import type { CampaignSnapshot, LevelRecord } from '../game/types'

const storageKey = 'xiaoxiaole-100-levels/campaign'

export function createInitialCampaign(playerName = ''): CampaignSnapshot {
  return {
    currentLevel: 1,
    unlockedLevel: 1,
    totalScore: 0,
    totalTimeMs: 0,
    clearedLevels: 0,
    playerName,
    levelRecords: {},
  }
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.round(value)))
}

function sanitizeLevelRecords(value: unknown): Record<string, LevelRecord> {
  if (!value || typeof value !== 'object') {
    return {}
  }

  const nextRecords: Record<string, LevelRecord> = {}

  for (const [key, item] of Object.entries(value)) {
    const levelNumber = Number(key)

    if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > 100) {
      continue
    }

    if (!item || typeof item !== 'object') {
      continue
    }

    const entry = item as Partial<LevelRecord> & { seconds?: number }
    const score = clampInteger(entry.score, 0, Number.MAX_SAFE_INTEGER, 0)
    const timeMs =
      typeof entry.timeMs === 'number'
        ? clampInteger(entry.timeMs, 0, Number.MAX_SAFE_INTEGER, 0)
        : clampInteger(entry.seconds, 0, Number.MAX_SAFE_INTEGER, 0) * 1000

    if (score <= 0) {
      continue
    }

    nextRecords[String(levelNumber)] = { score, timeMs }
  }

  return nextRecords
}

function summarizeRecords(levelRecords: Record<string, LevelRecord>): {
  totalScore: number
  totalTimeMs: number
  clearedLevels: number
} {
  const values = Object.values(levelRecords)

  return {
    totalScore: values.reduce((sum, item) => sum + item.score, 0),
    totalTimeMs: values.reduce((sum, item) => sum + item.timeMs, 0),
    clearedLevels: values.length,
  }
}

export function loadCampaign(): CampaignSnapshot {
  if (typeof window === 'undefined') {
    return createInitialCampaign()
  }

  const raw = window.localStorage.getItem(storageKey)

  if (!raw) {
    return createInitialCampaign()
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CampaignSnapshot> & { totalSeconds?: number }
    const levelRecords = sanitizeLevelRecords(parsed.levelRecords)
    const summary = summarizeRecords(levelRecords)
    const unlockedLevel = clampInteger(parsed.unlockedLevel, 1, 100, 1)

    return {
      currentLevel: clampInteger(parsed.currentLevel, 1, unlockedLevel, 1),
      unlockedLevel,
      totalScore:
        summary.totalScore > 0
          ? summary.totalScore
          : clampInteger(parsed.totalScore, 0, Number.MAX_SAFE_INTEGER, 0),
      totalTimeMs:
        summary.totalTimeMs > 0
          ? summary.totalTimeMs
          : typeof parsed.totalTimeMs === 'number'
            ? clampInteger(parsed.totalTimeMs, 0, Number.MAX_SAFE_INTEGER, 0)
            : clampInteger(parsed.totalSeconds, 0, Number.MAX_SAFE_INTEGER, 0) * 1000,
      clearedLevels:
        summary.clearedLevels > 0
          ? summary.clearedLevels
          : clampInteger(parsed.clearedLevels, 0, 100, 0),
      playerName: typeof parsed.playerName === 'string' ? parsed.playerName.slice(0, 20) : '',
      levelRecords,
    }
  } catch {
    return createInitialCampaign()
  }
}

export function saveCampaign(snapshot: CampaignSnapshot): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(storageKey, JSON.stringify(snapshot))
}

export function getHighestClearedLevel(snapshot: CampaignSnapshot): number {
  const clearedLevels = Object.keys(snapshot.levelRecords).map(Number)
  return clearedLevels.length > 0 ? Math.max(...clearedLevels) : 0
}

export function getTotalTimeMs(snapshot: CampaignSnapshot): number {
  return snapshot.totalTimeMs
}

export function upsertLevelResult(
  snapshot: CampaignSnapshot,
  levelId: number,
  score: number,
  timeMs: number,
  playerName: string,
): CampaignSnapshot {
  const currentRecord = snapshot.levelRecords[String(levelId)]
  const normalizedScore = Math.max(0, Math.round(score))
  const normalizedTimeMs = Math.max(0, Math.round(timeMs))
  const shouldReplace =
    !currentRecord ||
    normalizedScore > currentRecord.score ||
    (normalizedScore === currentRecord.score && normalizedTimeMs < currentRecord.timeMs)

  const nextLevelRecords = shouldReplace
    ? {
        ...snapshot.levelRecords,
        [String(levelId)]: {
          score: normalizedScore,
          timeMs: normalizedTimeMs,
        },
      }
    : snapshot.levelRecords

  const summary = summarizeRecords(nextLevelRecords)
  const normalizedName = playerName.trim().replace(/\s+/g, ' ').slice(0, 20)

  return {
    currentLevel: snapshot.currentLevel,
    unlockedLevel: Math.max(snapshot.unlockedLevel, Math.min(100, levelId + 1)),
    totalScore: summary.totalScore,
    totalTimeMs: summary.totalTimeMs,
    clearedLevels: summary.clearedLevels,
    playerName: normalizedName || snapshot.playerName,
    levelRecords: nextLevelRecords,
  }
}
