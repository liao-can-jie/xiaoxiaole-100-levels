import { formatDurationMs, formatScore } from '../lib/format'

export default function CampaignHero({
  clearedLevels,
  levelsCount,
  totalScore,
  totalTimeMs,
}: {
  clearedLevels: number
  levelsCount: number
  totalScore: number
  totalTimeMs: number
}) {
  return (
    <header className="hero-panel">
      <section className="card hero-copy-card">
        <div className="hero-copy-card__spark hero-copy-card__spark--left" aria-hidden="true" />
        <div className="hero-copy-card__spark hero-copy-card__spark--right" aria-hidden="true" />
        <p className="eyebrow">Crystal Dream Arcade</p>
        <h1>宝石幻境 · 消消乐 100 关</h1>
        <p className="hero-copy">
          把现有的消消乐挑战升级成更像正式成品的梦幻舞台：水晶棋盘、星屑辉光、强反馈动效与在线榜单并存。
        </p>
        <div className="hero-badges">
          <span className="hero-badge">100 关卡</span>
          <span className="hero-badge">梦幻宝石风</span>
          <span className="hero-badge">Canvas 粒子特效</span>
        </div>
      </section>

      <section className="campaign-card">
        <div>
          <span>累计积分</span>
          <strong>{formatScore(totalScore)}</strong>
        </div>
        <div>
          <span>已通关卡</span>
          <strong>
            {clearedLevels} / {levelsCount}
          </strong>
        </div>
        <div>
          <span>累计用时</span>
          <strong>{formatDurationMs(totalTimeMs)}</strong>
        </div>
      </section>
    </header>
  )
}
