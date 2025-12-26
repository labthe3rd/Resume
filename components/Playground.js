'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, Activity, Cpu, Gauge, Thermometer, Zap } from 'lucide-react'

const generateRandomValue = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const IDEAL_RUN_RATE = 100; // The maximum speed the machine is designed for
const TARGET_AVAILABILITY = 0.98; // 98% uptime
const TARGET_QUALITY = 0.99; // 99% good product yield

const calculateValueFromAngle = (centerX, centerY, mouseX, mouseY, currentVal) => {
  // 1. Get raw angle (-180 to 180)
  const angle = Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI);
  
  // 2. Normalize to your specific 270° arc
  // Adding 225 aligns the 0 position with the South-West start of your SVG
  let normalizedAngle = (angle + 225) % 360;

  // 3. THE DEAD ZONE (The 90-degree gap at the bottom)
  // We use 270 as the hard limit for our arc. 
  // If the mouse enters the "empty" 90 degrees, we lock to the nearest end-stop.
  if (normalizedAngle < 10 || normalizedAngle > 300) {
    // If we were high, stay at 100. If we were low, stay at 0.
    return currentVal = 0;
  }

  // 4. Calculate Percentage
  const newValue = Math.round((normalizedAngle / 270) * 100);
  const clampedValue = Math.min(100, Math.max(0, newValue));

  // 5. JUMP PROTECTION
  // Rejects "impossible" jumps (like 0 to 80 in one frame)
  // if (Math.abs(clampedValue - currentVal) > 60) {
  //   return currentVal;
  // }

  return clampedValue;
};

