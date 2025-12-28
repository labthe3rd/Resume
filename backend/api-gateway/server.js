import express from "express";
import cors from "cors";
import helmet from "helmet";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { createLogger, format, transports } from "winston";

const logger = createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: format.combine(format.timestamp(), format.json()),
    transports: [new transports.Console()],
});

const config = {
    port: parseInt(process.env.PORT) || 3000,
    ollamaUrl: process.env.OLLAMA_URL || "http://ollama:11434",
    systemUrl: process.env.SYSTEM_URL || "http://opcua-server:8080",
    model: process.env.LLM_MODEL || "llama3.2",
};

const app = express();
const server = createServer(app);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// ===========================================
// AI CONTROL AGENT WITH TOOL CALLING
// ===========================================

// Tool definitions for Ollama
const AI_TOOLS = [
    {
        type: "function",
        function: {
            name: "adjust_pid",
            description: "Adjust PID controller parameters to improve system stability",
            parameters: {
                type: "object",
                properties: {
                    kp: { type: "number", description: "Proportional gain (0.1-10)" },
                    ki: { type: "number", description: "Integral gain (0.01-1)" },
                    kd: { type: "number", description: "Derivative gain (0.1-5)" },
                    reason: { type: "string", description: "Reason for adjustment" }
                },
                required: ["reason"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "change_setpoint",
            description: "Change the target setpoint value",
            parameters: {
                type: "object",
                properties: {
                    value: { type: "number", description: "New setpoint (0-100)" },
                    reason: { type: "string", description: "Reason for change" }
                },
                required: ["value", "reason"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "report_status",
            description: "Report current analysis without making changes",
            parameters: {
                type: "object",
                properties: {
                    analysis: { type: "string", description: "System analysis" },
                    confidence: { type: "number", description: "Confidence level 0-100" }
                },
                required: ["analysis", "confidence"]
            }
        }
    }
];

class HallucinationTracker {
    constructor() {
        this.decisions = [];
        this.maxDecisions = 100;
        this.riskThreshold = 0.7; // 70% risk triggers failover
        this.warningThreshold = 0.5; // 50% risk triggers warning
    }

    recordDecision(decision) {
        this.decisions.push({
            timestamp: Date.now(),
            quality: 0.5, // Default quality
            confidence: 50, // Default confidence
            ...decision
        });
        if (this.decisions.length > this.maxDecisions) {
            this.decisions.shift();
        }
    }

    // Track error history for oscillation detection
    recordError(error) {
        if (!this.errorHistory) this.errorHistory = [];
        this.errorHistory.push(error);
        if (this.errorHistory.length > 50) this.errorHistory.shift();
    }

    // Calculate oscillation score (0 = smooth, 1 = highly oscillating)
    calculateOscillation() {
        if (!this.errorHistory || this.errorHistory.length < 10) return 0;
        
        const recent = this.errorHistory.slice(-20);
        let directionChanges = 0;
        let prevDelta = 0;
        
        for (let i = 1; i < recent.length; i++) {
            const delta = recent[i] - recent[i-1];
            if (prevDelta !== 0 && Math.sign(delta) !== Math.sign(prevDelta)) {
                directionChanges++;
            }
            prevDelta = delta;
        }
        
        // Normalize: more direction changes = more oscillation
        const oscillation = Math.min(1, directionChanges / (recent.length * 0.5));
        return oscillation;
    }

    // Calculate smoothness score (1 = perfectly smooth following setpoint, 0 = chaotic)
    calculateSmoothness() {
        if (!this.errorHistory || this.errorHistory.length < 10) return 1;
        
        const recent = this.errorHistory.slice(-20);
        const avgError = recent.reduce((s, e) => s + Math.abs(e), 0) / recent.length;
        const variance = recent.reduce((s, e) => s + Math.pow(e - avgError, 2), 0) / recent.length;
        const stdDev = Math.sqrt(variance);
        
        // Lower stdDev and avgError = smoother
        const smoothness = Math.max(0, 1 - (stdDev / 20) - (avgError / 50));
        return smoothness;
    }

    // Evaluate if a decision was good or bad based on error change AND oscillation
    evaluateDecision(errorBefore, errorAfter, confidence) {
        // Ensure inputs are valid numbers
        const errBefore = typeof errorBefore === 'number' && !isNaN(errorBefore) ? errorBefore : 0;
        const errAfter = typeof errorAfter === 'number' && !isNaN(errorAfter) ? errorAfter : 0;
        const conf = typeof confidence === 'number' && !isNaN(confidence) ? Math.max(0, Math.min(100, confidence)) : 50;
        
        const errorImproved = Math.abs(errAfter) < Math.abs(errBefore);
        const errorWorsened = Math.abs(errAfter) > Math.abs(errBefore) * 1.2;
        
        // Get oscillation and smoothness scores
        const oscillation = this.calculateOscillation();
        const smoothness = this.calculateSmoothness();
        
        // Base quality on error improvement
        let quality = 0.5;
        if (errorImproved) quality = 0.7 + (conf / 500);
        if (errorWorsened) quality = 0.3 - ((100 - conf) / 500);
        
        // BONUS for smoothness (up to +0.2)
        quality += smoothness * 0.2;
        
        // PENALTY for oscillation (up to -0.3)
        quality -= oscillation * 0.3;
        
        // Clamp quality to valid range
        quality = Math.max(0, Math.min(1, quality));
        
        return {
            quality,
            errorImproved,
            errorWorsened,
            errorDelta: errAfter - errBefore,
            oscillation,
            smoothness
        };
    }

    // Calculate hallucination risk score (0-1, higher = more risk)
    calculateRisk() {
        if (this.decisions.length < 5) return 0; // Not enough data

        const recentDecisions = this.decisions.slice(-20);
        
        // Factor 1: Bad decision ratio
        const badDecisions = recentDecisions.filter(d => d.quality < 0.4).length;
        const badRatio = badDecisions / recentDecisions.length;

        // Factor 2: Low confidence trend
        const avgConfidence = recentDecisions.reduce((s, d) => s + (d.confidence || 50), 0) / recentDecisions.length;
        const confidenceFactor = (100 - avgConfidence) / 100;

        // Factor 3: Erratic PID changes
        const pidChanges = recentDecisions.filter(d => d.pidChanged).length;
        const erraticFactor = pidChanges > recentDecisions.length * 0.5 ? 0.3 : 0;

        // Factor 4: Consecutive bad decisions
        let consecutiveBad = 0;
        for (let i = recentDecisions.length - 1; i >= 0; i--) {
            if (recentDecisions[i].quality < 0.4) consecutiveBad++;
            else break;
        }
        const consecutiveFactor = Math.min(consecutiveBad * 0.1, 0.4);

        // Factor 5: Error trend (is error getting worse over time?)
        const errorTrend = this.calculateErrorTrend(recentDecisions);

        const risk = Math.min(1, (badRatio * 0.3) + (confidenceFactor * 0.2) + erraticFactor + consecutiveFactor + (errorTrend * 0.2));
        
        return risk;
    }

    calculateErrorTrend(decisions) {
        if (decisions.length < 5) return 0;
        
        const firstHalf = decisions.slice(0, Math.floor(decisions.length / 2));
        const secondHalf = decisions.slice(Math.floor(decisions.length / 2));
        
        const avgFirst = firstHalf.reduce((s, d) => s + Math.abs(d.errorAfter || 0), 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((s, d) => s + Math.abs(d.errorAfter || 0), 0) / secondHalf.length;
        
        if (avgSecond > avgFirst * 1.5) return 0.5; // Error increasing significantly
        if (avgSecond > avgFirst * 1.2) return 0.3; // Error increasing
        return 0;
    }

    getStatus() {
        const risk = this.calculateRisk();
        const recentDecisions = this.decisions.slice(-10);
        
        // Safely calculate quality, defaulting undefined to 0.5
        let recentQuality = 100;
        if (recentDecisions.length > 0) {
            const validDecisions = recentDecisions.filter(d => typeof d.quality === 'number' && !isNaN(d.quality));
            if (validDecisions.length > 0) {
                const avgQuality = validDecisions.reduce((s, d) => s + d.quality, 0) / validDecisions.length;
                recentQuality = Math.round(Math.max(0, Math.min(100, avgQuality * 100)));
            }
        }
        
        return {
            risk: Math.round(Math.max(0, Math.min(100, risk * 100))),
            riskLevel: risk >= this.riskThreshold ? "CRITICAL" : 
                       risk >= this.warningThreshold ? "WARNING" : "NORMAL",
            totalDecisions: this.decisions.length,
            recentQuality,
            consecutiveBadDecisions: this.getConsecutiveBad(),
            shouldFailover: risk >= this.riskThreshold,
            oscillation: Math.round(this.calculateOscillation() * 100),
            smoothness: Math.round(this.calculateSmoothness() * 100)
        };
    }

    getConsecutiveBad() {
        let count = 0;
        for (let i = this.decisions.length - 1; i >= 0; i--) {
            if (this.decisions[i].quality < 0.4) count++;
            else break;
        }
        return count;
    }

    reset() {
        this.decisions = [];
        this.errorHistory = [];
        logger.info("Hallucination tracker reset");
    }
}

class AIControlAgent {
    constructor(instanceId = 1) {
        this.instanceId = instanceId;
        this.active = true;
        this.lastState = null;
        this.lastAction = null;
        this.actionHistory = [];
        this.maxHistory = 50;
        
        // PID parameters - START BAD so AI must tune them!
        // Good values would be ~2.0, 0.1, 0.5
        // We start weak so AI has room to improve
        this.kp = 0.5;   // Too low - slow response
        this.ki = 0.02;  // Too low - steady state error
        this.kd = 0.1;   // Too low - oscillations
        
        // PID state
        this.integral = 0;
        this.lastError = 0;
        
        // AI reasoning
        this.reasoningInterval = 3000; // Every 3 seconds for faster tuning
        this.lastReasoning = 0;
        this.lastReasoning_result = null;
        
        // User instructions
        this.userInstructions = "";
        this.targetSetpoint = null;
        
        // Hallucination tracking
        this.hallucinationTracker = new HallucinationTracker();
        this.lastErrorForEval = null;
        
        // Tool call history
        this.toolCalls = [];
        
        logger.info("AI Agent initialized", { instanceId });
    }

    async computeControl(state) {
        if (!this.active) return null;

        const error = state.setpoint - state.processValue;
        
        // Record error for oscillation tracking
        this.hallucinationTracker.recordError(error);
        
        // PID calculation
        this.integral += error * 0.1;
        this.integral = Math.max(-50, Math.min(50, this.integral));
        
        const derivative = (error - this.lastError) / 0.1;
        this.lastError = error;
        
        let controlOutput = 50 + (this.kp * error) + (this.ki * this.integral) + (this.kd * derivative);
        controlOutput = Math.max(0, Math.min(100, controlOutput));
        
        this.lastAction = {
            timestamp: Date.now(),
            error,
            controlOutput,
            state: { ...state },
        };
        
        this.actionHistory.push(this.lastAction);
        if (this.actionHistory.length > this.maxHistory) {
            this.actionHistory.shift();
        }
        
        return controlOutput;
    }

    async reason(state) {
        const now = Date.now();
        if (now - this.lastReasoning < this.reasoningInterval) {
            return null;
        }
        this.lastReasoning = now;

        // Evaluate previous decision if we have data
        if (this.lastErrorForEval !== null) {
            const evaluation = this.hallucinationTracker.evaluateDecision(
                this.lastErrorForEval,
                state.error,
                this.lastConfidence || 50
            );
            
            const lastDecision = this.hallucinationTracker.decisions[this.hallucinationTracker.decisions.length - 1];
            if (lastDecision) {
                lastDecision.quality = evaluation.quality;
                lastDecision.errorAfter = state.error;
                lastDecision.errorImproved = evaluation.errorImproved;
            }
        }
        
        this.lastErrorForEval = state.error;

        const recentHistory = this.actionHistory.slice(-10);
        const avgError = recentHistory.length > 0 
            ? recentHistory.reduce((sum, a) => sum + Math.abs(a.error), 0) / recentHistory.length 
            : 0;
        
        const riskStatus = this.hallucinationTracker.getStatus();
        
        // Determine if system needs tuning
        const needsTuning = state.stability !== "STABLE" || Math.abs(avgError) > 2;
        
        // Get oscillation and smoothness metrics
        const oscillation = this.hallucinationTracker.calculateOscillation();
        const smoothness = this.hallucinationTracker.calculateSmoothness();

        const prompt = `You are an AI PID controller tuning agent. Your PRIMARY GOAL is a SMOOTH line that follows the setpoint exactly.

CURRENT METRICS:
- Process Value: ${state.processValue.toFixed(2)}
- Setpoint: ${state.setpoint}
- Error: ${state.error.toFixed(2)} (GOAL: < 0.5)
- Stability: ${state.stability} (GOAL: STABLE)
- Avg Error: ${avgError.toFixed(2)}
- Oscillation: ${(oscillation * 100).toFixed(0)}% (GOAL: 0% - lower is better)
- Smoothness: ${(smoothness * 100).toFixed(0)}% (GOAL: 100% - higher is better)

CURRENT PID: Kp=${this.kp.toFixed(2)}, Ki=${this.ki.toFixed(3)}, Kd=${this.kd.toFixed(2)}

${this.userInstructions ? `USER INSTRUCTION: "${this.userInstructions}"` : ""}
${this.targetSetpoint !== null ? `CHANGE SETPOINT TO: ${this.targetSetpoint}` : ""}

PID TUNING GUIDE - ALL THREE MATTER:
1. Kp (Proportional, ${this.kp.toFixed(2)}): Controls response speed
   - Too LOW: Slow response, steady-state error → INCREASE
   - Too HIGH: Overshoot, oscillation → DECREASE
   - Good range: 1.0-4.0

2. Ki (Integral, ${this.ki.toFixed(3)}): Eliminates steady-state error
   - Too LOW: Persistent error → INCREASE slowly
   - Too HIGH: Integral windup, oscillation → DECREASE
   - Good range: 0.05-0.3

3. Kd (Derivative, ${this.kd.toFixed(2)}): Dampens oscillation
   - Too LOW: Overshoot, oscillation → INCREASE
   - Too HIGH: Sluggish, noise sensitive → DECREASE
   - Good range: 0.3-2.0

CURRENT DIAGNOSIS:
${oscillation > 0.3 ? "- HIGH OSCILLATION: Increase Kd OR decrease Kp" : ""}
${smoothness < 0.5 ? "- LOW SMOOTHNESS: Balance all three parameters" : ""}
${Math.abs(avgError) > 5 ? "- HIGH ERROR: Increase Kp or Ki" : ""}
${state.stability === "STABLE" && smoothness > 0.7 ? "- GOOD: Minor tuning only" : ""}

${needsTuning ? "ACTION NEEDED: Adjust PID parameters. Change AT LEAST Kp or Ki, not just Kd." : "System OK. Monitor or fine-tune."}

Respond ONLY with valid JSON:
{
  "action": "tune" or "setpoint" or "monitor",
  "analysis": "brief reason for changes",
  "kp": number between 0.5-10,
  "ki": number between 0.01-1,
  "kd": number between 0.1-5,
  "newSetpoint": null or number,
  "confidence": 0-100
}`;

        try {
            logger.info("AI reasoning: calling Ollama", { 
                model: config.model, 
                url: config.ollamaUrl,
                stability: state.stability,
                error: state.error.toFixed(2)
            });
            
            const response = await fetch(`${config.ollamaUrl}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: config.model,
                    prompt,
                    stream: false,
                    format: "json",
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error("Ollama reasoning error", { status: response.status, body: errorText });
                throw new Error(`Ollama error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            logger.info("AI reasoning: got response", { responseLength: data.response?.length });
            
            let reasoning;
            
            try {
                // Clean up response - remove any markdown
                let cleanResponse = data.response.trim();
                if (cleanResponse.startsWith("```")) {
                    cleanResponse = cleanResponse.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
                }
                reasoning = JSON.parse(cleanResponse);
            } catch (parseErr) {
                logger.warn("Failed to parse AI response", { response: data.response });
                throw parseErr;
            }
            
            let pidChanged = false;
            let toolUsed = reasoning.action || "monitor";
            let confidence = reasoning.confidence || 50;

            // Apply PID changes if action is tune
            if (reasoning.action === "tune" || reasoning.action === "adjust") {
                const oldPid = { kp: this.kp, ki: this.ki, kd: this.kd };
                
                if (reasoning.kp !== undefined && reasoning.kp !== this.kp) {
                    this.kp = Math.max(0.1, Math.min(10, reasoning.kp));
                    pidChanged = true;
                }
                if (reasoning.ki !== undefined && reasoning.ki !== this.ki) {
                    this.ki = Math.max(0.01, Math.min(1, reasoning.ki));
                    pidChanged = true;
                }
                if (reasoning.kd !== undefined && reasoning.kd !== this.kd) {
                    this.kd = Math.max(0.1, Math.min(5, reasoning.kd));
                    pidChanged = true;
                }
                
                if (pidChanged) {
                    logger.info("AI adjusted PID", { 
                        old: oldPid, 
                        new: { kp: this.kp, ki: this.ki, kd: this.kd },
                        reason: reasoning.analysis 
                    });
                }
            }

            // Apply setpoint change
            if (reasoning.action === "setpoint" && reasoning.newSetpoint !== null && reasoning.newSetpoint !== undefined) {
                await this.changeSetpoint(reasoning.newSetpoint);
                toolUsed = "setpoint";
            }
            
            // Handle user setpoint request
            if (this.targetSetpoint !== null) {
                await this.changeSetpoint(this.targetSetpoint);
                this.targetSetpoint = null;
                toolUsed = "setpoint";
            }

            // Record decision
            this.hallucinationTracker.recordDecision({
                errorBefore: state.error,
                confidence,
                pidChanged,
                toolUsed,
                kp: this.kp,
                ki: this.ki,
                kd: this.kd
            });

            this.lastConfidence = confidence;
            
            // Store reasoning for display
            this.lastReasoning_result = {
                action: toolUsed,
                analysis: reasoning.analysis,
                pidChanged,
                confidence
            };

            logger.info("AI Reasoning", { 
                action: toolUsed,
                pidChanged,
                confidence, 
                stability: state.stability,
                error: state.error.toFixed(2),
                analysis: reasoning.analysis
            });

            return { toolUsed, confidence, riskStatus, reasoning };
        } catch (err) {
            logger.error("AI reasoning failed", { error: err.message });
            
            this.hallucinationTracker.recordDecision({
                errorBefore: state.error,
                confidence: 0,
                failed: true,
                quality: 0.3
            });
            
            return null;
        }
    }

    async executeTool(toolCall, state) {
        const { name, arguments: args } = toolCall.function;
        let parsedArgs = args;
        
        if (typeof args === "string") {
            try {
                parsedArgs = JSON.parse(args);
            } catch {
                parsedArgs = {};
            }
        }

        logger.info("Executing tool", { name, args: parsedArgs });

        switch (name) {
            case "adjust_pid":
                const oldPid = { kp: this.kp, ki: this.ki, kd: this.kd };
                
                if (parsedArgs.kp !== undefined) {
                    this.kp = Math.max(0.1, Math.min(10, parsedArgs.kp));
                }
                if (parsedArgs.ki !== undefined) {
                    this.ki = Math.max(0.01, Math.min(1, parsedArgs.ki));
                }
                if (parsedArgs.kd !== undefined) {
                    this.kd = Math.max(0.1, Math.min(5, parsedArgs.kd));
                }
                
                logger.info("PID adjusted", { 
                    old: oldPid, 
                    new: { kp: this.kp, ki: this.ki, kd: this.kd },
                    reason: parsedArgs.reason 
                });
                
                return { pidChanged: true, reason: parsedArgs.reason };

            case "change_setpoint":
                const value = Math.max(0, Math.min(100, parsedArgs.value));
                await this.changeSetpoint(value);
                return { setpointChanged: true, newSetpoint: value, reason: parsedArgs.reason };

            case "report_status":
                return { 
                    confidence: parsedArgs.confidence || 50, 
                    analysis: parsedArgs.analysis 
                };

            default:
                logger.warn("Unknown tool", { name });
                return { error: "Unknown tool" };
        }
    }

    async changeSetpoint(value) {
        try {
            await fetch(`${config.systemUrl}/system/setpoint`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ setpoint: value }),
            });
            logger.info("Setpoint changed by agent", { value, instanceId: this.instanceId });
        } catch (err) {
            logger.error("Failed to change setpoint", { error: err.message });
        }
    }

    setUserInstructions(instructions) {
        this.userInstructions = instructions;
        
        const match = instructions.match(/(\d+)/);
        if (match && (instructions.toLowerCase().includes("setpoint") || 
            instructions.toLowerCase().includes("target") ||
            instructions.toLowerCase().includes("stabilize at") ||
            instructions.toLowerCase().includes("value"))) {
            this.targetSetpoint = parseFloat(match[1]);
            logger.info("Parsed target setpoint", { target: this.targetSetpoint });
        }
    }

    toggle(active) {
        this.active = active;
        if (!active) {
            this.integral = 0;
            this.lastError = 0;
        }
    }

    getStatus() {
        const riskStatus = this.hallucinationTracker.getStatus();
        
        return {
            instanceId: this.instanceId,
            active: this.active,
            kp: this.kp,
            ki: this.ki,
            kd: this.kd,
            integral: this.integral,
            lastError: this.lastError,
            userInstructions: this.userInstructions,
            targetSetpoint: this.targetSetpoint,
            actionCount: this.actionHistory.length,
            hallucination: riskStatus,
            recentToolCalls: this.toolCalls.slice(-5),
            lastAction: this.lastReasoning_result
        };
    }

    // Reset agent state (for failover)
    softReset() {
        this.integral = 0;
        this.lastError = 0;
        this.hallucinationTracker.reset();
        this.toolCalls = [];
        logger.info("Agent soft reset", { instanceId: this.instanceId });
    }
}

// ===========================================
// AGENT SUPERVISOR (Failover Management)
// ===========================================

class AgentSupervisor {
    constructor() {
        this.currentAgent = null;
        this.instanceCounter = 0;
        this.failoverHistory = [];
        this.checkInterval = 5000; // Check every 5 seconds
        this.lastCheck = 0;
    }

    createAgent() {
        this.instanceCounter++;
        const agent = new AIControlAgent(this.instanceCounter);
        logger.info("New agent created", { instanceId: this.instanceCounter });
        return agent;
    }

    async checkAndFailover() {
        const now = Date.now();
        if (now - this.lastCheck < this.checkInterval) return;
        this.lastCheck = now;

        if (!this.currentAgent) return;

        const status = this.currentAgent.hallucinationTracker.getStatus();
        
        if (status.shouldFailover) {
            logger.warn("Failover triggered!", { 
                risk: status.risk, 
                oldInstance: this.currentAgent.instanceId 
            });
            
            // Record failover
            this.failoverHistory.push({
                timestamp: Date.now(),
                fromInstance: this.currentAgent.instanceId,
                reason: `Risk level ${status.risk}%`,
                riskLevel: status.riskLevel
            });

            // Create new agent with fresh state
            const newAgent = this.createAgent();
            
            // Transfer essential state (but not the bad decisions or PID - start fresh)
            newAgent.userInstructions = this.currentAgent.userInstructions;
            newAgent.targetSetpoint = this.currentAgent.targetSetpoint;
            newAgent.active = this.currentAgent.active;

            // Swap agents
            this.currentAgent = newAgent;
            
            logger.info("Failover complete", { newInstance: newAgent.instanceId });
            
            return true;
        }
        
        return false;
    }

    getStatus() {
        return {
            currentInstance: this.currentAgent?.instanceId,
            totalInstances: this.instanceCounter,
            failoverCount: this.failoverHistory.length,
            recentFailovers: this.failoverHistory.slice(-5)
        };
    }
}

const supervisor = new AgentSupervisor();
const agent = supervisor.currentAgent = supervisor.createAgent();

// ===========================================
// CLIENT-AWARE CONTROL LOOP
// ===========================================

let controlLoopInterval = null;
let connectedClients = 0;

async function controlLoop() {
    try {
        // Check for failover
        await supervisor.checkAndFailover();
        
        // Get current agent from supervisor
        const currentAgent = supervisor.currentAgent;
        if (!currentAgent) return;
        
        // Get current system state
        const res = await fetch(`${config.systemUrl}/system`);
        if (!res.ok) return;
        
        const state = await res.json();
        
        // Compute control action
        const controlOutput = await currentAgent.computeControl(state);
        
        if (controlOutput !== null && currentAgent.active) {
            // Apply control
            await fetch(`${config.systemUrl}/system/control`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ controlOutput }),
            });
        }
        
        // Periodic AI reasoning
        await currentAgent.reason(state);
        
    } catch (err) {
        // System might not be ready yet
    }
}

