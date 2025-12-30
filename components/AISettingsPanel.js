'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sliders,
  Brain,
  Shield,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

const DEFAULT_SETTINGS = {
  // AI Response Timing
  reasoningInterval: 3000,
  pidChangeCooldownMs: 8000,

  // PID Constraints
  maxPidStep: { kp: 0.5, ki: 0.03, kd: 0.5 },
  pidRanges: {
    kp: { min: 0.1, max: 10 },
    ki: { min: 0.01, max: 1 },
    kd: { min: 0.1, max: 5 }
  },

  // Stability Thresholds
  stableDeadband: 1.0,
  maxOscillationWhenStable: 0.2,

  // Hallucination Detection
  hallucinationThresholds: {
    perplexity: 25.0,
    shannonEntropy: 1.5,
    zScoreCritical: 3.0,
    zScoreWarning: 2.0,
    semanticEntropy: 1.0
  },

  // AI Prompt Template
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
}

function SettingsSection({ title, icon: Icon, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      marginBottom: '1rem',
      overflow: 'hidden'
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.02)',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon size={16} style={{ color: '#00d4ff' }} />
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{title}</span>
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isOpen && (
        <div style={{ padding: '1rem' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function NumberInput({ label, value, onChange, min, max, step = 1, unit = '', hint = '' }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{
        display: 'block',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        marginBottom: '0.25rem'
      }}>
        {label}
        {hint && <span style={{ color: 'var(--text-tertiary)', marginLeft: '0.5rem' }}>({hint})</span>}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          style={{
            flex: 1,
            padding: '0.5rem',
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            fontFamily: 'monospace'
          }}
        />
        {unit && <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{unit}</span>}
      </div>
    </div>
  )
}

function TextAreaInput({ label, value, onChange, rows = 8, hint = '' }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{
        display: 'block',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        marginBottom: '0.25rem'
      }}>
        {label}
        {hint && <span style={{ color: 'var(--text-tertiary)', marginLeft: '0.5rem' }}>({hint})</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '6px',
          color: 'var(--text-primary)',
          fontSize: '0.8rem',
          fontFamily: 'monospace',
          resize: 'vertical',
          lineHeight: 1.4
        }}
      />
    </div>
  )
}

