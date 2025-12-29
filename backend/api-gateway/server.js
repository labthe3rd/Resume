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
// UFOPDT CORE IMPLEMENTATION
// ===========================================

/**
 * UnstableProcess - Core UFOPDT (Unstable First-Order Plus Dead Time) Implementation
 * 
 * Mathematical Model (Discrete ZOH):
 * y[k] = alpha[k] * y[k-1] + beta[k] * u[k - d[k]]
 * 
 * Where:
 * - alpha[k] = exp(Ts / tau[k])
 * - beta[k]  = K[k] * (alpha[k] - 1)
 * - d[k]     = floor(theta[k] / Ts)
 */
class UnstableProcess {
    constructor(Ts, bufferSize = 60.0, maxTau = 1e6) {
        this.Ts = Ts;
        this.bufferSize = Math.ceil(bufferSize / Ts);
        this.maxTau = maxTau;

        this.K = 1.0;
        this.tau = 10.0;
        this.theta = 2.0;

        this.y = 0.0;
        this.uBuffer = new Array(this.bufferSize).fill(0.0);
        this.bufferIndex = 0;

        this.alpha = null;
        this.beta = null;
        this.d = 0;

        this._computeDiscreteParams();
    }

    _computeDiscreteParams() {
        const tauClamped = Math.min(Math.abs(this.tau), this.maxTau);
        
        if (this.tau > 0) {
            this.alpha = Math.exp(this.Ts / tauClamped);
        } else if (this.tau < 0) {
            this.alpha = Math.exp(-this.Ts / tauClamped);
        } else {
            this.alpha = 1.0 + this.Ts / 1e-6;
        }

        this.beta = this.K * (this.alpha - 1.0);
        this.d = Math.max(0, Math.floor(this.theta / this.Ts));
    }

    setParameters(K, tau, theta) {
        this.K = K;
        this.tau = tau;
        this.theta = theta;
        this._computeDiscreteParams();
    }

    step(u) {
        this.uBuffer[this.bufferIndex] = u;

        const delayedIndex = (this.bufferIndex - this.d + this.bufferSize) % this.bufferSize;
        const uDelayed = this.uBuffer[delayedIndex];

        this.y = this.alpha * this.y + this.beta * uDelayed;

        this.bufferIndex = (this.bufferIndex + 1) % this.bufferSize;

        return {
            y: this.y,
            params: { alpha: this.alpha, beta: this.beta, d: this.d }
        };
    }

    reset() {
        this.y = 0.0;
        this.uBuffer.fill(0.0);
        this.bufferIndex = 0;
    }
}

// ===========================================
// UNSTABLE SYSTEM SIMULATION
// ===========================================

class UnstableSystem {
    constructor() {
        this.processValue = 50.0;
        this.rawProcessValue = 0.0;
        this.setpoint = 50.0;
        this.controlOutput = 50.0;

        this.instabilityRate = 0.1;
        this.noiseAmplitude = 2.0;
        this.oscillationFreq = 0.05;
        this.oscillationAmp = 5.0;

        this.disturbance = 0.0;
        this.disturbanceDecay = 0.95;
        this.displayOffset = 50.0;
        this.momentum = 0.0;

        this.tick = 0;
        this.lastUpdate = Date.now();
        this._prevProcessValue = this.processValue;

        this.history = [];
        this.maxHistory = 100;
        this.agentActive = true;

        this.ufopdt = new UnstableProcess(0.1, 60.0, 1e6);
        this.ufopdtParams = { 
            K: 1.0, 
            tau: 10.0, 
            theta: 2.0, 
            alpha: null, 
            lastRandomizedAt: null 
        };

        this.parameterRandomizationInterval = 5 * 60 * 1000; // 5 minutes

        this.randomizeUfopdtParameters("startup");
    }

    randomizeUfopdtParameters(reason = "interval") {
        const rand = (min, max) => min + Math.random() * (max - min);
        const s = Math.max(0.1, Math.min(1.0, this.instabilityRate));

        const Kmag = rand(0.5, 4.0 * (0.75 + s));
        const K = (Math.random() < 0.5 ? -1 : 1) * Kmag;
        const tau = rand(1.0, 25.0 * (1.25 - (s * 0.5)));
        const theta = rand(0.0, 6.0 * (0.75 + s));

        this.ufopdt.setParameters(K, tau, theta);

        this.ufopdtParams.K = K;
        this.ufopdtParams.tau = tau;
        this.ufopdtParams.theta = theta;
        this.ufopdtParams.lastRandomizedAt = Date.now();

        logger.info("UFOPDT parameters randomized", { reason, K, tau, theta });
    }

