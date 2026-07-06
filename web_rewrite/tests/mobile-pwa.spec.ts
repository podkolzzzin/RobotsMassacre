import { expect, test } from '@playwright/test';

interface MenuWindow {
  menu?: { active: boolean; screen: string; selected: number };
}

async function tapCanvas(page: import('@playwright/test').Page, logicalX: number, logicalY: number): Promise<void> {
  const rect = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
    const bounds = canvas.getBoundingClientRect();
    return { left: bounds.left, top: bounds.top, scaleX: bounds.width / canvas.width, scaleY: bounds.height / canvas.height };
  });
  await page.mouse.click(rect.left + logicalX * rect.scaleX, rect.top + logicalY * rect.scaleY);
}

test('menu is navigable by tapping items on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.active)).toBe(true);

  await tapCanvas(page, 195, 68); // 'create game' (canvas is 390 logical px wide on this phone)
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.screen)).toBe('mode');
  await tapCanvas(page, 195, 68); // 'deathmatch'
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.screen)).toBe('level');
  await tapCanvas(page, 90, 110); // first level thumbnail (3-column centered grid)
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.screen)).toBe('game-config');
  await tapCanvas(page, 195, 270); // 'start' button below the defaults
  await page.waitForURL(/play=1/);
  const params = new URL(page.url()).searchParams;
  expect(params.get('mode')).toBe('dm');
  expect(params.get('bonuses')).toBe('2222222222');
  expect(params.get('duration')).toBe('5');
});

test('on-screen esc button navigates back through menus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => document.body.dataset.inputMode)).toBe('menu');

  await tapCanvas(page, 195, 68); // 'create game'
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.screen)).toBe('mode');
  await page.locator('.esc-button').click(); // back to main
  await expect.poll(() => page.evaluate(() => (window as MenuWindow).menu?.screen)).toBe('main');
  const gameOnlyControls = await page.evaluate(() => ({
    joy: getComputedStyle(document.querySelector('.joy-zone')!).display,
    fire: getComputedStyle(document.querySelector('.fire-button')!).display,
  }));
  expect(gameOnlyControls).toEqual({ joy: 'none', fire: 'none' });
});

test('mobile viewport fills the screen with the canvas and overlays game controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?play=1&sound=off');
  await expect.poll(() => page.evaluate(() => document.body.dataset.inputMode)).toBe('game');

  const layout = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
    const joyZone = document.querySelector<HTMLElement>('.joy-zone')!;
    const fire = document.querySelector<HTMLElement>('.fire-button')!;
    const esc = document.querySelector<HTMLElement>('.esc-button')!;
    const canvasRect = canvas.getBoundingClientRect();
    const joyRect = joyZone.getBoundingClientRect();
    const fireRect = fire.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      canvas: { width: canvasRect.width, height: canvasRect.height, logicalW: canvas.width, logicalH: canvas.height },
      joy: { width: joyRect.width, height: joyRect.height, visible: getComputedStyle(joyZone).display !== 'none' },
      fire: { width: fireRect.width, height: fireRect.height, right: fireRect.right, visible: getComputedStyle(fire).display !== 'none' },
      escVisible: getComputedStyle(esc).display !== 'none',
      padVisible: getComputedStyle(document.querySelector('.touch-controls')!).display !== 'none',
    };
  });

  // Canvas fills the whole screen and its logical resolution matches 1:1.
  expect(layout.canvas.width).toBe(layout.viewport.width);
  expect(layout.canvas.height).toBe(layout.viewport.height);
  expect(layout.canvas.logicalW).toBe(Math.round(layout.canvas.width));
  expect(layout.canvas.logicalH).toBe(Math.round(layout.canvas.height));
  // Floating joystick zone covers the left side; fire button sits bottom-right.
  expect(layout.joy.visible).toBe(true);
  expect(layout.joy.width).toBeGreaterThan(layout.viewport.width / 2);
  // The joystick zone leaves the top score strip and bottom HUD tappable.
  expect(layout.joy.height).toBe(layout.viewport.height - 76);
  expect(layout.fire.visible).toBe(true);
  expect(layout.fire.width).toBeGreaterThan(80);
  expect(layout.fire.right).toBeLessThanOrEqual(layout.viewport.width);
  expect(layout.escVisible).toBe(true);
  // The editor d-pad cluster stays hidden during play.
  expect(layout.padVisible).toBe(false);
});

