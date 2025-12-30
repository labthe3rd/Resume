import {
    OPCUAServer,
    Variant,
    DataType,
    StatusCodes,
    nodesets,
    OPCUACertificateManager,
    MessageSecurityMode,
    SecurityPolicy,
} from "node-opcua";
import express from "express";
import cors from "cors";
import { createLogger, format, transports } from "winston";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { createServer } from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const logger = createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: format.combine(format.timestamp(), format.json()),
    transports: [new transports.Console()],
});

// ===========================================
// OVEN THERMAL SIMULATION
// ===========================================

class OvenThermalSystem {
    constructor() {
        // Process variables
        this.temperature = 20.0;           // Current oven temperature (°C)
        this.setpoint = 200.0;             // Target temperature (°C)
        this.heaterPower = 0.0;            // Heater output (0-100%)
        
        // Physical parameters
        this.baseHeatLoss = 0.25;          // Base heat loss (user controlled)
        this.disturbance = 0.0;            // Temporary disturbance (decays over time)
        this.heatLoss = 0.25;              // Effective heat loss = base + disturbance
        this.heaterEfficiency = 100.0;     // How effective the heater is (allows up to 420°C)
        this.ambientTemp = 20.0;           // Room temperature
        this.thermalMass = 0.5;            // Thermal inertia (lower = faster response)
        
        // PID controller state (initially poorly tuned)
        this.kp = 0.3;                     // Proportional gain (weak)
        this.ki = 0.01;                    // Integral gain (weak)
        this.kd = 0.05;                    // Derivative gain (weak)
        this.integral = 0.0;               // Integral accumulator
        this.lastError = 0.0;              // For derivative calculation
        
        // AI tuning state
        this.aiActive = true;
        this.aiLastTuneTime = Date.now();
        this.aiTuneThreshold = 0.25;       // Tune until within 0.25°C of setpoint
        this.aiThinking = 'System starting - monitoring for instability';
        this.aiTags = ['startup', 'monitoring'];
        this.lastTuneError = 0.0;          // Track error from last tune to detect overshoots
        this.errorHistory = [];            // Track recent errors to detect oscillations
        
        // Simulation timing
        this.dt = 0.1;                     // Time step (seconds)
        this.tick = 0;
        this.lastUpdate = Date.now();
        
        // History
        this.history = [];
        this.maxHistory = 100;

        // External control (from API gateway)
        this.externalControl = true;         // Use external heater power from API gateway
        this.externalHeaterPower = 0.0;      // Heater power from external controller
        this.lastExternalUpdate = Date.now();
    }

    setExternalHeaterPower(value) {
        this.externalHeaterPower = Math.max(0, Math.min(100, value));
        this.lastExternalUpdate = Date.now();
    }

    // Thermal dynamics simulation (no randomness, purely deterministic)
    update() {
        const now = Date.now();
        const dt = (now - this.lastUpdate) / 1000.0;
        this.lastUpdate = now;
        this.tick++;

        // Decay disturbance back to zero (half-life ~3 seconds)
        if (this.disturbance > 0.001) {
            this.disturbance *= Math.exp(-dt * 0.3);  // Exponential decay
            this.heatLoss = this.baseHeatLoss + this.disturbance;
        } else if (this.disturbance > 0) {
            this.disturbance = 0;
            this.heatLoss = this.baseHeatLoss;
        }

        // Calculate PID control output
        const error = this.setpoint - this.temperature;
        
        // Proportional term
        const pTerm = this.kp * error;
        
        // Integral term with anti-windup
        this.integral += error * dt;
        this.integral = Math.max(-100, Math.min(100, this.integral));
        const iTerm = this.ki * this.integral;

        // Derivative term
        const dError = dt > 0 ? (error - this.lastError) / dt : 0;
        const dTerm = this.kd * dError;
        
        // PID output
        let pidOutput = pTerm + iTerm + dTerm;
        pidOutput = Math.max(0, Math.min(100, pidOutput));

        // Use external control if enabled and receiving commands, otherwise use internal PID
        if (this.externalControl && (now - this.lastExternalUpdate) < 2000) {
            this.heaterPower = this.externalHeaterPower;
        } else {
            this.heaterPower = pidOutput;
        }
        this.lastError = error;

        // Thermal physics
        // Heat input from heater
        const heatIn = (this.heaterPower / 100.0) * this.heaterEfficiency;
        
        // Heat loss to environment (proportional to temperature difference)
        const tempDiff = this.temperature - this.ambientTemp;
        const heatOut = this.heatLoss * tempDiff;
        
        // Net heat change
        const netHeat = heatIn - heatOut;
        
        // Temperature change (dT/dt = netHeat / thermalMass)
        const dTemp = netHeat * dt / this.thermalMass;
        this.temperature += dTemp;
        
        // Clamp temperature to physical bounds
        this.temperature = Math.max(0, Math.min(500, this.temperature));

        // Record history
        this.history.push({
            timestamp: now,
            temperature: this.temperature,
            setpoint: this.setpoint,
            heaterPower: this.heaterPower,
            error: Math.abs(error),
        });
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        return this.getState();
    }