    update() {
        const now = Date.now();
        const dt = Math.max(1e-3, (now - this.lastUpdate) / 1000.0);
        this.lastUpdate = now;
        this.tick++;

        // Check if 5 minutes have passed since last randomization
        if (this.ufopdtParams.lastRandomizedAt && 
            (now - this.ufopdtParams.lastRandomizedAt) >= this.parameterRandomizationInterval) {
            this.randomizeUfopdtParameters("5min-interval");
        }

        const drift = (Math.random() - 0.5) * this.instabilityRate * 10;
        const noise = (Math.random() - 0.5) * this.noiseAmplitude;
        const oscillation = Math.sin(this.tick * this.oscillationFreq) * this.oscillationAmp;

        const envDisturbance = drift + noise + oscillation + this.disturbance;
        const agentU = this.agentActive ? (this.controlOutput - 50) * 0.5 : 0.0;
        const u = envDisturbance + agentU;

        const result = this.ufopdt.step(u);
        this.rawProcessValue = result.y;

        const pvDisplay = Math.max(0, Math.min(100, this.displayOffset + this.rawProcessValue));
        this.processValue = Math.round(pvDisplay * 100) / 100;

        this.momentum = Math.round(((this.processValue - this._prevProcessValue) / dt) * 100) / 100;
        this._prevProcessValue = this.processValue;

        this.ufopdtParams.alpha = result.params?.alpha ?? this.ufopdtParams.alpha;
        this.disturbance *= this.disturbanceDecay;

        const error = this.setpoint - this.processValue;
        this.history.push({
            timestamp: now,
            processValue: this.processValue,
            rawProcessValue: this.rawProcessValue,
            setpoint: this.setpoint,
            controlOutput: this.controlOutput,
            error: Math.abs(error),
            ufopdt: { 
                K: this.ufopdtParams.K, 
                tau: this.ufopdtParams.tau, 
                theta: this.ufopdtParams.theta, 
                alpha: this.ufopdtParams.alpha 
            },
        });

        if (this.history.length > this.maxHistory) this.history.shift();

        return this.getState();
    }

    getState() {
        const error = Math.abs(this.setpoint - this.processValue);
        let stability = "STABLE";
        if (error > 20) stability = "CRITICAL";
        else if (error > 10) stability = "UNSTABLE";
        else if (error > 5) stability = "MARGINAL";

        return {
            processValue: this.processValue,
            rawProcessValue: Math.round(this.rawProcessValue * 100) / 100,
            setpoint: this.setpoint,
            controlOutput: Math.round(this.controlOutput * 100) / 100,
            error: Math.round(error * 100) / 100,
            stability,
            instabilityRate: this.instabilityRate,
            agentActive: this.agentActive,
            momentum: this.momentum,
            tick: this.tick,
            timestamp: Date.now(),
            ufopdt: {
                K: Math.round(this.ufopdtParams.K * 1000) / 1000,
                tau: Math.round(this.ufopdtParams.tau * 1000) / 1000,
                theta: Math.round(this.ufopdtParams.theta * 1000) / 1000,
                alpha: this.ufopdtParams.alpha !== null ? (Math.round(this.ufopdtParams.alpha * 100000) / 100000) : null,
                lastRandomizedAt: this.ufopdtParams.lastRandomizedAt,
            },
        };
    }

    setControlOutput(value) {
        this.controlOutput = Math.max(0, Math.min(100, value));
        logger.info("Control output set", { value: this.controlOutput });
    }

    setSetpoint(value) {
        this.setpoint = Math.max(0, Math.min(100, value));
        logger.info("Setpoint changed", { value: this.setpoint });
    }

    increaseInstability(amount = 0.1) {
        this.instabilityRate = Math.min(1.0, this.instabilityRate + amount);
        logger.info("Instability increased", { rate: this.instabilityRate });
    }

    addDisturbance(amount) {
        this.disturbance += amount;
        logger.info("Disturbance added", { amount, total: this.disturbance });
    }

