import { expect, test } from '@playwright/test';

interface MenuWindow {
  menu?: { active: boolean; screen: string; selected: number };
}

interface GameHandle {
  gameOver: boolean;
  tick: (now: number) => void;
  remainingMs: (now?: number) => number;
  bonuses: Map<string, { kind: string }>;
}

async function openGameConfig(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.active)).toBe(true);
  await page.keyboard.press('Enter'); // create game
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.screen)).toBe('mode');
  await page.keyboard.press('Enter'); // deathmatch
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.screen)).toBe('level');
  await page.keyboard.press('Enter'); // first level
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.screen)).toBe('game-config');
}

test('create game opens the settings page and starts with the defaults', async ({ page }) => {
  await openGameConfig(page);
  await page.keyboard.press('Enter');
  await page.waitForURL(/play=1/);
  const params = new URL(page.url()).searchParams;
  expect(params.get('bonuses')).toBe('2222222222');
  expect(params.get('duration')).toBe('5');
  expect(params.get('mode')).toBe('dm');
});

test('settings page changes bonus frequencies and game duration', async ({ page }) => {
  await openGameConfig(page);
  await page.keyboard.press('ArrowRight'); // first bonus (acceleration): normal -> high
  await page.keyboard.press('Tab'); // second bonus (ap-bullets)
  await page.keyboard.press('ArrowLeft'); // normal -> minimum
  await page.keyboard.press('ArrowLeft'); // minimum -> no
  for (let i = 0; i < 9; i += 1) await page.keyboard.press('Tab'); // to duration
  await page.keyboard.press('ArrowRight'); // 5 -> 6
  await page.keyboard.press('ArrowRight'); // 6 -> 7
  await page.keyboard.press('Enter');
  await page.waitForURL(/play=1/);
  const params = new URL(page.url()).searchParams;
  expect(params.get('bonuses')).toBe('3022222222');
  expect(params.get('duration')).toBe('7');
});

test('settings page escapes back to the level grid', async ({ page }) => {
  await openGameConfig(page);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.screen)).toBe('level');
});

test('countdown timer runs from the configured duration and ends the game', async ({ page }) => {
  await page.goto('/?play=1&sound=off&duration=1');
  await expect.poll(() => page.evaluate(() => {
    const game = (window as Window & { game?: GameHandle }).game;
    return game ? game.remainingMs() : -1;
  })).toBeGreaterThan(0);
  const before = await page.evaluate(() => (window as Window & { game?: GameHandle }).game!.remainingMs());
  expect(before).toBeLessThanOrEqual(60_000);
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => (window as Window & { game?: GameHandle }).game!.remainingMs());
  expect(after).toBeLessThan(before);

  // Jumping a tick past the end of the match flips the game-over state.
  await page.evaluate(() => {
    const game = (window as Window & { game?: GameHandle }).game!;
    game.tick(performance.now() + 61_000);
  });
  const ended = await page.evaluate(() => {
    const game = (window as Window & { game?: GameHandle }).game!;
    return { gameOver: game.gameOver, remaining: game.remainingMs(performance.now() + 61_000) };
  });
  expect(ended.gameOver).toBe(true);
  expect(ended.remaining).toBe(0);
});

test('bonus frequency "no" disables all bonus spawns', async ({ page }) => {
  await page.goto('/?play=1&sound=off&bonuses=0000000000');
  await page.waitForFunction(() => (window as Window & { game?: GameHandle }).game !== undefined);
  const bonuses = await page.evaluate(() => {
    const game = (window as Window & { game?: GameHandle }).game!;
    for (let i = 0; i < 1000; i += 1) game.tick(performance.now() + i * 40);
    return game.bonuses.size;
  });
  expect(bonuses).toBe(0);
});

test('xhigh frequency spawns bonuses faster than the normal cadence', async ({ page }) => {
  await page.goto('/?play=1&sound=off&bonuses=4444444444');
  await page.waitForFunction(() => (window as Window & { game?: GameHandle }).game !== undefined);
  const bonuses = await page.evaluate(() => {
    const game = (window as Window & { game?: GameHandle }).game!;
    for (let i = 0; i < 120; i += 1) game.tick(performance.now() + i * 40);
    return game.bonuses.size;
  });
  // The default cadence (one bonus per 225 ticks) would still be at zero here.
  expect(bonuses).toBeGreaterThan(0);
});

test('per-type frequency limits which bonus kinds spawn', async ({ page }) => {
  await page.goto('/?play=1&sound=off&bonuses=4000000000');
  await page.waitForFunction(() => (window as Window & { game?: GameHandle }).game !== undefined);
  const kinds = await page.evaluate(() => {
    const game = (window as Window & { game?: GameHandle }).game!;
    for (let i = 0; i < 1500; i += 1) game.tick(performance.now() + i * 40);
    return [...game.bonuses.values()].map((bonus) => bonus.kind);
  });
  expect(kinds.length).toBeGreaterThan(0);
  expect(kinds.every((kind) => kind === 'acceleration')).toBe(true);
});