test('floating joystick moves the tank while the fire button shoots', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?play=1&sound=off');
  await expect.poll(() => page.evaluate(() => document.body.dataset.inputMode)).toBe('game');

  const start = await page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { x: number; y: number; ammo: number }; bullets: Map<string, unknown> } }).game!;
    game.localPlayer.x = 180;
    game.localPlayer.y = 180;
    game.localPlayer.ammo = 75;
    game.bullets.clear();
    return { x: game.localPlayer.x, y: game.localPlayer.y };
  });

  const joy = page.locator('.joy-zone');
  await joy.dispatchEvent('pointerdown', { pointerId: 20, pointerType: 'touch', clientX: 120, clientY: 500, bubbles: true, cancelable: true });
  await joy.dispatchEvent('pointermove', { pointerId: 20, pointerType: 'touch', clientX: 180, clientY: 500, bubbles: true, cancelable: true });
  await page.waitForTimeout(450);
  await page.locator('.fire-button').dispatchEvent('pointerdown', { pointerId: 22, pointerType: 'touch', bubbles: true, cancelable: true });
  await page.waitForTimeout(180);
  await page.locator('.fire-button').dispatchEvent('pointerup', { pointerId: 22, pointerType: 'touch', bubbles: true, cancelable: true });
  await joy.dispatchEvent('pointerup', { pointerId: 20, pointerType: 'touch', clientX: 180, clientY: 500, bubbles: true, cancelable: true });

  const state = await page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { x: number; y: number; ammo: number; direction: number }; bullets: Map<string, unknown>; soundEvents: () => string[] } }).game!;
    return {
      x: game.localPlayer.x,
      y: game.localPlayer.y,
      ammo: game.localPlayer.ammo,
      bullets: game.bullets.size,
      sounds: game.soundEvents(),
    };
  });

  expect(state.x).toBeGreaterThan(start.x);
  expect(state.y).toBe(start.y);
  expect(state.ammo).toBe(74);
  expect(state.bullets).toBe(1);
  expect(state.sounds).toEqual(['shoot']);
});

