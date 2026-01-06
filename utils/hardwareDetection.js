export function detectHardwareCapabilities() {
  const capabilities = {
    tier: 'high',
    isMobile: false,
    deviceMemory: 8,
    hardwareConcurrency: 8,
    maxTextureSize: 4096,
    devicePixelRatio: 1
  }

  // Detect mobile
  capabilities.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  
  // Device memory (GB)
  if (navigator.deviceMemory) {
    capabilities.deviceMemory = navigator.deviceMemory
  }
  
  // CPU cores
  if (navigator.hardwareConcurrency) {
    capabilities.hardwareConcurrency = navigator.hardwareConcurrency
  }
  
  // Device pixel ratio
  capabilities.devicePixelRatio = window.devicePixelRatio || 1

  // WebGL capabilities
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        capabilities.renderer = renderer
      }
      capabilities.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
    }
  } catch (e) {
    console.warn('WebGL detection failed:', e)
  }

  // Determine tier
  if (capabilities.isMobile) {
    if (capabilities.deviceMemory <= 2 || capabilities.hardwareConcurrency <= 4) {
      capabilities.tier = 'low'
    } else if (capabilities.deviceMemory <= 4) {
      capabilities.tier = 'medium'
    } else {
      capabilities.tier = 'high'
    }
  } else {
    if (capabilities.deviceMemory <= 4 || capabilities.hardwareConcurrency <= 4) {
      capabilities.tier = 'medium'
    } else {
      capabilities.tier = 'high'
    }
  }

  // Check for specific low-end indicators
  if (capabilities.maxTextureSize < 2048) {
    capabilities.tier = 'low'
  }

  return capabilities
}

export function getQualityPreset(tier) {
  const presets = {
    low: {
      particleCount: 500,
      gridDivisions: 10,
      orbCount: 3,
      enableBloom: false,
      pointSize: 0.03,
      animationSpeed: 0.5,
      dpr: [1, 1],
      antialias: false
    },
    medium: {
      particleCount: 1000,
      gridDivisions: 15,
      orbCount: 4,
      enableBloom: false,
      pointSize: 0.02,
      animationSpeed: 0.75,
      dpr: [1, 1.5],
      antialias: false
    },
    high: {
      particleCount: 2000,
      gridDivisions: 20,
      orbCount: 5,
      enableBloom: true,
      pointSize: 0.02,
      animationSpeed: 1,
      dpr: [1, 2],
      antialias: true
    }
  }

  return presets[tier] || presets.medium
}

export class PerformanceMonitor {
  constructor(callback) {
    this.callback = callback
    this.frameCount = 0
    this.lastTime = performance.now()
    this.fps = 60
    this.samples = []
    this.maxSamples = 60
    this.checkInterval = 60 // Check every second (at 60fps)
  }

  update() {
    this.frameCount++
    const currentTime = performance.now()
    const delta = currentTime - this.lastTime

    if (this.frameCount >= this.checkInterval) {
      this.fps = (this.frameCount / delta) * 1000
      this.samples.push(this.fps)
      
      if (this.samples.length > this.maxSamples) {
        this.samples.shift()
      }

      const avgFps = this.samples.reduce((a, b) => a + b, 0) / this.samples.length

      // Always report current FPS
      this.callback('update', this.fps)

      // Check for quality changes
      if (avgFps < 30 && this.samples.length >= 10) {
        this.callback('downgrade', avgFps)
      } else if (avgFps > 55 && this.samples.length >= 30) {
        this.callback('upgrade', avgFps)
      }

      this.frameCount = 0
      this.lastTime = currentTime
    }
  }

  reset() {
    this.samples = []
    this.frameCount = 0
    this.lastTime = performance.now()
  }
}