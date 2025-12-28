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
// UNSTABLE SYSTEM SIMULATION
// ===========================================

class UnstableSystem {
    constructor() {
        // Process variable (what we're trying to control)
        this.processValue = 50.0;
        
        // Setpoint (target value)
        this.setpoint = 50.0;
        
        // Control output from agent (0-100)
        this.controlOutput = 50.0;
        
        // Instability parameters
        this.instabilityRate = 0.1;      // Base drift rate
        this.noiseAmplitude = 2.0;       // Random noise
        this.oscillationFreq = 0.05;     // Natural oscillation
        this.oscillationAmp = 5.0;       // Oscillation amplitude
        
        // Disturbance (user-controlled chaos)
        this.disturbance = 0.0;
        this.disturbanceDecay = 0.95;
        
        // System dynamics
        this.momentum = 0.0;
        this.inertia = 0.8;              // How sluggish the system responds
        
        // Time tracking
        this.tick = 0;
        this.lastUpdate = Date.now();
        
        // History for trending
        this.history = [];
        this.maxHistory = 100;
        
        // Agent active flag
        this.agentActive = true;
    }

    update() {
        const now = Date.now();
        const dt = (now - this.lastUpdate) / 1000.0;
        this.lastUpdate = now;
        this.tick++;

        // Natural instability forces
        const drift = (Math.random() - 0.5) * this.instabilityRate * 10;
        const noise = (Math.random() - 0.5) * this.noiseAmplitude;
        const oscillation = Math.sin(this.tick * this.oscillationFreq) * this.oscillationAmp;
        
        // Exponential runaway tendency (the system wants to explode)
        const runaway = (this.processValue - 50) * 0.02;
        
        // Total destabilizing force
        let destabilize = drift + noise + oscillation + runaway + this.disturbance;
        
        // Control force from agent (trying to bring back to setpoint)
        const error = this.setpoint - this.processValue;
        const controlForce = (this.controlOutput - 50) * 0.5;
        
        // Apply forces with inertia
        this.momentum = this.momentum * this.inertia + (destabilize + controlForce) * (1 - this.inertia);
        this.processValue += this.momentum * dt * 10;
        
        // Decay disturbance over time
        this.disturbance *= this.disturbanceDecay;
        
        // Clamp to reasonable bounds
        this.processValue = Math.max(0, Math.min(100, this.processValue));
        
        // Record history
        this.history.push({
            timestamp: now,
            processValue: this.processValue,
            setpoint: this.setpoint,
            controlOutput: this.controlOutput,
            error: Math.abs(error),
        });
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        
        return this.getState();
    }

    getState() {
        const error = Math.abs(this.setpoint - this.processValue);
        let stability = "STABLE";
        if (error > 20) stability = "CRITICAL";
        else if (error > 10) stability = "UNSTABLE";
        else if (error > 5) stability = "MARGINAL";
        
        return {
            processValue: Math.round(this.processValue * 100) / 100,
            setpoint: this.setpoint,
            controlOutput: Math.round(this.controlOutput * 100) / 100,
            error: Math.round(error * 100) / 100,
            stability,
            instabilityRate: this.instabilityRate,
            agentActive: this.agentActive,
            momentum: Math.round(this.momentum * 100) / 100,
            tick: this.tick,
            timestamp: Date.now(),
        };
    }

    // Agent sets control output
    setControlOutput(value) {
        this.controlOutput = Math.max(0, Math.min(100, value));
        logger.info("Control output set", { value: this.controlOutput });
    }

    // User changes setpoint
    setSetpoint(value) {
        this.setpoint = Math.max(0, Math.min(100, value));
        logger.info("Setpoint changed", { value: this.setpoint });
    }

    // User increases instability
    increaseInstability(amount = 0.1) {
        this.instabilityRate = Math.min(1.0, this.instabilityRate + amount);
        logger.info("Instability increased", { rate: this.instabilityRate });
    }

    // User adds disturbance (kick the system)
    addDisturbance(amount) {
        this.disturbance += amount;
        logger.info("Disturbance added", { amount, total: this.disturbance });
    }

    // Reset system
    reset() {
        this.processValue = 50.0;
        this.setpoint = 50.0;
        this.controlOutput = 50.0;
        this.instabilityRate = 0.1;
        this.disturbance = 0.0;
        this.momentum = 0.0;
        this.history = [];
        logger.info("System reset");
    }

    // Toggle agent
    toggleAgent(active) {
        this.agentActive = active;
        if (!active) {
            this.controlOutput = 50.0; // Neutral when agent off
        }
        logger.info("Agent toggled", { active });
    }
}

