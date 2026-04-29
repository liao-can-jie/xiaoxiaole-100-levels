import type {
  Board,
  CascadeResolution,
  CreatedSpecial,
  LevelDefinition,
  MatchGroup,
  MatchPattern,
  Position,
  SpecialType,
  Tile,
  TileKind,
} from './types'

export type MoveResult = CascadeResolution & {
  valid: boolean
  reshuffled: boolean
}

type MutableBoard = (Tile | null)[][]

type RawLineMatch = {
  axis: 'row' | 'col'
  kind: TileKind
  positions: Position[]
}

function createTile(kind: TileKind, specialType?: SpecialType): Tile {
  return {
    id: crypto.randomUUID(),
    kind,
    specialType,
  }
}

function pickRandomKind(tileKinds: TileKind[]): TileKind {
  return tileKinds[Math.floor(Math.random() * tileKinds.length)]
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((tile) => ({ ...tile })))
}

function createsImmediateMatch(board: Board, row: number, col: number, kind: TileKind): boolean {
  const horizontalMatch =
    col >= 2 && board[row][col - 1].kind === kind && board[row][col - 2].kind === kind
  const verticalMatch =
    row >= 2 && board[row - 1][col].kind === kind && board[row - 2][col].kind === kind

  return horizontalMatch || verticalMatch
}

function buildSeedBoard(rows: number, columns: number, tileKinds: TileKind[]): Board {
  const board: Board = []

  for (let row = 0; row < rows; row += 1) {
    const nextRow: Tile[] = []

    for (let col = 0; col < columns; col += 1) {
      let chosenKind = pickRandomKind(tileKinds)

      while (createsImmediateMatch([...board, nextRow] as Board, row, col, chosenKind)) {
        chosenKind = pickRandomKind(tileKinds)
      }

      nextRow.push(createTile(chosenKind))
    }

    board.push(nextRow)
  }

  return board
}

export function isAdjacent(a: Position, b: Position): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1
}

function findLineMatches(board: Board): RawLineMatch[] {
  const matches: RawLineMatch[] = []
  const rows = board.length
  const columns = board[0]?.length ?? 0

  for (let row = 0; row < rows; row += 1) {
    let start = 0

    for (let col = 1; col <= columns; col += 1) {
      const sameKind = col < columns && board[row][col].kind === board[row][start].kind

      if (sameKind) {
        continue
      }

      if (col - start >= 3) {
        matches.push({
          axis: 'row',
          kind: board[row][start].kind,
          positions: Array.from({ length: col - start }, (_, index) => ({
            row,
            col: start + index,
          })),
        })
      }

      start = col
    }
  }

  for (let col = 0; col < columns; col += 1) {
    let start = 0

    for (let row = 1; row <= rows; row += 1) {
      const sameKind = row < rows && board[row][col].kind === board[start][col].kind

      if (sameKind) {
        continue
      }

      if (row - start >= 3) {
        matches.push({
          axis: 'col',
          kind: board[start][col].kind,
          positions: Array.from({ length: row - start }, (_, index) => ({
            row: start + index,
            col,
          })),
        })
      }

      start = row
    }
  }

  return matches
}

function matchPatternFromLine(length: number): MatchPattern {
  if (length >= 5) {
    return 'line-5'
  }

  if (length === 4) {
    return 'line-4'
  }

  return 'line-3'
}

function classifyMatchGroups(lineMatches: RawLineMatch[]): MatchGroup[] {
  const groups = lineMatches.map<MatchGroup>((match) => ({
    kind: match.kind,
    pattern: matchPatternFromLine(match.positions.length),
    positions: match.positions,
  }))

  for (let index = 0; index < lineMatches.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < lineMatches.length; compareIndex += 1) {
      const first = lineMatches[index]
      const second = lineMatches[compareIndex]

      if (first.kind !== second.kind || first.axis === second.axis) {
        continue
      }

      const overlap = first.positions.filter((position) =>
        second.positions.some((candidate) => candidate.row === position.row && candidate.col === position.col),
      )

      if (overlap.length === 0) {
        continue
      }

      const firstLength = first.positions.length
      const secondLength = second.positions.length
      const pattern: MatchPattern = firstLength >= 3 && secondLength >= 3
        ? firstLength === 3 || secondLength === 3
          ? 't-shape'
          : 'l-shape'
        : 'line-3'

      groups[index] = {
        kind: first.kind,
        pattern,
        positions: dedupePositions([...groups[index].positions, ...second.positions]),
      }

      groups[compareIndex] = {
        kind: second.kind,
        pattern,
        positions: dedupePositions([...groups[compareIndex].positions, ...first.positions]),
      }
    }
  }

  return groups
}

function dedupePositions(positions: Position[]): Position[] {
  const seen = new Set<string>()
  const unique: Position[] = []

  for (const position of positions) {
    const key = `${position.row}:${position.col}`

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    unique.push(position)
  }

  return unique
}

export function findMatches(board: Board): Position[][] {
  return findLineMatches(board).map((match) => match.positions)
}

export function analyzeMatches(board: Board): MatchGroup[] {
  return classifyMatchGroups(findLineMatches(board))
}

function uniqueMatchedPositions(groups: MatchGroup[]): Position[] {
  return dedupePositions(groups.flatMap((group) => group.positions))
}

