'use client'

export default function LEDComponent({ component, value }) {
  // Calculate brightness based on proximity to onValue
  const targetValue = component.onValue || 1
  const actualValue = value !== null && value !== undefined ? value : 0
  const isOn = value !== null && value !== undefined && value >= (component.onValue || 1)
  const color = isOn ? component.onColor : component.offColor
  // Calculate how close we are to the target (0 to 1)
  let brightness = 0
  
  if (actualValue >= targetValue) {
    // At or above target - full brightness
    brightness = 1
  } else {
    // Below target - fade based on percentage
    // If targetValue is 100 and actualValue is 75, brightness = 0.75
    brightness = Math.max(0, Math.min(1, actualValue / targetValue))
  }
  
  // Interpolate between off and on colors
  const offColor = component.offColor || '#333333'
  const onColor = component.onColor || '#10b981'
  
  // Convert hex to RGB for interpolation
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }
  
  const offRgb = hexToRgb(offColor)
  const onRgb = hexToRgb(onColor)
  
  // Interpolate
  const r = Math.round(offRgb.r + (onRgb.r - offRgb.r) * brightness)
  const g = Math.round(offRgb.g + (onRgb.g - offRgb.g) * brightness)
  const b = Math.round(offRgb.b + (onRgb.b - offRgb.b) * brightness)
  
  const currentColor = `rgb(${r}, ${g}, ${b})`
  
  // Glow intensity based on brightness
  const glowIntensity = brightness * 40

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    }}>
      <div style={{
        width: component.shape === 'circle' ? '80%' : '80%',
        height: component.shape === 'circle' ? '80%' : '60%',
        maxWidth: '100px',
        maxHeight: '100px',
        background: currentColor,
        borderRadius: component.shape === 'circle' ? '50%' : '8px',
        boxShadow: brightness > 0.1 ? `0 0 ${glowIntensity}px ${currentColor}` : 'none',
        border: '3px solid rgba(255,255,255,0.3)',
        transition: 'all 0.3s ease-out'
      }} />
      {component.showLabel && component.label && (
        <div style={{
          fontSize: '0.7rem',
          color: 'var(--text-secondary)',
          textAlign: 'center'
        }}>
          {component.label}
        </div>
      )}
      {component.showValue && value !== null && value !== undefined && (
        <div style={{
          fontSize: '0.6rem',
          color: '#666',
          textAlign: 'center'
        }}>
          {value.toFixed(1)}
        </div>
      )}
    </div>
  )
}