    getState() {
        // Add realistic sensor noise (±0.15°C for temperature, ±0.3% for power)
        const tempNoise = (Math.random() - 0.5) * 0.3;
        const powerNoise = (Math.random() - 0.5) * 0.6;

        const displayTemp = this.temperature + tempNoise;
        const displayPower = Math.max(0, Math.min(100, this.heaterPower + powerNoise));
        const error = Math.abs(this.setpoint - displayTemp);

        let stability = "STABLE";
        if (error > 20) stability = "CRITICAL";
        else if (error > 10) stability = "UNSTABLE";
        else if (error > 2) stability = "MARGINAL";

        return {
            temperature: Math.round(displayTemp * 100) / 100,
            setpoint: this.setpoint,
            heaterPower: Math.round(displayPower * 100) / 100,
            error: Math.round(error * 100) / 100,
            stability,
            heatLoss: this.heatLoss,
            aiActive: this.aiActive,
            tick: this.tick,
            timestamp: Date.now(),
            agent: {
                active: this.aiActive,
                kp: this.kp,
                ki: this.ki,
                kd: this.kd,
                thinking: this.aiThinking,
                tags: this.aiTags,
                lastAction: {
                    action: 'monitor',
                    analysis: this.aiThinking
                }
            }
        };
    }

    // User controls
    setSetpoint(value) {
        this.setpoint = Math.max(0, Math.min(500, value));
        this.aiThinking = `Setpoint changed to ${this.setpoint}°C`;
        this.aiTags = ['setpoint_change', 'monitoring'];
        logger.info("Setpoint changed", { value: this.setpoint });
    }

    setHeatLoss(value) {
        // Set base heat loss (permanent change by user)
        this.baseHeatLoss = Math.max(0.01, Math.min(1.0, value));
        this.heatLoss = this.baseHeatLoss + this.disturbance;
        this.aiThinking = `Heat loss coefficient changed to ${this.baseHeatLoss.toFixed(2)} - system destabilized`;
        this.aiTags = ['heat_loss_change', 'monitoring', 'need_tuning'];
        logger.info("Heat loss changed", { base: this.baseHeatLoss, effective: this.heatLoss });
    }

    addDisturbance(amount) {
        // Add temporary disturbance (like door opening) - decays over time
        this.disturbance = Math.min(0.5, this.disturbance + (amount || 0.15));
        this.heatLoss = this.baseHeatLoss + this.disturbance;
        this.aiThinking = `Disturbance detected! Heat loss spiked to ${this.heatLoss.toFixed(2)}`;
        this.aiTags = ['disturbance', 'recovering'];
        logger.info("Disturbance added", { amount, disturbance: this.disturbance, effective: this.heatLoss });
    }

