'use client'

export default function TankComponent({ component, value }) {
  const displayValue = value !== null && value !== undefined ? value : 0
  const percentage = Math.max(0, Math.min(100, ((displayValue - component.min) / (component.max - component.min)) * 100))

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative'
    }}>
      {/* Tank container */}
      <div style={{
        flex: 1,
        width: '70%',
        position: 'relative',
        border: `${component.borderWidth}px solid ${component.borderColor}`,
        borderRadius: '0 0 8px 8px',
        overflow: 'hidden',
        background: component.emptyColor,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}>
        {/* Liquid fill */}
        <div style={{
          width: '100%',
          height: `${percentage}%`,
          background: component.fillColor,
          transition: 'height 0.5s',
          boxShadow: `0 -2px 10px ${component.fillColor}50`
        }} />
        
        {/* Value display */}
        {component.showValue && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '0 0 4px rgba(0,0,0,0.8)',
            zIndex: 10
          }}>
            {displayValue.toFixed(1)}%
          </div>
        )}
      </div>
      
      {/* Scale markers */}
      {component.showScale && (
        <div style={{
          position: 'absolute',
          right: '-30px',
          top: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontSize: '0.6rem',
          color: 'var(--text-tertiary)'
        }}>
          <div>100</div>
          <div>75</div>
          <div>50</div>
          <div>25</div>
          <div>0</div>
        </div>
      )}
    </div>
  )
}
