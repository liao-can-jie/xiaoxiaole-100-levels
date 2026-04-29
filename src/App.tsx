import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import CampaignHero from './components/CampaignHero'
import GameBoardStage, { type LevelClearSummary } from './components/GameBoardStage'
import AmbientFxCanvas from './components/AmbientFxCanvas'
import SideRail from './components/SideRail'
import { attemptMove, createBoardForLevel } from './game/engine'
import { getLevel, levels } from './game/levels'
import type {
  Board,
  CampaignSnapshot,
  CreatedSpecial,
  LeaderboardEntry,
  LevelRecord,
  Position,
  TileKind,
} from './game/types'
import { loadCampaign, saveCampaign, upsertLevelResult } from './lib/storage'
import { fetchLeaderboard, leaderboardEnabled, submitLeaderboardScore } from './services/leaderboard'
import type { BoardFxSignal } from './components/BoardFxCanvas'

type GameStatus = 'playing' | 'won' | 'lost'

type LevelRunState = {
  board: Board
  selected: Position | null
  levelScore: number
  secondsLeft: number
  status: GameStatus
  message: string
}

const tileTheme: Record<TileKind, { label: string; className: string }> = {
  ruby: { label: '红', className: 'tile-ruby' },
  amber: { label: '黄', className: 'tile-amber' },
  emerald: { label: '绿', className: 'tile-emerald' },
  sapphire: { label: '蓝', className: 'tile-sapphire' },
  violet: { label: '紫', className: 'tile-violet' },
  rose: { label: '粉', className: 'tile-rose' },
  teal: { label: '青', className: 'tile-teal' },
}

function createLevelRun(levelId: number): LevelRunState {
  const level = getLevel(levelId)

  return {
    board: createBoardForLevel(level),
    selected: null,
    levelScore: 0,
    secondsLeft: level.timeLimit,
    status: 'playing',
    message: `第 ${level.id} 关开始：${level.summary}`,
  }
}

function shouldReplaceLevelRecord(
  nextScore: number,
  nextTimeMs: number,
  currentRecord?: LevelRecord,
): boolean {
  if (!currentRecord) {
    return true
  }

  if (nextScore !== currentRecord.score) {
    return nextScore > currentRecord.score
  }

  return nextTimeMs < currentRecord.timeMs
}

function describeCreatedSpecials(createdSpecials: CreatedSpecial[]) {
  if (createdSpecials.length === 0) {
    return ''
  }

  const labelMap: Record<CreatedSpecial['specialType'], string> = {
    row: '清行宝石',
    column: '清列宝石',
    bomb: '爆炸宝石',
    rainbow: '彩虹宝石',
  }

  return ` 生成 ${createdSpecials.map((special) => labelMap[special.specialType]).join('、')}。`
}

