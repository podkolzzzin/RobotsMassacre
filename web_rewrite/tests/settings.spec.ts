import { expect, test } from '@playwright/test';

interface GameWindow {
  menu?: { active: boolean; screen: string; selected: number };
  game?: { localPlayer: { name: string } };
}

async function openSettings(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as GameWindow).menu?.active)).toBe(true);
  for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as GameWindow).menu?.screen)).toBe('settings');
}

test('settings allow editing username and dimension, and persist across reloads', async ({ page }) => {
  await openSettings(page);

  await page.keyboard.press('Tab'); // dimension
  await page.keyboard.press('ArrowRight'); // 960x600 -> 640x480
  await expect.poll(() => page.evaluate(() => document.querySelector('canvas')?.width)).toBe(640);

  await page.keyboard.press('Tab'); // username
  for (let i = 0; i < 16; i += 1) await page.keyboard.press('Backspace');
  await page.keyboard.type('andrii');
  await expect.poll(() => page.evaluate(() => (window as GameWindow).game?.localPlayer.name)).toBe('andrii');

  await page.keyboard.press('Escape'); // save
  const stored = await page.evaluate(() => localStorage.getItem('rmm-settings'));
  expect(JSON.parse(stored ?? '{}')).toEqual({ name: 'andrii', width: 640, height: 480 });

  await page.reload();
  await expect.poll(() => page.evaluate(() => ({
    width: document.querySelector('canvas')?.width,
    name: (window as GameWindow).game?.localPlayer.name,
  }))).toEqual({ width: 640, name: 'andrii' });
});

test('play sessions accumulate persistent statistics', async ({ page }) => {
  await page.goto('/?play=1&sound=off');
  await expect.poll(() => page.evaluate(() => (window as GameWindow).game !== undefined)).toBe(true);
  await page.goto('/'); // navigation fires pagehide, which saves stats
  const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('rmm-stats') ?? '{}'));
  expect(stats.games).toBe(1);
  expect(stats.timeMs).toBeGreaterThan(0);
});

test('quit leaves the game page', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as GameWindow).menu?.active)).toBe(true);
  await page.keyboard.press('ArrowUp'); // wraps to 'quit'
  await page.keyboard.press('Enter');
  await expect.poll(() => (page.isClosed() ? 'about:blank' : page.url())).toContain('about:blank');
});