    // AI PID tuning
    async tunePID() {
        if (!this.aiActive) return;

        const error = Math.abs(this.setpoint - this.temperature);
        const signedError = this.setpoint - this.temperature;

        // Track error history for oscillation detection
        this.errorHistory.push(signedError);
        if (this.errorHistory.length > 10) this.errorHistory.shift();

        // Detect overshoot: error increased since last tune
        const errorIncreasing = error > this.lastTuneError && this.lastTuneError > 0;

        // Detect oscillation: error sign changed
        const oscillating = this.errorHistory.length >= 3 &&
            Math.sign(this.errorHistory[this.errorHistory.length - 1]) !==
            Math.sign(this.errorHistory[0]);

        // System is truly stable only if error < threshold AND not oscillating
        const isStable = error < this.aiTuneThreshold && !oscillating;

        if (isStable) {
            this.aiThinking = `Stable: Error ${error.toFixed(2)}°C, No oscillation detected`;
            this.aiTags = ['stable', 'monitoring'];
            return;
        }

        const now = Date.now();
        const timeSinceLastTune = now - this.aiLastTuneTime;

        // Tune immediately if overshooting, otherwise wait 3 seconds for oscillation, 8 seconds normally
        const tuneInterval = errorIncreasing ? 0 : oscillating ? 3000 : 8000;

        if (timeSinceLastTune < tuneInterval) {
            const reason = errorIncreasing ? 'Overshoot detected!' :
                          oscillating ? 'Oscillation detected' :
                          'Error above threshold';
            this.aiThinking = `${reason}: Error ${error.toFixed(1)}°C - tuning in ${((tuneInterval - timeSinceLastTune) / 1000).toFixed(1)}s`;
            this.aiTags = ['monitoring', errorIncreasing ? 'overshoot' : oscillating ? 'oscillating' : 'converging'];
            return;
        }

        this.aiLastTuneTime = now;
        this.lastTuneError = error;

        // Calculate optimal PID gains based on system characteristics
        const systemGain = this.heaterEfficiency / this.heatLoss;

        // Conservative PID tuning - start small and increase only for large errors
        const errorRatio = Math.min(error / 100.0, 2.0); // Scale factor (max 2x at 200°C error)
        let baseKp = 0.3 * errorRatio; // Conservative proportional gain
        let baseKi = 0.05 * errorRatio; // Small integral to prevent windup
        let baseKd = 0.1 * errorRatio; // Moderate derivative

        // If oscillating, reduce gains significantly
        if (oscillating) {
            baseKp *= 0.3;
            baseKi *= 0.2;
            baseKd *= 0.5;
        }

        // For very small errors (< 5°C), use very conservative gains
        if (error < 5.0) {
            baseKp = Math.min(baseKp, 0.2);
            baseKi = Math.min(baseKi, 0.02);
            baseKd = Math.min(baseKd, 0.05);
        }

        // Calculate new PID gains
        const newKp = baseKp;
        const newKi = baseKi;
        const newKd = baseKd;

        // Store old values to detect changes
        const oldKp = this.kp;

        // Apply new gains directly (no dampening for faster response)
        this.kp = newKp;
        this.ki = newKi;
        this.kd = newKd;

        // Clamp gains
        this.kp = Math.max(0.1, Math.min(10, this.kp));
        this.ki = Math.max(0.001, Math.min(1, this.ki));
        this.kd = Math.max(0.01, Math.min(5, this.kd));

        // Only reset integral if PID gains changed significantly (more than 20%)
        const kpChange = Math.abs(this.kp - oldKp) / Math.max(oldKp, 0.01);
        if (kpChange > 0.2) {
            this.integral = 0;
        }

        this.aiThinking = `PID Tuned! Error=${error.toFixed(2)}°C, HeatLoss=${this.heatLoss.toFixed(2)}, Gain=${systemGain.toFixed(2)} → Kp=${this.kp.toFixed(2)}, Ki=${this.ki.toFixed(3)}, Kd=${this.kd.toFixed(2)}`;
        this.aiTags = ['pid_tuning', 'ziegler_nichols', 'error_correction', 'stabilizing'];

        logger.info("AI tuned PID", {
            kp: this.kp,
            ki: this.ki,
            kd: this.kd,
            error,
            heatLoss: this.heatLoss
        });
    }

    reset() {
        this.temperature = this.ambientTemp;
        this.setpoint = 200.0;
        this.heaterPower = 0.0;
        this.heatLoss = 0.25;
        this.kp = 0.3;
        this.ki = 0.01;
        this.kd = 0.05;
        this.integral = 0.0;
        this.lastError = 0.0;
        this.history = [];
        this.aiThinking = 'System reset - poor initial tuning';
        this.aiTags = ['reset', 'needs_tuning'];
        logger.info("System reset");
    }

