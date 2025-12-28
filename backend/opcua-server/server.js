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

    await server.start();
    logger.info("OPC-UA Server started", { port, endpoint: server.getEndpointUrl() });

    return server;
}

// Start everything
createOPCUAServer().catch((err) => {
    logger.error("Failed to start OPC-UA server", { error: err.message });
});
