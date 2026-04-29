export type TileKind =
  | 'ruby'
  | 'amber'
  | 'emerald'
  | 'sapphire'
  | 'violet'
  | 'rose'
  | 'teal'

export type SpecialType = 'row' | 'column' | 'bomb' | 'rainbow'

export type Tile = {
  id: string
  kind: TileKind
  specialType?: SpecialType
}

export type Board = Tile[][]

export type Position = {
  row: number
  col: number
}

export type LevelDefinition = {
  id: number
  name: string
  summary: string
  rows: number
  columns: number
  tileKinds: TileKind[]
  targetScore: number
  timeLimit: number
  timeBonus: number
  pointsPerTile: number
  chainBonus: number
  handcrafted: boolean
}

export type MatchPattern = 'line-3' | 'line-4' | 'line-5' | 't-shape' | 'l-shape'

export type MatchGroup = {
  kind: TileKind
  pattern: MatchPattern
  positions: Position[]
}

export type CreatedSpecial = {
  position: Position
  kind: TileKind
  specialType: SpecialType
}

export type CascadeResolution = {
  board: Board
  clearedTiles: number
  chains: number
  matchedGroups: number
  matchGroups: MatchGroup[]
  createdSpecials: CreatedSpecial[]
}

export type LeaderboardEntry = {
  id: string
  name: string
  totalScore: number
  highestLevel: number
  totalTimeMs: number
  updatedAt: number
}

export type LevelRecord = {
  score: number
  timeMs: number
}

export type CampaignSnapshot = {
  currentLevel: number
  unlockedLevel: number
  totalScore: number
  totalTimeMs: number
  clearedLevels: number
  playerName: string
  levelRecords: Record<string, LevelRecord>
}
