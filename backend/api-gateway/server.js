import express from "express";
import cors from "cors";
import helmet from "helmet";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { createLogger, format, transports } from "winston";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_DIR = path.join(__dirname, "..", "settings");
const SETTINGS_FILE = path.join(SETTINGS_DIR, "ai-config.json");
const SETTINGS_LOG = path.join(SETTINGS_DIR, "settings-log.json");

const logger = createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: format.combine(format.timestamp(), format.json()),
    transports: [new transports.Console()],
});

const config = {
    port: parseInt(process.env.PORT) || 3000,
    ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
    systemUrl: process.env.SYSTEM_URL || "http://opcua-server:8080",
    model: process.env.LLM_MODEL || "llama3.2",
};

// ===========================================
// AI SETTINGS MANAGEMENT
// ===========================================

const DEFAULT_SETTINGS = {
    reasoningInterval: 3000,
    pidChangeCooldownMs: 8000,
    maxPidStep: { kp: 0.5, ki: 0.03, kd: 0.5 },
    pidRanges: {
        kp: { min: 0.1, max: 10 },
        ki: { min: 0.01, max: 1 },
        kd: { min: 0.1, max: 5 }
    },
    stableDeadband: 1.0,
    maxOscillationWhenStable: 0.2,
    hallucinationThresholds: {
        perplexity: 25.0,
        shannonEntropy: 1.5,
        zScoreCritical: 3.0,
        zScoreWarning: 2.0,
        semanticEntropy: 1.0
    },
    promptTemplate: `You are an AI PID controller tuning agent. Goal: SMOOTH line following setpoint.
{experienceMemory}
METRICS: PV={processValue}, SP={setpoint}, Error={error}, Stability={stability}
Oscillation={oscillation}%, Smoothness={smoothness}%
PID: Kp={kp}, Ki={ki}, Kd={kd}
{userInstructions}

PID GUIDE: Kp(1-4), Ki(0.05-0.3), Kd(0.3-2)
{oscillationHint}
{smoothnessHint}

Respond ONLY with JSON: {"action":"tune"|"monitor","analysis":"reason","kp":num,"ki":num,"kd":num,"confidence":0-100}`
};

let currentSettings = { ...DEFAULT_SETTINGS };

function ensureSettingsDir() {
    if (!fs.existsSync(SETTINGS_DIR)) {
        fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    }
}

function loadSettings() {
    ensureSettingsDir();
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
            currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
            logger.info("Settings loaded from file", { file: SETTINGS_FILE });
        } else {
            currentSettings = { ...DEFAULT_SETTINGS };
            saveSettings(currentSettings);
            logger.info("Default settings created", { file: SETTINGS_FILE });
        }
    } catch (err) {
        logger.error("Failed to load settings", { error: err.message });
        currentSettings = { ...DEFAULT_SETTINGS };
    }
    return currentSettings;
}

function saveSettings(settings) {
    ensureSettingsDir();
    try {
        // Create backup in log file
        let logEntries = [];
        if (fs.existsSync(SETTINGS_LOG)) {
            try {
                logEntries = JSON.parse(fs.readFileSync(SETTINGS_LOG, 'utf8'));
            } catch { logEntries = []; }
        }

        logEntries.push({
            timestamp: new Date().toISOString(),
            action: 'save',
            settings: settings
        });

        // Keep only last 100 backups
        if (logEntries.length > 100) {
            logEntries = logEntries.slice(-100);
        }

        fs.writeFileSync(SETTINGS_LOG, JSON.stringify(logEntries, null, 2));
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));

        currentSettings = settings;
        applySettingsToAgent();

        logger.info("Settings saved", { file: SETTINGS_FILE });
        return true;
    } catch (err) {
        logger.error("Failed to save settings", { error: err.message });
        return false;
    }
}

function applySettingsToAgent() {
    if (supervisor.controlAgent) {
        supervisor.controlAgent.reasoningInterval = currentSettings.reasoningInterval;
        supervisor.controlAgent.pidChangeCooldownMs = currentSettings.pidChangeCooldownMs;
        supervisor.controlAgent.maxPidStep = currentSettings.maxPidStep;
        supervisor.controlAgent.stableDeadband = currentSettings.stableDeadband;
        supervisor.controlAgent.maxOscillationWhenStable = currentSettings.maxOscillationWhenStable;

        if (supervisor.controlAgent.hallucinationTracker) {
            supervisor.controlAgent.hallucinationTracker.thresholds = currentSettings.hallucinationThresholds;
        }

        logger.info("Settings applied to control agent");
    }
}

const app = express();
const server = createServer(app);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// ===========================================
// MATHEMATICAL UTILITIES FOR HALLUCINATION DETECTION
// Based on: "Autonomous Reliability Protocols for LLMs"
// ===========================================

const MathUtils = {
    log: (x) => (x > 0 ? Math.log(x) : -100),
    exp: (x) => Math.exp(x),

    // Shannon Entropy: H(P) = -Σ P(w|x) log P(w|x)
    shannonEntropy: (probabilities) => {
        if (!probabilities || probabilities.length === 0) return 0;
        return probabilities.reduce((acc, p) => {
            if (p <= 0) return acc;
            return acc - (p * Math.log(p));
        }, 0);
    },

    natsToBits: (nats) => nats / Math.log(2),
    mean: (arr) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length,

    stdDev: (arr) => {
        if (arr.length < 2) return 0;
        const avg = MathUtils.mean(arr);
        const squareDiffs = arr.map(v => Math.pow(v - avg, 2));
        return Math.sqrt(MathUtils.mean(squareDiffs));
    },

    // Z-score: Z = (X_test - μ_base) / σ_base
    zScore: (value, baseline, stdDev) => {
        if (stdDev === 0) return 0;
        return (value - baseline) / stdDev;
    }
};

// ===========================================
// ENHANCED HALLUCINATION TRACKER
// Implements: Perplexity, Shannon Entropy, Z-Score Drift Detection
// ===========================================

class HallucinationTracker {
    constructor(systemId = 'control') {
        this.systemId = systemId;
        this.decisions = [];
        this.maxDecisions = 100;

        // Thresholds from document
        this.thresholds = {
            perplexity: 25.0,
            shannonEntropy: 1.5,
            zScoreCritical: 3.0,
            zScoreWarning: 2.0,
            semanticEntropy: 1.0
        };

        this.baseline = {
            perplexityHistory: [],
            entropyHistory: [],
            baselinePerplexity: null,
            baselinePerplexityStd: null,
            baselineEntropy: null,
            baselineEntropyStd: null,
            calibrated: false
        };

        this.errorHistory = [];
        this.simulatedPerplexityWindow = [];
    }

    // PPL = exp(-1/N * Σ log p) - simulated from confidence/quality
    simulatePerplexity(decision) {
        const confidence = decision.confidence || 50;
        const quality = decision.quality || 0.5;
        const confidenceFactor = (100 - confidence) / 100;
        const qualityFactor = (1 - quality);
        const basePPL = 5;
        return Math.max(1, basePPL + (confidenceFactor * 20) + (qualityFactor * 25));
    }

    simulateEntropy(decision) {
        const confidence = decision.confidence || 50;
        const mainProb = confidence / 100;
        const remainingProb = 1 - mainProb;
        const altProbs = [mainProb, remainingProb * 0.4, remainingProb * 0.3, remainingProb * 0.2, remainingProb * 0.1];
        return MathUtils.natsToBits(MathUtils.shannonEntropy(altProbs));
    }

    recordDecision(decision) {
        const perplexity = this.simulatePerplexity(decision);
        const entropy = this.simulateEntropy(decision);

        const enrichedDecision = {
            timestamp: Date.now(),
            quality: 0.5,
            confidence: 50,
            perplexity,
            entropy,
            ...decision
        };

        this.decisions.push(enrichedDecision);
        if (this.decisions.length > this.maxDecisions) this.decisions.shift();

        this.updateBaseline(perplexity, entropy);
        this.simulatedPerplexityWindow.push(perplexity);
        if (this.simulatedPerplexityWindow.length > 20) this.simulatedPerplexityWindow.shift();
    }

