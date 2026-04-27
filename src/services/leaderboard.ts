import { collection, doc, getDoc, getDocs, limit, query, setDoc } from 'firebase/firestore'
import type { CampaignSnapshot, LeaderboardEntry } from '../game/types'
import { getHighestClearedLevel, getTotalTimeMs } from '../lib/storage'
import { getFirebaseCollectionName, getFirebaseDb, isFirebaseConfigured } from './firebase'

function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (b.totalScore !== a.totalScore) {
    return b.totalScore - a.totalScore
  }

  if (b.highestLevel !== a.highestLevel) {
    return b.highestLevel - a.highestLevel
  }

  if (a.totalTimeMs !== b.totalTimeMs) {
    return a.totalTimeMs - b.totalTimeMs
  }

  return b.updatedAt - a.updatedAt
}

function sanitizePlayerKey(name: string): string {
  return encodeURIComponent(name.trim().toLowerCase()).slice(0, 120) || 'anonymous'
}

function toEntry(id: string, payload: Partial<LeaderboardEntry>): LeaderboardEntry {
  return {
    id,
    name: typeof payload.name === 'string' ? payload.name : '匿名玩家',
    totalScore: typeof payload.totalScore === 'number' ? payload.totalScore : 0,
    highestLevel: typeof payload.highestLevel === 'number' ? payload.highestLevel : 0,
    totalTimeMs: typeof payload.totalTimeMs === 'number' ? payload.totalTimeMs : 0,
    updatedAt: typeof payload.updatedAt === 'number' ? payload.updatedAt : 0,
  }
}

function isBetterCandidate(next: LeaderboardEntry, current?: LeaderboardEntry): boolean {
  if (!current) {
    return true
  }

  return compareEntries(next, current) < 0
}

export function leaderboardEnabled(): boolean {
  return isFirebaseConfigured()
}

export async function fetchLeaderboard(topN = 10): Promise<LeaderboardEntry[]> {
  const db = getFirebaseDb()

  if (!db) {
    return []
  }

  const snapshot = await getDocs(
    query(collection(db, getFirebaseCollectionName()), limit(Math.max(topN * 3, 20))),
  )

  return snapshot.docs
    .map((item) => toEntry(item.id, item.data() as Partial<LeaderboardEntry>))
    .sort(compareEntries)
    .slice(0, topN)
}

export async function submitLeaderboardScore(
  playerName: string,
  campaign: CampaignSnapshot,
): Promise<LeaderboardEntry> {
  const db = getFirebaseDb()

  if (!db) {
    throw new Error('Firebase 排行榜尚未配置，请先填写 .env 中的 Firebase 参数。')
  }

  const cleanName = playerName.trim().slice(0, 20)

  if (!cleanName) {
    throw new Error('请输入玩家昵称后再提交排行榜。')
  }

  const highestLevel = getHighestClearedLevel(campaign)

  if (highestLevel <= 0) {
    throw new Error('请先至少通关一关，再提交在线排行榜。')
  }

  const entry: LeaderboardEntry = {
    id: sanitizePlayerKey(cleanName),
    name: cleanName,
    totalScore: campaign.totalScore,
    highestLevel,
    totalTimeMs: getTotalTimeMs(campaign),
    updatedAt: Date.now(),
  }

  const entryRef = doc(db, getFirebaseCollectionName(), entry.id)
  const existingSnapshot = await getDoc(entryRef)
  const existingEntry = existingSnapshot.exists()
    ? toEntry(existingSnapshot.id, existingSnapshot.data() as Partial<LeaderboardEntry>)
    : undefined

  if (isBetterCandidate(entry, existingEntry)) {
    await setDoc(entryRef, entry)
    return entry
  }

  return existingEntry ?? entry
}