    resetPID() {
        this.kp = 0.3;
        this.ki = 0.01;
        this.kd = 0.05;
        this.integral = 0.0;
        this.lastError = 0.0;
        this.aiThinking = 'PID reset to weak defaults - AI will re-tune';
        this.aiTags = ['pid_reset', 'need_tuning'];
        logger.info("PID reset");
    }

    toggleAgent(active) {
        this.aiActive = active;
        this.aiThinking = active ? 'AI controller activated' : 'AI controller deactivated';
        this.aiTags = active ? ['activated'] : ['deactivated'];
        logger.info("AI toggled", { active });
    }
}

// Global oven instance
const ovenSystem = new OvenThermalSystem();

// ===========================================
// LIQUID TANK SIMULATION
// ===========================================

class LiquidTankSystem {
    constructor() {
        // OPC-UA Tags
        this.liquidFilling = true;
        this.liquidLevel = 0.0;
        this.liquidLow = true;
        this.liquidHigh = false;
        
        // Simulation parameters
        this.direction = 'up'; // 'up' or 'down'
        this.cycleDuration = 120000; // 120 seconds per direction
        this.lastDirectionChange = Date.now();
        
        // Fault injection states
        this.faults = {
            highSensorDisabled: false,
            lowSensorDisabled: false,
            highSensorForcedOn: false,
            lowSensorForcedOn: false,
            levelForceNegative: false,
            levelForceZero: false,
            levelLocked: false
        };
        
        // Store actual values before faults
        this.actualLevel = 0.0;
        this.lockedValue = null;
        
        // Anomaly tracking
        this.anomalyHistory = [];
        this.maxAnomalyHistory = 100;
    }
    
    update() {
        const now = Date.now();
        const elapsed = now - this.lastDirectionChange;

        // Calculate level based on cycle time (0-100 over 120 seconds)
        if (!this.faults.levelLocked) {
            const progress = Math.min(elapsed / this.cycleDuration, 1.0);

            if (this.direction === 'up') {
                this.actualLevel = progress * 100;
            } else {
                this.actualLevel = 100 - (progress * 100);
            }

            // Switch direction at cycle end
            if (progress >= 1.0) {
                this.direction = this.direction === 'up' ? 'down' : 'up';
                this.lastDirectionChange = now;
            }
        }

        // Apply fault injections to displayed values
        this.applyFaults();

        // Update sensor states based on level (with fault overrides)
        this.updateSensorStates();

        // Detect anomalies
        this.detectAnomalies();

        return this.getState();
    }
    
    applyFaults() {
        // Start with actual level
        let displayLevel = this.actualLevel;
        
        // Apply level faults
        if (this.faults.levelForceNegative) {
            displayLevel = -10;
        } else if (this.faults.levelForceZero) {
            displayLevel = 0;
        } else if (this.faults.levelLocked) {
            displayLevel = this.lockedValue !== null ? this.lockedValue : this.actualLevel;
        }
        
        this.liquidLevel = displayLevel;
        this.liquidFilling = this.direction === 'up' && !this.faults.levelLocked;
    }
    
    updateSensorStates() {
        // Calculate what sensors SHOULD show
        const shouldBeHigh = this.actualLevel >= 90;
        const shouldBeLow = this.actualLevel <= 20;
        
        // Apply sensor faults
        if (this.faults.highSensorDisabled) {
            this.liquidHigh = false;
        } else if (this.faults.highSensorForcedOn) {
            this.liquidHigh = true;
        } else {
            this.liquidHigh = shouldBeHigh;
        }
        
        if (this.faults.lowSensorDisabled) {
            this.liquidLow = false;
        } else if (this.faults.lowSensorForcedOn) {
            this.liquidLow = true;
        } else {
            this.liquidLow = shouldBeLow;
        }
    }
    
