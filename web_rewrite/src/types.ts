export const TILE_SIZE = 30;
export const TICK_MS = 40;

export enum Direction {
  Up = 0,
  Right = 1,
  Down = 2,
  Left = 3,
}

export enum MapEntity {
  WallOnGravel = 1,
  WallOnWater = 2,
  WallOnSand = 3,
  WallOnGrass = 20,
  Metal = 4,
  Gravel = 5,
  Sand = 6,
  Grass = 7,
  Water = 11,
  RedSpawnerOnGravel = 8,
  RedSpawnerOnSand = 9,
  RedSpawnerOnWater = 10,
  RedSpawnerOnGrass = 21,
  BluSpawnerOnGravel = 25,
  BluSpawnerOnSand = 12,
  BluSpawnerOnWater = 13,
  BluSpawnerOnGrass = 22,
  RedFlagOnGravel = 14,
  RedFlagOnSand = 15,
  RedFlagOnWater = 16,
  RedFlagOnGrass = 23,
  BluFlagOnGravel = 17,
  BluFlagOnSand = 18,
  BluFlagOnWater = 19,
  BluFlagOnGrass = 24,
}

export type TileKind = 'empty' | 'gravel' | 'sand' | 'grass' | 'water';
export type EntityKind = 'wall' | 'metal' | 'spawner-red' | 'spawner-blu' | 'flag-red' | 'flag-blu' | 'turret' | 'mine' | 'dispenser';
export type DetailKind = 'sand-trace' | 'sand-shore' | 'gravel-shore' | 'grass-shore' | 'flower';
export type BonusKind = 'acceleration' | 'ap-bullets' | 'big-ammo' | 'big-med' | 'invulnerability' | 'mine' | 'small-ammo' | 'small-med' | 'turret' | 'dispenser';
export type InventoryKind = 'cannon' | 'turret' | 'mine' | 'dispenser';
export type Team = 'red' | 'blu' | 'none';

export interface Tile {
  x: number;
  y: number;
  kind: TileKind;
  frame: number;
  skippedRedrawTicks: number;
}

export interface Detail {
  x: number;
  y: number;
  kind: DetailKind;
  direction: Direction;
  frame: number;
}

export interface StaticEntity {
  id?: string;
  x: number;
  y: number;
  kind: EntityKind;
  solid: boolean;
  health: number;
  maxHealth: number;
  removed: boolean;
  owner?: string;
  direction?: Direction;
  energy?: number;
  skippedRenewTicks?: number;
  lastShot?: number;
  skippedAnimTicks?: number;
  countdown?: boolean;
  skippedExplTicks?: number;
}

export interface LevelData {
  width: number;
  height: number;
  tiles: Tile[];
  details: Detail[];
  entities: StaticEntity[];
  spawners: StaticEntity[];
}

export interface BonusState {
  id: string;
  owner: string;
  kind: BonusKind;
  x: number;
  y: number;
  living: number;
  lifeTime: number;
}

export interface PlayerState {
  id: string;
  x: number;
  y: number;
  hp: number;
  ammo: number;
  direction: Direction;
  moving: boolean;
  shooting: boolean;
  kills: number;
  deaths: number;
  name: string;
  pickedBonuses: ActiveBonusState[];
  inventory: InventoryItemState[];
  currentInventoryKey: number;
  team: Team;
  holdingFlag?: Team;
  carriedBuildingId?: string;
}

export interface ActiveBonusState {
  kind: BonusKind;
  activationTime: number;
  duration: number;
}

export interface InventoryItemState {
  kind: InventoryKind;
  activationKey: number;
  imageIndex: number;
  amount: number;
}

export interface BulletState {
  id: string;
  owner: string;
  x: number;
  y: number;
  direction: Direction;
  ap: boolean;
}

export interface WallState {
  x: number;
  y: number;
  health: number;
  removed: boolean;
}

export interface HitState {
  id: string;
  owner: string;
  target: string;
  damage: number;
}

export interface ParticleState {
  id: string;
  kind: 'barrel-flame' | 'spark' | 'brick-dust' | 'wall-debris' | 'robot-debris' | 'dispense-heal' | 'dispense-ammo' | 'mine-explosion';
  x: number;
  y: number;
  direction: Direction;
  living: number;
  lifeTime: number;
  animationState: number;
  animationStates: number;
  debrisFrame: number;
}

export interface NetworkGameState {
  player: PlayerState;
  bullets: BulletState[];
  bonuses: BonusState[];
  buildings: StaticEntity[];
  flags: StaticEntity[];
  score: { red: number; blu: number };
  removedBonuses: string[];
  walls: WallState[];
  hits: HitState[];
}
