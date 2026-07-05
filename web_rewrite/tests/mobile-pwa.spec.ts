import { expect, test } from '@playwright/test';

test('mobile viewport keeps canvas playable with touch controls outside portrait play area', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?play=1&sound=off');

  const layout = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
    const controls = document.querySelector<HTMLElement>('.touch-controls')!;
    const pad = document.querySelector<HTMLElement>('.touch-pad')!;
    const shoot = document.querySelector<HTMLElement>('.touch-space')!;
    const canvasRect = canvas.getBoundingClientRect();
    const controlsRect = controls.getBoundingClientRect();
    const padRect = pad.getBoundingClientRect();
    const shootRect = shoot.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      canvas: {
        width: canvasRect.width,
        height: canvasRect.height,
        bottom: canvasRect.bottom,
        ratio: canvasRect.width / canvasRect.height,
      },
      controls: {
        top: controlsRect.top,
        bottom: controlsRect.bottom,
        left: controlsRect.left,
        right: controlsRect.right,
      },
      pad: { width: padRect.width, height: padRect.height },
      shoot: { width: shootRect.width, height: shootRect.height },
    };
  });

  expect(layout.canvas.width).toBeGreaterThan(300);
  expect(layout.canvas.height).toBeGreaterThan(180);
  expect(layout.canvas.ratio).toBeCloseTo(1.6, 1);
  expect(layout.canvas.bottom).toBeLessThanOrEqual(layout.controls.top + 1);
  expect(layout.controls.left).toBeGreaterThanOrEqual(0);
  expect(layout.controls.right).toBeLessThanOrEqual(layout.viewport.width);
  expect(layout.controls.bottom).toBeLessThanOrEqual(layout.viewport.height);
  expect(layout.pad.width).toBeGreaterThan(150);
  expect(layout.pad.height).toBeGreaterThan(100);
  expect(layout.shoot.width).toBeGreaterThan(110);
  expect(layout.shoot.height).toBeGreaterThan(45);
});

test('touch controls support simultaneous mobile movement and shooting', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?play=1&sound=off');

  const start = await page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { x: number; y: number; ammo: number }; bullets: Map<string, unknown> } }).game!;
    game.localPlayer.x = 180;
    game.localPlayer.y = 180;
    game.localPlayer.ammo = 75;
    game.bullets.clear();
    return { x: game.localPlayer.x, y: game.localPlayer.y };
  });

  await page.locator('.touch-w').dispatchEvent('pointerdown', { pointerId: 20, pointerType: 'touch', bubbles: true, cancelable: true });
  await page.locator('.touch-d').dispatchEvent('pointerdown', { pointerId: 21, pointerType: 'touch', bubbles: true, cancelable: true });
  await page.waitForTimeout(450);
  await page.locator('.touch-space').dispatchEvent('pointerdown', { pointerId: 22, pointerType: 'touch', bubbles: true, cancelable: true });
  await page.waitForTimeout(180);
  await page.locator('.touch-space').dispatchEvent('pointerup', { pointerId: 22, pointerType: 'touch', bubbles: true, cancelable: true });
  await page.locator('.touch-d').dispatchEvent('pointerup', { pointerId: 21, pointerType: 'touch', bubbles: true, cancelable: true });
  await page.locator('.touch-w').dispatchEvent('pointerup', { pointerId: 20, pointerType: 'touch', bubbles: true, cancelable: true });

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
  expect(state.y).toBeLessThan(start.y);
  expect(state.ammo).toBe(74);
  expect(state.bullets).toBe(1);
  expect(state.sounds).toEqual(['shoot']);
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