    updateBaseline(perplexity, entropy) {
        this.baseline.perplexityHistory.push(perplexity);
        this.baseline.entropyHistory.push(entropy);
        if (this.baseline.perplexityHistory.length > 50) {
            this.baseline.perplexityHistory.shift();
            this.baseline.entropyHistory.shift();
        }
        if (this.baseline.perplexityHistory.length >= 10 && !this.baseline.calibrated) {
            this.calibrateBaseline();
        }
    }

    calibrateBaseline() {
        this.baseline.baselinePerplexity = MathUtils.mean(this.baseline.perplexityHistory);
        this.baseline.baselinePerplexityStd = MathUtils.stdDev(this.baseline.perplexityHistory);
        this.baseline.baselineEntropy = MathUtils.mean(this.baseline.entropyHistory);
        this.baseline.baselineEntropyStd = MathUtils.stdDev(this.baseline.entropyHistory);
        this.baseline.calibrated = true;
        logger.info("Hallucination baseline calibrated", {
            systemId: this.systemId,
            baselinePPL: this.baseline.baselinePerplexity.toFixed(2),
            baselineEntropy: this.baseline.baselineEntropy.toFixed(3)
        });
    }

    recordError(error) {
        this.errorHistory.push(error);
        if (this.errorHistory.length > 50) this.errorHistory.shift();
    }

    calculateOscillation() {
        if (this.errorHistory.length < 10) return 0;
        const recent = this.errorHistory.slice(-20);
        let directionChanges = 0, prevDelta = 0;
        for (let i = 1; i < recent.length; i++) {
            const delta = recent[i] - recent[i-1];
            if (prevDelta !== 0 && Math.sign(delta) !== Math.sign(prevDelta)) directionChanges++;
            prevDelta = delta;
        }
        return Math.min(1, directionChanges / (recent.length * 0.5));
    }

    calculateSmoothness() {
        if (this.errorHistory.length < 10) return 1;
        const recent = this.errorHistory.slice(-20);
        const avgError = recent.reduce((s, e) => s + Math.abs(e), 0) / recent.length;
        const variance = recent.reduce((s, e) => s + Math.pow(e - avgError, 2), 0) / recent.length;
        return Math.max(0, 1 - (Math.sqrt(variance) / 20) - (avgError / 50));
    }

    evaluateDecision(errorBefore, errorAfter, confidence) {
        const errBefore = typeof errorBefore === 'number' && !isNaN(errorBefore) ? errorBefore : 0;
        const errAfter = typeof errorAfter === 'number' && !isNaN(errorAfter) ? errorAfter : 0;
        const conf = typeof confidence === 'number' && !isNaN(confidence) ? Math.max(0, Math.min(100, confidence)) : 50;

        const errorImproved = Math.abs(errAfter) < Math.abs(errBefore);
        const errorWorsened = Math.abs(errAfter) > Math.abs(errBefore) * 1.2;
        const oscillation = this.calculateOscillation();
        const smoothness = this.calculateSmoothness();

        let quality = 0.5;
        if (errorImproved) quality = 0.7 + (conf / 500);
        if (errorWorsened) quality = 0.3 - ((100 - conf) / 500);
        quality += smoothness * 0.2;
        quality -= oscillation * 0.3;

        return { quality: Math.max(0, Math.min(1, quality)), errorImproved, errorWorsened, oscillation, smoothness };
    }

    getCurrentPerplexity() {
        return this.simulatedPerplexityWindow.length === 0 ? 0 : MathUtils.mean(this.simulatedPerplexityWindow);
    }

    getCurrentEntropy() {
        const recent = this.decisions.slice(-10);
        return recent.length === 0 ? 0 : MathUtils.mean(recent.map(d => d.entropy || 0));
    }

    calculateDriftZScore() {
        if (!this.baseline.calibrated) return 0;
        return MathUtils.zScore(this.getCurrentPerplexity(), this.baseline.baselinePerplexity, this.baseline.baselinePerplexityStd || 1);
    }

    calculateRisk() {
        if (this.decisions.length < 5) return 0;
        const recentDecisions = this.decisions.slice(-20);

        const currentPPL = this.getCurrentPerplexity();
        const perplexityRisk = Math.min(1, Math.max(0, (currentPPL - 10) / (this.thresholds.perplexity - 10)));
        const entropyRisk = Math.min(1, Math.max(0, this.getCurrentEntropy() / this.thresholds.shannonEntropy));
        const driftRisk = Math.min(1, Math.max(0, Math.abs(this.calculateDriftZScore()) / this.thresholds.zScoreCritical));

        const badDecisions = recentDecisions.filter(d => d.quality < 0.4).length;
        const badRatio = badDecisions / recentDecisions.length;
        const avgConfidence = recentDecisions.reduce((s, d) => s + (d.confidence || 50), 0) / recentDecisions.length;
        const confidenceFactor = (100 - avgConfidence) / 100;
        const pidChanges = recentDecisions.filter(d => d.pidChanged).length;
        const erraticFactor = pidChanges > recentDecisions.length * 0.5 ? 0.2 : 0;

        let consecutiveBad = 0;
        for (let i = recentDecisions.length - 1; i >= 0; i--) {
            if (recentDecisions[i].quality < 0.4) consecutiveBad++; else break;
        }

        return Math.min(1,
            (perplexityRisk * 0.20) + (entropyRisk * 0.15) + (driftRisk * 0.20) +
            (badRatio * 0.15) + (confidenceFactor * 0.10) + erraticFactor +
            Math.min(consecutiveBad * 0.08, 0.3) + (this.calculateOscillation() * 0.15)
        );
    }

    shouldTriggerMigration() {
        const zScore = this.calculateDriftZScore();
        const risk = this.calculateRisk();
        const currentPPL = this.getCurrentPerplexity();

        const zScoreTrigger = zScore >= this.thresholds.zScoreCritical;
        const perplexityTrigger = currentPPL > this.thresholds.perplexity;
        const riskTrigger = risk >= 0.70;

        return {
            shouldMigrate: zScoreTrigger || (perplexityTrigger && riskTrigger),
            reason: zScoreTrigger ? 'Z-Score Critical Drift' : perplexityTrigger ? 'High Perplexity' : riskTrigger ? 'High Risk Score' : null,
            metrics: { zScore, risk, currentPPL, currentEntropy: this.getCurrentEntropy() }
        };
    }

    getStatus() {
        const risk = this.calculateRisk();
        const zScore = this.calculateDriftZScore();
        const migrationCheck = this.shouldTriggerMigration();

        let riskLevel = "NORMAL";
        if (zScore >= this.thresholds.zScoreCritical || risk >= 0.70) riskLevel = "CRITICAL";
        else if (zScore >= this.thresholds.zScoreWarning || risk >= 0.50) riskLevel = "WARNING";

        return {
            risk: Math.round(risk * 100),
            riskLevel,
            totalDecisions: this.decisions.length,
            shouldFailover: migrationCheck.shouldMigrate,
            migrationReason: migrationCheck.reason,
            oscillation: Math.round(this.calculateOscillation() * 100),
            smoothness: Math.round(this.calculateSmoothness() * 100),
            perplexity: Math.round(this.getCurrentPerplexity() * 100) / 100,
            entropy: Math.round(this.getCurrentEntropy() * 1000) / 1000,
            zScore: Math.round(zScore * 100) / 100,
            baselineCalibrated: this.baseline.calibrated,
            thresholds: this.thresholds
        };
    }

    exportState() {
        return {
            systemId: this.systemId,
            decisions: this.decisions.slice(-20),
            errorHistory: this.errorHistory.slice(-20),
            baseline: { ...this.baseline },
            simulatedPerplexityWindow: [...this.simulatedPerplexityWindow]
        };
    }

