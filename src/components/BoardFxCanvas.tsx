import { useEffect, useRef } from 'react'
import type { Position } from '../game/types'
import useReducedMotion from '../hooks/useReducedMotion'

export type BoardFxKind = 'invalid' | 'match' | 'combo' | 'reshuffle' | 'win' | 'lose'

export type BoardFxSignal = {
  id: number
  kind: BoardFxKind
  intensity: number
  rows: number
  columns: number
  from?: Position
  to?: Position
}

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  maxLife: number
  color: string
  glow: string
}

type Ripple = {
  x: number
  y: number
  radius: number
  maxRadius: number
  alpha: number
  color: string
  lineWidth: number
}

const palette: Record<BoardFxKind, { base: string; glow: string }> = {
  invalid: { base: 'rgba(251, 113, 133, 0.9)', glow: 'rgba(248, 113, 113, 0.6)' },
  match: { base: 'rgba(125, 211, 252, 0.92)', glow: 'rgba(96, 165, 250, 0.5)' },
  combo: { base: 'rgba(216, 180, 254, 0.95)', glow: 'rgba(192, 132, 252, 0.65)' },
  reshuffle: { base: 'rgba(251, 191, 36, 0.95)', glow: 'rgba(250, 204, 21, 0.6)' },
  win: { base: 'rgba(74, 222, 128, 0.95)', glow: 'rgba(45, 212, 191, 0.6)' },
  lose: { base: 'rgba(248, 113, 113, 0.9)', glow: 'rgba(244, 114, 182, 0.55)' },
}

function tileCenter(position: Position, width: number, height: number, rows: number, columns: number) {
  return {
    x: ((position.col + 0.5) / columns) * width,
    y: ((position.row + 0.5) / rows) * height,
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
        context.strokeStyle = 'rgba(191, 219, 254, 0.8)'
        context.lineWidth = 2.5
        context.shadowColor = 'rgba(125, 211, 252, 0.7)'
        context.shadowBlur = 18
        context.arc(center.x, center.y, radius, 0, Math.PI * 2)
        context.stroke()
      }

      for (const ripple of ripplesRef.current) {
        ripple.radius += (ripple.maxRadius / 420) * delta
        ripple.alpha -= 0.0028 * delta
      }

      ripplesRef.current = ripplesRef.current.filter((ripple) => ripple.alpha > 0)

      for (const ripple of ripplesRef.current) {
        context.beginPath()
        context.strokeStyle = ripple.color.replace('0.95', `${Math.max(0, ripple.alpha)}`)
        context.lineWidth = ripple.lineWidth
        context.shadowColor = ripple.color
        context.shadowBlur = 18
        context.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2)
        context.stroke()
      }

      for (const particle of particlesRef.current) {
        particle.life -= delta
        particle.x += particle.vx * (delta / 16)
        particle.y += particle.vy * (delta / 16)
        particle.vx *= 0.985
        particle.vy *= 0.985
      }

      particlesRef.current = particlesRef.current.filter((particle) => particle.life > 0)

      for (const particle of particlesRef.current) {
        const alpha = Math.max(0, particle.life / particle.maxLife)
        context.beginPath()
        context.fillStyle = particle.color.replace('0.95', `${alpha}`)
        context.shadowColor = particle.glow
        context.shadowBlur = particle.size * 8
        context.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2)
        context.fill()
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
    const colors = palette[signal.kind]
    const rippleSize = Math.min(bounds.width / signal.columns, bounds.height / signal.rows) * (1.2 + signal.intensity * 0.22)
    const particleCount = reducedMotion
      ? Math.max(8, Math.round(signal.intensity * 8))
      : Math.max(18, Math.round(signal.intensity * 18))

    ripplesRef.current.push({
      x: center.x,
      y: center.y,
      radius: Math.min(bounds.width, bounds.height) * 0.03,
      maxRadius: rippleSize,
      alpha: 0.85,
      color: colors.base,
      lineWidth: signal.kind === 'combo' || signal.kind === 'win' ? 4 : 2.4,
    })

    if (signal.kind === 'invalid') {
      ripplesRef.current.push({
        x: center.x,
        y: center.y,
        radius: Math.min(bounds.width, bounds.height) * 0.02,
        maxRadius: rippleSize * 0.7,
        alpha: 0.65,
        color: 'rgba(255, 148, 148, 0.82)',
        lineWidth: 2,
      })
    }

    for (let index = 0; index < particleCount; index += 1) {
      const angle = (Math.PI * 2 * index) / particleCount + Math.random() * 0.5
      const speedBase = signal.kind === 'win' ? 3.8 : signal.kind === 'combo' ? 3.2 : 2.4
      const speed = speedBase + Math.random() * signal.intensity * 2.4

      particlesRef.current.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        life: 520 + Math.random() * 320,
        maxLife: 520 + Math.random() * 320,
        color: colors.base,
        glow: colors.glow,
      })
    }
  }, [reducedMotion, signal])

  return <canvas ref={canvasRef} className="board-fx-canvas" aria-hidden="true" />
}