// Global system instance
const system = new UnstableSystem();

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
            levelLocked: false,
            fillingPaused: false
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
        if (!this.faults.levelLocked && !this.faults.fillingPaused) {
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
        } else if (this.faults.fillingPaused) {
            // Keep updating the lastDirectionChange so resuming works correctly
            this.lastDirectionChange = now - (this.actualLevel / 100 * this.cycleDuration);
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
            levelLocked: false,
            fillingPaused: false
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

function startSimulation() {
    if (simulationInterval) return; // Already running
    
    logger.info("Simulation started - clients connected");
    system.lastUpdate = Date.now(); // Reset timing
    
    simulationInterval = setInterval(() => {
        system.update();
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
    if (connectedClients === 0) {
        stopSimulation();
    }
    logger.info("Client disconnected", { total: connectedClients });
}

// ===========================================
// TANK SIMULATION CONTROL
// ===========================================
let tankConnectedClients = 0;
let tankSimulationInterval = null;

function startTankSimulation() {
    if (tankSimulationInterval) return;
    logger.info("Tank simulation started - clients connected");
    tankSimulationInterval = setInterval(() => {
        tankSystem.update();
    }, 100);
}

function stopTankSimulation() {
    if (tankSimulationInterval) {
        clearInterval(tankSimulationInterval);
        tankSimulationInterval = null;
        tankSystem.reset();
        logger.info("Tank simulation stopped and reset - no clients");
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

app.get("/system", (req, res) => {
    res.json(system.getState());
});

app.get("/system/history", (req, res) => {
    res.json(system.history);
});

app.post("/system/control", (req, res) => {
    const { controlOutput } = req.body;
    if (typeof controlOutput === "number") {
        system.setControlOutput(controlOutput);
    }
    res.json(system.getState());
});

app.post("/system/setpoint", (req, res) => {
    const { setpoint } = req.body;
    if (typeof setpoint === "number") {
        system.setSetpoint(setpoint);
    }
    res.json(system.getState());
});

app.post("/system/disturbance", (req, res) => {
    const { amount } = req.body;
    system.addDisturbance(amount || 10);
    res.json(system.getState());
});

app.post("/system/instability", (req, res) => {
    const { amount } = req.body;
    system.increaseInstability(amount || 0.1);
    res.json(system.getState());
});

app.post("/system/reset", (req, res) => {
    system.reset();
    res.json(system.getState());
});

app.post("/system/agent", (req, res) => {
    const { active } = req.body;
    system.toggleAgent(active);
    res.json(system.getState());
});

// ===========================================
// TANK SYSTEM HTTP ROUTES
// ===========================================

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

// Tank simulation control via HTTP (for api-gateway)
app.post("/tank/simulation/start", (req, res) => {
    tankConnectedClients++;
    if (tankConnectedClients === 1) {
        startTankSimulation();
    }
    logger.info("Tank HTTP client connected", { total: tankConnectedClients });
    res.json({ simulation: tankSimulationInterval ? "running" : "paused", clients: tankConnectedClients });
});

app.post("/tank/simulation/stop", (req, res) => {
    tankConnectedClients = Math.max(0, tankConnectedClients - 1);
    if (tankConnectedClients === 0) {
        stopTankSimulation();
    }
    logger.info("Tank HTTP client disconnected", { total: tankConnectedClients });
    res.json({ simulation: tankSimulationInterval ? "running" : "paused", clients: tankConnectedClients });
});

// Simulation control via HTTP (for api-gateway)
app.post("/simulation/start", (req, res) => {
    clientConnected();
    res.json({ simulation: "running", clients: connectedClients });
});

app.post("/simulation/stop", (req, res) => {
    clientDisconnected();
    res.json({ simulation: simulationInterval ? "running" : "paused", clients: connectedClients });
});

// WebSocket for real-time updates
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

wss.on("connection", (ws) => {
    clientConnected();
    
    const interval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(system.getState()));
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

const HTTP_PORT = 8080;
httpServer.listen(HTTP_PORT, () => {
    logger.info("HTTP/WebSocket server started", { port: HTTP_PORT });
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
        resourcePath: "/UA/UnstableSystem",
        buildInfo: {
            productName: "Unstable System Simulator",
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

    const systemFolder = namespace.addFolder(addressSpace.rootFolder.objects, {
        browseName: "UnstableSystem",
    });

    // Process Value
    namespace.addVariable({
        componentOf: systemFolder,
        browseName: "ProcessValue",
        nodeId: "ns=1;s=ProcessValue",
        dataType: DataType.Double,
        value: { get: () => new Variant({ dataType: DataType.Double, value: system.processValue }) },
    });

    // Setpoint
    namespace.addVariable({
        componentOf: systemFolder,
        browseName: "Setpoint",
        nodeId: "ns=1;s=Setpoint",
        dataType: DataType.Double,
        value: { get: () => new Variant({ dataType: DataType.Double, value: system.setpoint }) },
    });

    // Control Output
    namespace.addVariable({
        componentOf: systemFolder,
        browseName: "ControlOutput",
        nodeId: "ns=1;s=ControlOutput",
        dataType: DataType.Double,
        value: { get: () => new Variant({ dataType: DataType.Double, value: system.controlOutput }) },
    });

    // Error
    namespace.addVariable({
        componentOf: systemFolder,
        browseName: "Error",
        nodeId: "ns=1;s=Error",
        dataType: DataType.Double,
        value: { get: () => new Variant({ dataType: DataType.Double, value: Math.abs(system.setpoint - system.processValue) }) },
    });

    // ===========================================
    // LIQUID TANK OPC-UA VARIABLES
    // ===========================================
    
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

// Start everything
createOPCUAServer().catch((err) => {
    logger.error("Failed to start OPC-UA server", { error: err.message });
});