    detectAnomalies() {
        const anomalies = [];
        const now = Date.now();
        
        // Check for impossible states
        
        // 1. High sensor on when level is low
        if (this.liquidHigh && this.actualLevel < 85) {
            anomalies.push({
                type: 'SENSOR_MISMATCH',
                severity: 'HIGH',
                message: 'High sensor active but level below threshold',
                details: { sensor: 'HIGH', actualLevel: this.actualLevel }
            });
        }
        
        // 2. Low sensor on when level is high
        if (this.liquidLow && this.actualLevel > 25) {
            anomalies.push({
                type: 'SENSOR_MISMATCH',
                severity: 'HIGH',
                message: 'Low sensor active but level above threshold',
                details: { sensor: 'LOW', actualLevel: this.actualLevel }
            });
        }
        
        // 3. High sensor NOT on when level is high (should trigger)
        if (!this.liquidHigh && this.actualLevel >= 92) {
            anomalies.push({
                type: 'SENSOR_FAILURE',
                severity: 'CRITICAL',
                message: 'High sensor not triggering at high level',
                details: { sensor: 'HIGH', actualLevel: this.actualLevel }
            });
        }
        
        // 4. Low sensor NOT on when level is low (should trigger)
        if (!this.liquidLow && this.actualLevel <= 18) {
            anomalies.push({
                type: 'SENSOR_FAILURE',
                severity: 'CRITICAL',
                message: 'Low sensor not triggering at low level',
                details: { sensor: 'LOW', actualLevel: this.actualLevel }
            });
        }
        
        // 5. Negative level (impossible)
        if (this.liquidLevel < 0) {
            anomalies.push({
                type: 'IMPOSSIBLE_VALUE',
                severity: 'CRITICAL',
                message: 'Negative liquid level detected',
                details: { displayedLevel: this.liquidLevel }
            });
        }
        
        // 6. Level stuck (not changing while filling/draining should happen)
        if (this.faults.levelLocked || this.faults.levelForceZero) {
            anomalies.push({
                type: 'STUCK_VALUE',
                severity: 'MEDIUM',
                message: 'Level value appears stuck',
                details: { displayedLevel: this.liquidLevel }
            });
        }
        
        // Record anomaly history
        if (anomalies.length > 0) {
            this.anomalyHistory.push({
                timestamp: now,
                anomalies: anomalies
            });
            if (this.anomalyHistory.length > this.maxAnomalyHistory) {
                this.anomalyHistory.shift();
            }
        }
        
        return anomalies;
    }
    
    setFault(type, value) {
        if (type in this.faults) {
            // If locking level, store current value
            if (type === 'levelLocked' && value) {
                this.lockedValue = this.liquidLevel;
            }
            this.faults[type] = value;
            logger.info("Tank fault set", { type, value });
        }
    }
    
    reset() {
        this.liquidFilling = true;
        this.liquidLevel = 0.0;
        this.liquidLow = true;
        this.liquidHigh = false;
        this.direction = 'up';
        this.lastDirectionChange = Date.now();
        this.actualLevel = 0.0;
        this.lockedValue = null;
        this.faults = {
            highSensorDisabled: false,
            lowSensorDisabled: false,
            highSensorForcedOn: false,
            lowSensorForcedOn: false,
            levelForceNegative: false,
            levelForceZero: false,
            levelLocked: false
        };
        this.anomalyHistory = [];
        logger.info("Tank system reset");
    }
    
    getState() {
        const currentAnomalies = this.detectAnomalies();
        
        return {
            liquidFilling: this.liquidFilling,
            liquidLevel: Math.round(this.liquidLevel * 100) / 100,
            liquidLow: this.liquidLow,
            liquidHigh: this.liquidHigh,
            direction: this.direction,
            actualLevel: Math.round(this.actualLevel * 100) / 100,
            faults: { ...this.faults },
            anomalies: currentAnomalies,
            hasAnomaly: currentAnomalies.length > 0,
            timestamp: Date.now()
        };
    }
    
    getAnomalyState() {
        const anomalies = this.detectAnomalies();
        return {
            hasAnomaly: anomalies.length > 0,
            anomalies: anomalies,
            recentHistory: this.anomalyHistory.slice(-10)
        };
    }
}

// Global tank instance
const tankSystem = new LiquidTankSystem();