function startControlLoop() {
    if (controlLoopInterval) return;
    logger.info("Control loop started - clients connected");
    controlLoopInterval = setInterval(controlLoop, 100);
    
    // Notify opcua-server to start simulation
    fetch(`${config.systemUrl}/simulation/start`, { method: "POST" }).catch(() => {});
}

function stopControlLoop() {
    if (controlLoopInterval) {
        clearInterval(controlLoopInterval);
        controlLoopInterval = null;
        logger.info("Control loop paused - no clients connected");
        
        // Notify opcua-server to stop simulation
        fetch(`${config.systemUrl}/simulation/stop`, { method: "POST" }).catch(() => {});
    }
}

function clientConnected() {
    connectedClients++;
    if (connectedClients === 1) {
        startControlLoop();
    }
    logger.info("Client connected", { total: connectedClients });
}

function clientDisconnected() {
    connectedClients = Math.max(0, connectedClients - 1);
    if (connectedClients === 0) {
        stopControlLoop();
    }
    logger.info("Client disconnected", { total: connectedClients });
}

// ===========================================
// API ENDPOINTS
// ===========================================

app.get("/health", (req, res) => {
    res.json({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        controlLoop: controlLoopInterval ? "running" : "paused",
        clients: connectedClients,
        supervisor: supervisor.getStatus()
    });
});

