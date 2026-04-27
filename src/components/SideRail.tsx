import type { LeaderboardEntry, LevelDefinition } from '../game/types'
import { formatDurationMs, formatScore } from '../lib/format'

export default function SideRail({
  currentLevel,
  leaderboard,
  leaderboardAvailable,
  leaderboardMessage,
  levels,
  onPlayerNameChange,
  onSelectLevel,
  onSubmitScore,
  playerNameInput,
  submitting,
  unlockedLevel,
}: {
  currentLevel: number
  leaderboard: LeaderboardEntry[]
  leaderboardAvailable: boolean
  leaderboardMessage: string
  levels: LevelDefinition[]
  onPlayerNameChange: (value: string) => void
  onSelectLevel: (levelId: number) => void
  onSubmitScore: () => void
  playerNameInput: string
  submitting: boolean
  unlockedLevel: number
}) {
  return (
    <aside className="side-column">
      <section className="card level-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">关卡选择</p>
            <h2>已解锁至 {unlockedLevel} 关</h2>
          </div>
        </div>
        <div className="level-grid">
          {levels.map((item) => {
            const unlocked = item.id <= unlockedLevel
            const active = item.id === currentLevel

            return (
              <button
                key={item.id}
                type="button"
                className={`level-chip ${active ? 'active' : ''}`}
                disabled={!unlocked}
                onClick={() => onSelectLevel(item.id)}
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
            onChange={(event) => onPlayerNameChange(event.target.value)}
            placeholder="输入 20 字以内昵称"
            maxLength={20}
          />
        </label>

        <button
          type="button"
          className="action-button"
          onClick={onSubmitScore}
          disabled={!leaderboardAvailable || submitting}
        >
          {submitting ? '提交中...' : '提交累计积分'}
        </button>

        {leaderboardMessage ? <p className="subtle-text leaderboard-message">{leaderboardMessage}</p> : null}

        <ol className="leaderboard-list">
          {leaderboard.map((entry, index) => (
            <li key={entry.id} className={index < 3 ? `leaderboard-top leaderboard-top--${index + 1}` : ''}>
              <div>
                <strong>
                  #{index + 1} {entry.name}
                </strong>
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
  )
}
