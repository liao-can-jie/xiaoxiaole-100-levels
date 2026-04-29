import GemIcon from './GemIcon'
import BoardFxCanvas, { type BoardFxSignal } from './BoardFxCanvas'
import type {
  Board,
  CreatedSpecial,
  LevelDefinition,
  LevelRecord,
  Position,
  TileKind,
} from '../game/types'
import { formatDurationMs, formatScore } from '../lib/format'

type GameStatus = 'playing' | 'won' | 'lost'

export type LevelClearSummary = {
  levelId: number
  levelName: string
  awardedScore: number
  timeReward: number
  secondsLeft: number
  chains: number
  clearedTiles: number
  recordImproved: boolean
  createdSpecials: CreatedSpecial[]
}

export default function GameBoardStage({
  board,
  boardFxSignal,
  canAdvance,
  canGoPrev,
  clearSummary,
  currentLevel,
  currentRecord,
  createdSpecials,
  isFinalLevelCleared,
  level,
  levelScore,
  message,
  onDismissClearSummary,
  onNext,
  onPrev,
  onRestart,
  onTileClick,
  progressPercent,
  secondsLeft,
  selected,
  status,
  tileTheme,
}: {
  board: Board
  boardFxSignal: BoardFxSignal | null
  canAdvance: boolean
  canGoPrev: boolean
  clearSummary: LevelClearSummary | null
  currentLevel: number
  currentRecord?: LevelRecord
  createdSpecials: CreatedSpecial[]
  isFinalLevelCleared: boolean
  level: LevelDefinition
  levelScore: number
  message: string
  onDismissClearSummary: () => void
  onNext: () => void
  onPrev: () => void
  onRestart: () => void
  onTileClick: (position: Position) => void
  progressPercent: number
  secondsLeft: number
  selected: Position | null
  status: GameStatus
  tileTheme: Record<TileKind, { label: string; className: string }>
}) {
  const isTimerCritical = secondsLeft <= Math.max(10, Math.floor(level.timeLimit * 0.2))

  return (
    <section className={`game-panel card game-panel--${status} ${isTimerCritical ? 'game-panel--critical' : ''}`}>
      <div className="panel-header board-header">
        <div>
          <p className="eyebrow">第 {level.id} 关</p>
          <h2>{level.name}</h2>
          <p className="subtle-text">{level.summary}</p>
        </div>
        <div className={`status-pill status-${status}`}>
          {status === 'playing' ? '进行中' : status === 'won' ? '已通关' : '失败'}
        </div>
      </div>

      <div className="stats-grid jewel-stats-grid">
        <article>
          <span>本关目标</span>
          <strong>{formatScore(level.targetScore)}</strong>
        </article>
        <article>
          <span>本关得分</span>
          <strong>{formatScore(levelScore)}</strong>
        </article>
        <article className={isTimerCritical ? 'is-critical' : ''}>
          <span>剩余时间</span>
          <strong>{secondsLeft}s</strong>
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

      <div className="board-stage">
        <div className="board-stage__halo" aria-hidden="true" />
        <div className="board-shell">
          <div className="board-grid-wrap">
            <div
              className="board board-grid"
              style={{ gridTemplateColumns: `repeat(${level.columns}, minmax(0, 1fr))` }}
            >
              {board.map((row, rowIndex) =>
                row.map((tile, colIndex) => {
                  const isSelected = selected?.row === rowIndex && selected?.col === colIndex
                  const theme = tileTheme[tile.kind]
                  const specialClass = tile.specialType ? `tile-special tile-special--${tile.specialType}` : ''

                  return (
                    <button
                      key={tile.id}
                      type="button"
                      className={`tile ${theme.className} ${specialClass} ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => onTileClick({ row: rowIndex, col: colIndex })}
                      aria-label={`${theme.label}色宝石 ${tile.specialType ? ` ${tile.specialType} 特殊效果` : ''} ${rowIndex + 1} 行 ${colIndex + 1} 列`}
                    >
                      <GemIcon kind={tile.kind} specialType={tile.specialType} />
                      <span className="tile__label">{theme.label}</span>
                    </button>
                  )
                }),
              )}
            </div>
            <BoardFxCanvas rows={level.rows} columns={level.columns} selected={selected} signal={boardFxSignal} />
          </div>
        </div>
      </div>

      <p className="message-box">{message}</p>

      {createdSpecials.length > 0 ? (
        <p className="subtle-text special-created-note">
          本次生成特殊宝石：
          {createdSpecials.map((special, index) => (
            <span key={`${special.position.row}-${special.position.col}-${index}`}>
              {index > 0 ? '、' : ''}
              {special.specialType === 'row'
                ? '横向清行'
                : special.specialType === 'column'
                  ? '纵向清列'
                  : special.specialType === 'bomb'
                    ? '爆炸'
                    : '彩虹'}
            </span>
          ))}
          。
        </p>
      ) : null}

      {currentRecord ? (
        <p className="subtle-text best-record">
          本关最佳：{formatScore(currentRecord.score)} 分，用时 {formatDurationMs(currentRecord.timeMs)}。
        </p>
      ) : null}

      <div className="button-row">
        <button type="button" className="action-button" onClick={onRestart}>
          重开本关
        </button>
        <button type="button" className="action-button secondary" onClick={onPrev} disabled={!canGoPrev}>
          上一关
        </button>
        <button type="button" className="action-button" onClick={onNext} disabled={!canAdvance}>
          下一关
        </button>
      </div>

      {isFinalLevelCleared ? (
        <p className="victory-note">你已经完成全部 100 关，可以提交最终总积分冲击排行榜。</p>
      ) : null}

      <p className="subtle-text board-stage__caption">当前关卡 {currentLevel} / 100 · 水晶棋盘强动画模式</p>

      {clearSummary ? (
        <div className="level-clear-modal" role="dialog" aria-modal="true" aria-labelledby="level-clear-title">
          <div className="level-clear-modal__backdrop" onClick={onDismissClearSummary} />
          <div className="level-clear-modal__panel card">
            <p className="eyebrow">Level Clear</p>
            <h3 id="level-clear-title">{clearSummary.levelName} 通关成功</h3>
            <div className="level-clear-modal__stats">
              <div>
                <span>本关总分</span>
                <strong>{formatScore(clearSummary.awardedScore)}</strong>
              </div>
              <div>
                <span>时间奖励</span>
                <strong>{formatScore(clearSummary.timeReward)}</strong>
              </div>
              <div>
                <span>连锁次数</span>
                <strong>{clearSummary.chains}</strong>
              </div>
              <div>
                <span>清除数量</span>
                <strong>{clearSummary.clearedTiles}</strong>
              </div>
            </div>
            {clearSummary.createdSpecials.length > 0 ? (
              <div className="level-clear-modal__specials">
                <span>本回合生成的特殊宝石</span>
                <div className="level-clear-modal__special-list">
                  {clearSummary.createdSpecials.map((special, index) => (
                    <div key={`${special.position.row}-${special.position.col}-${index}`} className="level-clear-modal__special-chip">
                      <GemIcon kind={special.kind} specialType={special.specialType} />
                      <span>{special.specialType}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="subtle-text">
              {clearSummary.recordImproved ? '已刷新本关最佳成绩。' : '本关最佳成绩未提升。'}
            </p>
            <div className="level-clear-modal__actions">
              <button type="button" className="action-button secondary" onClick={onDismissClearSummary}>
                继续查看
              </button>
              <button type="button" className="action-button" onClick={onNext} disabled={!canAdvance}>
                下一关
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