// Comprehensive diagnostics
app.get("/diagnostics", async (req, res) => {
    const results = {
        timestamp: new Date().toISOString(),
        services: {}
    };
    
    // Check OPC-UA server
    try {
        const opcuaRes = await fetch(`${config.systemUrl}/system`);
        results.services.opcuaServer = {
            status: opcuaRes.ok ? "healthy" : "error",
            url: config.systemUrl
        };
    } catch (err) {
        results.services.opcuaServer = { status: "down", error: err.message };
    }
    
    // Check Ollama
    try {
        const ollamaRes = await fetch(`${config.ollamaUrl}/api/tags`);
        if (ollamaRes.ok) {
            const data = await ollamaRes.json();
            const models = data.models || [];
            const hasModel = models.some(m => m.name.includes(config.model));
            results.services.ollama = {
                status: hasModel ? "healthy" : "missing_model",
                url: config.ollamaUrl,
                requiredModel: config.model,
                availableModels: models.map(m => m.name),
                fix: hasModel ? null : `docker exec ollama ollama pull ${config.model}`
            };
        } else {
            results.services.ollama = { status: "error", code: ollamaRes.status };
        }
    } catch (err) {
        results.services.ollama = { 
            status: "down", 
            error: err.message,
            fix: "docker logs ollama"
        };
    }
    
    // Agent status
    results.agent = {
        instanceId: supervisor.currentAgent?.instanceId,
        active: supervisor.currentAgent?.active,
        pid: {
            kp: supervisor.currentAgent?.kp,
            ki: supervisor.currentAgent?.ki,
            kd: supervisor.currentAgent?.kd
        },
        lastAction: supervisor.currentAgent?.lastReasoning_result
    };
    
    results.controlLoop = controlLoopInterval ? "running" : "paused";
    results.clients = connectedClients;
    
    res.json(results);
});