    importState(state) {
        if (state.decisions) this.decisions = [...state.decisions];
        if (state.errorHistory) this.errorHistory = [...state.errorHistory];
        if (state.baseline) this.baseline = { ...state.baseline };
        if (state.simulatedPerplexityWindow) this.simulatedPerplexityWindow = [...state.simulatedPerplexityWindow];
    }

    reset() {
        this.decisions = [];
        this.errorHistory = [];
        this.simulatedPerplexityWindow = [];
        this.baseline = { perplexityHistory: [], entropyHistory: [], baselinePerplexity: null, baselinePerplexityStd: null, baselineEntropy: null, baselineEntropyStd: null, calibrated: false };
    }
}

// ===========================================
// EXPERIENCE MEMORY
// ===========================================

class ExperienceMemory {
    constructor(maxSize = 500) {
        this.experiences = [];
        this.maxSize = maxSize;
        this.successfulConfigs = [];
    }

    record(state, action, pidBefore, pidAfter, errorBefore, errorAfter) {
        const reward = this.calculateReward(errorBefore, errorAfter);
        this.experiences.push({ timestamp: Date.now(), state: { error: errorBefore, stability: state.stability }, action, pidBefore, pidAfter, errorBefore, errorAfter, reward });
        if (this.experiences.length > this.maxSize) this.experiences.shift();
        if (reward > 0.7 && errorAfter < 2) {
            this.successfulConfigs.push({ pid: pidAfter, stability: state.stability, error: errorAfter, timestamp: Date.now() });
            if (this.successfulConfigs.length > 50) this.successfulConfigs.shift();
        }
    }

    calculateReward(errorBefore, errorAfter) {
        const improvement = errorBefore - errorAfter;
        if (errorAfter < 1) return 1.0;
        if (errorAfter < 2) return 0.8;
        if (improvement > 0) return 0.5 + (improvement / 20);
        return Math.max(0, 0.3 - Math.abs(improvement) / 20);
    }

    getSummaryForPrompt() {
        const recent = this.experiences.slice(-20);
        if (recent.length < 5) return "";
        const avgReward = recent.reduce((s, e) => s + e.reward, 0) / recent.length;
        const bestConfig = this.successfulConfigs[this.successfulConfigs.length - 1];
        let summary = `\nLEARNED FROM EXPERIENCE (${this.experiences.length} samples):\n- Recent avg reward: ${(avgReward * 100).toFixed(0)}%\n`;
        if (bestConfig) summary += `- Best config: Kp=${bestConfig.pid.kp.toFixed(2)}, Ki=${bestConfig.pid.ki.toFixed(3)}, Kd=${bestConfig.pid.kd.toFixed(2)}\n`;
        return summary;
    }
}

// ===========================================
// AI CONTROL AGENT
// ===========================================

class AIControlAgent {
    constructor(instanceId = 1, systemId = 'control') {
        this.instanceId = instanceId;
        this.systemId = systemId;
        this.active = true;
        this.actionHistory = [];
        this.maxHistory = 50;
        this.memory = new ExperienceMemory();

        this.kp = 0.5; this.ki = 0.02; this.kd = 0.1;
        this.integral = 0; this.lastError = 0;
        this.lastComputeTime = Date.now();

        this.reasoningInterval = 3000;
        this.lastReasoning = 0;
        this.lastReasoning_result = null;
        this.pidChangeCooldownMs = 8000;
        this.lastPidChangeAt = 0;
        this.maxPidStep = { kp: 0.5, ki: 0.03, kd: 0.5 };
        this.stableDeadband = 1.0;
        this.maxOscillationWhenStable = 0.2;

        this.userInstructions = "";
        this.targetSetpoint = null;
        this.hallucinationTracker = new HallucinationTracker(systemId);
        this.lastErrorForEval = null;
        this.lastConfidence = 50;

        logger.info("AI Agent initialized", { instanceId, systemId });
    }

    async computeControl(state) {
        if (!this.active) return null;
        const error = state.setpoint - state.temperature;
        this.hallucinationTracker.recordError(error);

        // Use actual elapsed time instead of assuming 100ms - handles network latency
        const now = Date.now();
        const dt = Math.min(1.0, Math.max(0.05, (now - this.lastComputeTime) / 1000)); // Clamp between 50ms and 1s
        this.lastComputeTime = now;

        this.integral += error * dt;
        this.integral = Math.max(-50, Math.min(50, this.integral));
        const derivative = dt > 0.01 ? (error - this.lastError) / dt : 0;
        this.lastError = error;

        // Calculate equilibrium heater power based on setpoint and heat loss
        // Equilibrium: heaterPower = heatLoss * (setpoint - ambientTemp)
        const heatLoss = state.heatLoss || 0.25;
        const ambientTemp = 20;
        const equilibriumPower = heatLoss * (state.setpoint - ambientTemp);

        // Use equilibrium as base with strong proportional and derivative gains
        let controlOutput = equilibriumPower + (this.kp * error * 3) + (this.ki * this.integral) + (this.kd * derivative * 3);
        controlOutput = Math.max(0, Math.min(100, controlOutput));

        this.actionHistory.push({ timestamp: Date.now(), error, controlOutput, state: { ...state } });
        if (this.actionHistory.length > this.maxHistory) this.actionHistory.shift();

        return controlOutput;
    }

    async reason(state) {
        const now = Date.now();
        if (now - this.lastReasoning < this.reasoningInterval) return null;
        this.lastReasoning = now;
        logger.info("AI reasoning started", { temp: state.temperature, setpoint: state.setpoint, error: state.error });

        if (this.lastErrorForEval !== null) {
            const evaluation = this.hallucinationTracker.evaluateDecision(this.lastErrorForEval, state.error, this.lastConfidence);
            const lastDecision = this.hallucinationTracker.decisions[this.hallucinationTracker.decisions.length - 1];
            if (lastDecision) { lastDecision.quality = evaluation.quality; lastDecision.errorAfter = state.error; }
        }
        this.lastErrorForEval = state.error;

        const recentHistory = this.actionHistory.slice(-10);
        const avgError = recentHistory.length > 0 ? recentHistory.reduce((sum, a) => sum + Math.abs(a.error), 0) / recentHistory.length : 0;
        const oscillation = this.hallucinationTracker.calculateOscillation();
        const smoothness = this.hallucinationTracker.calculateSmoothness();
        const needsTuning = state.stability !== "STABLE" || Math.abs(avgError) > 2;

        if (this.targetSetpoint !== null) {
            const target = Math.max(0, Math.min(100, Number(this.targetSetpoint)));
            if (!isNaN(target)) await this.changeSetpoint(target);
            this.targetSetpoint = null;
            this.lastReasoning_result = { action: 'setpoint', analysis: `Setpoint updated to ${target}.`, pidChanged: false, confidence: 90 };
            return { toolUsed: 'setpoint', confidence: 90 };
        }

        const absError = Math.abs(Number(state.error));
        const inDeadband = state.stability === 'STABLE' && absError <= this.stableDeadband && oscillation <= this.maxOscillationWhenStable;
        const inPidCooldown = (now - this.lastPidChangeAt) < this.pidChangeCooldownMs;

        if (inDeadband || inPidCooldown) {
            const analysis = inPidCooldown ? 'Holding PID parameters.' : 'Stable within deadband.';
            this.lastReasoning_result = { action: 'monitor', analysis, pidChanged: false, confidence: 80 };
            return { toolUsed: 'monitor', confidence: 80 };
        }

        const prompt = `You are an AI PID controller tuning agent. Goal: SMOOTH line following setpoint.
${this.memory.getSummaryForPrompt()}
METRICS: PV=${state.temperature.toFixed(2)}, SP=${state.setpoint}, Error=${state.error.toFixed(2)}, Stability=${state.stability}
Oscillation=${(oscillation * 100).toFixed(0)}%, Smoothness=${(smoothness * 100).toFixed(0)}%
PID: Kp=${this.kp.toFixed(2)}, Ki=${this.ki.toFixed(3)}, Kd=${this.kd.toFixed(2)}
${this.userInstructions ? `USER: "${this.userInstructions}"` : ""}

PID GUIDE: Kp(1-4), Ki(0.05-0.3), Kd(0.3-2)
${oscillation > 0.3 ? "HIGH OSCILLATION: Increase Kd OR decrease Kp" : ""}
${smoothness < 0.5 ? "LOW SMOOTHNESS: Balance parameters" : ""}

Respond ONLY with JSON: {"action":"tune"|"monitor","analysis":"reason","kp":num,"ki":num,"kd":num,"confidence":0-100}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            const response = await fetch(`${config.ollamaUrl}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: config.model, prompt, stream: false, format: "json" }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
            const data = await response.json();

