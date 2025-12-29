/**
 * UnstableProcess.js
 * 
 * A high-fidelity simulation of an Unstable First-Order Plus Dead Time (UFOPDT) system.
 * Designed for stress-testing automated tuning algorithms under Linear Time-Varying (LTV) conditions.
 * 
 * Mathematical Model (Discrete ZOH):
 * y[k] = alpha[k] * y[k-1] + beta[k] * u[k - d[k]
 * 
 * Where:
 * - alpha[k] = exp(Ts / tau[k])
 * - beta[k]  = K[k] * (alpha[k] - 1)
 * - d[k]     = floor(theta[k] / Ts)
 */

class UnstableSystem {
  constructor() {
    // UI/display PV (0-100). Underlying UFOPDT output is rawProcessValue.
    this.processValue = 50.0;
    this.rawProcessValue = 0.0;

    this.setpoint = 50.0;
    this.controlOutput = 50.0;

    // Kept for UI compatibility; used to scale disturbances + parameter ranges
    this.instabilityRate = 0.1;

    // Input-side disturbance terms (UFOPDT model remains untouched)
    this.noiseAmplitude = 2.0;
    this.oscillationFreq = 0.05;
    this.oscillationAmp = 5.0;

    this.disturbance = 0.0;
    this.disturbanceDecay = 0.95;

    // PV shown to UI = clamp(displayOffset + rawY, 0..100)
    this.displayOffset = 50.0;

    // “Momentum” kept for UI compatibility (rate-of-change of displayed PV)
    this.momentum = 0.0;

    this.tick = 0;
    this.lastUpdate = Date.now();
    this._prevProcessValue = this.processValue;

    this.history = [];
    this.maxHistory = 100;

    this.agentActive = true;

    // UFOPDT model (UnstableProcess.js) — formula stays in that file.
    this.ufopdt = new UnstableProcess(0.1, 60.0, 1e6);
    this.ufopdtParams = { K: 1.0, tau: 10.0, theta: 2.0, alpha: null, lastRandomizedAt: null };

    // Randomize once on startup
    this.randomizeUfopdtParameters("startup");
  }

  // Randomize UFOPDT parameters every 5 minutes
  randomizeUfopdtParameters(reason = "interval") {
    const rand = (min, max) => min + Math.random() * (max - min);

    const s = Math.max(0.1, Math.min(1.0, this.instabilityRate));

    const Kmag = rand(0.5, 4.0 * (0.75 + s));
    const K = (Math.random() < 0.5 ? -1 : 1) * Kmag;

    // tau > 0 (UnstableProcess enforces internally)
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

    // Build UFOPDT input u[k]
    const drift = (Math.random() - 0.5) * this.instabilityRate * 10;
    const noise = (Math.random() - 0.5) * this.noiseAmplitude;
    const oscillation = Math.sin(this.tick * this.oscillationFreq) * this.oscillationAmp;

    const envDisturbance = drift + noise + oscillation + this.disturbance;
    const agentU = this.agentActive ? (this.controlOutput - 50) * 0.5 : 0.0;

    const u = envDisturbance + agentU;

    // UFOPDT step (formula is inside UnstableProcess.js)
    const result = this.ufopdt.step(u);

    this.rawProcessValue = result.y;

    // Map to UI PV domain (0..100) without changing UFOPDT internals
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
      ufopdt: { K: this.ufopdtParams.K, tau: this.ufopdtParams.tau, theta: this.ufopdtParams.theta, alpha: this.ufopdtParams.alpha },
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


export default UnstableProcess;
export { UnstableProcess };