// Supervisor status
app.get("/supervisor", (req, res) => {
    res.json(supervisor.getStatus());
});

// Force failover (for testing)
app.post("/supervisor/failover", (req, res) => {
    const oldInstance = supervisor.currentAgent?.instanceId;
    const newAgent = supervisor.createAgent();
    
    // Transfer state
    if (supervisor.currentAgent) {
        newAgent.userInstructions = supervisor.currentAgent.userInstructions;
        newAgent.targetSetpoint = supervisor.currentAgent.targetSetpoint;
        newAgent.active = supervisor.currentAgent.active;
    }
    
    supervisor.currentAgent = newAgent;
    supervisor.failoverHistory.push({
        timestamp: Date.now(),
        fromInstance: oldInstance,
        reason: "Manual failover",
        riskLevel: "MANUAL"
    });
    
    res.json({ 
        message: "Failover complete",
        oldInstance,
        newInstance: newAgent.instanceId,
        supervisor: supervisor.getStatus()
    });
});

// Reset hallucination tracker
app.post("/supervisor/reset-tracker", (req, res) => {
    if (supervisor.currentAgent) {
        supervisor.currentAgent.hallucinationTracker.reset();
    }
    res.json({ 
        message: "Tracker reset",
        supervisor: supervisor.getStatus()
    });
});

