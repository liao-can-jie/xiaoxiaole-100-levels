export function formatScore(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString('zh-CN')
}

export function formatDurationMs(totalTimeMs: number): string {
  const totalSeconds = Math.max(0, Math.round(totalTimeMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
