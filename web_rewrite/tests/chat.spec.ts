import { expect, test, type Page } from '@playwright/test';

function playUrl(path = '/'): string {
  const url = new URL(path, 'http://robots-massacre.test');
  url.searchParams.set('play', '1');
  return `${url.pathname}${url.search}`;
}

async function startGame(page: Page): Promise<void> {
  await page.goto(playUrl('/?sound=off'));
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { players: Map<string, unknown> } }).game;
    return game?.players.size ?? 0;
  })).toBe(1);
  await page.waitForTimeout(1200);
}

async function playerPosition(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { x: number; y: number } } }).game!;
    return { x: game.localPlayer.x, y: game.localPlayer.y };
  });
}

test('T opens the chat input and Enter sends a message with a bold nickname', async ({ page }) => {
  await startGame(page);
  await page.keyboard.press('KeyT');
  const input = page.locator('.chat-input');
  await expect(input).toBeFocused();
  await input.fill('hello world');
  await page.keyboard.press('Enter');

  await expect(page.locator('.chat-line')).toHaveCount(1);
  await expect(page.locator('.chat-line .chat-name')).toHaveText('Tanker');
  await expect(page.locator('.chat-line .chat-text')).toHaveText('hello world');
  const weight = await page.locator('.chat-name').evaluate((el) => Number(getComputedStyle(el).fontWeight));
  expect(weight).toBeGreaterThanOrEqual(700);
  // The input closes after submitting.
  await expect(page.locator('.chat-layer.is-typing')).toHaveCount(0);
});

test('Escape closes the chat without sending anything', async ({ page }) => {
  await startGame(page);
  await page.keyboard.press('KeyT');
  const input = page.locator('.chat-input');
  await expect(input).toBeFocused();
  await input.fill('never mind');
  await page.keyboard.press('Escape');
  await expect(page.locator('.chat-layer.is-typing')).toHaveCount(0);
  await expect(page.locator('.chat-line')).toHaveCount(0);
});

test('Ctrl+number and tapping insert the matching emoji', async ({ page }) => {
  await startGame(page);
  await page.keyboard.press('KeyT');
  const input = page.locator('.chat-input');
  await expect(input).toBeFocused();
  await page.keyboard.press('Control+Digit1');
  await page.keyboard.press('Control+Digit0');
  await expect(input).toHaveValue('😀🚀');

  await page.locator('.chat-emoji').nth(4).click();
  await expect(input).toHaveValue('😀🚀🎉');
  await expect(input).toBeFocused();
});

test('typing movement keys while chatting does not drive the tank', async ({ page }) => {
  await startGame(page);
  const before = await playerPosition(page);
  await page.keyboard.press('KeyT');
  await expect(page.locator('.chat-input')).toBeFocused();
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyD');
  const after = await playerPosition(page);
  expect(Math.abs(after.x - before.x)).toBeLessThan(1);
  expect(Math.abs(after.y - before.y)).toBeLessThan(1);
});

test('chat messages are delivered to the other client over WebRTC', async ({ browser }) => {
  const context = await browser.newContext();
  const room = `pw-chat-${Date.now()}`;
  const a = await context.newPage();
  const b = await context.newPage();

  await a.goto(playUrl(`/?room=${room}&signal=broadcast&sound=off`));
  await b.goto(playUrl(`/?room=${room}&signal=broadcast&sound=off`));

  await expect.poll(async () => a.evaluate(() => {
    const multiplayer = (window as Window & { multiplayer?: { connectedPeerCount: () => number } }).multiplayer;
    return multiplayer?.connectedPeerCount() ?? 0;
  })).toBe(1);
  await expect.poll(async () => b.evaluate(() => {
    const multiplayer = (window as Window & { multiplayer?: { connectedPeerCount: () => number } }).multiplayer;
    return multiplayer?.connectedPeerCount() ?? 0;
  })).toBe(1);

  await a.evaluate(() => {
    (window as Window & { game?: { localPlayer: { name: string } } }).game!.localPlayer.name = 'alpha';
  });

  await a.keyboard.press('KeyT');
  const input = a.locator('.chat-input');
  await expect(input).toBeFocused();
  await input.fill('hi there');
  await a.keyboard.press('Enter');

  await expect(b.locator('.chat-line .chat-text')).toHaveText('hi there');
  await expect(b.locator('.chat-line .chat-name')).toHaveText('alpha');

  await context.close();
});