// Proxy system state
app.get("/system", async (req, res) => {
    try {
        const response = await fetch(`${config.systemUrl}/system`);
        const state = await response.json();
        res.json({
            ...state,
            agent: supervisor.currentAgent?.getStatus() || {},
            supervisor: supervisor.getStatus()
        });
    } catch (err) {
        res.status(503).json({ error: "System unavailable" });
    }
});

app.get("/system/history", async (req, res) => {
    try {
        const response = await fetch(`${config.systemUrl}/system/history`);
        const history = await response.json();
        res.json(history);
    } catch (err) {
        res.status(503).json({ error: "System unavailable" });
    }
});

// User controls
app.post("/user/instability", async (req, res) => {
    try {
        const { amount } = req.body;
        await fetch(`${config.systemUrl}/system/instability`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: amount || 0.1 }),
        });
        const response = await fetch(`${config.systemUrl}/system`);
        res.json(await response.json());
    } catch (err) {
        res.status(503).json({ error: "System unavailable" });
    }
});

app.post("/user/disturbance", async (req, res) => {
    try {
        const { amount } = req.body;
        await fetch(`${config.systemUrl}/system/disturbance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: amount || 20 }),
        });
        const response = await fetch(`${config.systemUrl}/system`);
        res.json(await response.json());
    } catch (err) {
        res.status(503).json({ error: "System unavailable" });
    }
});

app.post("/user/reset", async (req, res) => {
    try {
        await fetch(`${config.systemUrl}/system/reset`, { method: "POST" });
        if (supervisor.currentAgent) {
            supervisor.currentAgent.integral = 0;
            supervisor.currentAgent.lastError = 0;
            supervisor.currentAgent.userInstructions = "";
            supervisor.currentAgent.targetSetpoint = null;
            supervisor.currentAgent.hallucinationTracker.reset();
        }
        const response = await fetch(`${config.systemUrl}/system`);
        res.json(await response.json());
    } catch (err) {
        res.status(503).json({ error: "System unavailable" });
    }
});

// Natural language instructions to agent
app.post("/agent/instruct", async (req, res) => {
    const { instruction } = req.body;
    
    if (!instruction) {
        return res.status(400).json({ error: "Instruction required" });
    }

    supervisor.currentAgent.setUserInstructions(instruction);

    // Get immediate AI interpretation
    try {
        const prompt = `You are an AI control system agent. A user has given you this instruction:
"${instruction}"

Interpret this instruction and respond in JSON format:
{
    "understood": true/false,
    "interpretation": "What you understand the user wants",
    "targetSetpoint": number or null (if they specified a value to stabilize at),
    "action": "What you will do in response"
}`;

        const response = await fetch(`${config.ollamaUrl}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: config.model,
                prompt,
                stream: false,
                format: "json",
            }),
        });

        if (response.ok) {
            const data = await response.json();
            const interpretation = JSON.parse(data.response);
            
            if (interpretation.targetSetpoint !== null) {
                supervisor.currentAgent.targetSetpoint = interpretation.targetSetpoint;
            }
            
            res.json({
                success: true,
                instruction,
                interpretation,
                agentStatus: supervisor.currentAgent.getStatus(),
            });
        } else {
            res.json({
                success: true,
                instruction,
                interpretation: { understood: true, action: "Will process instruction" },
                agentStatus: supervisor.currentAgent.getStatus(),
            });
        }
    } catch (err) {
        res.json({
            success: true,
            instruction,
            interpretation: { understood: true, action: "Will process instruction" },
            agentStatus: supervisor.currentAgent.getStatus(),
        });
    }
});

