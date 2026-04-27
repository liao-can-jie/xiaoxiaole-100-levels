import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { attemptMove, createBoardForLevel } from './game/engine'
import { getLevel, levels } from './game/levels'
import type {
  Board,
  CampaignSnapshot,
  LeaderboardEntry,
  LevelRecord,
  Position,
  TileKind,
} from './game/types'
import { formatDurationMs, formatScore } from './lib/format'
import { loadCampaign, saveCampaign, upsertLevelResult } from './lib/storage'
import { fetchLeaderboard, leaderboardEnabled, submitLeaderboardScore } from './services/leaderboard'

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

function App() {
  const initialCampaign = loadCampaign()
  const [campaign, setCampaign] = useState<CampaignSnapshot>(initialCampaign)
  const [run, setRun] = useState<LevelRunState>(() => createLevelRun(initialCampaign.currentLevel))
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardNotice, setLeaderboardNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [playerNameInput, setPlayerNameInput] = useState(initialCampaign.playerName)

  const level = useMemo(() => getLevel(campaign.currentLevel), [campaign.currentLevel])
  const leaderboardAvailable = leaderboardEnabled()
  const currentRecord = campaign.levelRecords[String(level.id)]
  const leaderboardMessage = leaderboardAvailable
    ? leaderboardNotice
    : '请先复制 .env.example 为 .env，并填写 Firebase 参数后启用在线排行榜。'
  const displayedLeaderboard = leaderboardAvailable ? leaderboard : []

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
  }, [campaign.currentLevel, run.status])

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

  function startLevel(levelId: number) {
    const nextLevelId = Math.min(campaign.unlockedLevel, Math.max(1, levelId))

    setCampaign((current) => ({
      ...current,
      currentLevel: nextLevelId,
    }))
    setRun(createLevelRun(nextLevelId))
  }

  function restartLevel() {
    setRun(createLevelRun(campaign.currentLevel))
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

    const move = attemptMove(run.board, run.selected, position, level)

    if (!move.valid) {
      setRun((current) => ({
        ...current,
        selected: null,
        message: '这次交换不会形成消除，请换一个位置。',
      }))
      return
    }

    const earned =
      move.clearedTiles * level.pointsPerTile +
      Math.max(0, move.chains - 1) * level.chainBonus +
      move.matchedGroups * 12
    const nextLevelScore = run.levelScore + earned
    const nextMessage = `消除了 ${move.clearedTiles} 个宝石，形成 ${move.chains} 段连锁，获得 ${formatScore(earned)} 分${move.reshuffled ? '，棋盘已自动重排。' : '。'}`

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
    setRun((current) => ({
      ...current,
      board: move.board,
      selected: null,
      levelScore: awardedScore,
      status: 'won',
      message: `通关成功，剩余 ${run.secondsLeft} 秒，时间奖励 ${formatScore(timeReward)} 分。${recordImproved ? ' 已刷新本关最佳成绩。' : ' 本关最佳成绩未提升。'}`,
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
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">React + Vite + Firebase</p>
          <h1>消消乐 100 关挑战</h1>
          <p className="hero-copy">
            共 {levels.length} 关，前 15 关为手工节奏关，后 85 关按规则递增生成；每关越快通关，累计最佳成绩越高。
          </p>
        </div>
        <div className="campaign-card">
          <div>
            <span>累计积分</span>
            <strong>{formatScore(campaign.totalScore)}</strong>
          </div>
          <div>
            <span>已通关卡</span>
            <strong>
              {campaign.clearedLevels} / {levels.length}
            </strong>
          </div>
          <div>
            <span>累计用时</span>
            <strong>{formatDurationMs(campaign.totalTimeMs)}</strong>
          </div>
        </div>
      </header>

      <main className="layout-grid">
        <section className="game-panel card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">第 {level.id} 关</p>
              <h2>{level.name}</h2>
              <p className="subtle-text">{level.summary}</p>
            </div>
            <div className={`status-pill status-${run.status}`}>
              {run.status === 'playing' ? '进行中' : run.status === 'won' ? '已通关' : '失败'}
            </div>
          </div>

          <div className="stats-grid">
            <article>
              <span>本关目标</span>
              <strong>{formatScore(level.targetScore)}</strong>
            </article>
            <article>
              <span>本关得分</span>
              <strong>{formatScore(run.levelScore)}</strong>
            </article>
            <article>
              <span>剩余时间</span>
              <strong>{run.secondsLeft}s</strong>
            </article>
            <article>
              <span>棋盘规模</span>
              <strong>
                {level.rows} × {level.columns}
              </strong>
            </article>
          </div>

          <div className="progress-block">
            <div className="progress-meta">
              <span>通关进度</span>
              <span>{Math.floor(progressPercent)}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div
            className="board"
            style={{ gridTemplateColumns: `repeat(${level.columns}, minmax(0, 1fr))` }}
          >
            {run.board.map((row, rowIndex) =>
              row.map((tile, colIndex) => {
                const isSelected = run.selected?.row === rowIndex && run.selected?.col === colIndex
                const theme = tileTheme[tile.kind]

                return (
                  <button
                    key={tile.id}
                    type="button"
                    className={`tile ${theme.className} ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleTileClick({ row: rowIndex, col: colIndex })}
                    aria-label={`${theme.label}色宝石 ${rowIndex + 1} 行 ${colIndex + 1} 列`}
                  >
                    <span>{theme.label}</span>
                  </button>
                )
              }),
            )}
          </div>

          <p className="message-box">{run.message}</p>

          {currentRecord ? (
            <p className="subtle-text best-record">
              本关最佳：{formatScore(currentRecord.score)} 分，用时 {formatDurationMs(currentRecord.timeMs)}。
            </p>
          ) : null}

          <div className="button-row">
            <button type="button" className="action-button" onClick={restartLevel}>
              重开本关
            </button>
            <button
              type="button"
              className="action-button secondary"
              onClick={() => startLevel(campaign.currentLevel - 1)}
              disabled={campaign.currentLevel === 1}
            >
              上一关
            </button>
            <button
              type="button"
              className="action-button"
              onClick={() => startLevel(campaign.currentLevel + 1)}
              disabled={!canAdvance}
            >
              下一关
            </button>
          </div>

          {isFinalLevelCleared ? (
            <p className="victory-note">你已经完成全部 100 关，可以提交最终总积分冲击排行榜。</p>
          ) : null}
        </section>

        <aside className="side-column">
          <section className="card level-panel">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">关卡选择</p>
                <h2>已解锁至 {campaign.unlockedLevel} 关</h2>
              </div>
            </div>
            <div className="level-grid">
              {levels.map((item) => {
                const unlocked = item.id <= campaign.unlockedLevel
                const active = item.id === campaign.currentLevel

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`level-chip ${active ? 'active' : ''}`}
                    disabled={!unlocked}
                    onClick={() => startLevel(item.id)}
                  >
                    {item.id}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="card leaderboard-panel">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">在线积分榜</p>
                <h2>Firebase Leaderboard</h2>
              </div>
            </div>

            <label className="input-group">
              <span>玩家昵称</span>
              <input
                value={playerNameInput}
                onChange={(event) => setPlayerNameInput(event.target.value)}
                placeholder="输入 20 字以内昵称"
                maxLength={20}
              />
            </label>

            <button
              type="button"
              className="action-button"
              onClick={handleSubmitScore}
              disabled={!leaderboardAvailable || submitting}
            >
              {submitting ? '提交中...' : '提交累计积分'}
            </button>

            {leaderboardMessage ? <p className="subtle-text leaderboard-message">{leaderboardMessage}</p> : null}

            <ol className="leaderboard-list">
              {displayedLeaderboard.map((entry, index) => (
                <li key={entry.id}>
                  <div>
                    <strong>#{index + 1} {entry.name}</strong>
                    <span>
                      通关 {entry.highestLevel} 关 / 用时 {formatDurationMs(entry.totalTimeMs)}
                    </span>
                  </div>
                  <b>{formatScore(entry.totalScore)}</b>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default App