// ===========================================
// CLIENT-AWARE SIMULATION LOOP
// ===========================================
let simulationInterval = null;
let connectedClients = 0;
let stopTimer = null;

function startSimulation() {
    if (simulationInterval) return; // Already running

    // Clear any pending stop timer
    if (stopTimer) {
        clearTimeout(stopTimer);
        stopTimer = null;
    }

    logger.info("Simulation started - clients connected");
    ovenSystem.lastUpdate = Date.now(); // Reset timing

    simulationInterval = setInterval(async () => {
        ovenSystem.update();
        await ovenSystem.tunePID();
    }, 100);
}

function stopSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
        logger.info("Simulation paused - no clients connected");
    }
}

function clientConnected() {
    connectedClients++;
    if (connectedClients === 1) {
        startSimulation();
    }
    logger.info("Client connected", { total: connectedClients });
}

function clientDisconnected() {
    connectedClients = Math.max(0, connectedClients - 1);
    logger.info("Client disconnected", { total: connectedClients });

    if (connectedClients === 0) {
        // Don't stop immediately - wait 3 seconds for reconnection
        if (stopTimer) clearTimeout(stopTimer);
        stopTimer = setTimeout(() => {
            if (connectedClients === 0) {
                stopSimulation();
            }
        }, 3000);
    }
}

// ===========================================
// HTTP API
// ===========================================

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

app.get("/health", (req, res) => {
    res.json({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        simulation: simulationInterval ? "running" : "paused",
        clients: connectedClients
    });
});

// Oven system endpoints
app.get("/system", (req, res) => {
    res.json(ovenSystem.getState());
});

app.post("/system/control", (req, res) => {
    const { controlOutput } = req.body;
    if (controlOutput !== undefined) {
        ovenSystem.setExternalHeaterPower(controlOutput);
    }
    res.json(ovenSystem.getState());
});

app.post("/simulation/start", (req, res) => {
    clientConnected();
    res.json({ status: "started", clients: connectedClients });
});

app.post("/simulation/stop", (req, res) => {
    clientDisconnected();
    res.json({ status: "stopped", clients: connectedClients });
});

app.post("/user/setpoint", (req, res) => {
    const { value } = req.body;
    if (value !== undefined) {
        ovenSystem.setSetpoint(value);
    }
    res.json(ovenSystem.getState());
});

app.post("/user/heatloss", (req, res) => {
    const { value } = req.body;
    if (value !== undefined) {
        ovenSystem.setHeatLoss(value);
    }
    res.json(ovenSystem.getState());
});

app.post("/user/disturbance", (req, res) => {
    // Temporary disturbance - like door opening, decays back to normal
    const { amount } = req.body;
    ovenSystem.addDisturbance(amount || 0.1);
    res.json(ovenSystem.getState());
});

app.post("/user/instability", (req, res) => {
    // Temporary instability spike - decays back to normal
    const { amount } = req.body;
    ovenSystem.addDisturbance(amount || 0.2);
    res.json(ovenSystem.getState());
});

app.post("/user/reset", (req, res) => {
    ovenSystem.reset();
    res.json(ovenSystem.getState());
});

app.post("/agent/tune", async (req, res) => {
    await ovenSystem.tunePID();
    res.json(ovenSystem.getState());
});

app.post("/agent/reset-pid", (req, res) => {
    ovenSystem.resetPID();
    res.json(ovenSystem.getState());
});

app.post("/agent/toggle", (req, res) => {
    const { active } = req.body;
    ovenSystem.toggleAgent(active);
    res.json(ovenSystem.getState());
});

app.post("/agent/instruct", async (req, res) => {
    const { instruction } = req.body;
    
    // Simple instruction parsing
    const lower = instruction.toLowerCase();
    
    if (lower.includes('reset')) {
        ovenSystem.reset();
    } else if (lower.includes('tune') || lower.includes('adjust')) {
        await ovenSystem.tunePID();
    } else {
        // Extract setpoint if mentioned
        const match = instruction.match(/(\d+)/);
        if (match) {
            const value = parseInt(match[1]);
            ovenSystem.setSetpoint(value);
        }
    }
    
    res.json(ovenSystem.getState());
});