export default function Playground() {
  const [targetSpeed, setTargetSpeed] = useState(0);
  const [isDragging, setIsDragging] = useState(false); //track mouse dragging
  const dialRef = useRef(null); // Reference to the dial container
  const targetSpeedRef = useRef(targetSpeed);
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [isRunning, setIsRunning] = useState(false)
  const [plcData, setPlcData] = useState({
    temperature: 72,
    pressure: 45,
    speed: 0,
    production: 0,
    oee: 0,
    status: 'STOPPED'
  })



  // 2. Sync Ref with State
  useEffect(() => {
    targetSpeedRef.current = targetSpeed;
  }, [targetSpeed]);

  // 3. PLC Scan Cycle
  useEffect(() => {
    let interval;
    if (isRunning) { // isRunning is now in scope
      interval = setInterval(() => {
        setPlcData(prev => {
          const liveTarget = targetSpeedRef.current;
          const speedStep = liveTarget > prev.speed ? 5 : -5;
          const currentSpeed = Math.abs(liveTarget - prev.speed) <= 5 
            ? liveTarget 
            : prev.speed + speedStep;
          const machineIsActive = currentSpeed > 1; // 1% threshold for noise
          return {
            ...prev,
            speed: currentSpeed,
            // NOISE GATING: If not active, values are rock-solid constants
            temperature: machineIsActive 
              ? Math.round(65 + (currentSpeed * 0.3) + generateRandomValue(-1, 2)) 
              : 72,
            pressure: machineIsActive 
              ? Math.round(20 + (currentSpeed * 0.4) + generateRandomValue(-2, 2)) 
              : 0,
            production: machineIsActive 
              ? prev.production + (currentSpeed > 20 ? 1 : 0) // Only produce if fast enough
              : prev.production,
            oee: machineIsActive ? Math.round((currentSpeed / 100) * 98) : 0,
            status: currentSpeed === 0 ? 'IDLE' : 'RUNNING'
          };
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

const handleStart = () => {
  // Reset production if starting from a fresh stop
  if (plcData.status === 'STOPPED') {
    setTargetSpeed(75); // Set the dial first
  }
  setIsRunning(true); // Then enable the "PLC Scan"
  setPlcData(prev => ({ ...prev, status: 'STARTING...' }));
};

  const handleStop = () => {
    setIsRunning(false)
    setPlcData(prev => ({ ...prev, speed: 0, status: 'STOPPED' }))
  }

  const handleReset = () => {
    setIsRunning(false)
    setPlcData({
      temperature: 72,
      pressure: 45,
      speed: 0,
      production: 0,
      status: 'STOPPED'
    })
  }

  const getStatusColor = () => {
    switch (plcData.status) {
      case 'RUNNING': return '#10b981'
      case 'STARTING...': return '#f97316'
      default: return '#ef4444'
    }
  }
// Dial movement
const handleDialMove = (e) => {
  if (!isRunning) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  // Pass current targetSpeed to check for jumps
  const newValue = calculateValueFromAngle(centerX, centerY, e.clientX, e.clientY, targetSpeed);
  setTargetSpeed(newValue);
};

// Function to handle the calculation logic
  const handleMove = (clientX, clientY) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const newValue = calculateValueFromAngle(centerX, centerY, clientX, clientY, targetSpeed);
    setTargetSpeed(newValue);
  };

// Attach global listeners when dragging starts
  useEffect(() => {
    const onMouseMove = (e) => {
      if (isDragging) handleMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  return (
    <section
      id="playground"
      ref={ref}
      style={{
        padding: '8rem 2rem',
        position: 'relative'
      }}
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          style={{ marginBottom: '3rem' }}
        >
          <span className="section-subtitle">Interactive Demo</span>
          <h2 className="section-title">
            PLC <span className="gradient-text">Playground</span>
          </h2>
          <p style={{
            color: 'var(--text-secondary)',
            maxWidth: 600,
            marginTop: '1rem'
          }}>
            Experience a simulated industrial control system. Start the line and watch real-time metrics update.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass-card"
          style={{
            padding: '2rem',
            maxWidth: 900,
            margin: '0 auto'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: getStatusColor(),
                boxShadow: `0 0 20px ${getStatusColor()}`,
                animation: isRunning ? 'pulse 1s infinite' : 'none'
              }} />
              <span className="mono" style={{
                color: getStatusColor(),
                fontWeight: 600,
                fontSize: '0.875rem'
              }}>
                {plcData.status}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {!isRunning ? (
                <motion.button
                  onClick={handleStart}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #00d4ff 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'var(--bg-primary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Space Grotesk, sans-serif'
                  }}
                >
                  <Play size={18} />
                  Start Line
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleStop}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Space Grotesk, sans-serif'
                  }}
                >
                  <Pause size={18} />
                  Stop Line
                </motion.button>
              )}

              <motion.button
                onClick={handleReset}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'Space Grotesk, sans-serif'
                }}
              >
                <RotateCcw size={18} />
                Reset
              </motion.button>
            </div>
          </div>

        <div className="dial-container" style={{ textAlign: 'center', padding: '20px' }}>
      <label className="mono" style={{ display: 'block', marginBottom: '1rem', color: 'var(--accent-cyan)' }}>
        ROTARY SPEED POTENTIOMETER
      </label>
        <div 
          ref={dialRef}
          onMouseDown={(e) => {
            if (!isRunning) return;
            setIsDragging(true);
            handleMove(e.clientX, e.clientY); // Initial click sets value
          }}
          style={{
            width: '120px',
            height: '120px',
            margin: '0 auto',
            position: 'relative',
            cursor: isRunning ? 'grabbing' : 'not-allowed',
            touchAction: 'none' // Prevents scrolling while dragging on mobile
          }}
        >
          {/* SVG Code from previous step goes here */}
       
      {/* The Dial SVG */}
      <div 
        onMouseMove={(e) => e.buttons === 1 && handleDialMove(e)} // Only move if clicking
        onClick={handleDialMove}
        style={{
          width: '120px',
          height: '120px',
          margin: '0 auto',
          position: 'relative',
          cursor: isRunning ? 'pointer' : 'not-allowed'
        }}
      >
      <svg viewBox="0 0 100 100" style={{ transform: 'rotate(135deg)', overflow: 'visible' }}>
        {/* Background Track - Only 270 degrees */}
        <circle 
          cx="50" cy="50" r="40" fill="none" 
          stroke="rgba(255,255,255,0.1)" 
          strokeWidth="8" 
          strokeDasharray="188.5 251.3" // 188.5 is exactly 270 degrees of a 40r circle
          strokeLinecap="round"
        />
        {/* Active Value Track - Clamped to prevent "ghost" lines */}
        <circle 
          cx="50" cy="50" r="40" fill="none" 
          // If speed is 0, hide the stroke entirely to prevent the "ghost dot"
          stroke={targetSpeed > 0 ? "var(--accent-cyan)" : "transparent"} 
          strokeWidth="8" 
          // Clamping math to ensure no overflow
          strokeDasharray={`${Math.max(0, (targetSpeed / 100) * 188.5)} 251.3`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.1s linear, stroke 0.2s' }}
        />
      </svg>
        
        {/* The Physical "Knob" indicator */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: '60px', height: '60px',
          background: '#1a1a1a',
          borderRadius: '50%',
          border: '2px solid #333',
          transform: `translate(-50%, -50%) rotate(${(targetSpeed * 2.7) - 135}deg)`,
          boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
        }}>
          <div style={{ width: '4px', height: '15px', background: 'var(--accent-cyan)', margin: '0 auto', borderRadius: '2px' }} />
        </div>
      </div>
      
      <div style={{ marginTop: '1rem', fontWeight: 'bold', color: 'white' }}>{targetSpeed}%</div>
    </div>
    </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1.5rem'
          }}>
            <MetricCard
              icon={Thermometer}
              label="Temperature"
              value={plcData.temperature}
              unit="°F"
              color="#f97316"
              min={65}
              max={95}
              isRunning={isRunning}
            />
            <MetricCard
              icon={Gauge}
              label="Pressure"
              value={plcData.pressure}
              unit="PSI"
              color="#3b82f6"
              min={30}
              max={60}
              isRunning={isRunning}
            />
            <MetricCard
              icon={Activity}
              label="Line Speed"
              value={plcData.speed}
              unit="%"
              color="#10b981"
              min={0}
              max={100}
              isRunning={isRunning}
            />
            <MetricCard
              icon={Zap}
              label="Production"
              value={plcData.production}
              unit="units"
              color="#a855f7"
              isCounter
              isRunning={isRunning}
            />
            <MetricCard
            icon={Gauge}
            label="OEE (Live)"
            value={plcData.oee}
            unit="%"
            color="#facc15" // Gold for performance
            min={0}
            max={100}
            isRunning={isRunning}
          />
          </div>

          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.75rem'
          }}>
            <div style={{ color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
              // PLC Tag Monitor
            </div>
            <div style={{ color: '#10b981' }}>
              Program:MainProgram.Temperature := {plcData.temperature};
            </div>
            <div style={{ color: '#3b82f6' }}>
              Program:MainProgram.Pressure := {plcData.pressure};
            </div>
            <div style={{ color: '#f97316' }}>
              Program:MainProgram.LineSpeed := {plcData.speed};
            </div>
            <div style={{ color: '#a855f7' }}>
              Program:MainProgram.ProductionCount := {plcData.production};
            </div>
            <div style={{ color: '#facc15' }}>
              Program:MainProgram.OEE := {plcData.oee};
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function MetricCard({ icon: Icon, label, value, unit, color, min, max, isCounter, isRunning }) {
  const percentage = isCounter ? 100 : ((value - min) / (max - min)) * 100

  return (
    <div style={{
      padding: '1.5rem',
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '12px',
      border: '1px solid var(--glass-border)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1rem'
      }}>
        <Icon size={20} style={{ color }} />
        <span style={{
          fontSize: '0.75rem',
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>
          {label}
        </span>
      </div>

      <div style={{
        fontFamily: 'Syne, sans-serif',
        fontSize: '2rem',
        fontWeight: 700,
        color,
        marginBottom: '0.5rem'
      }}>
        {value}
        <span style={{ fontSize: '1rem', color: 'var(--text-tertiary)', marginLeft: '0.25rem' }}>
          {unit}
        </span>
      </div>

      {!isCounter && (
        <div style={{
          height: 4,
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          overflow: 'hidden'
        }}>
          <motion.div
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.3 }}
            style={{
              height: '100%',
              background: color,
              borderRadius: 2
            }}
          />
        </div>
      )}
    </div>
  )
}