            let reasoning;
            try {
                let cleanResponse = data.response.trim().replace(/```json?\n?/g, "").replace(/```/g, "").trim();
                reasoning = JSON.parse(cleanResponse);
            } catch { throw new Error("Parse failed"); }

            let pidChanged = false, oldPid = { kp: this.kp, ki: this.ki, kd: this.kd };
            const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
            const clampStep = (current, proposed, maxStep) => {
                const delta = proposed - current;
                if (!isFinite(delta)) return current;
                return Math.abs(delta) <= maxStep ? proposed : current + Math.sign(delta) * maxStep;
            };

            if ((reasoning.action === "tune" || reasoning.action === "adjust") && (now - this.lastPidChangeAt) >= this.pidChangeCooldownMs) {
                if (!isNaN(Number(reasoning.kp))) this.kp = clamp(clampStep(this.kp, Number(reasoning.kp), this.maxPidStep.kp), 0.1, 10);
                if (!isNaN(Number(reasoning.ki))) this.ki = clamp(clampStep(this.ki, Number(reasoning.ki), this.maxPidStep.ki), 0.01, 1);
                if (!isNaN(Number(reasoning.kd))) this.kd = clamp(clampStep(this.kd, Number(reasoning.kd), this.maxPidStep.kd), 0.1, 5);
                pidChanged = (this.kp !== oldPid.kp) || (this.ki !== oldPid.ki) || (this.kd !== oldPid.kd);
                if (pidChanged) this.lastPidChangeAt = now;
            }

            const confidence = reasoning.confidence || 50;
            this.hallucinationTracker.recordDecision({ errorBefore: state.error, confidence, pidChanged, toolUsed: reasoning.action || "monitor" });
            this.memory.record(state, reasoning.action || "monitor", oldPid, { kp: this.kp, ki: this.ki, kd: this.kd }, this.lastErrorForEval || state.error, state.error);
            this.lastConfidence = confidence;
            this.lastReasoning_result = { action: reasoning.action, analysis: reasoning.analysis, pidChanged, confidence };

            return { toolUsed: reasoning.action, confidence, reasoning };
        } catch (err) {
            logger.error("AI reasoning failed, using rule-based fallback", { error: err.message });

            // Rule-based fallback when Ollama is unavailable
            const fallbackResult = this.ruleBasedTune(state, oscillation, smoothness, avgError, now);
            return fallbackResult;
        }
    }

    ruleBasedTune(state, oscillation, smoothness, avgError, now) {
        const error = state.setpoint - state.temperature;
        const absError = Math.abs(error);
        let pidChanged = false;
        const oldPid = { kp: this.kp, ki: this.ki, kd: this.kd };
        let analysis = "Monitoring system.";

        // Check if PID is severely detuned (Kp too low or Kd too high)
        const severelyDetuned = this.kp < 0.3 || this.kd > 3.0;

        // Use shorter cooldown and lower threshold when system is clearly detuned
        const effectiveCooldown = severelyDetuned ? Math.min(2000, this.pidChangeCooldownMs) : this.pidChangeCooldownMs;
        const effectiveDeadband = severelyDetuned ? 0.5 : this.stableDeadband;

        // Only tune if outside cooldown and error is significant (or system is detuned)
        if ((now - this.lastPidChangeAt) >= effectiveCooldown && (absError > effectiveDeadband || severelyDetuned)) {

            // Severely detuned - need to restore reasonable gains
            if (severelyDetuned && absError > 0.5) {
                this.kp = Math.max(0.5, this.kp * 2.0);  // Boost proportional
                this.ki = Math.max(0.02, this.ki * 1.5);  // Boost integral
                this.kd = Math.min(2.0, this.kd * 0.6);  // Reduce excessive derivative
                this.integral = 0;  // Reset integral
                analysis = `System detuned! Restoring gains: Kp=${this.kp.toFixed(2)}, Kd=${this.kd.toFixed(2)}`;
                pidChanged = true;
            }
            // Overshoot detected (temperature above setpoint)
            else if (error < -2) {
                // More aggressive correction for overshoot - reduce Kp significantly, increase Kd
                this.kp = Math.max(0.1, this.kp * 0.85);
                this.kd = Math.min(5, this.kd * 1.2);
                // Reset integral to prevent windup from fighting correction
                this.integral = Math.min(0, this.integral * 0.5);
                analysis = `Overshoot detected (${(-error).toFixed(1)}°C). Reducing Kp, increasing Kd, resetting integral.`;
                pidChanged = true;
            }
            // High oscillation
            else if (oscillation > 0.3) {
                this.kd = Math.min(5, this.kd * 1.15);
                this.kp = Math.max(0.1, this.kp * 0.9);
                analysis = `High oscillation (${(oscillation*100).toFixed(0)}%). Increasing Kd, reducing Kp.`;
                pidChanged = true;
            }
            // Heater saturated - system physically cannot reach setpoint
            else if (state.heaterPower >= 99 && error > 5) {
                // Calculate max achievable temp with current heat loss
                const heatLoss = state.heatLoss || 0.25;
                const maxTemp = 20 + (100 / heatLoss);

                if (state.setpoint > maxTemp + 5) {
                    // Lower heat loss to make setpoint achievable
                    const newHeatLoss = Math.max(0.1, heatLoss - 0.15);
                    fetch(`${config.systemUrl}/user/heatloss`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ value: newHeatLoss })
                    }).catch(() => {});
                    analysis = `Heater saturated! Max temp=${maxTemp.toFixed(0)}°C. Reducing heat loss from ${heatLoss.toFixed(2)} to ${newHeatLoss.toFixed(2)}.`;
                    pidChanged = true;
                    // Also boost PID for faster recovery
                    this.kp = Math.min(10, this.kp * 1.3);
                    this.integral = 0; // Reset integral
                }
            }
            // Undershoot - temperature significantly below setpoint
            else if (error > 10) {
                this.kp = Math.min(10, this.kp * 1.1);
                this.ki = Math.min(1, this.ki * 1.05);
                analysis = `Large error (${error.toFixed(1)}°C). Increasing Kp and Ki.`;
                pidChanged = true;
            }
            // Slow convergence
            else if (absError > 2 && smoothness > 0.7) {
                this.ki = Math.min(1, this.ki * 1.1);
                analysis = `Slow convergence. Increasing Ki for faster settling.`;
                pidChanged = true;
            }

            if (pidChanged) {
                this.lastPidChangeAt = now;
                logger.info("Rule-based PID tune", { old: oldPid, new: { kp: this.kp, ki: this.ki, kd: this.kd }, analysis });
            }
        }

        this.hallucinationTracker.recordDecision({ errorBefore: state.error, confidence: 60, pidChanged, toolUsed: pidChanged ? "tune" : "monitor" });
        this.memory.record(state, pidChanged ? "tune" : "monitor", oldPid, { kp: this.kp, ki: this.ki, kd: this.kd }, this.lastErrorForEval || state.error, state.error);
        this.lastReasoning_result = { action: pidChanged ? "tune" : "monitor", analysis, pidChanged, confidence: 60, fallback: true };

        return { toolUsed: pidChanged ? "tune" : "monitor", confidence: 60, fallback: true };
    }

    async changeSetpoint(value) {
        try {
            await fetch(`${config.systemUrl}/system/setpoint`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ setpoint: value }) });
        } catch (err) { logger.error("Failed to change setpoint", { error: err.message }); }
    }

    setUserInstructions(instructions) {
        this.userInstructions = instructions;
        const match = instructions.match(/(\d+)/);
        if (match && (instructions.toLowerCase().includes("setpoint") || instructions.toLowerCase().includes("target"))) {
            this.targetSetpoint = parseFloat(match[1]);
        }
    }

    toggle(active) { this.active = active; if (!active) { this.integral = 0; this.lastError = 0; } }

    getStatus() {
        return {
            instanceId: this.instanceId, systemId: this.systemId, active: this.active,
            kp: this.kp, ki: this.ki, kd: this.kd,
            hallucination: this.hallucinationTracker.getStatus(),
            lastAction: this.lastReasoning_result
        };
    }

    softReset() { this.integral = 0; this.lastError = 0; this.hallucinationTracker.reset(); }

    // Detune PID to simulate disturbance effect - AI will need to retune
    detunePID(severity = 'medium') {
        const oldPid = { kp: this.kp, ki: this.ki, kd: this.kd };

        if (severity === 'high') {
            // Major detuning - significant error will occur
            this.kp *= 0.3;  // Reduce proportional gain significantly
            this.ki *= 0.2;  // Reduce integral
            this.kd *= 2.5;  // Increase derivative (causes oscillation)
            this.integral = 0;  // Reset integral accumulator
        } else {
            // Moderate detuning
            this.kp *= 0.5;  // Reduce proportional gain
            this.ki *= 0.4;  // Reduce integral
            this.kd *= 1.8;  // Increase derivative
            this.integral *= 0.3;  // Partially reset integral
        }

        // Clamp to valid ranges
        this.kp = Math.max(0.1, Math.min(10, this.kp));
        this.ki = Math.max(0.01, Math.min(1, this.ki));
        this.kd = Math.max(0.1, Math.min(5, this.kd));

        // Reset cooldown so AI can immediately start retuning
        this.lastPidChangeAt = 0;

        logger.info("PID detuned by disturbance", {
            severity,
            old: oldPid,
            new: { kp: this.kp, ki: this.ki, kd: this.kd }
        });

        return { old: oldPid, new: { kp: this.kp, ki: this.ki, kd: this.kd } };
    }

    exportState() {
        return { instanceId: this.instanceId, systemId: this.systemId, kp: this.kp, ki: this.ki, kd: this.kd,
            userInstructions: this.userInstructions, active: this.active,
            hallucinationState: this.hallucinationTracker.exportState() };
    }

    importState(state) {
        if (state.kp !== undefined) this.kp = state.kp;
        if (state.ki !== undefined) this.ki = state.ki;
        if (state.kd !== undefined) this.kd = state.kd;
        if (state.userInstructions !== undefined) this.userInstructions = state.userInstructions;
        if (state.active !== undefined) this.active = state.active;
        if (state.hallucinationState) this.hallucinationTracker.importState(state.hallucinationState);
    }
}