// Tank system endpoints
app.get("/tank", (req, res) => {
    res.json(tankSystem.getState());
});

app.get("/tank/anomalies", (req, res) => {
    res.json(tankSystem.getAnomalyState());
});

app.post("/tank/fault", (req, res) => {
    const { type, value } = req.body;
    if (type) {
        tankSystem.setFault(type, value);
    }
    res.json(tankSystem.getState());
});

app.post("/tank/reset", (req, res) => {
    tankSystem.reset();
    res.json(tankSystem.getState());
});

// Simulation control via HTTP
app.post("/simulation/start", (req, res) => {
    clientConnected();
    res.json({ simulation: "running", clients: connectedClients });
});

app.post("/simulation/stop", (req, res) => {
    clientDisconnected();
    res.json({ simulation: simulationInterval ? "running" : "paused", clients: connectedClients });
});

// WebSocket for oven system real-time updates
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

wss.on("connection", (ws) => {
    clientConnected();
    
    const interval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(ovenSystem.getState()));
        }
    }, 100); // 10Hz updates
    
    ws.on("close", () => {
        clearInterval(interval);
        clientDisconnected();
    });
    
    ws.on("error", () => {
        clearInterval(interval);
        clientDisconnected();
    });
});

// WebSocket for tank system updates
const tankWss = new WebSocketServer({ server: httpServer, path: "/ws/tank" });
let tankConnectedClients = 0;
let tankSimulationInterval = null;

function startTankSimulation() {
    if (tankSimulationInterval) return;
    logger.info("Tank simulation started");
    tankSimulationInterval = setInterval(() => {
        tankSystem.update();
    }, 100);
}

function stopTankSimulation() {
    if (tankSimulationInterval) {
        clearInterval(tankSimulationInterval);
        tankSimulationInterval = null;
        tankSystem.reset();
        logger.info("Tank simulation stopped and reset");
    }
}

tankWss.on("connection", (ws) => {
    tankConnectedClients++;
    if (tankConnectedClients === 1) {
        startTankSimulation();
    }
    logger.info("Tank client connected", { total: tankConnectedClients });
    
    const interval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            const state = tankSystem.getState();
            ws.send(JSON.stringify({
                tank: state,
                anomalyState: tankSystem.getAnomalyState()
            }));
        }
    }, 1000); // 1Hz updates for AI monitoring
    
    ws.on("close", () => {
        clearInterval(interval);
        tankConnectedClients = Math.max(0, tankConnectedClients - 1);
        if (tankConnectedClients === 0) {
            stopTankSimulation();
        }
        logger.info("Tank client disconnected", { total: tankConnectedClients });
    });
    
    ws.on("error", () => {
        clearInterval(interval);
        tankConnectedClients = Math.max(0, tankConnectedClients - 1);
        if (tankConnectedClients === 0) {
            stopTankSimulation();
        }
    });
});

const HTTP_PORT = 8080;
httpServer.listen(HTTP_PORT, () => {
    logger.info("HTTP/WebSocket server started", { port: HTTP_PORT });

    // Start tank simulation automatically so HTTP polling works
    startTankSimulation();
});

// ===========================================
// OPC-UA SERVER
// ===========================================