    reset() {
        this.processValue = 50.0;
        this.rawProcessValue = 0.0;
        this.setpoint = 50.0;
        this.controlOutput = 50.0;
        this.instabilityRate = 0.1;
        this.disturbance = 0.0;
        this.momentum = 0.0;
        this.tick = 0;
        this.lastUpdate = Date.now();
        this._prevProcessValue = this.processValue;
        this.history = [];

        this.ufopdt.reset();
        this.randomizeUfopdtParameters("reset");

        logger.info("System reset");
    }

    toggleAgent(active) {
        this.agentActive = active;
        if (!active) this.controlOutput = 50.0;
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
        this.liquidFilling = true;
        this.liquidLevel = 0.0;
        this.liquidLow = true;
        this.liquidHigh = false;
        
        this.direction = 'up';
        this.cycleDuration = 120000;
        this.lastDirectionChange = Date.now();
        
        this.faults = {
            highSensorDisabled: false,
            lowSensorDisabled: false,
            highSensorForcedOn: false,
            lowSensorForcedOn: false,
            levelForceNegative: false,
            levelForceZero: false,
            levelLocked: false
        };
        
        this.actualLevel = 0.0;
        this.lockedValue = null;
        this.anomalyHistory = [];
        this.maxAnomalyHistory = 100;
    }
    
    update() {
        const now = Date.now();
        const elapsed = now - this.lastDirectionChange;

        if (!this.faults.levelLocked) {
            const progress = Math.min(elapsed / this.cycleDuration, 1.0);

            if (this.direction === 'up') {
                this.actualLevel = progress * 100;
            } else {
                this.actualLevel = 100 - (progress * 100);
            }

            if (progress >= 1.0) {
                this.direction = this.direction === 'up' ? 'down' : 'up';
                this.lastDirectionChange = now;
            }
        }

        this.applyFaults();
        this.updateSensorStates();
        this.detectAnomalies();

        return this.getState();
    }
    
    applyFaults() {
        let displayLevel = this.actualLevel;
        
        if (this.faults.levelForceNegative) {
            displayLevel = -Math.abs(this.actualLevel);
        } else if (this.faults.levelForceZero) {
            displayLevel = 0.0;
        } else if (this.faults.levelLocked && this.lockedValue !== null) {
            displayLevel = this.lockedValue;
        }
        
        this.liquidLevel = displayLevel;
    }
    
    updateSensorStates() {
        let low = this.liquidLevel < 10;
        let high = this.liquidLevel > 90;
        
        if (this.faults.lowSensorDisabled) {
            low = false;
        } else if (this.faults.lowSensorForcedOn) {
            low = true;
        }
        
        if (this.faults.highSensorDisabled) {
            high = false;
        } else if (this.faults.highSensorForcedOn) {
            high = true;
        }
        
        this.liquidLow = low;
        this.liquidHigh = high;
        this.liquidFilling = this.direction === 'up';
    }
    
    detectAnomalies() {
        const anomalies = [];
        
        if (this.liquidLevel < 0) {
            anomalies.push({ type: 'NEGATIVE_LEVEL', severity: 'CRITICAL' });
        }
        
        if (this.liquidLow && this.liquidHigh) {
            anomalies.push({ type: 'SENSOR_CONFLICT', severity: 'HIGH' });
        }
        
        if (this.liquidLevel > 100) {
            anomalies.push({ type: 'OVERFLOW', severity: 'CRITICAL' });
        }
        
        if (anomalies.length > 0) {
            this.anomalyHistory.push({
                timestamp: Date.now(),
                anomalies: anomalies
            });
            
            if (this.anomalyHistory.length > this.maxAnomalyHistory) {
                this.anomalyHistory.shift();
            }
        }
    }
    
    getState() {
        return {
            liquidFilling: this.liquidFilling,
            liquidLevel: Math.round(this.liquidLevel * 100) / 100,
            liquidLow: this.liquidLow,
            liquidHigh: this.liquidHigh,
            direction: this.direction,
            faults: this.faults,
            timestamp: Date.now()
        };
    }
    
    getAnomalyState() {
        return {
            recentAnomalies: this.anomalyHistory.slice(-10),
            totalAnomalies: this.anomalyHistory.length
        };
    }
    