// Toggle agent
app.post("/agent/toggle", (req, res) => {
    const { active } = req.body;
    supervisor.currentAgent.toggle(active);
    res.json({ agentStatus: supervisor.currentAgent.getStatus() });
});

// Reset PID to defaults (keeps learning history)
app.post("/agent/reset-pid", (req, res) => {
    if (supervisor.currentAgent) {
        supervisor.currentAgent.kp = 0.5;
        supervisor.currentAgent.ki = 0.02;
        supervisor.currentAgent.kd = 0.1;
        supervisor.currentAgent.integral = 0;
        supervisor.currentAgent.lastError = 0;
        // Keep hallucination tracker - preserves learning
        logger.info("PID reset to defaults (learning preserved)");
    }
    res.json({ 
        message: "PID reset to defaults",
        agentStatus: supervisor.currentAgent?.getStatus()
    });
});

// Get agent status
app.get("/agent/status", (req, res) => {
    res.json(supervisor.currentAgent.getStatus());
});

// Chat with reasoning model about the control system
app.post("/control/chat", async (req, res) => {
    const { message } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: "Message required" });
    }

    try {
        // Get current state for context
        const stateRes = await fetch(`${config.systemUrl}/system`);
        const state = await stateRes.json();

        const systemPrompt = `You are an AI assistant explaining an unstable control system demonstration.

Current System State:
- Process Value: ${state.processValue} (the actual value)
- Setpoint: ${state.setpoint} (the target value)
- Error: ${state.error} (difference from target)
- Stability: ${state.stability}
- Instability Rate: ${state.instabilityRate}
- Agent Active: ${supervisor.currentAgent.active}
- Agent PID: Kp=${supervisor.currentAgent.kp}, Ki=${supervisor.currentAgent.ki}, Kd=${supervisor.currentAgent.kd}

The system naturally drifts and oscillates. An AI agent uses PID control to stabilize it.
Users can increase instability, add disturbances, or tell the agent what setpoint to target.

Be helpful and explain control systems concepts when relevant.`;

        logger.info("Calling Ollama for chat", { model: config.model, url: config.ollamaUrl });
        
        const response = await fetch(`${config.ollamaUrl}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: config.model,
                system: systemPrompt,
                prompt: message,
                stream: false,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error("Ollama error response", { status: response.status, body: errorText });
            throw new Error(`Ollama error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        res.json({
            response: data.response,
            systemState: state,
            agentStatus: supervisor.currentAgent.getStatus(),
        });
    } catch (err) {
        logger.error("Chat error", { error: err.message });
        res.status(500).json({ 
            error: "Chat service unavailable", 
            details: err.message,
            hint: "Run: docker exec ollama ollama pull llama3.2"
        });
    }
});

