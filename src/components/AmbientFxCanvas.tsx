import { useEffect, useRef } from 'react'
import useReducedMotion from '../hooks/useReducedMotion'

type Star = {
  x: number
  y: number
  radius: number
  alpha: number
  driftX: number
  driftY: number
  twinkle: number
  twinkleSpeed: number
  hue: number
}

export default function AmbientFxCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
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
    let stars: Star[] = []
    let lastTime = performance.now()
    let width = 0
    let height = 0

    const createStars = () => {
      const count = reducedMotion
        ? Math.max(18, Math.floor((width * height) / 80000))
        : Math.max(44, Math.floor((width * height) / 28000))

      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.6 + Math.random() * 2.4,
        alpha: 0.18 + Math.random() * 0.55,
        driftX: -0.02 + Math.random() * 0.04,
        driftY: -0.03 + Math.random() * 0.06,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 1.8,
        hue: 180 + Math.random() * 110,
      }))
    }

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      width = bounds.width
      height = bounds.height
      canvas.width = Math.max(1, Math.floor(bounds.width * dpr))
      canvas.height = Math.max(1, Math.floor(bounds.height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      createStars()
    }

    const drawBackdrop = (time: number) => {
      const topGlow = context.createRadialGradient(width * 0.5, height * 0.1, 0, width * 0.5, height * 0.1, width * 0.45)
      topGlow.addColorStop(0, 'rgba(96, 165, 250, 0.22)')
      topGlow.addColorStop(0.5, 'rgba(59, 130, 246, 0.08)')
      topGlow.addColorStop(1, 'rgba(15, 23, 42, 0)')

      context.fillStyle = topGlow
      context.fillRect(0, 0, width, height)

      const pulseX = width * (0.2 + Math.sin(time * 0.00018) * 0.05)
      const pulseY = height * (0.22 + Math.cos(time * 0.00015) * 0.04)
      const pulseGlow = context.createRadialGradient(pulseX, pulseY, 0, pulseX, pulseY, width * 0.3)
      pulseGlow.addColorStop(0, 'rgba(192, 132, 252, 0.16)')
      pulseGlow.addColorStop(0.55, 'rgba(125, 211, 252, 0.05)')
      pulseGlow.addColorStop(1, 'rgba(15, 23, 42, 0)')

      context.fillStyle = pulseGlow
      context.fillRect(0, 0, width, height)
    }

    const renderFrame = (time: number) => {
      const delta = Math.min(32, time - lastTime)
      lastTime = time

      context.clearRect(0, 0, width, height)
      drawBackdrop(time)
      context.save()
      context.globalCompositeOperation = 'screen'

      for (const star of stars) {
        if (!reducedMotion) {
          star.x += star.driftX * delta
          star.y += star.driftY * delta
          star.twinkle += star.twinkleSpeed * 0.02

          if (star.x < -10) star.x = width + 10
          if (star.x > width + 10) star.x = -10
          if (star.y < -10) star.y = height + 10
          if (star.y > height + 10) star.y = -10
        }

        const alpha = star.alpha + Math.sin(star.twinkle) * 0.14
        context.beginPath()
        context.fillStyle = `hsla(${star.hue}, 100%, 78%, ${Math.max(0.08, alpha)})`
        context.shadowColor = `hsla(${star.hue}, 100%, 72%, 0.65)`
        context.shadowBlur = star.radius * 8
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        context.fill()
      }

      context.restore()
      animationFrame = window.requestAnimationFrame(renderFrame)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    animationFrame = window.requestAnimationFrame(renderFrame)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [reducedMotion])

  return <canvas ref={canvasRef} className="ambient-fx-canvas" aria-hidden="true" />
}