function App() {
  const initialCampaign = loadCampaign()
  const [campaign, setCampaign] = useState<CampaignSnapshot>(initialCampaign)
  const [run, setRun] = useState<LevelRunState>(() => createLevelRun(initialCampaign.currentLevel))
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardNotice, setLeaderboardNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [playerNameInput, setPlayerNameInput] = useState(initialCampaign.playerName)
  const [boardFxSignal, setBoardFxSignal] = useState<BoardFxSignal | null>(null)
  const [clearSummary, setClearSummary] = useState<LevelClearSummary | null>(null)
  const [createdSpecials, setCreatedSpecials] = useState<CreatedSpecial[]>([])
  const boardFxCounterRef = useRef(0)

  const level = useMemo(() => getLevel(campaign.currentLevel), [campaign.currentLevel])
  const leaderboardAvailable = leaderboardEnabled()
  const currentRecord = campaign.levelRecords[String(level.id)]
  const leaderboardMessage = leaderboardAvailable
    ? leaderboardNotice
    : '请先复制 .env.example 为 .env，并填写 Firebase 参数后启用在线排行榜。'
  const displayedLeaderboard = leaderboardAvailable ? leaderboard : []

  const emitBoardFx = useCallback(
    (
      kind: BoardFxSignal['kind'],
      intensity: number,
      positions?: { from?: Position; to?: Position },
      specialType?: BoardFxSignal['specialType'],
    ) => {
      boardFxCounterRef.current += 1
      setBoardFxSignal({
        id: boardFxCounterRef.current,
        kind,
        intensity,
        rows: level.rows,
        columns: level.columns,
        from: positions?.from,
        to: positions?.to,
        specialType,
      })
    },
    [level.columns, level.rows],
  )

  const startLevel = useCallback(
    (levelId: number) => {
      const nextLevelId = Math.min(campaign.unlockedLevel, Math.max(1, levelId))

      setCampaign((current) => ({
        ...current,
        currentLevel: nextLevelId,
      }))
      setRun(createLevelRun(nextLevelId))
      setBoardFxSignal(null)
      setClearSummary(null)
      setCreatedSpecials([])
    },
    [campaign.unlockedLevel],
  )

  useEffect(() => {
    if (run.status !== 'playing') {
      return
    }

    const timer = window.setInterval(() => {
      setRun((current) => {
        if (current.status !== 'playing') {
          return current
        }

        if (current.secondsLeft <= 1) {
          emitBoardFx('lose', 1.2)
          return {
            ...current,
            secondsLeft: 0,
            status: 'lost',
            message: '时间到了，这一关失败了，点击“重开本关”再试一次。',
          }
        }

        return {
          ...current,
          secondsLeft: current.secondsLeft - 1,
        }
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [emitBoardFx, run.status])

  useEffect(() => {
    saveCampaign(campaign)
  }, [campaign])

  useEffect(() => {
    if (!leaderboardAvailable) {
      return
    }

    let cancelled = false

    const loadLeaderboard = async () => {
      try {
        const entries = await fetchLeaderboard(10)

        if (!cancelled) {
          setLeaderboard(entries)
          setLeaderboardNotice(entries.length > 0 ? '' : '排行榜暂时还没有记录。')
        }
      } catch {
        if (!cancelled) {
          setLeaderboardNotice('排行榜读取失败，请检查 Firebase 配置和 Firestore 权限。')
        }
      }
    }

    void loadLeaderboard()

    return () => {
      cancelled = true
    }
  }, [leaderboardAvailable])

  useEffect(() => {
    if (!clearSummary || campaign.currentLevel >= levels.length) {
      return
    }

    const timer = window.setTimeout(() => {
      setClearSummary(null)
      startLevel(campaign.currentLevel + 1)
    }, 2200)

    return () => window.clearTimeout(timer)
  }, [campaign.currentLevel, clearSummary, startLevel])

  function restartLevel() {
    setRun(createLevelRun(campaign.currentLevel))
    setBoardFxSignal(null)
    setClearSummary(null)
    setCreatedSpecials([])
  }

  function handleDismissClearSummary() {
    setClearSummary(null)
  }

  function handleTileClick(position: Position) {
    if (run.status !== 'playing') {
      return
    }

    if (!run.selected) {
      setRun((current) => ({
        ...current,
        selected: position,
      }))
      return
    }

    if (run.selected.row === position.row && run.selected.col === position.col) {
      setRun((current) => ({
        ...current,
        selected: null,
      }))
      return
    }

    const previousSelection = run.selected
    const move = attemptMove(run.board, previousSelection, position, level)

    if (!move.valid) {
      emitBoardFx('invalid', 1, { from: previousSelection, to: position })
      setRun((current) => ({
        ...current,
        selected: null,
        message: '这次交换不会形成消除，请换一个位置。',
      }))
      return
    }

    setCreatedSpecials(move.createdSpecials)

    for (const special of move.createdSpecials) {
      emitBoardFx(
        'special-created',
        special.specialType === 'rainbow' ? 2.2 : 1.5,
        { to: special.position },
        special.specialType,
      )
    }

    const earned =
      move.clearedTiles * level.pointsPerTile +
      Math.max(0, move.chains - 1) * level.chainBonus +
      move.matchedGroups * 12 +
      move.createdSpecials.length * 80
    const nextLevelScore = run.levelScore + earned
    const nextMessage = `消除了 ${move.clearedTiles} 个宝石，形成 ${move.chains} 段连锁，获得 ${Math.max(0, Math.round(earned)).toLocaleString('zh-CN')} 分。${describeCreatedSpecials(move.createdSpecials)}${move.reshuffled ? ' 棋盘已自动重排。' : ''}`

    emitBoardFx(
      move.chains >= 3 ? 'combo' : 'match',
      Math.max(1, move.chains + move.clearedTiles / 5 + move.createdSpecials.length * 0.6),
      {
        from: previousSelection,
        to: position,
      },
    )

    if (move.reshuffled) {
      emitBoardFx('reshuffle', 1.4)
    }

    if (nextLevelScore < level.targetScore) {
      setRun((current) => ({
        ...current,
        board: move.board,
        selected: null,
        levelScore: nextLevelScore,
        message: nextMessage,
      }))
      return
    }

    const elapsedSeconds = level.timeLimit - run.secondsLeft
    const elapsedTimeMs = elapsedSeconds * 1000
    const timeReward = run.secondsLeft * level.timeBonus
    const awardedScore = nextLevelScore + timeReward
    const recordImproved = shouldReplaceLevelRecord(awardedScore, elapsedTimeMs, currentRecord)

    emitBoardFx(
      'win',
      Math.max(1.6, move.chains + 1.6 + move.createdSpecials.length * 0.8),
      {
        from: previousSelection,
        to: position,
      },
    )

    setCampaign((current) =>
      upsertLevelResult(
        {
          ...current,
          currentLevel: level.id,
        },
        level.id,
        awardedScore,
        elapsedTimeMs,
        playerNameInput,
      ),
    )

    setClearSummary({
      levelId: level.id,
      levelName: level.name,
      awardedScore,
      timeReward,
      secondsLeft: run.secondsLeft,
      chains: move.chains,
      clearedTiles: move.clearedTiles,
      recordImproved,
      createdSpecials: move.createdSpecials,
    })

    setRun((current) => ({
      ...current,
      board: move.board,
      selected: null,
      levelScore: awardedScore,
      status: 'won',
      message: `通关成功，剩余 ${run.secondsLeft} 秒，时间奖励 ${Math.max(0, Math.round(timeReward)).toLocaleString('zh-CN')} 分。${recordImproved ? ' 已刷新本关最佳成绩。' : ' 本关最佳成绩未提升。'}`,
    }))
  }

  async function handleSubmitScore() {
    const trimmedName = playerNameInput.trim().slice(0, 20)

    if (!trimmedName) {
      setLeaderboardNotice('请输入昵称后再提交排行榜。')
      return
    }

    setSubmitting(true)
    setLeaderboardNotice('')

    try {
      const nextCampaign = { ...campaign, playerName: trimmedName }
      setCampaign(nextCampaign)
      await submitLeaderboardScore(trimmedName, nextCampaign)
      const entries = await fetchLeaderboard(10)
      setLeaderboard(entries)
      setLeaderboardNotice('排行榜提交成功。')
    } catch (error) {
      setLeaderboardNotice(error instanceof Error ? error.message : '排行榜提交失败。')
    } finally {
      setSubmitting(false)
    }
  }

  const progressPercent = Math.min(100, (run.levelScore / level.targetScore) * 100)
  const canAdvance = run.status === 'won' && campaign.currentLevel < levels.length
  const isFinalLevelCleared = run.status === 'won' && campaign.currentLevel === levels.length

  return (
    <div className="app-shell app-shell--fantasy">
      <AmbientFxCanvas />
      <div className="app-shell__veil" aria-hidden="true" />
      <div className="app-shell__content">
        <CampaignHero
          clearedLevels={campaign.clearedLevels}
          levelsCount={levels.length}
          totalScore={campaign.totalScore}
          totalTimeMs={campaign.totalTimeMs}
        />

        <main className="layout-grid">
          <GameBoardStage
            board={run.board}
            boardFxSignal={boardFxSignal}
            canAdvance={canAdvance}
            canGoPrev={campaign.currentLevel > 1}
            clearSummary={clearSummary}
            currentLevel={campaign.currentLevel}
            currentRecord={currentRecord}
            createdSpecials={createdSpecials}
            isFinalLevelCleared={isFinalLevelCleared}
            level={level}
            levelScore={run.levelScore}
            message={run.message}
            onDismissClearSummary={handleDismissClearSummary}
            onNext={() => startLevel(campaign.currentLevel + 1)}
            onPrev={() => startLevel(campaign.currentLevel - 1)}
            onRestart={restartLevel}
            onTileClick={handleTileClick}
            progressPercent={progressPercent}
            secondsLeft={run.secondsLeft}
            selected={run.selected}
            status={run.status}
            tileTheme={tileTheme}
          />

          <SideRail
            currentLevel={campaign.currentLevel}
            leaderboard={displayedLeaderboard}
            leaderboardAvailable={leaderboardAvailable}
            leaderboardMessage={leaderboardMessage}
            levels={levels}
            onPlayerNameChange={setPlayerNameInput}
            onSelectLevel={startLevel}
            onSubmitScore={handleSubmitScore}
            playerNameInput={playerNameInput}
            submitting={submitting}
            unlockedLevel={campaign.unlockedLevel}
          />
        </main>
      </div>
    </div>
  )
}

export default App