export default function AISettingsPanel({ onSettingsChange }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [originalSettings, setOriginalSettings] = useState(DEFAULT_SETTINGS)
  const [saveStatus, setSaveStatus] = useState(null) // 'saving', 'success', 'error'
  const [showConfirm, setShowConfirm] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [loading, setLoading] = useState(true)

  const getApiUrl = () => {
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    return process.env.NEXT_PUBLIC_API_URL || (isLocal ? 'http://localhost:3101' : '/msg')
  }

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings)
    setHasChanges(changed)
    if (onSettingsChange) {
      onSettingsChange(settings)
    }
  }, [settings, originalSettings, onSettingsChange])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${getApiUrl()}/settings`)
      if (res.ok) {
        const data = await res.json()
        if (data.settings) {
          setSettings(data.settings)
          setOriginalSettings(data.settings)
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
    setLoading(false)
  }

  const saveSettings = async () => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`${getApiUrl()}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      })

      if (res.ok) {
        setSaveStatus('success')
        setOriginalSettings(settings)
        setShowConfirm(false)
        setTimeout(() => setSaveStatus(null), 2000)
      } else {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus(null), 3000)
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS)
  }

  const updateSetting = (path, value) => {
    setSettings(prev => {
      const newSettings = JSON.parse(JSON.stringify(prev))
      const keys = path.split('.')
      let current = newSettings
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      return newSettings
    })
  }

  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: 'var(--text-secondary)'
      }}>
        <RefreshCw size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
        <div>Loading settings...</div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        padding: '0.75rem 1rem',
        background: 'rgba(0,212,255,0.1)',
        border: '1px solid rgba(0,212,255,0.3)',
        borderRadius: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={20} style={{ color: '#00d4ff' }} />
          <span style={{ fontWeight: 600 }}>AI Configuration</span>
          {hasChanges && (
            <span style={{
              fontSize: '0.65rem',
              padding: '0.2rem 0.5rem',
              background: '#fbbf2440',
              border: '1px solid #fbbf24',
              borderRadius: '4px',
              color: '#fbbf24'
            }}>
              Unsaved Changes
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={resetToDefaults}
            style={{
              padding: '0.4rem 0.75rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <RefreshCw size={12} /> Reset
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowConfirm(true)}
            disabled={!hasChanges || saveStatus === 'saving'}
            style={{
              padding: '0.4rem 0.75rem',
              background: hasChanges ? '#10b98130' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${hasChanges ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '6px',
              color: hasChanges ? '#10b981' : 'var(--text-tertiary)',
              fontSize: '0.75rem',
              cursor: hasChanges ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            {saveStatus === 'saving' ? (
              <><RefreshCw size={12} className="spin" /> Saving...</>
            ) : saveStatus === 'success' ? (
              <><CheckCircle size={12} /> Saved!</>
            ) : saveStatus === 'error' ? (
              <><AlertTriangle size={12} /> Error</>
            ) : (
              <><Save size={12} /> Save</>
            )}
          </motion.button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '400px',
              width: '90%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={20} style={{ color: '#fbbf24' }} />
              <span style={{ fontWeight: 600 }}>Confirm Save</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              This will save the current settings to disk and create a backup. The AI agent will use these new settings immediately.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowConfirm(false)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={saveSettings}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#10b98130',
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  color: '#10b981',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Save size={14} /> Save Settings
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Settings Sections */}
      <SettingsSection title="AI Response Timing" icon={Clock}>
        <NumberInput
          label="Reasoning Interval"
          value={settings.reasoningInterval}
          onChange={(v) => updateSetting('reasoningInterval', v)}
          min={500}
          max={30000}
          step={100}
          unit="ms"
          hint="How often AI reasons about PID"
        />
        <NumberInput
          label="PID Change Cooldown"
          value={settings.pidChangeCooldownMs}
          onChange={(v) => updateSetting('pidChangeCooldownMs', v)}
          min={1000}
          max={60000}
          step={500}
          unit="ms"
          hint="Minimum time between PID adjustments"
        />
      </SettingsSection>

      <SettingsSection title="PID Constraints" icon={Sliders}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
            Maximum Step Size (per adjustment)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <NumberInput
              label="Kp Step"
              value={settings.maxPidStep.kp}
              onChange={(v) => updateSetting('maxPidStep.kp', v)}
              min={0.01}
              max={2}
              step={0.01}
            />
            <NumberInput
              label="Ki Step"
              value={settings.maxPidStep.ki}
              onChange={(v) => updateSetting('maxPidStep.ki', v)}
              min={0.001}
              max={0.1}
              step={0.001}
            />
            <NumberInput
              label="Kd Step"
              value={settings.maxPidStep.kd}
              onChange={(v) => updateSetting('maxPidStep.kd', v)}
              min={0.01}
              max={2}
              step={0.01}
            />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
            PID Value Ranges
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            <NumberInput
              label="Kp Min"
              value={settings.pidRanges.kp.min}
              onChange={(v) => updateSetting('pidRanges.kp.min', v)}
              min={0.01}
              max={5}
              step={0.01}
            />
            <NumberInput
              label="Kp Max"
              value={settings.pidRanges.kp.max}
              onChange={(v) => updateSetting('pidRanges.kp.max', v)}
              min={1}
              max={50}
              step={0.5}
            />
            <NumberInput
              label="Ki Min"
              value={settings.pidRanges.ki.min}
              onChange={(v) => updateSetting('pidRanges.ki.min', v)}
              min={0.001}
              max={0.5}
              step={0.001}
            />
            <NumberInput
              label="Ki Max"
              value={settings.pidRanges.ki.max}
              onChange={(v) => updateSetting('pidRanges.ki.max', v)}
              min={0.1}
              max={5}
              step={0.1}
            />
            <NumberInput
              label="Kd Min"
              value={settings.pidRanges.kd.min}
              onChange={(v) => updateSetting('pidRanges.kd.min', v)}
              min={0.01}
              max={2}
              step={0.01}
            />
            <NumberInput
              label="Kd Max"
              value={settings.pidRanges.kd.max}
              onChange={(v) => updateSetting('pidRanges.kd.max', v)}
              min={1}
              max={20}
              step={0.5}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Stability Thresholds" icon={Brain}>
        <NumberInput
          label="Stable Deadband"
          value={settings.stableDeadband}
          onChange={(v) => updateSetting('stableDeadband', v)}
          min={0.1}
          max={10}
          step={0.1}
          unit="°C"
          hint="Error tolerance when considered stable"
        />
        <NumberInput
          label="Max Oscillation When Stable"
          value={settings.maxOscillationWhenStable}
          onChange={(v) => updateSetting('maxOscillationWhenStable', v)}
          min={0.05}
          max={1}
          step={0.05}
          hint="Maximum allowed oscillation (0-1)"
        />
      </SettingsSection>

      <SettingsSection title="Hallucination Detection" icon={Shield} defaultOpen={false}>
        <NumberInput
          label="Perplexity Threshold"
          value={settings.hallucinationThresholds.perplexity}
          onChange={(v) => updateSetting('hallucinationThresholds.perplexity', v)}
          min={5}
          max={100}
          step={1}
          hint="Higher = more tolerance"
        />
        <NumberInput
          label="Shannon Entropy Threshold"
          value={settings.hallucinationThresholds.shannonEntropy}
          onChange={(v) => updateSetting('hallucinationThresholds.shannonEntropy', v)}
          min={0.5}
          max={5}
          step={0.1}
          unit="bits"
          hint="Decision uncertainty limit"
        />
        <NumberInput
          label="Z-Score Critical"
          value={settings.hallucinationThresholds.zScoreCritical}
          onChange={(v) => updateSetting('hallucinationThresholds.zScoreCritical', v)}
          min={1}
          max={5}
          step={0.1}
          hint="Triggers migration"
        />
        <NumberInput
          label="Z-Score Warning"
          value={settings.hallucinationThresholds.zScoreWarning}
          onChange={(v) => updateSetting('hallucinationThresholds.zScoreWarning', v)}
          min={0.5}
          max={4}
          step={0.1}
          hint="Warning threshold"
        />
      </SettingsSection>

      <SettingsSection title="AI Prompt Template" icon={FileText} defaultOpen={false}>
        <TextAreaInput
          label="Prompt Template"
          value={settings.promptTemplate}
          onChange={(v) => updateSetting('promptTemplate', v)}
          rows={12}
          hint="Use placeholders: {processValue}, {setpoint}, {error}, etc."
        />
        <div style={{
          fontSize: '0.7rem',
          color: 'var(--text-tertiary)',
          marginTop: '0.5rem',
          padding: '0.5rem',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '4px'
        }}>
          <strong>Available placeholders:</strong><br />
          {'{processValue}'}, {'{setpoint}'}, {'{error}'}, {'{stability}'}, {'{oscillation}'}, {'{smoothness}'},
          {'{kp}'}, {'{ki}'}, {'{kd}'}, {'{experienceMemory}'}, {'{userInstructions}'}, {'{oscillationHint}'}, {'{smoothnessHint}'}
        </div>
      </SettingsSection>

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
