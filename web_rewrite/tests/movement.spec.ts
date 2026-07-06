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

test('holding two perpendicular keys moves the player diagonally', async ({ page }) => {
  await startGame(page);
  const before = await playerPosition(page);
  await page.keyboard.down('KeyS');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyS');
  await page.keyboard.up('KeyD');
  const after = await playerPosition(page);
  expect(Math.abs(after.x - before.x)).toBeGreaterThan(3);
  expect(Math.abs(after.y - before.y)).toBeGreaterThan(3);
});

test('diagonal movement continues when both left and right are held', async ({ page }) => {
  await startGame(page);
  // Move diagonally down-left, then press right without releasing left:
  // the most recently pressed horizontal key should win, keeping the
  // player on a diagonal course instead of freezing the horizontal axis.
  await page.keyboard.down('KeyS');
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(300);
  await page.keyboard.down('KeyD');
  const before = await playerPosition(page);
  await page.waitForTimeout(700);
  const after = await playerPosition(page);
  await page.keyboard.up('KeyS');
  await page.keyboard.up('KeyA');
  await page.keyboard.up('KeyD');
  expect(after.x - before.x).toBeGreaterThan(3); // moving right (latest press wins)
  expect(after.y - before.y).toBeGreaterThan(3); // still moving down
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