    setFault(type, value) {
        if (this.faults.hasOwnProperty(type)) {
            this.faults[type] = value;
            
            if (type === 'levelLocked' && value) {
                this.lockedValue = this.liquidLevel;
            }
            
            logger.info("Fault set", { type, value });
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
        
        Object.keys(this.faults).forEach(key => {
            this.faults[key] = false;
        });
        
        this.anomalyHistory = [];
        logger.info("Tank system reset");
    }
}

const tankSystem = new LiquidTankSystem();

// ===========================================
// CLIENT TRACKING & SIMULATION CONTROL
// ===========================================

let connectedClients = 0;
let simulationInterval = null;

function startSimulation() {
    if (simulationInterval) return;
    logger.info("Simulation started - clients connected");
    simulationInterval = setInterval(() => {
        system.update();
    }, 100);
}

function stopSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
        system.reset();
        logger.info("Simulation stopped and reset - no clients");
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
// HTTP SERVER SETUP
// ===========================================

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

// ===========================================
// UNSTABLE SYSTEM HTTP ROUTES
// ===========================================

app.get("/system", (req, res) => {
    res.json(system.getState());
});

app.post("/system/setpoint", (req, res) => {
    const { value } = req.body;
    system.setSetpoint(value);
    res.json(system.getState());
});

app.post("/system/control", (req, res) => {
    const { value } = req.body;
    system.setControlOutput(value);
    res.json(system.getState());
});

app.post("/system/instability", (req, res) => {
    const { amount } = req.body;
    system.increaseInstability(amount);
    res.json(system.getState());
});

app.post("/system/disturbance", (req, res) => {
    const { amount } = req.body;
    system.addDisturbance(amount);
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

app.post("/simulation/start", (req, res) => {
    clientConnected();
    res.json({ simulation: "running", clients: connectedClients });
});

app.post("/simulation/stop", (req, res) => {
    clientDisconnected();
    res.json({ simulation: simulationInterval ? "running" : "paused", clients: connectedClients });
});

// ===========================================
// WEBSOCKET SERVERS
// ===========================================

const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

wss.on("connection", (ws) => {
    clientConnected();
    
    const interval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(system.getState()));
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

const tankWss = new WebSocketServer({ server: httpServer, path: "/ws/tank" });
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
    }, 1000);
    
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

    namespace.addVariable({
        componentOf: systemFolder,
        browseName: "ProcessValue",
        nodeId: "ns=1;s=ProcessValue",
        dataType: DataType.Double,
        value: { get: () => new Variant({ dataType: DataType.Double, value: system.processValue }) },
    });

    namespace.addVariable({
        componentOf: systemFolder,
        browseName: "Setpoint",
        nodeId: "ns=1;s=Setpoint",
        dataType: DataType.Double,
        value: { get: () => new Variant({ dataType: DataType.Double, value: system.setpoint }) },
    });

    namespace.addVariable({
        componentOf: systemFolder,
        browseName: "ControlOutput",
        nodeId: "ns=1;s=ControlOutput",
        dataType: DataType.Double,
        value: { get: () => new Variant({ dataType: DataType.Double, value: system.controlOutput }) },
    });

    namespace.addVariable({
        componentOf: systemFolder,
        browseName: "Error",
        nodeId: "ns=1;s=Error",
        dataType: DataType.Double,
        value: { get: () => new Variant({ dataType: DataType.Double, value: Math.abs(system.setpoint - system.processValue) }) },
    });

    const tankFolder = namespace.addFolder(addressSpace.rootFolder.objects, {
        browseName: "LiquidTank",
    });
    
    namespace.addVariable({
        componentOf: tankFolder,
        browseName: "LiquidFilling",
        nodeId: "ns=1;s=LiquidFilling",
        dataType: DataType.Boolean,
        value: { get: () => new Variant({ dataType: DataType.Boolean, value: tankSystem.liquidFilling }) },
    });
    
    namespace.addVariable({
        componentOf: tankFolder,
        browseName: "LiquidLevel",
        nodeId: "ns=1;s=LiquidLevel",
        dataType: DataType.Double,
        value: { get: () => new Variant({ dataType: DataType.Double, value: tankSystem.liquidLevel }) },
    });
    
    namespace.addVariable({
        componentOf: tankFolder,
        browseName: "LiquidLow",
        nodeId: "ns=1;s=LiquidLow",
        dataType: DataType.Boolean,
        value: { get: () => new Variant({ dataType: DataType.Boolean, value: tankSystem.liquidLow }) },
    });
    
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

createOPCUAServer().catch((err) => {
    logger.error("Failed to start OPC-UA server", { error: err.message });
});