test('inventory selection, building grab, flag drop and stats work from touch', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?play=1&sound=off');
  await expect.poll(() => page.evaluate(() => document.body.dataset.inputMode)).toBe('game');

  interface GameHandle {
    localPlayer: {
      x: number; y: number; hp: number; currentInventoryKey: number;
      inventory: Array<{ kind: string; activationKey: number; imageIndex: number; amount: number }>;
      carriedBuildingId?: string; holdingFlag?: string;
    };
    level: { entities: Array<{ kind: string; owner?: string }> };
    input: { down: Set<string> };
  }

  await page.evaluate(() => {
    const game = (window as Window & { game?: GameHandle }).game!;
    game.localPlayer.x = 300;
    game.localPlayer.y = 300;
    game.localPlayer.inventory.push({ kind: 'turret', activationKey: 2, imageIndex: 7, amount: 1 });
  });

  // Contextual buttons start hidden: nothing to grab, no flag held.
  const buttonDisplay = () => page.evaluate(() => ({
    grab: getComputedStyle(document.querySelector('.grab-button')!).display,
    drop: getComputedStyle(document.querySelector('.drop-button')!).display,
  }));
  expect(await buttonDisplay()).toEqual({ grab: 'none', drop: 'none' });

  // Tap the second inventory slot in the bottom HUD (canvas is 390 logical px wide).
  await page.mouse.click(200, 824);
  await expect.poll(() => page.evaluate(() => (window as Window & { game?: GameHandle }).game!.localPlayer.currentInventoryKey)).toBe(2);

  // FIRE places the selected turret.
  await page.locator('.fire-button').dispatchEvent('pointerdown', { pointerId: 40, pointerType: 'touch', bubbles: true, cancelable: true });
  await page.waitForTimeout(120);
  await page.locator('.fire-button').dispatchEvent('pointerup', { pointerId: 40, pointerType: 'touch', bubbles: true, cancelable: true });
  await expect.poll(() => page.evaluate(() => (window as Window & { game?: GameHandle }).game!.level.entities.filter((entity) => entity.kind === 'turret').length)).toBe(1);

  // With an own building in reach, the GRAB button appears.
  await expect.poll(async () => (await buttonDisplay()).grab).toBe('block');

  // GRAB picks the placed turret back up; a second press drops it.
  await page.locator('.grab-button').dispatchEvent('pointerdown', { pointerId: 41, pointerType: 'touch', bubbles: true, cancelable: true });
  await page.waitForTimeout(120);
  await page.locator('.grab-button').dispatchEvent('pointerup', { pointerId: 41, pointerType: 'touch', bubbles: true, cancelable: true });
  await expect.poll(() => page.evaluate(() => (window as Window & { game?: GameHandle }).game!.localPlayer.carriedBuildingId !== undefined)).toBe(true);
  await page.locator('.grab-button').dispatchEvent('pointerdown', { pointerId: 42, pointerType: 'touch', bubbles: true, cancelable: true });
  await page.waitForTimeout(120);
  await page.locator('.grab-button').dispatchEvent('pointerup', { pointerId: 42, pointerType: 'touch', bubbles: true, cancelable: true });
  await expect.poll(() => page.evaluate(() => (window as Window & { game?: GameHandle }).game!.localPlayer.carriedBuildingId === undefined)).toBe(true);

  // Holding DROP self-destructs (matching held Z on a keyboard), which releases a held flag.
  await page.evaluate(() => {
    const game = (window as Window & { game?: GameHandle }).game!;
    game.localPlayer.holdingFlag = 'blu';
    game.localPlayer.hp = 100;
  });
  // The DROP button appears only while the flag is held.
  await expect.poll(async () => (await buttonDisplay()).drop).toBe('block');
  await page.locator('.drop-button').dispatchEvent('pointerdown', { pointerId: 43, pointerType: 'touch', bubbles: true, cancelable: true });
  await expect.poll(() => page.evaluate(() => {
    const game = (window as Window & { game?: GameHandle }).game!;
    return game.localPlayer.holdingFlag ?? null;
  }), { timeout: 10_000 }).toBe(null);
  await page.locator('.drop-button').dispatchEvent('pointerup', { pointerId: 43, pointerType: 'touch', bubbles: true, cancelable: true });
  const afterDrop = await page.evaluate(() => {
    const game = (window as Window & { game?: GameHandle }).game!;
    return { holdingFlag: game.localPlayer.holdingFlag ?? null };
  });
  expect(afterDrop.holdingFlag).toBe(null);
  // The player revives once the respawn delay elapses.
  await expect.poll(() => page.evaluate(() => (window as Window & { game?: GameHandle }).game!.localPlayer.hp), { timeout: 10_000 }).toBeGreaterThan(0);
  // ...and the DROP button disappears again.
  await expect.poll(async () => (await buttonDisplay()).drop).toBe('none');

  // Tapping the top score strip toggles the statistics overlay.
  await page.mouse.click(100, 12);
  await expect.poll(() => page.evaluate(() => (window as Window & { game?: { statsPinned: boolean } }).game!.statsPinned)).toBe(true);
  await page.mouse.click(100, 12);
  await expect.poll(() => page.evaluate(() => (window as Window & { game?: { statsPinned: boolean } }).game!.statsPinned)).toBe(false);
});

test('pwa manifest and service worker install assets are available', async ({ page }) => {
  await page.goto('/?play=1&sound=off&sw=on');

  const head = await page.evaluate(() => ({
    manifest: document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href,
    theme: document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content,
    apple: document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')?.href,
  }));
  expect(head.manifest).toContain('/manifest.webmanifest');
  expect(head.theme).toBe('#000000');
  expect(head.apple).toContain('/icons/apple-touch-icon.svg');

  const manifest = await page.request.get('/manifest.webmanifest').then((response) => response.json());
  expect(manifest).toMatchObject({
    name: 'Robots Massacre',
    short_name: 'Robots',
    start_url: '/?play=1',
    display: 'fullscreen',
    theme_color: '#000000',
  });
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ src: '/icons/icon.svg', purpose: 'any' }),
    expect.objectContaining({ src: '/icons/maskable.svg', purpose: 'maskable' }),
  ]));

  await expect.poll(async () => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL.endsWith('/sw.js') ?? false;
  }, { timeout: 15_000 })).toBe(true);

  await expect((await page.request.get('/sw.js')).status()).toBe(200);
});