function determineSpecialType(group: MatchGroup): SpecialType | null {
  switch (group.pattern) {
    case 'line-4':
      return group.positions.every((position) => position.row === group.positions[0].row) ? 'row' : 'column'
    case 'line-5':
      return 'rainbow'
    case 't-shape':
    case 'l-shape':
      return 'bomb'
    default:
      return null
  }
}

function chooseCreatedSpecial(group: MatchGroup): CreatedSpecial | null {
  const specialType = determineSpecialType(group)

  if (!specialType) {
    return null
  }

  const anchor = group.positions[Math.floor(group.positions.length / 2)]

  return {
    position: anchor,
    kind: group.kind,
    specialType,
  }
}

function clearMatches(board: Board, positions: Position[], createdSpecials: CreatedSpecial[]): MutableBoard {
  const nextBoard = cloneBoard(board) as MutableBoard
  const preservedKeys = new Set(createdSpecials.map((special) => `${special.position.row}:${special.position.col}`))

  for (const position of positions) {
    const key = `${position.row}:${position.col}`

    if (preservedKeys.has(key)) {
      continue
    }

    nextBoard[position.row][position.col] = null
  }

  for (const special of createdSpecials) {
    nextBoard[special.position.row][special.position.col] = createTile(special.kind, special.specialType)
  }

  return nextBoard
}

function collapseBoard(board: MutableBoard, tileKinds: TileKind[]): Board {
  const rows = board.length
  const columns = board[0]?.length ?? 0
  const collapsed = Array.from({ length: rows }, () => Array<Tile>(columns))

  for (let col = 0; col < columns; col += 1) {
    const survivors: Tile[] = []

    for (let row = rows - 1; row >= 0; row -= 1) {
      const tile = board[row][col]

      if (tile) {
        survivors.push(tile)
      }
    }

    let survivorIndex = 0

    for (let row = rows - 1; row >= 0; row -= 1) {
      collapsed[row][col] =
        survivorIndex < survivors.length
          ? { ...survivors[survivorIndex++] }
          : createTile(pickRandomKind(tileKinds))
    }
  }

  return collapsed
}

export function resolveBoard(board: Board, tileKinds: TileKind[]): CascadeResolution {
  let currentBoard = cloneBoard(board)
  let clearedTiles = 0
  let chains = 0
  let matchedGroups = 0
  const allMatchGroups: MatchGroup[] = []
  const allCreatedSpecials: CreatedSpecial[] = []

  while (true) {
    const matchGroups = analyzeMatches(currentBoard)

    if (matchGroups.length === 0) {
      break
    }

    chains += 1
    matchedGroups += matchGroups.length
    allMatchGroups.push(...matchGroups)

    const uniquePositions = uniqueMatchedPositions(matchGroups)
    clearedTiles += uniquePositions.length

    const createdSpecials = matchGroups
      .map(chooseCreatedSpecial)
      .filter((special): special is CreatedSpecial => special !== null)

    allCreatedSpecials.push(...createdSpecials)

    const clearedBoard = clearMatches(currentBoard, uniquePositions, createdSpecials)
    currentBoard = collapseBoard(clearedBoard, tileKinds)
  }

  return {
    board: currentBoard,
    clearedTiles,
    chains,
    matchedGroups,
    matchGroups: allMatchGroups,
    createdSpecials: allCreatedSpecials,
  }
}

function swapTiles(board: Board, a: Position, b: Position): Board {
  const nextBoard = cloneBoard(board)
  const temp = nextBoard[a.row][a.col]
  nextBoard[a.row][a.col] = nextBoard[b.row][b.col]
  nextBoard[b.row][b.col] = temp
  return nextBoard
}

export function hasAnyValidMove(board: Board): boolean {
  const rows = board.length
  const columns = board[0]?.length ?? 0

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const origin = { row, col }
      const neighbors = [
        { row, col: col + 1 },
        { row: row + 1, col },
      ]

      for (const neighbor of neighbors) {
        if (neighbor.row >= rows || neighbor.col >= columns) {
          continue
        }

        const swapped = swapTiles(board, origin, neighbor)

        if (findMatches(swapped).length > 0) {
          return true
        }
      }
    }
  }

  return false
}

export function createBoardForLevel(level: LevelDefinition): Board {
  while (true) {
    const board = buildSeedBoard(level.rows, level.columns, level.tileKinds)

    if (hasAnyValidMove(board)) {
      return board
    }
  }
}

export function attemptMove(
  board: Board,
  from: Position,
  to: Position,
  level: LevelDefinition,
): MoveResult {
  if (!isAdjacent(from, to)) {
    return {
      valid: false,
      board,
      clearedTiles: 0,
      chains: 0,
      matchedGroups: 0,
      matchGroups: [],
      createdSpecials: [],
      reshuffled: false,
    }
  }

  const swappedBoard = swapTiles(board, from, to)

  if (findMatches(swappedBoard).length === 0) {
    return {
      valid: false,
      board,
      clearedTiles: 0,
      chains: 0,
      matchedGroups: 0,
      matchGroups: [],
      createdSpecials: [],
      reshuffled: false,
    }
  }

  const resolved = resolveBoard(swappedBoard, level.tileKinds)
  const playableBoard = hasAnyValidMove(resolved.board)
    ? resolved.board
    : createBoardForLevel(level)

  return {
    valid: true,
    ...resolved,
    board: playableBoard,
    reshuffled: !playableBoard.every((row, rowIndex) =>
      row.every((tile, colIndex) => tile.id === resolved.board[rowIndex][colIndex].id),
    ),
  }
}