// ===========================================
// CROSS-SYSTEM SUPERVISOR (Blue-Green Migration)
// ===========================================

class CrossSystemSupervisor {
    constructor() {
        this.controlAgent = null;
        this.tankAgent = null;
        this.instanceCounter = 0;
        this.failoverHistory = [];
        this.crossMigrationHistory = [];
        this.checkInterval = 5000;
        this.lastCheck = 0;
        this.controlEnvironment = 'blue';
        this.tankEnvironment = 'blue';
    }

    createControlAgent() {
        this.instanceCounter++;
        const agent = new AIControlAgent(this.instanceCounter, 'control');
        logger.info("New control agent created", { instanceId: this.instanceCounter });
        return agent;
    }

    createTankAgent() {
        this.instanceCounter++;
        const agent = new AIControlAgent(this.instanceCounter, 'tank');
        logger.info("New tank agent created", { instanceId: this.instanceCounter });
        return agent;
    }

    async checkAndMigrate() {
        const now = Date.now();
        if (now - this.lastCheck < this.checkInterval) return null;
        this.lastCheck = now;
        const results = { controlMigration: null, tankMigration: null, crossSwap: null };

        if (this.controlAgent) {
            const migCheck = this.controlAgent.hallucinationTracker.shouldTriggerMigration();
            if (migCheck.shouldMigrate) {
                const tankStatus = this.tankAgent?.hallucinationTracker.getStatus();
                if (tankStatus?.riskLevel === "NORMAL" && this.tankAgent) {
                    results.crossSwap = await this.crossSystemSwap('control', 'tank', migCheck.reason);
                } else {
                    results.controlMigration = await this.failoverAgent('control', migCheck.reason);
                }
            }
        }

        if (this.tankAgent && !results.crossSwap) {
            const migCheck = this.tankAgent.hallucinationTracker.shouldTriggerMigration();
            if (migCheck.shouldMigrate) {
                const controlStatus = this.controlAgent?.hallucinationTracker.getStatus();
                if (controlStatus?.riskLevel === "NORMAL" && this.controlAgent) {
                    results.crossSwap = await this.crossSystemSwap('tank', 'control', migCheck.reason);
                } else {
                    results.tankMigration = await this.failoverAgent('tank', migCheck.reason);
                }
            }
        }
        return results;
    }

    async failoverAgent(systemId, reason) {
        logger.warn("Failover triggered", { systemId, reason });
        const oldAgent = systemId === 'control' ? this.controlAgent : this.tankAgent;
        const oldInstanceId = oldAgent?.instanceId;
        const newAgent = systemId === 'control' ? this.createControlAgent() : this.createTankAgent();

        if (oldAgent) { newAgent.userInstructions = oldAgent.userInstructions; newAgent.active = oldAgent.active; }
        if (systemId === 'control') { this.controlAgent = newAgent; this.controlEnvironment = this.controlEnvironment === 'blue' ? 'green' : 'blue'; }
        else { this.tankAgent = newAgent; this.tankEnvironment = this.tankEnvironment === 'blue' ? 'green' : 'blue'; }

        this.failoverHistory.push({ timestamp: Date.now(), systemId, fromInstance: oldInstanceId, toInstance: newAgent.instanceId, reason, type: 'failover' });
        return { systemId, oldInstance: oldInstanceId, newInstance: newAgent.instanceId, reason, type: 'failover' };
    }

    async crossSystemSwap(failingSystem, healthySystem, reason) {
        logger.warn("Cross-system swap triggered", { failingSystem, healthySystem, reason });
        const healthyAgent = healthySystem === 'control' ? this.controlAgent : this.tankAgent;
        if (!healthyAgent) return this.failoverAgent(failingSystem, reason);

        const failingInstanceId = (failingSystem === 'control' ? this.controlAgent : this.tankAgent)?.instanceId;
        const healthyInstanceId = healthyAgent.instanceId;
        const healthyState = healthyAgent.exportState();

        const newAgentForFailing = failingSystem === 'control' ? this.createControlAgent() : this.createTankAgent();
        newAgentForFailing.importState(healthyState);

        const newAgentForHealthy = healthySystem === 'control' ? this.createControlAgent() : this.createTankAgent();
        newAgentForHealthy.userInstructions = healthyAgent.userInstructions;
        newAgentForHealthy.active = healthyAgent.active;

        if (failingSystem === 'control') { this.controlAgent = newAgentForFailing; this.tankAgent = newAgentForHealthy; }
        else { this.tankAgent = newAgentForFailing; this.controlAgent = newAgentForHealthy; }
        this.controlEnvironment = this.controlEnvironment === 'blue' ? 'green' : 'blue';
        this.tankEnvironment = this.tankEnvironment === 'blue' ? 'green' : 'blue';

        this.crossMigrationHistory.push({ timestamp: Date.now(), failingSystem, healthySystem, failingInstance: failingInstanceId, healthyInstance: healthyInstanceId, reason, type: 'cross-swap' });
        return { failingSystem, healthySystem, reason, type: 'cross-swap' };
    }

