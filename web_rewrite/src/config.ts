import type { BonusKind } from './types';

export const BONUS_KINDS: BonusKind[] = ['acceleration', 'ap-bullets', 'big-ammo', 'big-med', 'invulnerability', 'mine', 'small-ammo', 'small-med', 'turret', 'dispenser'];

// Column of each bonus tile on row 19 of Graphics.png.
export const BONUS_TILE_COLUMNS: Record<BonusKind, number> = {
  'big-ammo': 0,
  'big-med': 1,
  'ap-bullets': 2,
  invulnerability: 3,
  acceleration: 4,
  'small-med': 5,
  'small-ammo': 6,
  turret: 7,
  mine: 8,
  dispenser: 10,
};

export const BONUS_FREQUENCIES = ['no', 'minimum', 'normal', 'high', 'xhigh'] as const;
export type BonusFrequency = (typeof BONUS_FREQUENCIES)[number];
export const DEFAULT_BONUS_FREQUENCY_INDEX = BONUS_FREQUENCIES.indexOf('normal');

const FREQUENCY_WEIGHTS: Record<BonusFrequency, number> = { no: 0, minimum: 1, normal: 4, high: 8, xhigh: 16 };

export const MIN_GAME_MINUTES = 1;
export const MAX_GAME_MINUTES = 10;
export const DEFAULT_GAME_MINUTES = 5;

export interface GameConfig {
  bonusFrequencies: Record<BonusKind, BonusFrequency>;
  durationMs: number;
}

export function defaultBonusFrequencies(): Record<BonusKind, BonusFrequency> {
  const frequencies = {} as Record<BonusKind, BonusFrequency>;
  for (const kind of BONUS_KINDS) frequencies[kind] = 'normal';
  return frequencies;
}

export function defaultGameConfig(): GameConfig {
  return { bonusFrequencies: defaultBonusFrequencies(), durationMs: DEFAULT_GAME_MINUTES * 60_000 };
}

// One digit per bonus kind (in BONUS_KINDS order) indexing into BONUS_FREQUENCIES.
export function encodeBonusFrequencies(frequencies: Record<BonusKind, BonusFrequency>): string {
  return BONUS_KINDS.map((kind) => BONUS_FREQUENCIES.indexOf(frequencies[kind])).join('');
}

export const DEFAULT_BONUSES_PARAM = encodeBonusFrequencies(defaultBonusFrequencies());

export function parseBonusFrequencies(value: string | null): Record<BonusKind, BonusFrequency> {
  const frequencies = defaultBonusFrequencies();
  if (!value) return frequencies;
  for (let i = 0; i < BONUS_KINDS.length && i < value.length; i += 1) {
    const frequency = BONUS_FREQUENCIES[Number(value[i])];
    if (frequency) frequencies[BONUS_KINDS[i]] = frequency;
  }
  return frequencies;
}

export function parseGameMinutes(value: string | null): number {
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return DEFAULT_GAME_MINUTES;
  return Math.max(MIN_GAME_MINUTES, Math.min(MAX_GAME_MINUTES, Math.round(minutes)));
}

export function gameConfigFromParams(params: URLSearchParams): GameConfig {
  return {
    bonusFrequencies: parseBonusFrequencies(params.get('bonuses')),
    durationMs: parseGameMinutes(params.get('duration')) * 60_000,
  };
}

// Spawn order with each kind appearing proportionally to its frequency weight,
// spread evenly through the cycle rather than in blocks. With every kind at the
// default 'normal' this degenerates to the classic round-robin over BONUS_KINDS.
export function buildBonusSchedule(frequencies: Record<BonusKind, BonusFrequency>): BonusKind[] {
  const slots: Array<{ kind: BonusKind; position: number }> = [];
  for (const kind of BONUS_KINDS) {
    const weight = FREQUENCY_WEIGHTS[frequencies[kind]];
    for (let i = 0; i < weight; i += 1) slots.push({ kind, position: (i + 0.5) / weight });
  }
  slots.sort((a, b) => a.position - b.position);
  return slots.map((slot) => slot.kind);
}

// Higher combined frequency also shortens the delay between spawns; the
// all-'normal' default keeps the base cadence unchanged.
export function bonusSpawnIntervalTicks(frequencies: Record<BonusKind, BonusFrequency>, baseTicks: number): number {
  const total = BONUS_KINDS.reduce((sum, kind) => sum + FREQUENCY_WEIGHTS[frequencies[kind]], 0);
  if (total === 0) return baseTicks;
  const defaultTotal = BONUS_KINDS.length * FREQUENCY_WEIGHTS.normal;
  return Math.max(1, Math.round(baseTicks * defaultTotal / total));
}