async function createOPCUAServer() {
    const port = parseInt(process.env.OPCUA_PORT) || 4840;
    const pkiFolder = process.env.PKI_FOLDER || path.join(__dirname, "pki");

    const serverCertificateManager = new OPCUACertificateManager({
        automaticallyAcceptUnknownCertificate: true,
        rootFolder: pkiFolder,
    });

    await serverCertificateManager.initialize();

    const server = new OPCUAServer({
        port,
        resourcePath: "/UA/IndustrialSystems",
        buildInfo: {
            productName: "Industrial Systems Simulator",
            buildNumber: "1.0.0",
            buildDate: new Date(),
        },
        serverCertificateManager,
        securityModes: [MessageSecurityMode.None],
        securityPolicies: [SecurityPolicy.None],
        allowAnonymous: true,
        nodeset_filename: [nodesets.standard],
    });

    await server.initialize();

    const addressSpace = server.engine.addressSpace;
    const namespace = addressSpace.getOwnNamespace();

    // Oven System folder
    const ovenFolder = namespace.addFolder(addressSpace.rootFolder.objects, {
        browseName: "OvenSystem",
    });

    // Temperature (Process Value)
    namespace.addVariable({
        componentOf: ovenFolder,
        browseName: "Temperature",
        nodeId: "ns=1;s=Temperature",
        dataType: DataType.Double,
        value: { get: () => new Variant({ dataType: DataType.Double, value: ovenSystem.temperature }) },
    });

    // Setpoint
    namespace.addVariable({
        componentOf: ovenFolder,
        browseName: "Setpoint",
        nodeId: "ns=1;s=Setpoint",
        dataType: DataType.Double,
        value: { get: () => new Variant({ dataType: DataType.Double, value: ovenSystem.setpoint }) },
    });

    // Heater Power
    namespace.addVariable({
        componentOf: ovenFolder,
        browseName: "HeaterPower",
        nodeId: "ns=1;s=HeaterPower",
        dataType: DataType.Double,
        value: { get: () => new Variant({ dataType: DataType.Double, value: ovenSystem.heaterPower }) },
    });

    // Error
    namespace.addVariable({
        componentOf: ovenFolder,
        browseName: "Error",
        nodeId: "ns=1;s=Error",
        dataType: DataType.Double,
        value: { get: () => new Variant({ dataType: DataType.Double, value: Math.abs(ovenSystem.setpoint - ovenSystem.temperature) }) },
    });

    // PID Gains
    namespace.addVariable({
        componentOf: ovenFolder,
        browseName: "Kp",
        nodeId: "ns=1;s=Kp",
        dataType: DataType.Double,
        value: { get: () => new Variant({ dataType: DataType.Double, value: ovenSystem.kp }) },
    });

    namespace.addVariable({
        componentOf: ovenFolder,
        browseName: "Ki",
        nodeId: "ns=1;s=Ki",
        dataType: DataType.Double,
        value: { get: () => new Variant({ dataType: DataType.Double, value: ovenSystem.ki }) },
    });

    namespace.addVariable({
        componentOf: ovenFolder,
        browseName: "Kd",
        nodeId: "ns=1;s=Kd",
        dataType: DataType.Double,
        value: { get: () => new Variant({ dataType: DataType.Double, value: ovenSystem.kd }) },
    });

    // Tank System folder
    const tankFolder = namespace.addFolder(addressSpace.rootFolder.objects, {
        browseName: "LiquidTank",
    });
    
    // LiquidFilling (BOOL)
    namespace.addVariable({
        componentOf: tankFolder,
        browseName: "LiquidFilling",
        nodeId: "ns=1;s=LiquidFilling",
        dataType: DataType.Boolean,
        value: { get: () => new Variant({ dataType: DataType.Boolean, value: tankSystem.liquidFilling }) },
    });
    
    // LiquidLevel (REAL)
    namespace.addVariable({
        componentOf: tankFolder,
        browseName: "LiquidLevel",
        nodeId: "ns=1;s=LiquidLevel",
        dataType: DataType.Double,
        value: { get: () => new Variant({ dataType: DataType.Double, value: tankSystem.liquidLevel }) },
    });
    
    // LiquidLow (BOOL)
    namespace.addVariable({
        componentOf: tankFolder,
        browseName: "LiquidLow",
        nodeId: "ns=1;s=LiquidLow",
        dataType: DataType.Boolean,
        value: { get: () => new Variant({ dataType: DataType.Boolean, value: tankSystem.liquidLow }) },
    });
    
    // LiquidHigh (BOOL)
    namespace.addVariable({
        componentOf: tankFolder,
        browseName: "LiquidHigh",
        nodeId: "ns=1;s=LiquidHigh",
        dataType: DataType.Boolean,
        value: { get: () => new Variant({ dataType: DataType.Boolean, value: tankSystem.liquidHigh }) },
    });

    await server.start();
    logger.info("OPC-UA Server started", { port, endpoint: server.getEndpointUrl() });

    return server;
}

// Start OPC-UA server
createOPCUAServer().catch((err) => {
    logger.error("Failed to start OPC-UA server", { error: err.message });
});
