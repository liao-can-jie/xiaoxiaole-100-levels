import GemIcon from './GemIcon'
import BoardFxCanvas, { type BoardFxSignal } from './BoardFxCanvas'
import type { Board, LevelDefinition, LevelRecord, Position, TileKind } from '../game/types'
import { formatDurationMs, formatScore } from '../lib/format'

type GameStatus = 'playing' | 'won' | 'lost'

export default function GameBoardStage({
  board,
  boardFxSignal,
  canAdvance,
  canGoPrev,
  currentRecord,
  currentLevel,
  isFinalLevelCleared,
  level,
  levelScore,
  message,
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
  currentLevel: number
  currentRecord?: LevelRecord
  isFinalLevelCleared: boolean
  level: LevelDefinition
  levelScore: number
  message: string
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

                  return (
                    <button
                      key={tile.id}
                      type="button"
                      className={`tile ${theme.className} ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => onTileClick({ row: rowIndex, col: colIndex })}
                      aria-label={`${theme.label}色宝石 ${rowIndex + 1} 行 ${colIndex + 1} 列`}
                    >
                      <GemIcon kind={tile.kind} />
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
    </section>
  )
}