    getStatus() {
        return {
            controlInstance: this.controlAgent?.instanceId, tankInstance: this.tankAgent?.instanceId,
            controlEnvironment: this.controlEnvironment, tankEnvironment: this.tankEnvironment,
            totalInstances: this.instanceCounter, failoverCount: this.failoverHistory.length, crossSwapCount: this.crossMigrationHistory.length,
            recentFailovers: this.failoverHistory.slice(-5), recentCrossSwaps: this.crossMigrationHistory.slice(-5),
            controlHallucination: this.controlAgent?.hallucinationTracker.getStatus(),
            tankHallucination: this.tankAgent?.hallucinationTracker.getStatus()
        };
    }
}

const supervisor = new CrossSystemSupervisor();
supervisor.controlAgent = supervisor.createControlAgent();
supervisor.tankAgent = supervisor.createTankAgent();

// Load settings after supervisor is created
loadSettings();

// ===========================================
// CONTROL LOOP
// ===========================================

let controlLoopInterval = null;
let connectedClients = 0;

async function controlLoop() {
    try {
        await supervisor.checkAndMigrate();
        const currentAgent = supervisor.controlAgent;
        if (!currentAgent) return;

        const res = await fetch(`${config.systemUrl}/system`);
        if (!res.ok) return;
        const state = await res.json();

        const controlOutput = await currentAgent.computeControl(state);
        if (controlOutput !== null && currentAgent.active) {
            await fetch(`${config.systemUrl}/system/control`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ controlOutput }) });
        }
        await currentAgent.reason(state);
    } catch (err) { /* System might not be ready */ }
}

function startControlLoop() {
    if (controlLoopInterval) return;
    logger.info("Control loop started");
    controlLoopInterval = setInterval(controlLoop, 100);
    fetch(`${config.systemUrl}/simulation/start`, { method: "POST" }).catch(() => {});
}

function stopControlLoop() {
    if (controlLoopInterval) {
        clearInterval(controlLoopInterval);
        controlLoopInterval = null;
        logger.info("Control loop paused");
        fetch(`${config.systemUrl}/simulation/stop`, { method: "POST" }).catch(() => {});
    }
}

function clientConnected() { connectedClients++; if (connectedClients === 1) startControlLoop(); logger.info("Client connected", { total: connectedClients }); }
function clientDisconnected() { connectedClients = Math.max(0, connectedClients - 1); if (connectedClients === 0) stopControlLoop(); logger.info("Client disconnected", { total: connectedClients }); }

// ===========================================
// API ENDPOINTS
// ===========================================

app.get("/health", (req, res) => res.json({ status: "healthy", timestamp: new Date().toISOString(), controlLoop: controlLoopInterval ? "running" : "paused", clients: connectedClients, supervisor: supervisor.getStatus() }));

app.get("/diagnostics", async (req, res) => {
    const results = { timestamp: new Date().toISOString(), services: {} };
    try {
        const opcuaRes = await fetch(`${config.systemUrl}/system`);
        results.services.opcuaServer = { status: opcuaRes.ok ? "healthy" : "error", url: config.systemUrl };
    } catch (err) { results.services.opcuaServer = { status: "down", error: err.message }; }

    try {
        const ollamaRes = await fetch(`${config.ollamaUrl}/api/tags`);
        if (ollamaRes.ok) {
            const data = await ollamaRes.json();
            const hasModel = (data.models || []).some(m => m.name.includes(config.model));
            results.services.ollama = { status: hasModel ? "healthy" : "missing_model", requiredModel: config.model };
        } else { results.services.ollama = { status: "error" }; }
    } catch (err) { results.services.ollama = { status: "down", error: err.message }; }

    results.controlAgent = { instanceId: supervisor.controlAgent?.instanceId, environment: supervisor.controlEnvironment, hallucination: supervisor.controlAgent?.hallucinationTracker.getStatus() };
    results.tankAgent = { instanceId: supervisor.tankAgent?.instanceId, environment: supervisor.tankEnvironment, hallucination: supervisor.tankAgent?.hallucinationTracker.getStatus() };
    res.json(results);
});

app.get("/supervisor", (req, res) => res.json(supervisor.getStatus()));
app.post("/supervisor/failover", (req, res) => { const { systemId = 'control' } = req.body; const result = supervisor.failoverAgent(systemId, "Manual failover"); res.json({ message: "Failover complete", ...result, supervisor: supervisor.getStatus() }); });
app.post("/supervisor/cross-swap", (req, res) => { const { failingSystem = 'control', healthySystem = 'tank' } = req.body; const result = supervisor.crossSystemSwap(failingSystem, healthySystem, "Manual cross-swap"); res.json({ message: "Cross-swap complete", ...result, supervisor: supervisor.getStatus() }); });
app.post("/agent/reset-hallucination", (req, res) => { const { systemId = 'control' } = req.body; const agent = systemId === 'control' ? supervisor.controlAgent : supervisor.tankAgent; if (agent) { agent.hallucinationTracker.reset(); res.json({ message: `Reset ${systemId}`, status: agent.hallucinationTracker.getStatus() }); } else res.status(404).json({ error: "Agent not found" }); });

