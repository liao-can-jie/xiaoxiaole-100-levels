import { useEffect, useRef } from 'react'
import type { Position, SpecialType } from '../game/types'
import useReducedMotion from '../hooks/useReducedMotion'

export type BoardFxKind = 'invalid' | 'match' | 'combo' | 'reshuffle' | 'win' | 'lose' | 'special-created'

export type BoardFxSignal = {
  id: number
  kind: BoardFxKind
  intensity: number
  rows: number
  columns: number
  from?: Position
  to?: Position
  specialType?: SpecialType
}

type ParticleShape = 'orb' | 'shard' | 'streak'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  maxLife: number
  color: [number, number, number]
  glow: [number, number, number]
  shape: ParticleShape
  rotation: number
  spin: number
  stretch: number
}

type Ripple = {
  x: number
  y: number
  radius: number
  maxRadius: number
  alpha: number
  color: [number, number, number]
  lineWidth: number
}

type GlowPulse = {
  x: number
  y: number
  radius: number
  alpha: number
  maxRadius: number
  color: [number, number, number]
}

type PaletteEntry = {
  base: [number, number, number]
  glow: [number, number, number]
  accent: [number, number, number]
}

const palette: Record<BoardFxKind, PaletteEntry> = {
  invalid: { base: [251, 113, 133], glow: [248, 113, 113], accent: [255, 228, 230] },
  match: { base: [125, 211, 252], glow: [96, 165, 250], accent: [224, 242, 254] },
  combo: { base: [216, 180, 254], glow: [192, 132, 252], accent: [233, 213, 255] },
  reshuffle: { base: [251, 191, 36], glow: [250, 204, 21], accent: [254, 249, 195] },
  win: { base: [74, 222, 128], glow: [45, 212, 191], accent: [220, 252, 231] },
  lose: { base: [248, 113, 113], glow: [244, 114, 182], accent: [254, 205, 211] },
  'special-created': { base: [250, 204, 21], glow: [244, 114, 182], accent: [224, 231, 255] },
}

