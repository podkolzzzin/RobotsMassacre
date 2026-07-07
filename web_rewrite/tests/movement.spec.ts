import { expect, test } from '@playwright/test';

function playUrl(path = '/'): string {
  const url = new URL(path, 'http://robots-massacre.test');
  url.searchParams.set('play', '1');
  return `${url.pathname}${url.search}`;
}

async function startGame(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(playUrl('/?sound=off'));
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { players: Map<string, unknown> } }).game;
    return game?.players.size ?? 0;
  })).toBe(1);
  await page.waitForTimeout(1200);
}

async function playerPosition(page: import('@playwright/test').Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { x: number; y: number } } }).game!;
    return { x: game.localPlayer.x, y: game.localPlayer.y };
  });
}

test('holding two perpendicular keys moves only in the most recently pressed direction', async ({ page }) => {
  await startGame(page);
  await page.keyboard.down('KeyS');
  await page.keyboard.down('KeyD');
  const before = await playerPosition(page);
  await page.waitForTimeout(700);
  const after = await playerPosition(page);
  await page.keyboard.up('KeyS');
  await page.keyboard.up('KeyD');
  expect(after.x - before.x).toBeGreaterThan(3); // moves right (latest press wins)
  expect(Math.abs(after.y - before.y)).toBeLessThan(1); // never moves down at the same time
});

test('pressing a third perpendicular key overrides the current direction, not blends with it', async ({ page }) => {
  await startGame(page);
  // Move down, then press left without releasing down: diagonal movement is
  // prohibited by game design, so the latest press should fully take over
  // the single active direction rather than adding a second axis.
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(300);
  await page.keyboard.down('KeyA');
  const before = await playerPosition(page);
  await page.waitForTimeout(700);
  const after = await playerPosition(page);
  await page.keyboard.up('KeyA');
  await page.keyboard.up('KeyS');
  expect(after.x - before.x).toBeLessThan(-3); // moving left (latest press wins)
  expect(Math.abs(after.y - before.y)).toBeLessThan(1); // not also moving down
});

test('opposite keys alone move toward the most recent press', async ({ page }) => {
  await startGame(page);
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(200);
  await page.keyboard.down('KeyD');
  const before = await playerPosition(page);
  await page.waitForTimeout(500);
  const after = await playerPosition(page);
  await page.keyboard.up('KeyA');
  await page.keyboard.up('KeyD');
  expect(after.x - before.x).toBeGreaterThan(3);
  // Releasing the newer key hands control back to the older one.
  await page.keyboard.down('KeyA');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(100);
  await page.keyboard.up('KeyD');
  const back = await playerPosition(page);
  await page.waitForTimeout(500);
  const final = await playerPosition(page);
  await page.keyboard.up('KeyA');
  expect(final.x - back.x).toBeLessThan(-3);
});

test('holding all four directional keys still moves in only one direction', async ({ page }) => {
  await startGame(page);
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyA');
  await page.keyboard.down('KeyS');
  await page.keyboard.down('KeyD');
  // Capture the baseline only once all four are confirmed down, so the brief
  // per-key press sequence (which passes through partial states) isn't
  // mistaken for movement during the steady-state hold.
  const before = await playerPosition(page);
  await page.waitForTimeout(700);
  const after = await playerPosition(page);
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyA');
  await page.keyboard.up('KeyS');
  await page.keyboard.up('KeyD');
  expect(after.x - before.x).toBeGreaterThan(3); // moves right (KeyD pressed last)
  expect(Math.abs(after.y - before.y)).toBeLessThan(1); // never diagonally
});
