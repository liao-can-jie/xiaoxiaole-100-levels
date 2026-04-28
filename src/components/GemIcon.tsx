import type { ReactNode } from 'react'
import type { TileKind } from '../game/types'

const gemShapes: Record<TileKind, ReactNode> = {
  ruby: (
    <>
      <polygon className="gem-facet gem-facet--outer" points="50,7 85,38 50,93 15,38" />
      <polygon className="gem-facet gem-facet--mid" points="50,16 74,39 50,82 26,39" />
      <polygon className="gem-facet gem-facet--light" points="50,16 64,39 50,54 36,39" />
      <path className="gem-stroke" d="M50 16 L50 82 M26 39 L74 39 M36 39 L50 54 L64 39" />
    </>
  ),
  amber: (
    <>
      <polygon className="gem-facet gem-facet--outer" points="28,12 72,12 90,50 72,88 28,88 10,50" />
      <polygon className="gem-facet gem-facet--mid" points="33,24 67,24 81,50 67,76 33,76 19,50" />
      <polygon className="gem-facet gem-facet--light" points="33,24 50,34 67,24 61,50 39,50" />
      <path className="gem-stroke" d="M28 12 L50 34 L72 12 M10 50 L39 50 M90 50 L61 50 M33 76 L50 58 L67 76" />
    </>
  ),
  emerald: (
    <>
      <polygon className="gem-facet gem-facet--outer" points="34,8 66,8 88,30 80,70 66,92 34,92 20,70 12,30" />
      <polygon className="gem-facet gem-facet--mid" points="38,22 62,22 76,36 70,66 58,78 42,78 30,66 24,36" />
      <polygon className="gem-facet gem-facet--light" points="38,22 50,34 62,22 58,50 42,50" />
      <path className="gem-stroke" d="M34 8 L38 22 M66 8 L62 22 M20 70 L42 50 L12 30 M88 30 L58 50 L80 70 M42 78 L50 62 L58 78" />
    </>
  ),
  sapphire: (
    <>
      <polygon className="gem-facet gem-facet--outer" points="50,6 78,18 92,50 78,82 50,94 22,82 8,50 22,18" />
      <polygon className="gem-facet gem-facet--mid" points="50,16 69,25 79,50 69,75 50,84 31,75 21,50 31,25" />
      <polygon className="gem-facet gem-facet--light" points="50,16 61,31 50,50 39,31" />
      <path className="gem-stroke" d="M50 16 L50 84 M31 25 L69 25 M21 50 L79 50 M31 75 L69 75 M39 31 L50 50 L61 31" />
    </>
  ),
  violet: (
    <>
      <polygon className="gem-facet gem-facet--outer" points="50,6 62,26 86,26 68,46 75,72 50,58 25,72 32,46 14,26 38,26" />
      <polygon className="gem-facet gem-facet--mid" points="50,17 57,30 72,30 61,42 65,58 50,49 35,58 39,42 28,30 43,30" />
      <polygon className="gem-facet gem-facet--light" points="50,17 57,30 50,43 43,30" />
      <path className="gem-stroke" d="M50 17 L50 58 M28 30 L72 30 M39 42 L61 42 M35 58 L50 49 L65 58" />
    </>
  ),
  rose: (
    <>
      <path className="gem-facet gem-facet--outer" d="M50 10 C64 10 78 20 78 34 C78 46 69 56 62 63 C58 67 54 71 50 78 C46 71 42 67 38 63 C31 56 22 46 22 34 C22 20 36 10 50 10Z" />
      <path className="gem-facet gem-facet--mid" d="M50 22 C60 22 68 28 68 37 C68 44 62 50 57 55 C54 58 52 61 50 65 C48 61 46 58 43 55 C38 50 32 44 32 37 C32 28 40 22 50 22Z" />
      <path className="gem-facet gem-facet--light" d="M50 22 C55 22 60 26 60 31 C60 35 56 39 53 42 C52 43 51 44 50 46 C49 44 48 43 47 42 C44 39 40 35 40 31 C40 26 45 22 50 22Z" />
      <path className="gem-stroke" d="M50 22 L50 65 M40 31 Q50 39 60 31 M43 55 Q50 49 57 55" />
    </>
  ),
  teal: (
    <>
      <path className="gem-facet gem-facet--outer" d="M22 18 L78 18 L88 38 L78 86 L22 86 L12 38 Z" />
      <path className="gem-facet gem-facet--mid" d="M29 28 L71 28 L79 42 L71 76 L29 76 L21 42 Z" />
      <polygon className="gem-facet gem-facet--light" points="29,28 50,40 71,28 65,52 35,52" />
      <path className="gem-stroke" d="M22 18 L29 28 L50 40 L71 28 L78 18 M21 42 L35 52 L65 52 L79 42 M29 76 L50 58 L71 76" />
    </>
  ),
}

export default function GemIcon({ kind }: { kind: TileKind }) {
  return (
    <svg viewBox="0 0 100 100" className="gem-icon" aria-hidden="true" focusable="false">
      <defs>
        <filter id={`gem-glow-${kind}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="var(--gem-glow)" floodOpacity="0.75" />
        </filter>
      </defs>
      <g filter={`url(#gem-glow-${kind})`}>
        {gemShapes[kind]}
      </g>
    </svg>
  )
}