// Ollama health check
app.get("/ollama/health", async (req, res) => {
    try {
        const response = await fetch(`${config.ollamaUrl}/api/tags`);
        if (!response.ok) {
            throw new Error(`Ollama responded with ${response.status}`);
        }
        const data = await response.json();
        const models = data.models || [];
        const hasRequiredModel = models.some(m => m.name.includes(config.model));
        
        res.json({
            status: "connected",
            url: config.ollamaUrl,
            requiredModel: config.model,
            hasModel: hasRequiredModel,
            availableModels: models.map(m => m.name),
            hint: hasRequiredModel ? null : `Run: docker exec ollama ollama pull ${config.model}`
        });
    } catch (err) {
        res.status(503).json({
            status: "disconnected",
            url: config.ollamaUrl,
            error: err.message,
            hint: "Check if Ollama container is running: docker logs ollama"
        });
    }
});

// ===========================================
// WEBSOCKET FOR REAL-TIME UPDATES
// ===========================================

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
    clientConnected();
    
    const interval = setInterval(async () => {
        try {
            const res = await fetch(`${config.systemUrl}/system`);
            if (res.ok && ws.readyState === ws.OPEN) {
                const state = await res.json();
                ws.send(JSON.stringify({
                    ...state,
                    agent: supervisor.currentAgent?.getStatus() || {},
                    supervisor: supervisor.getStatus()
                }));
            }
        } catch {
            // Ignore
        }
    }, 100);
    
    ws.on("close", () => {
        clearInterval(interval);
        clientDisconnected();
    });
    
    ws.on("error", () => {
        clearInterval(interval);
        clientDisconnected();
    });
});

// ===========================================
// START SERVER
// ===========================================

server.listen(config.port, () => {
    logger.info("API Gateway started", { port: config.port });
});
