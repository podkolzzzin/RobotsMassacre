import { Detail, DetailKind, Direction, EntityKind, LevelData, MapEntity, StaticEntity, TILE_SIZE, Tile, TileKind } from './types';

function tileKind(entity: MapEntity): TileKind {
  switch (entity) {
    case MapEntity.WallOnWater:
    case MapEntity.RedSpawnerOnWater:
    case MapEntity.BluSpawnerOnWater:
    case MapEntity.RedFlagOnWater:
    case MapEntity.BluFlagOnWater:
    case MapEntity.Water:
      return 'water';
    case MapEntity.WallOnSand:
    case MapEntity.RedSpawnerOnSand:
    case MapEntity.BluSpawnerOnSand:
    case MapEntity.RedFlagOnSand:
    case MapEntity.BluFlagOnSand:
    case MapEntity.Sand:
      return 'sand';
    case MapEntity.WallOnGrass:
    case MapEntity.RedSpawnerOnGrass:
    case MapEntity.BluSpawnerOnGrass:
    case MapEntity.RedFlagOnGrass:
    case MapEntity.BluFlagOnGrass:
    case MapEntity.Grass:
      return 'grass';
    case MapEntity.Metal:
      return 'empty';
    default:
      return 'gravel';
  }
}

function staticEntity(entity: MapEntity, x: number, y: number): StaticEntity | undefined {
  const common = { x, y, solid: false, health: Number.POSITIVE_INFINITY, maxHealth: Number.POSITIVE_INFINITY, removed: false };
  switch (entity) {
    case MapEntity.WallOnGravel:
    case MapEntity.WallOnWater:
    case MapEntity.WallOnSand:
    case MapEntity.WallOnGrass:
      return { ...common, kind: 'wall', solid: true, health: 60, maxHealth: 60 };
    case MapEntity.Metal:
      return { ...common, kind: 'metal', solid: true };
    case MapEntity.RedSpawnerOnGravel:
    case MapEntity.RedSpawnerOnWater:
    case MapEntity.RedSpawnerOnSand:
    case MapEntity.RedSpawnerOnGrass:
      return { ...common, kind: 'spawner-red' };
    case MapEntity.BluSpawnerOnGravel:
    case MapEntity.BluSpawnerOnWater:
    case MapEntity.BluSpawnerOnSand:
    case MapEntity.BluSpawnerOnGrass:
      return { ...common, kind: 'spawner-blu' };
    case MapEntity.RedFlagOnGravel:
    case MapEntity.RedFlagOnWater:
    case MapEntity.RedFlagOnSand:
    case MapEntity.RedFlagOnGrass:
      return { ...common, kind: 'flag-red' };
    case MapEntity.BluFlagOnGravel:
    case MapEntity.BluFlagOnWater:
    case MapEntity.BluFlagOnSand:
    case MapEntity.BluFlagOnGrass:
      return { ...common, kind: 'flag-blu' };
    default:
      return undefined;
  }
}

export function parseLevel(buffer: ArrayBuffer): LevelData {
  const view = new DataView(buffer);
  const width = view.getInt32(0, true);
  const height = view.getInt32(4, true);
  const tiles: Tile[] = [];
  const entities: StaticEntity[] = [];
  const spawners: StaticEntity[] = [];
  let offset = 8;

  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      const value = view.getUint8(offset) as MapEntity;
      offset += 1;
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      const kind = tileKind(value);
      tiles.push({ x: px, y: py, kind, frame: arbitraryFrame(x, y, value), skippedRedrawTicks: 0 });
      const entity = staticEntity(value, px, py);
      if (entity) {
        if (entity.kind.startsWith('spawner')) spawners.push(entity);
        else entities.push(entity);
      }
    }
  }

  return { width, height, tiles, details: generateDetails(width, height, tiles), entities, spawners };
}

