import { expect, test } from '@playwright/test';

interface MenuWindow {
  menu?: { active: boolean; screen: string; selected: number };
}

const ROOMS = {
  rooms: [
    { room: 'alpha1', players: 2, mode: 'dm', level: '/levels/dm/open.rmm', updatedAt: 1 },
    { room: 'beta22', players: 1, mode: 'ctf', level: '/levels/ctf/MAXIMUM.rmm', updatedAt: 2 },
  ],
};

async function openJoinScreen(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.active)).toBe(true);
  await page.keyboard.press('ArrowDown'); // join game
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.screen)).toBe('join');
}

test('join screen lists rooms from the lobby and joins the selected one', async ({ page }) => {
  await page.route('**/rooms', (route) => route.fulfill({ json: ROOMS }));
  await openJoinScreen(page);
  await expect.poll(() => page.evaluate(() => (window as MenuWindow & { menu?: { joinStatus?: string } }).menu?.joinStatus)).toBe('ready');
  const rooms = await page.evaluate(() => (window as MenuWindow & { menu?: { joinRooms?: unknown[] } }).menu?.joinRooms);
  expect(rooms).toHaveLength(2);

  await page.keyboard.press('ArrowDown'); // select beta22
  await page.keyboard.press('Enter');
  await page.waitForURL(/room=beta22/);
  const params = new URL(page.url()).searchParams;
  expect(params.get('play')).toBe('1');
  expect(params.get('mode')).toBe('ctf');
  expect(params.get('level')).toBe('/levels/ctf/MAXIMUM.rmm');
});

test('join screen falls back to manual room code entry', async ({ page }) => {
  await page.route('**/rooms', (route) => route.fulfill({ json: { rooms: [] } }));
  await openJoinScreen(page);
  await expect.poll(() => page.evaluate(() => (window as MenuWindow & { menu?: { joinStatus?: string } }).menu?.joinStatus)).toBe('ready');

  await page.keyboard.press('KeyC');
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.screen)).toBe('join-code');
  await page.keyboard.type('my-room1');
  await page.keyboard.press('Enter');
  await page.waitForURL(/room=my-room1/);
  expect(new URL(page.url()).searchParams.get('play')).toBe('1');
});

test('join screen reports when the room list is unavailable', async ({ page }) => {
  await page.route('**/rooms', (route) => route.fulfill({ status: 404, body: 'not found' }));
  await openJoinScreen(page);
  await expect.poll(() => page.evaluate(() => (window as MenuWindow & { menu?: { joinStatus?: string } }).menu?.joinStatus)).toBe('error');
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.screen)).toBe('main');
});