function rgba(color: [number, number, number], alpha: number) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${Math.max(0, Math.min(1, alpha))})`
}

function tileCenter(position: Position, width: number, height: number, rows: number, columns: number) {
  return {
    x: ((position.col + 0.5) / columns) * width,
    y: ((position.row + 0.5) / rows) * height,
  }
}

function pushBurst(
  particles: Particle[],
  center: { x: number; y: number },
  amount: number,
  intensity: number,
  colors: PaletteEntry,
  preferredShape: ParticleShape,
) {
  for (let index = 0; index < amount; index += 1) {
    const angle = (Math.PI * 2 * index) / amount + Math.random() * 0.7
    const speed = 1.8 + Math.random() * (preferredShape === 'streak' ? 5.8 : 4.2) + intensity * 1.2
    const randomShape = preferredShape === 'orb' && Math.random() > 0.55 ? 'shard' : preferredShape

    particles.push({
      x: center.x,
      y: center.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * (preferredShape === 'streak' ? 3.2 : 4.8),
      life: 420 + Math.random() * 520 + intensity * 80,
      maxLife: 420 + Math.random() * 520 + intensity * 80,
      color: Math.random() > 0.6 ? colors.accent : colors.base,
      glow: colors.glow,
      shape: randomShape,
      rotation: Math.random() * Math.PI * 2,
      spin: -0.08 + Math.random() * 0.16,
      stretch: randomShape === 'streak' ? 3 + Math.random() * 3 : 1.4 + Math.random() * 1.8,
    })
  }
}

export default function BoardFxCanvas({
  rows,
  columns,
  selected,
  signal,
}: {
  rows: number
  columns: number
  selected: Position | null
  signal: BoardFxSignal | null
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const ripplesRef = useRef<Ripple[]>([])
  const glowPulsesRef = useRef<GlowPulse[]>([])
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    let animationFrame = 0
    let lastTime = performance.now()
    let width = 0
    let height = 0

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      width = bounds.width
      height = bounds.height
      canvas.width = Math.max(1, Math.floor(bounds.width * dpr))
      canvas.height = Math.max(1, Math.floor(bounds.height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resizeCanvas()
    const observer = new ResizeObserver(resizeCanvas)
    observer.observe(canvas)

    const renderFrame = (time: number) => {
      const delta = Math.min(32, time - lastTime)
      lastTime = time

      context.clearRect(0, 0, width, height)
      context.save()
      context.globalCompositeOperation = 'screen'

      if (selected) {
        const center = tileCenter(selected, width, height, rows, columns)
        const pulse = reducedMotion ? 1 : 1 + Math.sin(time * 0.01) * 0.12
        const radius = Math.min(width / columns, height / rows) * 0.42 * pulse

        context.beginPath()
        context.strokeStyle = 'rgba(191, 219, 254, 0.84)'
        context.lineWidth = 2.5
        context.shadowColor = 'rgba(125, 211, 252, 0.75)'
        context.shadowBlur = 18
        context.arc(center.x, center.y, radius, 0, Math.PI * 2)
        context.stroke()

        context.beginPath()
        context.strokeStyle = 'rgba(224, 242, 254, 0.25)'
        context.lineWidth = 6
        context.shadowColor = 'rgba(56, 189, 248, 0.35)'
        context.shadowBlur = 14
        context.arc(center.x, center.y, radius * 1.12, 0, Math.PI * 2)
        context.stroke()
      }

      for (const ripple of ripplesRef.current) {
        ripple.radius += (ripple.maxRadius / 420) * delta
        ripple.alpha -= 0.0026 * delta
      }

      ripplesRef.current = ripplesRef.current.filter((ripple) => ripple.alpha > 0)

      for (const pulse of glowPulsesRef.current) {
        pulse.radius += (pulse.maxRadius / 500) * delta
        pulse.alpha -= 0.0022 * delta
      }

      glowPulsesRef.current = glowPulsesRef.current.filter((pulse) => pulse.alpha > 0)

      for (const pulse of glowPulsesRef.current) {
        const gradient = context.createRadialGradient(pulse.x, pulse.y, pulse.radius * 0.2, pulse.x, pulse.y, pulse.radius)
        gradient.addColorStop(0, rgba(pulse.color, pulse.alpha * 0.5))
        gradient.addColorStop(0.5, rgba(pulse.color, pulse.alpha * 0.18))
        gradient.addColorStop(1, rgba(pulse.color, 0))
        context.fillStyle = gradient
        context.beginPath()
        context.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2)
        context.fill()
      }

      for (const ripple of ripplesRef.current) {
        context.beginPath()
        context.strokeStyle = rgba(ripple.color, ripple.alpha)
        context.lineWidth = ripple.lineWidth
        context.shadowColor = rgba(ripple.color, Math.min(1, ripple.alpha + 0.1))
        context.shadowBlur = 18
        context.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2)
        context.stroke()
      }

      for (const particle of particlesRef.current) {
        particle.life -= delta
        particle.x += particle.vx * (delta / 16)
        particle.y += particle.vy * (delta / 16)
        particle.vx *= particle.shape === 'streak' ? 0.992 : 0.985
        particle.vy *= particle.shape === 'streak' ? 0.992 : 0.985
        particle.rotation += particle.spin * (delta / 16)
      }

      particlesRef.current = particlesRef.current.filter((particle) => particle.life > 0)

      for (const particle of particlesRef.current) {
        const alpha = Math.max(0, particle.life / particle.maxLife)
        context.save()
        context.translate(particle.x, particle.y)
        context.rotate(particle.rotation)
        context.fillStyle = rgba(particle.color, alpha)
        context.strokeStyle = rgba(particle.glow, alpha * 0.9)
        context.shadowColor = rgba(particle.glow, 0.8)
        context.shadowBlur = particle.size * 9

        if (particle.shape === 'orb') {
          context.beginPath()
          context.arc(0, 0, particle.size * alpha, 0, Math.PI * 2)
          context.fill()
        } else if (particle.shape === 'shard') {
          const widthScale = particle.size * particle.stretch * alpha
          const heightScale = particle.size * 1.25 * alpha
          context.beginPath()
          context.moveTo(0, -heightScale)
          context.lineTo(widthScale * 0.55, 0)
          context.lineTo(0, heightScale)
          context.lineTo(-widthScale * 0.55, 0)
          context.closePath()
          context.fill()
        } else {
          const length = particle.size * particle.stretch * alpha
          context.beginPath()
          context.moveTo(-length * 0.7, -particle.size * 0.4)
          context.lineTo(length, 0)
          context.lineTo(-length * 0.7, particle.size * 0.4)
          context.closePath()
          context.fill()
        }

        context.restore()
      }

      context.restore()
      animationFrame = window.requestAnimationFrame(renderFrame)
    }

    animationFrame = window.requestAnimationFrame(renderFrame)

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(animationFrame)
    }
  }, [columns, reducedMotion, rows, selected])

  useEffect(() => {
    if (!signal) {
      return
    }

    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const bounds = canvas.getBoundingClientRect()
    const originPosition = signal.to ?? signal.from
    const center = originPosition
      ? tileCenter(originPosition, bounds.width, bounds.height, signal.rows, signal.columns)
      : { x: bounds.width / 2, y: bounds.height / 2 }
    const boardCenter = { x: bounds.width / 2, y: bounds.height / 2 }
    const colors = palette[signal.kind]
    const rippleSize = Math.min(bounds.width / signal.columns, bounds.height / signal.rows) * (1.25 + signal.intensity * 0.25)
    const particleCount = reducedMotion
      ? Math.max(10, Math.round(signal.intensity * 8))
      : Math.max(22, Math.round(signal.intensity * 20))

    ripplesRef.current.push({
      x: center.x,
      y: center.y,
      radius: Math.min(bounds.width, bounds.height) * 0.03,
      maxRadius: rippleSize,
      alpha: 0.85,
      color: colors.base,
      lineWidth: signal.kind === 'combo' || signal.kind === 'win' ? 4 : 2.6,
    })

    glowPulsesRef.current.push({
      x: center.x,
      y: center.y,
      radius: Math.min(bounds.width, bounds.height) * 0.04,
      maxRadius: rippleSize * 1.3,
      alpha: signal.kind === 'win' ? 0.48 : 0.34,
      color: colors.glow,
    })

    if (signal.kind === 'combo') {
      ripplesRef.current.push({
        x: center.x,
        y: center.y,
        radius: Math.min(bounds.width, bounds.height) * 0.02,
        maxRadius: rippleSize * 1.35,
        alpha: 0.68,
        color: colors.accent,
        lineWidth: 2.4,
      })
      glowPulsesRef.current.push({
        x: center.x,
        y: center.y,
        radius: Math.min(bounds.width, bounds.height) * 0.03,
        maxRadius: rippleSize * 1.8,
        alpha: 0.28,
        color: colors.base,
      })
    }

    if (signal.kind === 'win') {
      ripplesRef.current.push({
        x: boardCenter.x,
        y: boardCenter.y,
        radius: Math.min(bounds.width, bounds.height) * 0.05,
        maxRadius: Math.min(bounds.width, bounds.height) * 0.48,
        alpha: 0.72,
        color: colors.accent,
        lineWidth: 5,
      })
      ripplesRef.current.push({
        x: boardCenter.x,
        y: boardCenter.y,
        radius: Math.min(bounds.width, bounds.height) * 0.035,
        maxRadius: Math.min(bounds.width, bounds.height) * 0.62,
        alpha: 0.55,
        color: colors.glow,
        lineWidth: 3.2,
      })
      glowPulsesRef.current.push({
        x: boardCenter.x,
        y: boardCenter.y,
        radius: Math.min(bounds.width, bounds.height) * 0.08,
        maxRadius: Math.min(bounds.width, bounds.height) * 0.68,
        alpha: 0.34,
        color: colors.base,
      })
    }

    if (signal.kind === 'invalid') {
      ripplesRef.current.push({
        x: center.x,
        y: center.y,
        radius: Math.min(bounds.width, bounds.height) * 0.02,
        maxRadius: rippleSize * 0.72,
        alpha: 0.65,
        color: colors.accent,
        lineWidth: 2,
      })
    }

    if (signal.kind === 'reshuffle') {
      ripplesRef.current.push({
        x: boardCenter.x,
        y: boardCenter.y,
        radius: Math.min(bounds.width, bounds.height) * 0.04,
        maxRadius: Math.min(bounds.width, bounds.height) * 0.44,
        alpha: 0.42,
        color: colors.base,
        lineWidth: 2.8,
      })
    }

    if (signal.kind === 'special-created') {
      ripplesRef.current.push({
        x: center.x,
        y: center.y,
        radius: Math.min(bounds.width, bounds.height) * 0.018,
        maxRadius: rippleSize * 1.1,
        alpha: 0.74,
        color: colors.accent,
        lineWidth: signal.specialType === 'rainbow' ? 5 : 3,
      })
      glowPulsesRef.current.push({
        x: center.x,
        y: center.y,
        radius: Math.min(bounds.width, bounds.height) * 0.025,
        maxRadius: rippleSize * 1.45,
        alpha: 0.3,
        color: signal.specialType === 'rainbow' ? colors.accent : colors.glow,
      })
    }

    pushBurst(
      particlesRef.current,
      center,
      particleCount,
      signal.intensity,
      colors,
      signal.kind === 'combo' || signal.kind === 'win' ? 'streak' : signal.kind === 'invalid' ? 'shard' : 'orb',
    )

    if (signal.kind === 'combo') {
      pushBurst(particlesRef.current, center, Math.max(10, Math.round(particleCount * 0.5)), signal.intensity, colors, 'shard')
    }

    if (signal.kind === 'win') {
      pushBurst(
        particlesRef.current,
        boardCenter,
        Math.max(18, Math.round(particleCount * 0.7)),
        signal.intensity + 0.6,
        colors,
        'orb',
      )
    }

    if (signal.kind === 'special-created') {
      pushBurst(
        particlesRef.current,
        center,
        Math.max(10, Math.round(particleCount * 0.55)),
        signal.intensity + 0.3,
        colors,
        signal.specialType === 'rainbow' ? 'orb' : 'shard',
      )
    }
  }, [reducedMotion, signal])

  return <canvas ref={canvasRef} className="board-fx-canvas" aria-hidden="true" />
}