export async function loadLevel(path = '/levels/dm/open.rmm'): Promise<LevelData> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load level ${path}`);
  return parseLevel(await response.arrayBuffer());
}

const THUMBNAIL_COLORS: Partial<Record<MapEntity, [number, number, number]>> = {
  [MapEntity.WallOnGravel]: [255, 0, 0],
  [MapEntity.WallOnWater]: [255, 137, 137],
  [MapEntity.WallOnSand]: [141, 0, 0],
  [MapEntity.WallOnGrass]: [124, 21, 21],
  [MapEntity.Water]: [0, 0, 255],
  [MapEntity.Sand]: [100, 100, 100],
  [MapEntity.Gravel]: [150, 150, 150],
  [MapEntity.Grass]: [200, 0, 200],
  [MapEntity.Metal]: [0, 150, 150],
  [MapEntity.RedSpawnerOnGravel]: [0, 255, 0],
  [MapEntity.RedSpawnerOnGrass]: [163, 159, 163],
  [MapEntity.RedSpawnerOnSand]: [0, 93, 0],
  [MapEntity.RedSpawnerOnWater]: [193, 255, 193],
  [MapEntity.BluSpawnerOnGravel]: [157, 255, 157],
  [MapEntity.BluSpawnerOnGrass]: [183, 126, 183],
  [MapEntity.BluSpawnerOnSand]: [46, 96, 46],
  [MapEntity.BluSpawnerOnWater]: [145, 188, 145],
};

export function createThumbnail(buffer: ArrayBuffer): HTMLCanvasElement {
  const view = new DataView(buffer);
  const width = view.getInt32(0, true);
  const height = view.getInt32(4, true);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  const image = ctx.createImageData(width, height);
  let offset = 8;
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      const [r, g, b] = THUMBNAIL_COLORS[view.getUint8(offset) as MapEntity] ?? [0, 0, 0];
      offset += 1;
      const i = (y * width + x) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export function spriteForTile(kind: TileKind): [number, number] {
  if (kind === 'sand') return [0, 6];
  if (kind === 'grass') return [1, 4];
  if (kind === 'water') return [0, 5];
  return [0, 3];
}

export function spriteForEntity(kind: EntityKind): [number, number] {
  if (kind === 'wall') return [0, 2];
  if (kind === 'metal') return [0, 4];
  if (kind === 'flag-red') return [3, 18];
  if (kind === 'flag-blu') return [2, 18];
  if (kind === 'spawner-red') return [5, 18];
  return [4, 18];
}

export function wallFrame(health: number, maxHealth: number): number {
  if (health <= 0) return 2;
  return Math.max(0, Math.min(2, Math.round(maxHealth / health) - 1));
}

export function spriteForDetail(detail: Detail): [number, number] {
  if (detail.kind === 'sand-trace') return [6, 6];
  if (detail.kind === 'sand-shore') return [3 + detail.frame, 6];
  if (detail.kind === 'gravel-shore') return [3 + detail.frame, 3];
  if (detail.kind === 'grass-shore') return [4 + detail.frame, 4];
  return [7 + detail.frame, 4];
}

function generateDetails(width: number, height: number, tiles: Tile[]): Detail[] {
  const details: Detail[] = [];
  const byCell = new Map<string, Tile>();
  for (const tile of tiles) byCell.set(`${tile.x / TILE_SIZE}:${tile.y / TILE_SIZE}`, tile);

  const tileAt = (x: number, y: number) => byCell.get(`${x}:${y}`);
  const add = (kind: DetailKind, x: number, y: number, direction: Direction, seed: number) => {
    details.push({ x, y, kind, direction, frame: arbitraryFrame(x, y, seed) });
  };

  for (const tile of tiles) {
    const tx = tile.x / TILE_SIZE;
    const ty = tile.y / TILE_SIZE;
    const neighbors: Array<[Tile | undefined, number, number, Direction]> = [
      [tileAt(tx - 1, ty), tile.x - TILE_SIZE + 2, tile.y, Direction.Left],
      [tileAt(tx + 1, ty), tile.x + TILE_SIZE - 2, tile.y, Direction.Right],
      [tileAt(tx, ty - 1), tile.x, tile.y - TILE_SIZE + 2, Direction.Up],
      [tileAt(tx, ty + 1), tile.x, tile.y + TILE_SIZE - 2, Direction.Down],
    ];

    if (tile.kind === 'sand') {
      for (const [neighbor, x, y, direction] of neighbors) {
        if (neighbor?.kind === 'gravel') add('sand-trace', x, y, direction, 11);
        if (neighbor && (neighbor.kind === 'water' || neighbor.kind === 'gravel')) add('sand-shore', x, y, direction, 10);
      }
    } else if (tile.kind === 'gravel') {
      for (const [neighbor, x, y, direction] of neighbors) {
        if (neighbor?.kind === 'water') add('gravel-shore', x, y, direction, 9);
      }
    } else if (tile.kind === 'grass') {
      for (const [neighbor, x, y, direction] of neighbors) {
        if (neighbor && (neighbor.kind === 'water' || neighbor.kind === 'gravel' || neighbor.kind === 'sand')) {
          add('grass-shore', x, direction === Direction.Right ? y + 1 : y, direction, 8);
        }
      }
      if (hash(tile.x, tile.y, width, height) % 128 < 48) {
        details.push({
          x: tile.x + hash(tile.x, tile.y, 1, 9) % 21,
          y: tile.y + hash(tile.x, tile.y, 2, 9) % 21,
          kind: 'flower',
          direction: Direction.Down,
          frame: arbitraryFrame(tile.x, tile.y, 7),
        });
      }
    }
  }

  return details;
}

function arbitraryFrame(x: number, y: number, seed: number): number {
  const generated = hash(x, y, seed, 128) % 128;
  if (generated < 64) return 0;
  return generated % 2 === 0 ? 1 : 2;
}

export function nextArbitraryFrame(x: number, y: number, seed: number, current: number): number {
  let nextSeed = seed;
  let frame = current;
  while (frame === current) {
    nextSeed += 1;
    frame = arbitraryFrame(x, y, nextSeed);
  }
  return frame;
}

function hash(a: number, b: number, c: number, d: number): number {
  let value = (a | 0) * 374761393 + (b | 0) * 668265263 + (c | 0) * 2147483647 + (d | 0) * 1274126177;
  value = (value ^ (value >>> 13)) * 1274126177;
  return (value ^ (value >>> 16)) >>> 0;
}
