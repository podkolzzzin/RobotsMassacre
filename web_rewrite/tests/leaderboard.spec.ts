import { expect, test } from '@playwright/test';

interface MenuWindow {
  menu?: { active: boolean; screen: string; selected: number; leaderboardStatus?: string; leaderboard?: { name: string; kills: number }[] };
}

const LEADERBOARD = {
  leaderboard: [
    { name: 'Tanker', kills: 42 },
    { name: 'Robot', kills: 15 },
    { name: 'Destroyer', kills: 3 },
  ],
};

async function openLeaderboard(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.active)).toBe(true);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown'); // leaderboard is at index 2
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.screen)).toBe('leaderboard');
}

test('leaderboard screen loads entries from the server sorted by kills', async ({ page }) => {
  await page.route('**/leaderboard', (route) => route.fulfill({ json: LEADERBOARD }));
  await openLeaderboard(page);
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.leaderboardStatus)).toBe('ready');
  const entries = await page.evaluate(() => (window as MenuWindow).menu?.leaderboard);
  expect(entries).toHaveLength(3);
  expect(entries?.[0]).toEqual({ name: 'Tanker', kills: 42 });
  expect(entries?.[1]).toEqual({ name: 'Robot', kills: 15 });
});

test('leaderboard screen reports when the leaderboard is unavailable', async ({ page }) => {
  await page.route('**/leaderboard', (route) => route.fulfill({ status: 500, body: 'error' }));
  await openLeaderboard(page);
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.leaderboardStatus)).toBe('error');
});

test('leaderboard screen returns to main menu on Escape', async ({ page }) => {
  await page.route('**/leaderboard', (route) => route.fulfill({ json: { leaderboard: [] } }));
  await openLeaderboard(page);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.screen)).toBe('main');
  const selected = await page.evaluate(() => (window as MenuWindow).menu?.selected);
  expect(selected).toBe(0);
});