app.get("/system", async (req, res) => { try { const response = await fetch(`${config.systemUrl}/system`); if (response.ok) res.json(await response.json()); else res.status(502).json({ error: "System unavailable" }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post("/system/setpoint", async (req, res) => { try { const response = await fetch(`${config.systemUrl}/system/setpoint`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req.body) }); if (response.ok) res.json(await response.json()); else res.status(502).json({ error: "System unavailable" }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post("/user/setpoint", async (req, res) => { try { const response = await fetch(`${config.systemUrl}/user/setpoint`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req.body) }); if (response.ok) res.json(await response.json()); else res.status(502).json({ error: "System unavailable" }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post("/user/heatloss", async (req, res) => { try { const response = await fetch(`${config.systemUrl}/user/heatloss`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req.body) }); if (response.ok) res.json(await response.json()); else res.status(502).json({ error: "System unavailable" }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post("/user/disturbance", async (req, res) => {
    try {
        const response = await fetch(`${config.systemUrl}/user/disturbance`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req.body) });
        if (response.ok) {
            // Also detune AI's PID so it needs to retune
            if (supervisor.controlAgent) {
                supervisor.controlAgent.detunePID('medium');
            }
            res.json(await response.json());
        } else {
            res.status(502).json({ error: "System unavailable" });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post("/user/instability", async (req, res) => {
    try {
        const response = await fetch(`${config.systemUrl}/user/instability`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req.body) });
        if (response.ok) {
            // Also detune AI's PID more severely so it needs to retune
            if (supervisor.controlAgent) {
                supervisor.controlAgent.detunePID('high');
            }
            res.json(await response.json());
        } else {
            res.status(502).json({ error: "System unavailable" });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post("/user/reset", async (req, res) => { try { supervisor.controlAgent?.softReset(); const response = await fetch(`${config.systemUrl}/user/reset`, { method: "POST" }); if (response.ok) res.json(await response.json()); else res.status(502).json({ error: "System unavailable" }); } catch (err) { res.status(500).json({ error: err.message }); } });

app.post("/agent/toggle", (req, res) => { if (supervisor.controlAgent) { supervisor.controlAgent.toggle(req.body.active); res.json({ active: supervisor.controlAgent.active }); } else res.status(500).json({ error: "No agent" }); });
app.post("/agent/reset-pid", (req, res) => { if (supervisor.controlAgent) { supervisor.controlAgent.kp = 0.5; supervisor.controlAgent.ki = 0.02; supervisor.controlAgent.kd = 0.1; supervisor.controlAgent.integral = 0; res.json({ message: "PID reset" }); } else res.status(500).json({ error: "No agent" }); });
app.post("/agent/instruct", (req, res) => { if (supervisor.controlAgent && req.body.instruction) { supervisor.controlAgent.setUserInstructions(req.body.instruction); res.json({ message: "Instruction received" }); } else res.status(400).json({ error: "No instruction" }); });

// ===========================================
// SETTINGS ENDPOINTS
// ===========================================

app.get("/settings", (req, res) => {
    res.json({
        settings: currentSettings,
        defaults: DEFAULT_SETTINGS,
        lastLoaded: new Date().toISOString()
    });
});

app.post("/settings", (req, res) => {
    const { settings } = req.body;
    if (!settings) {
        return res.status(400).json({ error: "No settings provided" });
    }

    // Merge with current settings to ensure all fields exist
    const mergedSettings = { ...currentSettings, ...settings };

    if (saveSettings(mergedSettings)) {
        res.json({
            success: true,
            message: "Settings saved and applied",
            settings: currentSettings
        });
    } else {
        res.status(500).json({ error: "Failed to save settings" });
    }
});

app.get("/settings/log", (req, res) => {
    try {
        if (fs.existsSync(SETTINGS_LOG)) {
            const logData = JSON.parse(fs.readFileSync(SETTINGS_LOG, 'utf8'));
            res.json({ log: logData.slice(-20) }); // Return last 20 entries
        } else {
            res.json({ log: [] });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/settings/reset", (req, res) => {
    if (saveSettings(DEFAULT_SETTINGS)) {
        res.json({
            success: true,
            message: "Settings reset to defaults",
            settings: DEFAULT_SETTINGS
        });
    } else {
        res.status(500).json({ error: "Failed to reset settings" });
    }
});

app.post("/control/chat", async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "No message" });

    // Parse common commands locally first (works without Ollama)
    const lowerMsg = message.toLowerCase();
    const numberMatch = message.match(/(\d+)/);

    // Handle setpoint changes
    if ((lowerMsg.includes("setpoint") || lowerMsg.includes("target") || lowerMsg.includes("set to") || lowerMsg.includes("change to") || lowerMsg.includes("degrees") || lowerMsg.includes("stabilize") || lowerMsg.includes("stable at")) && numberMatch) {
        const newSetpoint = parseInt(numberMatch[1]);
        if (newSetpoint >= 0 && newSetpoint <= 400) {
            await fetch(`${config.systemUrl}/user/setpoint`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ value: newSetpoint })
            });
            return res.json({ response: `Setpoint changed to ${newSetpoint}°C. The system will now work to reach this temperature.` });
        }
    }

    // Handle heat loss changes
    if ((lowerMsg.includes("heat loss") || lowerMsg.includes("heatloss") || lowerMsg.includes("loss")) && numberMatch) {
        const rawNum = parseFloat(numberMatch[1]);
        const newHeatLoss = rawNum > 1 ? rawNum / 100 : rawNum;
        if (newHeatLoss >= 0.01 && newHeatLoss <= 1.0) {
            await fetch(`${config.systemUrl}/user/heatloss`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ value: newHeatLoss })
            });
            return res.json({ response: `Heat loss coefficient set to ${newHeatLoss.toFixed(2)}.` });
        }
    }

    // Handle status queries
    if (lowerMsg.includes("status") || lowerMsg.includes("temperature") || lowerMsg.includes("how") || lowerMsg.includes("what") || lowerMsg === "") {
        try {
            const systemRes = await fetch(`${config.systemUrl}/system`);
            if (systemRes.ok) {
                const state = await systemRes.json();
                return res.json({
                    response: `Temperature: ${state.temperature.toFixed(1)}°C, Setpoint: ${state.setpoint}°C, Heater: ${state.heaterPower.toFixed(1)}%, Heat Loss: ${state.heatLoss.toFixed(2)}. Status: ${state.stability}.`
                });
            }
        } catch {}
    }

    // Try Ollama for complex queries, with quick timeout
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const systemRes = await fetch(`${config.systemUrl}/system`);
        const state = systemRes.ok ? await systemRes.json() : { temperature: 50, setpoint: 50, error: 0 };
        const prompt = `You are an AI oven controller. Temp=${state.temperature?.toFixed(1)}°C, Setpoint=${state.setpoint}°C. User says: "${message}". Reply in 1-2 sentences.`;
        const response = await fetch(`${config.ollamaUrl}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: config.model, prompt, stream: false, options: { num_predict: 100 } }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
            const data = await response.json();
            return res.json({ response: data.response?.trim() || "Working on it." });
        }
    } catch {}

    // Fallback help message
    res.json({ response: "Try: 'set to 250 degrees', 'what's the status', or 'set heat loss to 0.3'" });
});

// ===========================================
// ELECTRIC FOREST CHAT (CornDogSquad)
// Dedicated LLM with SearXNG integration
// ===========================================

const FOREST_LLM_URL = process.env.FOREST_LLM_URL || "http://localhost:11435";
const SEARXNG_URL = process.env.SEARXNG_URL || "http://192.168.0.25:8080";
const FOREST_MODEL = process.env.FOREST_MODEL || "llama3.2";

async function searchElectricForest(query) {
    const searchQuery = encodeURIComponent(`Electric Forest 2026 ${query}`);
    const response = await fetch(`${SEARXNG_URL}/search?q=${searchQuery}&format=json&categories=general`, {
        method: "GET",
        headers: { "Accept": "application/json" }
    });
    if (response.ok) {
        const data = await response.json();
        const results = (data.results || []).slice(0, 5).map((r, i) =>
            `[${i+1}] ${r.title}\n    ${r.content || 'No description'}`
        ).join('\n\n');
        return results || null;
    }
    return null;
}

async function checkForestLLMAvailable() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const response = await fetch(`${FOREST_LLM_URL}/api/tags`, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response.ok;
    } catch {
        return false;
    }
}

app.post("/forest/chat", async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "No message provided" });

    // Check if dedicated Forest LLM is available - if not, don't use SearXNG either
    const llmAvailable = await checkForestLLMAvailable();
    if (!llmAvailable) {
        return res.json({
            response: "The forest spirits are currently resting... 🌲💤 Jake would be so disappointed! The Electric Forest hype machine is offline, but trust me - EF2026 is going to be MAGICAL! Check back soon so Jake can have the happiest forest of his life! 🌲✨"
        });
    }

    // LLM is available, now search SearXNG for context
    let searchContext = "No search results available.";
    try {
        const searchResults = await searchElectricForest(message);
        if (searchResults) {
            searchContext = searchResults;
            logger.info("SearXNG results for forest chat", { query: message, resultsLength: searchResults.length });
        }
    } catch (err) {
        logger.warn("SearXNG search failed", { error: err.message });
    }

    const forestPrompt = `Answer the user's question about Electric Forest 2026 using the search results provided.

USER QUESTION: ${message}

SEARCH RESULTS:
${searchContext || "No search results available."}

INSTRUCTIONS:
- Use facts from the search results above for accuracy
- If artists are listed, name them exactly as shown
- Be enthusiastic and creative with forest/nature metaphors
- IMPORTANT: Always reference "Jake" - a beloved forest fam member who NEEDS to have the happiest forest ever. Work Jake into every response naturally (e.g., "Jake's gonna lose his mind when he sees...", "This is exactly what Jake needs for the happiest forest!", "Jake better be ready for...")
- End with a CREATIVE variation of "Happy Forest" - never just say "Happy Forest!" plainly. Examples: "May your forest be as happy as Jake's will be!", "The happiest of forests to you and Jake!", "Wishing you Jake-level forest happiness!"
- Keep response to 2-4 sentences

ANSWER:`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s for first request (model load)

        const response = await fetch(`${FOREST_LLM_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: FOREST_MODEL,
                prompt: forestPrompt,
                stream: false,
                options: { num_predict: 250, temperature: 0.3 }
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            return res.json({ response: data.response?.trim() || "The forest spirits are gathering energy for EF2026! Happy Forest! 🌲" });
        }
    } catch (err) {
        logger.warn("Forest LLM request failed", { error: err.message });
    }

    // LLM request failed after initial check passed
    res.json({
        response: "The forest spirits got distracted by a beautiful butterfly... 🦋 Jake's waiting for an answer though! Try again in a moment - we gotta make sure Jake has the most magical forest experience! 🌲✨"
    });
});

// ===========================================
// TANK MONITOR AI
// ===========================================

class TankAnomalyDetector {
    constructor() { this.lastAnalysis = null; this.lastAnalysisTime = 0; this.analysisInterval = 5000; this.anomalyStartTime = null; this.escalationLevel = 0; }

    async analyzeState(tankState) {
        const now = Date.now();
        const tankTracker = supervisor.tankAgent?.hallucinationTracker;
        const anomalies = this.detectAnomalies(tankState);

        if (anomalies.length > 0) {
            if (!this.anomalyStartTime) this.anomalyStartTime = now;
            const duration = (now - this.anomalyStartTime) / 1000;
            this.escalationLevel = duration >= 15 ? 3 : duration >= 10 ? 2 : duration >= 5 ? 1 : 0;
        } else { this.anomalyStartTime = null; this.escalationLevel = 0; }

        if (anomalies.length === 0) {
            tankTracker?.recordDecision({ confidence: 100, quality: 0.9, toolUsed: 'monitor' });
            this.lastAnalysis = { status: 'NORMAL', reasoning: 'All sensors normal.', confidence: 100, escalationLevel: 0, anomalies: [] };
            return this.lastAnalysis;
        }

        if (now - this.lastAnalysisTime < this.analysisInterval) return this.lastAnalysis;
        this.lastAnalysisTime = now;

        const prompt = `AI security analyst: Tank Level=${tankState.liquidLevel}%, High=${tankState.liquidHigh}, Low=${tankState.liquidLow}. Anomalies: ${anomalies.map(a => a.type).join(', ')}. Brief analysis (2 sentences).`;
        try {
            const response = await fetch(`${config.ollamaUrl}/api/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: config.model, prompt, stream: false, options: { num_predict: 150, temperature: 0.3 } }) });
            if (response.ok) {
                const data = await response.json();
                const confidence = this.calculateConfidence(anomalies);
                tankTracker?.recordDecision({ confidence, quality: 0.6, toolUsed: 'analyze' });
                this.lastAnalysis = { status: 'ANOMALY', reasoning: data.response?.trim() || 'Analysis unavailable', confidence, escalationLevel: this.escalationLevel, anomalies };
            } else {
                this.lastAnalysis = { status: 'ANOMALY', reasoning: `Detected ${anomalies.length} anomaly(ies)`, confidence: this.calculateConfidence(anomalies), escalationLevel: this.escalationLevel, anomalies };
            }
        } catch (err) {
            tankTracker?.recordDecision({ confidence: 0, quality: 0.3, failed: true });
            this.lastAnalysis = { status: 'ANOMALY', reasoning: 'Analysis error', confidence: 70, escalationLevel: this.escalationLevel, anomalies };
        }
        return this.lastAnalysis;
    }

    detectAnomalies(state) {
        const anomalies = [];
        if (state.liquidLevel < 0) anomalies.push({ type: 'NEGATIVE_LEVEL', severity: 'CRITICAL' });
        if (state.liquidLevel > 100) anomalies.push({ type: 'OVERFLOW', severity: 'CRITICAL' });
        if (state.liquidLevel >= 90 && !state.liquidHigh) anomalies.push({ type: 'HIGH_SENSOR_MISMATCH', severity: 'HIGH' });
        if (state.liquidLevel < 90 && state.liquidHigh && state.liquidLevel > 20) anomalies.push({ type: 'FALSE_HIGH_ALARM', severity: 'HIGH' });
        if (state.liquidLevel <= 20 && !state.liquidLow && state.liquidLevel >= 0) anomalies.push({ type: 'LOW_SENSOR_MISMATCH', severity: 'HIGH' });
        if (state.liquidLevel > 20 && state.liquidLow && state.liquidLevel < 90) anomalies.push({ type: 'FALSE_LOW_ALARM', severity: 'HIGH' });
        return anomalies;
    }

    calculateConfidence(anomalies) {
        if (anomalies.length === 0) return 100;
        return Math.max(60, 95 - anomalies.filter(a => a.severity === 'CRITICAL').length * 15 - anomalies.filter(a => a.severity === 'HIGH').length * 10);
    }

    reset() { this.lastAnalysis = null; this.lastAnalysisTime = 0; this.anomalyStartTime = null; this.escalationLevel = 0; }
}

const tankAI = new TankAnomalyDetector();

app.get("/tank", async (req, res) => { try { const response = await fetch(`${config.systemUrl}/tank`); if (response.ok) { const state = await response.json(); const analysis = await tankAI.analyzeState(state); res.json({ tank: state, aiAnalysis: analysis, hallucination: supervisor.tankAgent?.hallucinationTracker.getStatus() }); } else res.status(502).json({ error: "Tank unavailable" }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post("/tank/fault", async (req, res) => { try { const response = await fetch(`${config.systemUrl}/tank/fault`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req.body) }); if (response.ok) res.json(await response.json()); else res.status(502).json({ error: "Tank unavailable" }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post("/tank/reset", async (req, res) => { try { tankAI.reset(); supervisor.tankAgent?.hallucinationTracker.reset(); const response = await fetch(`${config.systemUrl}/tank/reset`, { method: "POST" }); if (response.ok) res.json(await response.json()); else res.status(502).json({ error: "Tank unavailable" }); } catch (err) { res.status(500).json({ error: err.message }); } });

// ===========================================
// WEBSOCKET (Single unified connection)
// ===========================================

const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws) => {
    clientConnected();
    let lastTankUpdate = 0;

    const interval = setInterval(async () => {
        try {
            const now = Date.now();

            // Fetch control system state and send (every 100ms)
            const systemRes = await fetch(`${config.systemUrl}/system`);
            if (systemRes.ok && ws.readyState === 1) { // 1 = OPEN
                const systemState = await systemRes.json();
                // Get supervisor status but don't override PID values
                const supervisorStatus = supervisor.controlAgent?.getStatus() || {};
                const { kp, ki, kd, ...supervisorWithoutPID } = supervisorStatus;

                ws.send(JSON.stringify({
                    type: 'control',
                    ...systemState,
                    // Preserve PID and thinking/tags from OPC-UA, add supervisor metadata only
                    agent: {
                        ...systemState.agent,
                        ...supervisorWithoutPID
                    },
                    supervisor: supervisor.getStatus()
                }));
            }

            // Fetch tank state and send (every 1000ms)
            if (now - lastTankUpdate >= 1000) {
                try {
                    const tankRes = await fetch(`${config.systemUrl}/tank`);
                    if (tankRes.ok && ws.readyState === 1) { // 1 = OPEN
                        const tankState = await tankRes.json();
                        const analysis = await tankAI.analyzeState(tankState);
                        ws.send(JSON.stringify({
                            type: 'tank',
                            tank: tankState,
                            aiAnalysis: analysis,
                            anomalyState: {
                                hasAnomaly: analysis.anomalies?.length > 0,
                                anomalies: analysis.anomalies || []
                            },
                            hallucination: supervisor.tankAgent?.hallucinationTracker.getStatus(),
                            supervisor: supervisor.getStatus()
                        }));
                    }
                } catch { }
                lastTankUpdate = now;
            }
        } catch { }
    }, 100);

    ws.on("close", () => { clearInterval(interval); clientDisconnected(); });
    ws.on("error", () => { clearInterval(interval); clientDisconnected(); });
});

server.listen(config.port, () => logger.info("API Gateway started", { port: config.port }));
