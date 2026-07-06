import { expect, test } from '@playwright/test';

function playUrl(path = '/'): string {
  const url = new URL(path, 'http://robots-massacre.test');
  url.searchParams.set('play', '1');
  return `${url.pathname}${url.search}`;
}

test('default route renders original menu before play starts', async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { active: boolean; selected: number } }).menu;
    return { active: menu?.active, selected: menu?.selected };
  })).toEqual({ active: true, selected: 0 });
});

test('loads and renders the game canvas', async ({ page }) => {
  await page.goto(playUrl());
  const canvas = page.locator('#game');
  await expect(canvas).toBeVisible();
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { players: Map<string, unknown> } }).game;
    return game?.players.size ?? 0;
  })).toBe(1);
  const summary = await page.evaluate(() => {
    const game = (window as Window & { game?: { levelSummary: () => { tiles: number; details: number; entities: number; spawners: number } } }).game!;
    return game.levelSummary();
  });
  expect(summary.tiles).toBeGreaterThan(0);
  expect(summary.details).toBeGreaterThan(0);
  expect(summary.spawners).toBeGreaterThan(0);
  const nonBlackPixels = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const data = ctx.getImageData(0, 40, canvas.width, canvas.height - 40).data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] || data[i + 1] || data[i + 2]) count += 1;
    }
    return count;
  });
  expect(nonBlackPixels).toBeGreaterThan(5000);
});

test('desktop play keeps the canvas at 960x600 and hides touch controls', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  const layout = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
    return {
      width: canvas.width,
      height: canvas.height,
      touchLayer: getComputedStyle(document.querySelector('.touch-layer')!).display,
    };
  });
  expect(layout.width).toBe(960);
  expect(layout.height).toBe(600);
  expect(layout.touchLayer).toBe('none');
});

test('hud renders original bottom bar icons and bitmap font', async ({ page }) => {
  await page.goto(playUrl());
  const comparison = await page.evaluate(async () => {
    const font = new Image();
    font.src = '/assets/art/Font.png';
    await font.decode();
    const glyphCanvas = document.createElement('canvas');
    glyphCanvas.width = 8;
    glyphCanvas.height = 8;
    const glyphCtx = glyphCanvas.getContext('2d')!;
    glyphCtx.drawImage(font, 27 * 8, 0, 8, 8, 0, 0, 8, 8);
    const glyph = glyphCtx.getImageData(0, 0, 8, 8).data;
    let offset = 0;
    for (let i = 0; i < glyph.length; i += 4) {
      if (glyph[i + 3] > 0) {
        offset = i / 4;
        break;
      }
    }
    const ox = offset % 8;
    const oy = Math.floor(offset / 8);
    const expected = Array.from(glyphCtx.getImageData(ox, oy, 1, 1).data);
    const canvas = document.querySelector('canvas')!;
    const actual = Array.from(canvas.getContext('2d')!.getImageData(31 + ox, canvas.height - 26 + oy, 1, 1).data);

    const graphics = new Image();
    graphics.src = '/assets/art/Graphics.png';
    await graphics.decode();
    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 30;
    iconCanvas.height = 30;
    const iconCtx = iconCanvas.getContext('2d')!;
    iconCtx.drawImage(graphics, 1 * 30, 18 * 30, 30, 30, 0, 0, 30, 30);
    const icon = iconCtx.getImageData(0, 0, 30, 30).data;
    let iconOffset = 0;
    for (let i = 0; i < icon.length; i += 4) {
      if (icon[i + 3] > 0) {
        iconOffset = i / 4;
        break;
      }
    }
    const ix = iconOffset % 30;
    const iy = Math.floor(iconOffset / 30);
    const expectedIcon = Array.from(iconCtx.getImageData(ix, iy, 1, 1).data);
    const actualIcon = Array.from(canvas.getContext('2d')!.getImageData(10 + ix, canvas.height - 30 + iy, 1, 1).data);
    const bottomBar = Array.from(canvas.getContext('2d')!.getImageData(5, canvas.height - 40, 1, 1).data);
    return { expected, actual, expectedIcon, actualIcon, bottomBar };
  });
  expect(comparison.actual).toEqual(comparison.expected);
  expect(comparison.actualIcon).toEqual(comparison.expectedIcon);
  expect(comparison.bottomBar.slice(0, 3)).toEqual([0, 0, 0]);
});

test('bonuses render with original bonus sprites and generate on cadence', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      addBonus: (kind: string, x: number, y: number) => unknown;
      tick: (now: number) => void;
      bonuses: Map<number, { kind: string; lifeTime: number }>;
    } }).game!;
    game.addBonus('small-ammo', 150, 150);
    for (let i = 0; i < 227; i += 1) game.tick(performance.now() + i * 40);
  });
  await page.waitForTimeout(80);

  const sprite = await page.evaluate(async () => {
    const graphics = new Image();
    graphics.src = '/assets/art/Graphics.png';
    await graphics.decode();
    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 30;
    iconCanvas.height = 30;
    const iconCtx = iconCanvas.getContext('2d')!;
    iconCtx.drawImage(graphics, 6 * 30, 19 * 30, 30, 30, 0, 0, 30, 30);
    const icon = iconCtx.getImageData(0, 0, 30, 30).data;
    let offset = 0;
    for (let i = 0; i < icon.length; i += 4) {
      if (icon[i + 3] > 0) {
        offset = i / 4;
        break;
      }
    }
    const ox = offset % 30;
    const oy = Math.floor(offset / 30);
    const expected = Array.from(iconCtx.getImageData(ox, oy, 1, 1).data);
    const canvas = document.querySelector('canvas')!;
    const actual = Array.from(canvas.getContext('2d')!.getImageData(150 + ox, 150 + oy, 1, 1).data);
    const game = (window as Window & { game?: { bonuses: Map<number, { kind: string; lifeTime: number }> } }).game!;
    return { actual, expected, bonuses: [...game.bonuses.values()] };
  });
  expect(sprite.actual).toEqual(sprite.expected);
  expect(sprite.bonuses.length).toBeGreaterThan(1);
  expect(sprite.bonuses.some((bonus: { lifeTime: number }) => bonus.lifeTime === 2500)).toBe(true);
});

test('player picks up ammo and med chest bonuses with original caps', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; hp: number; ammo: number };
      addBonus: (kind: string, x: number, y: number) => unknown;
    } }).game!;
    game.localPlayer.x = 120;
    game.localPlayer.y = 120;
    game.localPlayer.hp = 60;
    game.localPlayer.ammo = 90;
    game.addBonus('small-ammo', 120, 120);
    game.addBonus('big-med', 120, 120);
  });

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { hp: number; ammo: number };
      bonuses: Map<number, unknown>;
    } }).game!;
    return { hp: game.localPlayer.hp, ammo: game.localPlayer.ammo, bonuses: game.bonuses.size };
  })).toEqual({ hp: 100, ammo: 115, bonuses: 0 });
});

test('ap bullets bonus makes shots use AP damage until it expires', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; direction: number; ammo: number };
      addBonus: (kind: string, x: number, y: number) => unknown;
      upsertRemotePlayer: (state: unknown) => void;
    } }).game!;
    game.localPlayer.x = 120;
    game.localPlayer.y = 120;
    game.localPlayer.direction = 1;
    game.localPlayer.ammo = 75;
    game.addBonus('ap-bullets', 120, 120);
    game.upsertRemotePlayer({
      id: 'remote-ap-target',
      x: 172,
      y: 120,
      hp: 100,
      ammo: 75,
      direction: 3,
      moving: false,
      shooting: false,
      kills: 0,
      deaths: 0,
      name: 'Target',
      pickedBonuses: [],
    });
  });

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { pickedBonuses: Array<{ kind: string; duration: number }> } } }).game!;
    return game.localPlayer.pickedBonuses;
  })).toMatchObject([{ kind: 'ap-bullets', duration: 7500 }]);

  await page.waitForTimeout(450);
  await page.keyboard.press('Space');

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { players: Map<string, { hp: number }> } }).game!;
    return game.players.get('remote-ap-target')?.hp;
  })).toBe(40);
});

test('expired ap bullets bonus returns shots to normal damage', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; direction: number; ammo: number; pickedBonuses: Array<{ kind: string; activationTime: number; duration: number }> };
      upsertRemotePlayer: (state: unknown) => void;
    } }).game!;
    game.localPlayer.x = 120;
    game.localPlayer.y = 120;
    game.localPlayer.direction = 1;
    game.localPlayer.ammo = 75;
    game.localPlayer.pickedBonuses = [{ kind: 'ap-bullets', activationTime: performance.now() - 7600, duration: 7500 }];
    game.upsertRemotePlayer({
      id: 'remote-expired-ap',
      x: 172,
      y: 120,
      hp: 100,
      ammo: 75,
      direction: 3,
      moving: false,
      shooting: false,
      kills: 0,
      deaths: 0,
      name: 'Target',
      pickedBonuses: [],
    });
  });

  await page.waitForTimeout(450);
  await page.keyboard.press('Space');

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { pickedBonuses: unknown[] };
      players: Map<string, { hp: number; deaths: number }>;
    } }).game!;
    return { bonuses: game.localPlayer.pickedBonuses.length, hp: game.players.get('remote-expired-ap')?.hp };
  })).toEqual({ bonuses: 0, hp: 80 });
});

test('acceleration bonus doubles original max movement speed while active', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number };
      addBonus: (kind: string, x: number, y: number) => unknown;
    } }).game!;
    game.localPlayer.x = 180;
    game.localPlayer.y = 180;
    game.addBonus('acceleration', 180, 180);
  });

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { pickedBonuses: Array<{ kind: string; duration: number }> } } }).game!;
    return game.localPlayer.pickedBonuses;
  })).toMatchObject([{ kind: 'acceleration', duration: 8000 }]);

  await page.keyboard.down('KeyD');
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { visualState: () => { speed: number } } }).game!;
    return game.visualState().speed;
  })).toBeGreaterThan(4.5);
  await page.keyboard.up('KeyD');
});

test('invulnerability bonus prevents bullet damage until it expires', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      bullets: Map<string, unknown>;
      localPlayer: { id: string; x: number; y: number; hp: number; pickedBonuses: Array<{ kind: string; activationTime: number; duration: number }> };
      upsertRemotePlayer: (state: unknown) => void;
    } }).game!;
    game.localPlayer.x = 180;
    game.localPlayer.y = 180;
    game.localPlayer.hp = 100;
    game.localPlayer.pickedBonuses = [{ kind: 'invulnerability', activationTime: performance.now(), duration: 5000 }];
    game.upsertRemotePlayer({
      id: 'remote-invuln-shooter',
      x: 120,
      y: 180,
      hp: 100,
      ammo: 75,
      direction: 1,
      moving: false,
      shooting: false,
      kills: 0,
      deaths: 0,
      name: 'Shooter',
      pickedBonuses: [],
    });
    game.bullets.set('remote-invuln-1', { id: 'remote-invuln-1', owner: 'remote-invuln-shooter', x: 170, y: 190, direction: 1, ap: false });
  });

  await page.waitForTimeout(120);
  const protectedHp = await page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { hp: number } } }).game!;
    return game.localPlayer.hp;
  });
  expect(protectedHp).toBe(100);

  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      bullets: Map<string, unknown>;
      localPlayer: { pickedBonuses: Array<{ kind: string; activationTime: number; duration: number }> };
    } }).game!;
    game.localPlayer.pickedBonuses = [{ kind: 'invulnerability', activationTime: performance.now() - 5100, duration: 5000 }];
    game.bullets.set('remote-invuln-2', { id: 'remote-invuln-2', owner: 'remote-invuln-shooter', x: 170, y: 190, direction: 1, ap: false });
  });

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { hp: number; pickedBonuses: unknown[] } } }).game!;
    return { hp: game.localPlayer.hp, bonuses: game.localPlayer.pickedBonuses.length };
  })).toEqual({ hp: 80, bonuses: 0 });
});

test('hud renders active bonus icons and duration bars', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  const comparison = await page.evaluate(async () => {
    const game = (window as Window & { game?: {
      localPlayer: { pickedBonuses: Array<{ kind: string; activationTime: number; duration: number }> };
    } }).game!;
    game.localPlayer.pickedBonuses = [{ kind: 'invulnerability', activationTime: performance.now(), duration: 5000 }];
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const graphics = new Image();
    graphics.src = '/assets/art/Graphics.png';
    await graphics.decode();
    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 30;
    iconCanvas.height = 30;
    const iconCtx = iconCanvas.getContext('2d')!;
    iconCtx.drawImage(graphics, 3 * 30, 19 * 30, 30, 30, 0, 0, 30, 30);
    const icon = iconCtx.getImageData(0, 0, 30, 30).data;
    let offset = 0;
    for (let i = 0; i < icon.length; i += 4) {
      if (icon[i + 3] > 0) {
        offset = i / 4;
        break;
      }
    }
    const ox = offset % 30;
    const oy = Math.floor(offset / 30);
    const expectedIcon = Array.from(iconCtx.getImageData(ox, oy, 1, 1).data);
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const bonusX = canvas.width - 24 - 13;
    const actualIcon = Array.from(ctx.getImageData(bonusX - 3 + ox, canvas.height - 37 + oy, 1, 1).data);
    const bar = Array.from(ctx.getImageData(bonusX + 1, canvas.height - 14, 1, 1).data);
    return { expectedIcon, actualIcon, bar };
  });
  expect(comparison.actualIcon).toEqual(comparison.expectedIcon);
  expect(comparison.bar.slice(0, 3)).toEqual([0, 128, 0]);
});

test('inventory bonuses add and stack original inventory items', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number };
      addBonus: (kind: string, x: number, y: number) => unknown;
    } }).game!;
    game.localPlayer.x = 120;
    game.localPlayer.y = 120;
    game.addBonus('turret', 120, 120);
    game.addBonus('mine', 120, 120);
    game.addBonus('turret', 120, 120);
  });

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { inventory: Array<{ kind: string; activationKey: number; imageIndex: number; amount: number }> };
      bonuses: Map<string, unknown>;
    } }).game!;
    return { inventory: game.localPlayer.inventory, bonuses: game.bonuses.size };
  })).toEqual({
    inventory: [
      { kind: 'cannon', activationKey: 1, imageIndex: 9, amount: 1 },
      { kind: 'turret', activationKey: 2, imageIndex: 7, amount: 2 },
      { kind: 'mine', activationKey: 3, imageIndex: 8, amount: 1 },
    ],
    bonuses: 0,
  });
});

test('hud renders dynamic inventory slots and amounts', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  const comparison = await page.evaluate(async () => {
    const game = (window as Window & { game?: {
      localPlayer: {
        inventory: Array<{ kind: string; activationKey: number; imageIndex: number; amount: number }>;
        currentInventoryKey: number;
      };
    } }).game!;
    game.localPlayer.inventory = [
      { kind: 'cannon', activationKey: 1, imageIndex: 9, amount: 1 },
      { kind: 'turret', activationKey: 2, imageIndex: 7, amount: 2 },
    ];
    game.localPlayer.currentInventoryKey = 2;
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const graphics = new Image();
    graphics.src = '/assets/art/Graphics.png';
    await graphics.decode();
    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 30;
    iconCanvas.height = 30;
    const iconCtx = iconCanvas.getContext('2d')!;
    iconCtx.drawImage(graphics, 7 * 30, 19 * 30, 30, 30, 0, 0, 30, 30);
    const icon = iconCtx.getImageData(0, 0, 30, 30).data;
    let offset = 0;
    for (let i = 0; i < icon.length; i += 4) {
      if (icon[i + 3] > 0) {
        offset = i / 4;
        break;
      }
    }
    const ox = offset % 30;
    const oy = Math.floor(offset / 30);
    const expectedIcon = Array.from(iconCtx.getImageData(ox, oy, 1, 1).data);
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const secondSlotX = canvas.width / 2 - ((24 + 21) * 2) / 2 + 24 + 21;
    const actualIcon = Array.from(ctx.getImageData(secondSlotX - 3 + ox, canvas.height - 37 + oy, 1, 1).data);
    const highlight = Array.from(ctx.getImageData(Math.round(secondSlotX - 16), canvas.height - 43, 1, 1).data);
    const amount = Array.from(ctx.getImageData(secondSlotX + 12, canvas.height - 9, 1, 1).data);
    return { expectedIcon, actualIcon, highlight, amount };
  });
  expect(comparison.actualIcon).toEqual(comparison.expectedIcon);
  expect(comparison.highlight[3]).toBeGreaterThan(0);
  expect(comparison.amount[3]).toBeGreaterThan(0);
});

test('number keys select only available original inventory slots', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: {
        inventory: Array<{ kind: string; activationKey: number; imageIndex: number; amount: number }>;
        currentInventoryKey: number;
      };
    } }).game!;
    game.localPlayer.inventory = [
      { kind: 'cannon', activationKey: 1, imageIndex: 9, amount: 1 },
      { kind: 'turret', activationKey: 2, imageIndex: 7, amount: 1 },
    ];
    game.localPlayer.currentInventoryKey = 1;
  });

  await page.keyboard.press('Digit3');
  await page.waitForTimeout(80);
  let selected = await page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { currentInventoryKey: number } } }).game!;
    return game.localPlayer.currentInventoryKey;
  });
  expect(selected).toBe(1);

  await page.keyboard.press('Digit2');
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { currentInventoryKey: number } } }).game!;
    return game.localPlayer.currentInventoryKey;
  })).toBe(2);

  const highlight = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const secondSlotX = canvas.width / 2 - ((24 + 21) * 2) / 2 + 24 + 21;
    const data = canvas.getContext('2d')!.getImageData(Math.round(secondSlotX - 16), canvas.height - 43, 1, 1).data;
    return [data[0], data[1], data[2], data[3]];
  });
  expect(highlight[3]).toBeGreaterThan(0);
});

test('selected non-cannon inventory changes player body and renders hologram', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  const pixels = await page.evaluate(async () => {
    const game = (window as Window & { game?: {
      localPlayer: {
        x: number;
        y: number;
        direction: number;
        inventory: Array<{ kind: string; activationKey: number; imageIndex: number; amount: number }>;
        currentInventoryKey: number;
      };
    } }).game!;
    game.localPlayer.x = 180;
    game.localPlayer.y = 180;
    game.localPlayer.direction = 0;
    game.localPlayer.inventory = [
      { kind: 'cannon', activationKey: 1, imageIndex: 9, amount: 1 },
      { kind: 'turret', activationKey: 2, imageIndex: 7, amount: 1 },
    ];
    game.localPlayer.currentInventoryKey = 1;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const beforePreview = ctx.getImageData(160, 140, 80, 80).data;

    game.localPlayer.currentInventoryKey = 2;
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const graphics = new Image();
    graphics.src = '/assets/art/Graphics.png';
    await graphics.decode();
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = 30;
    spriteCanvas.height = 30;
    const spriteCtx = spriteCanvas.getContext('2d')!;

    spriteCtx.drawImage(graphics, 0, 12 * 30, 30, 30, 0, 0, 30, 30);
    const body = spriteCtx.getImageData(0, 0, 30, 30).data;
    let bodyOffset = 0;
    for (let i = 0; i < body.length; i += 4) {
      const y = Math.floor(i / 4 / 30);
      if (y < 6 && body[i + 3] > 0) {
        bodyOffset = i / 4;
        break;
      }
    }
    const box = bodyOffset % 30;
    const boy = Math.floor(bodyOffset / 30);
    const expectedBody = Array.from(spriteCtx.getImageData(box, boy, 1, 1).data);

    const actualBody = Array.from(ctx.getImageData(178 + box, 178 + boy, 1, 1).data);
    const afterPreview = ctx.getImageData(160, 140, 80, 80).data;
    let changedPixels = 0;
    for (let i = 0; i < afterPreview.length; i += 4) {
      if (
        beforePreview[i] !== afterPreview[i]
        || beforePreview[i + 1] !== afterPreview[i + 1]
        || beforePreview[i + 2] !== afterPreview[i + 2]
        || beforePreview[i + 3] !== afterPreview[i + 3]
      ) changedPixels += 1;
    }
    return { actualBody, expectedBody, changedPixels };
  });

  expect(pixels.actualBody).toEqual(pixels.expectedBody);
  expect(pixels.changedPixels).toBeGreaterThan(20);
});

test('selected non-cannon inventory renders original building grid', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  const brightness = await page.evaluate(async () => {
    const game = (window as Window & { game?: {
      render: () => void;
      localPlayer: {
        x: number;
        y: number;
        direction: number;
        inventory: Array<{ kind: string; activationKey: number; imageIndex: number; amount: number }>;
        currentInventoryKey: number;
      };
      level: { entities: unknown[] };
    } }).game!;
    game.localPlayer.x = 180;
    game.localPlayer.y = 180;
    game.localPlayer.direction = 0;
    game.localPlayer.inventory = [
      { kind: 'cannon', activationKey: 1, imageIndex: 9, amount: 1 },
      { kind: 'turret', activationKey: 2, imageIndex: 7, amount: 1 },
    ];
    game.level.entities = [];
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const lineBrightness = () => {
      let total = 0;
      for (let x = 0; x <= 120; x += 10) {
        const data = ctx.getImageData(x, 0, 1, 120).data;
        for (let i = 0; i < data.length; i += 4) total += data[i] + data[i + 1] + data[i + 2];
      }
      for (let y = 0; y <= 120; y += 10) {
        const data = ctx.getImageData(0, y, 120, 1).data;
        for (let i = 0; i < data.length; i += 4) total += data[i] + data[i + 1] + data[i + 2];
      }
      return total;
    };

    game.localPlayer.currentInventoryKey = 1;
    game.render();
    const cannon = lineBrightness();
    game.localPlayer.currentInventoryKey = 2;
    game.render();
    const turret = lineBrightness();
    return { cannon, turret };
  });

  expect(brightness.turret).toBeGreaterThan(brightness.cannon + 25000);
});

test('selected non-cannon inventory places a building instead of shooting', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: {
        x: number;
        y: number;
        direction: number;
        ammo: number;
        inventory: Array<{ kind: string; activationKey: number; imageIndex: number; amount: number }>;
        currentInventoryKey: number;
      };
      bullets: Map<string, unknown>;
      level: { entities: Array<{ kind: string; x: number; y: number; owner?: string; health: number; maxHealth: number; solid: boolean; removed: boolean }> };
      localId: string;
    } }).game!;
    game.localPlayer.x = 180;
    game.localPlayer.y = 180;
    game.localPlayer.direction = 2;
    game.localPlayer.ammo = 75;
    game.localPlayer.inventory = [
      { kind: 'cannon', activationKey: 1, imageIndex: 9, amount: 1 },
      { kind: 'turret', activationKey: 2, imageIndex: 7, amount: 1 },
    ];
    game.localPlayer.currentInventoryKey = 2;
    game.bullets.clear();
    game.level.entities = [];
  });

  await page.keyboard.press('Space');

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: {
        ammo: number;
        inventory: Array<{ kind: string; activationKey: number; imageIndex: number; amount: number }>;
        currentInventoryKey: number;
      };
      bullets: Map<string, unknown>;
      level: { entities: Array<{ kind: string; x: number; y: number; owner?: string; health: number; maxHealth: number; solid: boolean; removed: boolean }> };
      localId: string;
    } }).game!;
    return {
      bullets: game.bullets.size,
      ammo: game.localPlayer.ammo,
      inventory: game.localPlayer.inventory,
      selected: game.localPlayer.currentInventoryKey,
      placed: game.level.entities.map((entity) => ({
        kind: entity.kind,
        x: entity.x,
        y: entity.y,
        owner: entity.owner,
        health: entity.health,
        maxHealth: entity.maxHealth,
        solid: entity.solid,
        removed: entity.removed,
      })),
      localId: game.localId,
    };
  })).toMatchObject({
    bullets: 0,
    ammo: 75,
    inventory: [{ kind: 'cannon', activationKey: 1, imageIndex: 9, amount: 1 }],
    selected: 1,
    placed: [{ kind: 'turret', x: 180, y: 211, health: 125, maxHealth: 125, solid: true, removed: false }],
  });
});

test('holding attack after deploy does not fire accidental cannon shot', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: {
        x: number;
        y: number;
        direction: number;
        ammo: number;
        inventory: Array<{ kind: string; activationKey: number; imageIndex: number; amount: number }>;
        currentInventoryKey: number;
      };
      bullets: Map<string, unknown>;
      level: { entities: Array<unknown> };
    } }).game!;
    game.localPlayer.x = 180;
    game.localPlayer.y = 180;
    game.localPlayer.direction = 2;
    game.localPlayer.ammo = 75;
    game.localPlayer.inventory = [
      { kind: 'cannon', activationKey: 1, imageIndex: 9, amount: 1 },
      { kind: 'mine', activationKey: 2, imageIndex: 8, amount: 1 },
    ];
    game.localPlayer.currentInventoryKey = 2;
    game.bullets.clear();
    game.level.entities = [];
  });

  await page.keyboard.down('Space');
  await page.waitForTimeout(650);
  await page.keyboard.up('Space');

  const state = await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { ammo: number; currentInventoryKey: number; inventory: Array<{ kind: string }> };
      bullets: Map<string, unknown>;
      level: { entities: Array<{ kind?: string }> };
    } }).game!;
    return {
      bullets: game.bullets.size,
      ammo: game.localPlayer.ammo,
      selected: game.localPlayer.currentInventoryKey,
      inventory: game.localPlayer.inventory,
      mines: game.level.entities.filter((entity) => entity.kind === 'mine').length,
    };
  });

  expect(state).toEqual({
    bullets: 0,
    ammo: 75,
    selected: 1,
    inventory: [{ kind: 'cannon', activationKey: 1, imageIndex: 9, amount: 1 }],
    mines: 1,
  });
});

test('blocked building placement keeps inventory and does not fire', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: {
        x: number;
        y: number;
        direction: number;
        ammo: number;
        inventory: Array<{ kind: string; activationKey: number; imageIndex: number; amount: number }>;
        currentInventoryKey: number;
      };
      bullets: Map<string, unknown>;
      level: { entities: Array<unknown> };
    } }).game!;
    game.localPlayer.x = 5;
    game.localPlayer.y = 120;
    game.localPlayer.direction = 3;
    game.localPlayer.ammo = 75;
    game.localPlayer.inventory = [
      { kind: 'cannon', activationKey: 1, imageIndex: 9, amount: 1 },
      { kind: 'mine', activationKey: 3, imageIndex: 8, amount: 1 },
    ];
    game.localPlayer.currentInventoryKey = 3;
    game.bullets.clear();
    game.level.entities = [];
  });

  await page.keyboard.press('Space');
  await page.waitForTimeout(80);

  const state = await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: {
        ammo: number;
        inventory: Array<{ kind: string; activationKey: number; imageIndex: number; amount: number }>;
        currentInventoryKey: number;
      };
      bullets: Map<string, unknown>;
      level: { entities: Array<{ kind?: string }> };
    } }).game!;
    return {
      bullets: game.bullets.size,
      ammo: game.localPlayer.ammo,
      inventory: game.localPlayer.inventory,
      selected: game.localPlayer.currentInventoryKey,
      mines: game.level.entities.filter((entity) => entity.kind === 'mine').length,
    };
  });

  expect(state).toEqual({
    bullets: 0,
    ammo: 75,
    inventory: [
      { kind: 'cannon', activationKey: 1, imageIndex: 9, amount: 1 },
      { kind: 'mine', activationKey: 3, imageIndex: 8, amount: 1 },
    ],
    selected: 3,
    mines: 0,
  });
});

test('owned buildings can be picked up moved and dropped with interact', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localId: string;
      localPlayer: { x: number; y: number; direction: number; carriedBuildingId?: string };
      level: {
        entities: Array<{
          id?: string;
          kind: string;
          owner?: string;
          x: number;
          y: number;
          solid: boolean;
          health: number;
          maxHealth: number;
          removed: boolean;
          direction?: number;
          lastShot?: number;
          skippedAnimTicks?: number;
        }>;
      };
    } }).game!;
    game.level.entities = [{
      id: 'drag-turret',
      kind: 'turret',
      owner: game.localId,
      x: 200,
      y: 180,
      solid: true,
      health: 125,
      maxHealth: 125,
      removed: false,
      direction: 0,
      lastShot: performance.now(),
      skippedAnimTicks: 0,
    }];
    game.localPlayer.x = 180;
    game.localPlayer.y = 180;
    game.localPlayer.direction = 1;
    game.localPlayer.carriedBuildingId = undefined;
  });

  await page.keyboard.press('KeyE');
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { carriedBuildingId?: string };
      level: { entities: Array<{ id?: string; x: number; y: number; solid: boolean }> };
    } }).game!;
    const entity = game.level.entities.find((candidate) => candidate.id === 'drag-turret')!;
    return { carried: game.localPlayer.carriedBuildingId, x: entity.x, y: entity.y, solid: entity.solid };
  })).toEqual({ carried: 'drag-turret', x: 180, y: 180, solid: false });

  await page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { x: number; y: number; direction: number } } }).game!;
    game.localPlayer.x = 240;
    game.localPlayer.y = 210;
    game.localPlayer.direction = 2;
  });
  await page.waitForTimeout(80);
  await page.keyboard.press('KeyE');

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { carriedBuildingId?: string };
      level: { entities: Array<{ id?: string; x: number; y: number; solid: boolean }> };
    } }).game!;
    const entity = game.level.entities.find((candidate) => candidate.id === 'drag-turret')!;
    return { carried: game.localPlayer.carriedBuildingId, x: entity.x, y: entity.y, solid: entity.solid };
  })).toEqual({ carried: undefined, x: 240, y: 241, solid: true });
});

test('owned buildings render original focus cues and mine countdown', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localId: string;
      localPlayer: { x: number; y: number; direction: number; carriedBuildingId?: string };
      level: {
        entities: Array<{
          id?: string;
          kind: string;
          owner?: string;
          x: number;
          y: number;
          solid: boolean;
          health: number;
          maxHealth: number;
          removed: boolean;
          direction?: number;
          lastShot?: number;
          skippedAnimTicks?: number;
          countdown?: boolean;
          skippedExplTicks?: number;
        }>;
      };
    } }).game!;
    game.localPlayer.x = 120;
    game.localPlayer.y = 120;
    game.localPlayer.direction = 1;
    game.localPlayer.carriedBuildingId = undefined;
    game.level.entities = [{
      id: 'focused-turret',
      kind: 'turret',
      owner: game.localId,
      x: 150,
      y: 120,
      solid: true,
      health: 60,
      maxHealth: 125,
      removed: false,
      direction: 0,
      lastShot: performance.now(),
      skippedAnimTicks: 0,
    }, {
      id: 'countdown-mine',
      kind: 'mine',
      owner: 'remote-owner',
      x: 220,
      y: 120,
      solid: true,
      health: 0,
      maxHealth: 1,
      removed: false,
      countdown: true,
      skippedExplTicks: 5,
    }];
  });

  await expect.poll(async () => page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const countWhere = (x: number, y: number, w: number, h: number, predicate: (r: number, g: number, b: number, a: number) => boolean) => {
      const data = ctx.getImageData(x, y, w, h).data;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (predicate(data[i], data[i + 1], data[i + 2], data[i + 3])) count += 1;
      }
      return count;
    };
    return {
      focus: countWhere(148, 118, 34, 34, (r, g, b, a) => r > 220 && g > 220 && b > 220 && a > 0),
      health: countWhere(150, 150, 18, 4, (r, g, b) => r > 180 && g > 180 && b < 80),
      countdown: countWhere(220, 120, 16, 8, (r, g, b, a) => r > 180 && g > 180 && b > 180 && a > 0),
    };
  })).toMatchObject({
    focus: expect.any(Number),
    health: expect.any(Number),
    countdown: expect.any(Number),
  });

  const cues = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const countWhere = (x: number, y: number, w: number, h: number, predicate: (r: number, g: number, b: number, a: number) => boolean) => {
      const data = ctx.getImageData(x, y, w, h).data;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (predicate(data[i], data[i + 1], data[i + 2], data[i + 3])) count += 1;
      }
      return count;
    };
    return {
      focus: countWhere(148, 118, 34, 34, (r, g, b, a) => r > 220 && g > 220 && b > 220 && a > 0),
      health: countWhere(150, 150, 18, 4, (r, g, b) => r > 180 && g > 180 && b < 80),
      countdown: countWhere(220, 120, 16, 8, (r, g, b, a) => r > 180 && g > 180 && b > 180 && a > 0),
    };
  });
  expect(cues.focus).toBeGreaterThan(20);
  expect(cues.health).toBeGreaterThan(8);
  expect(cues.countdown).toBeGreaterThan(8);
});

test('dispenser restores owner health and ammo with beam particles', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localId: string;
      localPlayer: { id: string; x: number; y: number; hp: number; ammo: number };
      players: Map<string, {
        id: string;
        x: number;
        y: number;
        hp: number;
        ammo: number;
        direction: number;
        moving: boolean;
        shooting: boolean;
        kills: number;
        deaths: number;
        name: string;
        pickedBonuses: unknown[];
        inventory: Array<{ kind: string; activationKey: number; imageIndex: number; amount: number }>;
        currentInventoryKey: number;
      }>;
      particles: Array<{ kind: string }>;
      level: {
        entities: Array<{
          id?: string;
          kind: string;
          owner?: string;
          x: number;
          y: number;
          solid: boolean;
          health: number;
          maxHealth: number;
          removed: boolean;
          energy?: number;
          skippedRenewTicks?: number;
        }>;
      };
    } }).game!;
    game.level.entities = [{
      id: 'local-dispenser',
      kind: 'dispenser',
      owner: game.localId,
      x: 180,
      y: 180,
      solid: true,
      health: 75,
      maxHealth: 75,
      removed: false,
      energy: 1125,
      skippedRenewTicks: 2,
    }];
    game.localPlayer.x = 190;
    game.localPlayer.y = 190;
    game.localPlayer.hp = 80;
    game.localPlayer.ammo = 100;
    game.players.set('enemy', {
      id: 'enemy',
      x: 190,
      y: 190,
      hp: 80,
      ammo: 100,
      direction: 2,
      moving: false,
      shooting: false,
      kills: 0,
      deaths: 0,
      name: 'enemy',
      pickedBonuses: [],
      inventory: [{ kind: 'cannon', activationKey: 1, imageIndex: 9, amount: 1 }],
      currentInventoryKey: 1,
    });
    game.particles.splice(0, game.particles.length);
  });

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { hp: number; ammo: number };
      players: Map<string, { hp: number; ammo: number }>;
      particles: Array<{ kind: string }>;
      level: { entities: Array<{ kind: string; energy?: number; removed: boolean }> };
    } }).game!;
    const dispenser = game.level.entities.find((entity) => entity.kind === 'dispenser')!;
    return {
      restoredOwner: game.localPlayer.hp >= 81 && game.localPlayer.ammo >= 101,
      enemyUnchanged: game.players.get('enemy')?.hp === 80 && game.players.get('enemy')?.ammo === 100,
      spentEnergy: (dispenser.energy ?? 1125) <= 1123,
      active: !dispenser.removed,
      hasHealBeam: game.particles.some((particle) => particle.kind === 'dispense-heal'),
      hasAmmoBeam: game.particles.some((particle) => particle.kind === 'dispense-ammo'),
    };
  })).toMatchObject({
    restoredOwner: true,
    enemyUnchanged: true,
    spentEnergy: true,
    active: true,
    hasHealBeam: true,
    hasAmmoBeam: true,
  });
});

test('turret targets enemies and fires original bullets with sound', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localId: string;
      localPlayer: { team: string };
      players: Map<string, {
        id: string;
        x: number;
        y: number;
        hp: number;
        ammo: number;
        direction: number;
        moving: boolean;
        shooting: boolean;
        kills: number;
        deaths: number;
        name: string;
        pickedBonuses: unknown[];
        inventory: Array<{ kind: string; activationKey: number; imageIndex: number; amount: number }>;
        currentInventoryKey: number;
        team: string;
      }>;
      bullets: Map<string, unknown>;
      particles: Array<{ kind: string }>;
      level: {
        entities: Array<{
          id?: string;
          kind: string;
          owner?: string;
          x: number;
          y: number;
          solid: boolean;
          health: number;
          maxHealth: number;
          removed: boolean;
          direction?: number;
          lastShot?: number;
          skippedAnimTicks?: number;
        }>;
      };
    } }).game!;
    game.localPlayer.team = 'red';
    game.level.entities = [{
      id: 'local-turret',
      kind: 'turret',
      owner: game.localId,
      x: 180,
      y: 180,
      solid: true,
      health: 125,
      maxHealth: 125,
      removed: false,
      direction: 0,
      lastShot: performance.now() - 500,
      skippedAnimTicks: 0,
    }];
    game.players.set('ally', {
      id: 'ally',
      x: 184,
      y: 310,
      hp: 100,
      ammo: 75,
      direction: 0,
      moving: false,
      shooting: false,
      kills: 0,
      deaths: 0,
      name: 'ally',
      pickedBonuses: [],
      inventory: [{ kind: 'cannon', activationKey: 1, imageIndex: 9, amount: 1 }],
      currentInventoryKey: 1,
      team: 'red',
    });
    game.players.set('enemy', {
      id: 'enemy',
      x: 310,
      y: 184,
      hp: 100,
      ammo: 75,
      direction: 0,
      moving: false,
      shooting: false,
      kills: 0,
      deaths: 0,
      name: 'enemy',
      pickedBonuses: [],
      inventory: [{ kind: 'cannon', activationKey: 1, imageIndex: 9, amount: 1 }],
      currentInventoryKey: 1,
      team: 'blu',
    });
    game.bullets.clear();
    game.particles.splice(0, game.particles.length);
  });

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: {
      localId: string;
      bullets: Map<string, { owner: string; x: number; y: number; direction: number; ap: boolean }>;
      particles: Array<{ kind: string; direction: number }>;
      soundEvents: () => string[];
      level: { entities: Array<{ kind: string; direction?: number }> };
    } }).game!;
    const bullet = [...game.bullets.values()][0];
    const turret = game.level.entities.find((entity) => entity.kind === 'turret')!;
    return {
      bulletMatches: bullet?.owner === game.localId && bullet.direction === 1 && bullet.ap === false,
      turretDirection: turret.direction,
      hasFlame: game.particles.some((particle) => particle.kind === 'barrel-flame' && particle.direction === 1),
      hasSound: game.soundEvents().includes('shoot'),
    };
  })).toMatchObject({
    bulletMatches: true,
    turretDirection: 1,
    hasFlame: true,
    hasSound: true,
  });
});

test('mine counts down then damages nearby enemies with explosion particles', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localId: string;
      localPlayer: { team: string };
      players: Map<string, {
        id: string;
        x: number;
        y: number;
        hp: number;
        ammo: number;
        direction: number;
        moving: boolean;
        shooting: boolean;
        kills: number;
        deaths: number;
        name: string;
        pickedBonuses: unknown[];
        inventory: Array<{ kind: string; activationKey: number; imageIndex: number; amount: number }>;
        currentInventoryKey: number;
        team: string;
      }>;
      particles: Array<{ kind: string }>;
      level: {
        entities: Array<{
          id?: string;
          kind: string;
          owner?: string;
          x: number;
          y: number;
          solid: boolean;
          health: number;
          maxHealth: number;
          removed: boolean;
          countdown?: boolean;
          skippedExplTicks?: number;
        }>;
      };
    } }).game!;
    game.localPlayer.team = 'red';
    game.level.entities = [{
      id: 'local-mine',
      kind: 'mine',
      owner: game.localId,
      x: 180,
      y: 180,
      solid: true,
      health: 0,
      maxHealth: 1,
      removed: false,
      countdown: true,
      skippedExplTicks: 25,
    }];
    game.players.set('ally', {
      id: 'ally',
      x: 185,
      y: 185,
      hp: 100,
      ammo: 75,
      direction: 0,
      moving: false,
      shooting: false,
      kills: 0,
      deaths: 0,
      name: 'ally',
      pickedBonuses: [],
      inventory: [{ kind: 'cannon', activationKey: 1, imageIndex: 9, amount: 1 }],
      currentInventoryKey: 1,
      team: 'red',
    });
    game.players.set('enemy', {
      id: 'enemy',
      x: 190,
      y: 190,
      hp: 100,
      ammo: 75,
      direction: 0,
      moving: false,
      shooting: false,
      kills: 0,
      deaths: 0,
      name: 'enemy',
      pickedBonuses: [],
      inventory: [{ kind: 'cannon', activationKey: 1, imageIndex: 9, amount: 1 }],
      currentInventoryKey: 1,
      team: 'blu',
    });
    game.particles.splice(0, game.particles.length);
  });

  // The explosion appears first; the enemy revives only after the respawn delay.
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: {
      particles: Array<{ kind: string }>;
      level: { entities: Array<{ kind: string; removed: boolean; solid: boolean }> };
    } }).game!;
    const mine = game.level.entities.find((entity) => entity.kind === 'mine')!;
    return {
      removed: mine.removed,
      solid: mine.solid,
      hasExplosion: game.particles.some((particle) => particle.kind === 'mine-explosion'),
    };
  })).toMatchObject({
    removed: true,
    solid: false,
    hasExplosion: true,
  });

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: {
      players: Map<string, { hp: number; deaths: number }>;
    } }).game!;
    return {
      enemy: game.players.get('enemy'),
      ally: game.players.get('ally'),
    };
  })).toMatchObject({
    enemy: { hp: 100, deaths: 1 },
    ally: { hp: 100, deaths: 0 },
  });
});

test('player moves and can shoot', async ({ page }) => {
  await page.goto(playUrl());
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(250);
  await page.keyboard.up('KeyD');
  const moved = await page.evaluate(() => {
    const game = (window as Window & { game?: { snapshot: () => { x: number } } }).game!;
    return game.snapshot().x;
  });
  expect(moved).toBeGreaterThan(30);

  await page.waitForTimeout(450);
  await page.keyboard.press('Space');
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { bullets: Map<string, unknown> } }).game!;
    return game.bullets.size;
  })).toBeGreaterThan(0);
});

test('z self-damages player and lethal self-damage respawns', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; hp: number; deaths: number };
      particles: unknown[];
    } }).game!;
    game.localPlayer.x = 180;
    game.localPlayer.y = 180;
    game.localPlayer.hp = 100;
    game.localPlayer.deaths = 0;
    game.particles.splice(0, game.particles.length);
  });

  await page.keyboard.press('KeyZ');
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { hp: number; deaths: number } } }).game!;
    return { hp: game.localPlayer.hp, deaths: game.localPlayer.deaths };
  })).toEqual({ hp: 90, deaths: 0 });

  await page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { hp: number } } }).game!;
    game.localPlayer.hp = 10;
  });
  await page.keyboard.press('KeyZ');

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { hp: number; ammo: number; deaths: number; x: number; y: number };
      particles: Array<{ kind: string; x: number; y: number }>;
    } }).game!;
    return {
      player: game.localPlayer,
      debris: game.particles.some((particle) => particle.kind === 'robot-debris' && particle.x === 180 && particle.y === 180),
    };
  })).toMatchObject({
    player: { hp: 100, ammo: 75, deaths: 1 },
    debris: true,
  });
});

test('shooting emits original shot sound and barrel flame particle', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; direction: number; ammo: number };
      level: { entities: Array<unknown> };
    } }).game!;
    game.level.entities = [];
    game.localPlayer.x = 120;
    game.localPlayer.y = 120;
    game.localPlayer.direction = 1;
    game.localPlayer.ammo = 75;
  });

  await page.waitForTimeout(450);
  await page.keyboard.press('Space');

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: {
      particles: Array<{ kind: string; direction: number; lifeTime: number }>;
      soundEvents: () => string[];
    } }).game!;
    return {
      particle: game.particles[0],
      sounds: game.soundEvents(),
    };
  })).toMatchObject({
    particle: { kind: 'barrel-flame', direction: 1, lifeTime: 2 },
    sounds: ['shoot'],
  });
});

test('local shots increment original in-game shot counter', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localStats: { shots: number };
      localPlayer: { x: number; y: number; direction: number; ammo: number };
      level: { entities: Array<unknown> };
    } }).game!;
    game.localStats.shots = 0;
    game.level.entities = [];
    game.localPlayer.x = 120;
    game.localPlayer.y = 120;
    game.localPlayer.direction = 1;
    game.localPlayer.ammo = 75;
  });

  await page.waitForTimeout(450);
  await page.keyboard.press('Space');

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { localStats: { shots: number } } }).game!;
    return game.localStats.shots;
  })).toBe(1);

  const counterPixels = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const data = canvas.getContext('2d')!.getImageData(10, 30, 8, 8).data;
    let bright = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 150 && data[i + 1] > 150 && data[i + 2] > 150 && data[i + 3] > 0) bright += 1;
    }
    return bright;
  });
  expect(counterPixels).toBeGreaterThan(4);
});

test('menu renders original bitmap list and opens mode selection', async ({ page }) => {
  await page.goto('/?sound=off');
  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { active: boolean; selected: number; screen: string } }).menu;
    return { active: menu?.active, selected: menu?.selected, screen: menu?.screen };
  })).toEqual({ active: true, selected: 0, screen: 'main' });

  const marker = await page.evaluate(async () => {
    const font = new Image();
    font.src = '/assets/art/FontBig.png';
    await font.decode();
    const glyphCanvas = document.createElement('canvas');
    glyphCanvas.width = 16;
    glyphCanvas.height = 16;
    const glyphCtx = glyphCanvas.getContext('2d')!;
    glyphCtx.drawImage(font, 51 * 16, 0, 16, 16, 0, 0, 16, 16);
    const glyph = glyphCtx.getImageData(0, 0, 16, 16).data;
    let offset = 0;
    for (let i = 0; i < glyph.length; i += 4) {
      if (glyph[i + 3] > 0) {
        offset = i / 4;
        break;
      }
    }
    const ox = offset % 16;
    const oy = Math.floor(offset / 16);
    const expected = Array.from(glyphCtx.getImageData(ox, oy, 1, 1).data);
    const canvas = document.querySelector('canvas')!;
    const x = Math.round((canvas.width - '> create game <'.length * 16) / 2) + ox;
    const actual = Array.from(canvas.getContext('2d')!.getImageData(x, 60 + oy, 1, 1).data);
    return { expected, actual };
  });
  expect(marker.actual).toEqual(marker.expected);

  await page.keyboard.press('Enter');
  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { active: boolean; selected: number; screen: string } }).menu!;
    return { active: menu.active, selected: menu.selected, screen: menu.screen };
  })).toEqual({ active: true, selected: 0, screen: 'mode' });

  const modePixel = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const data = canvas.getContext('2d')!.getImageData(Math.round((canvas.width - '> deathmatch <'.length * 16) / 2), 60, 30, 16).data;
    let visible = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0) visible += 1;
    return visible;
  });
  expect(modePixel).toBeGreaterThan(0);
});

test('main menu opens original how-to-play and credits screens', async ({ page }) => {
  await page.goto('/?sound=off');
  for (let i = 0; i < 5; i += 1) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { active: boolean; screen: string } }).menu!;
    return { active: menu.active, screen: menu.screen };
  })).toEqual({ active: true, screen: 'help' });

  const helpPixels = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const title = ctx.getImageData(Math.round((canvas.width - 'how to play'.length * 16) / 2), 20, 160, 16).data;
    const line = ctx.getImageData(Math.round((canvas.width - 'use wasd or arrows'.length * 8) / 2), 60, 180, 8).data;
    let count = 0;
    for (let i = 0; i < title.length; i += 4) if (title[i + 3] > 0) count += 1;
    for (let i = 0; i < line.length; i += 4) if (line[i + 3] > 0) count += 1;
    return count;
  });
  expect(helpPixels).toBeGreaterThan(50);

  await page.keyboard.press('Escape');
  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { active: boolean; selected: number; screen: string } }).menu!;
    return { active: menu.active, selected: menu.selected, screen: menu.screen };
  })).toEqual({ active: true, selected: 0, screen: 'main' });

  for (let i = 0; i < 6; i += 1) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { active: boolean; screen: string } }).menu!;
    return { active: menu.active, screen: menu.screen };
  })).toEqual({ active: true, screen: 'credits' });

  const creditPixels = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const title = ctx.getImageData(Math.round((canvas.width - 'credits'.length * 16) / 2), 20, 120, 16).data;
    const line = ctx.getImageData(Math.round((canvas.width - 'dedicated to java.'.length * 8) / 2), 60, 160, 8).data;
    let count = 0;
    for (let i = 0; i < title.length; i += 4) if (title[i + 3] > 0) count += 1;
    for (let i = 0; i < line.length; i += 4) if (line[i + 3] > 0) count += 1;
    return count;
  });
  expect(creditPixels).toBeGreaterThan(40);
});

test('main menu opens original map editor selection and help screens', async ({ page }) => {
  await page.goto('/?sound=off');
  for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { active: boolean; selected: number; screen: string } }).menu!;
    return { active: menu.active, selected: menu.selected, screen: menu.screen };
  })).toEqual({ active: true, selected: 0, screen: 'map-editor' });

  const editorPixels = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const countText = (x: number, y: number, w: number, h: number) => {
      const data = ctx.getImageData(x, y, w, h).data;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0) count += 1;
      return count;
    };
    return {
      title: countText(Math.round((canvas.width - 'map editor'.length * 16) / 2), 28, 160, 16),
      createMap: countText(Math.round((canvas.width - '> Create map <'.length * 16) / 2), 60, 224, 16),
      openMap: countText(Math.round((canvas.width - 'Open map'.length * 16) / 2), 80, 128, 16),
      howToUse: countText(Math.round((canvas.width - 'How to use'.length * 16) / 2), 120, 160, 16),
    };
  });
  expect(editorPixels.title).toBeGreaterThan(20);
  expect(editorPixels.createMap).toBeGreaterThan(20);
  expect(editorPixels.openMap).toBeGreaterThan(20);
  expect(editorPixels.howToUse).toBeGreaterThan(20);

  for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { active: boolean; selected: number; screen: string } }).menu!;
    return { active: menu.active, selected: menu.selected, screen: menu.screen };
  })).toEqual({ active: true, selected: 3, screen: 'map-editor-help' });

  const helpPixels = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const countText = (x: number, y: number, w: number, h: number) => {
      const data = ctx.getImageData(x, y, w, h).data;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0) count += 1;
      return count;
    };
    return {
      title: countText(Math.round((canvas.width - 'Map editor help'.length * 16) / 2), 20, 240, 16),
      firstLine: countText(Math.round((canvas.width - 'arrows or wasd to move.'.length * 8) / 2), 60, 184, 8),
      saveLine: countText(Math.round((canvas.width - 'Ctrl+S to save.'.length * 8) / 2), 150, 120, 8),
      tip: countText(Math.round((canvas.width - 'press esc to return'.length * 8) / 2), canvas.height - 20, 152, 8),
    };
  });
  expect(helpPixels.title).toBeGreaterThan(20);
  expect(helpPixels.firstLine).toBeGreaterThan(20);
  expect(helpPixels.saveLine).toBeGreaterThan(20);
  expect(helpPixels.tip).toBeGreaterThan(20);

  await page.keyboard.press('Escape');
  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { active: boolean; selected: number; screen: string } }).menu!;
    return { active: menu.active, selected: menu.selected, screen: menu.screen };
  })).toEqual({ active: true, selected: 3, screen: 'map-editor' });

  await page.keyboard.press('Escape');
  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { active: boolean; selected: number; screen: string } }).menu!;
    return { active: menu.active, selected: menu.selected, screen: menu.screen };
  })).toEqual({ active: true, selected: 0, screen: 'main' });
});

test('main menu opens original settings screen', async ({ page }) => {
  await page.goto('/?sound=off');
  for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { active: boolean; screen: string; settingsOption: number } }).menu!;
    return { active: menu.active, screen: menu.screen, settingsOption: menu.settingsOption };
  })).toEqual({ active: true, screen: 'settings', settingsOption: 0 });

  const settingsPixels = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const countText = (x: number, y: number, w: number, h: number) => {
      const data = ctx.getImageData(x, y, w, h).data;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0) count += 1;
      return count;
    };
    return {
      title: countText(Math.round((canvas.width - 'settings'.length * 16) / 2), 20, 128, 16),
      stats: countText(100, 60, 90, 8),
      dimension: countText(100, 175, 150, 8),
      username: countText(100, 195, 150, 8),
      marker: countText(85, 60, 8, 8),
      tip: countText(Math.round((canvas.width - 'esc to save'.length * 8) / 2), canvas.height - 20, 120, 8),
    };
  });
  expect(settingsPixels.title).toBeGreaterThan(20);
  expect(settingsPixels.stats).toBeGreaterThan(10);
  expect(settingsPixels.dimension).toBeGreaterThan(10);
  expect(settingsPixels.username).toBeGreaterThan(10);
  expect(settingsPixels.marker).toBeGreaterThan(2);
  expect(settingsPixels.tip).toBeGreaterThan(10);

  await page.keyboard.press('Tab');
  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { settingsOption: number } }).menu!;
    return menu.settingsOption;
  })).toBe(1);

  await page.keyboard.press('Escape');
  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { active: boolean; selected: number; screen: string } }).menu!;
    return { active: menu.active, selected: menu.selected, screen: menu.screen };
  })).toEqual({ active: true, selected: 0, screen: 'main' });
});

test('ctf mode shows original team selector before play', async ({ page }) => {
  await page.goto(playUrl('/?mode=ctf&level=/levels/ctf/struggel.rmm&sound=off'));
  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { active: boolean; selected: number; screen: string }; game?: { localPlayer: { team: string } } }).menu!;
    const game = (window as Window & { game?: { localPlayer: { team: string } } }).game!;
    return { active: menu.active, selected: menu.selected, screen: menu.screen, team: game.localPlayer.team };
  })).toEqual({ active: true, selected: 0, screen: 'team', team: 'none' });

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { active: boolean }; game?: { localPlayer: { team: string } } }).menu!;
    const game = (window as Window & { game?: { localPlayer: { team: string } } }).game!;
    return { active: menu.active, team: game.localPlayer.team };
  })).toEqual({ active: false, team: 'blu' });
});

test('escape opens original pause menu and can change team', async ({ page }) => {
  await page.goto(playUrl('/?mode=ctf&team=red&level=/levels/ctf/struggel.rmm&sound=off'));
  const beforePause = await page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { x: number } } }).game!;
    return game.localPlayer.x;
  });

  await page.keyboard.press('Escape');
  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { active: boolean; selected: number; screen: string } }).menu!;
    return { active: menu.active, selected: menu.selected, screen: menu.screen };
  })).toEqual({ active: true, selected: 0, screen: 'pause' });

  await page.keyboard.down('KeyD');
  await page.waitForTimeout(250);
  await page.keyboard.up('KeyD');
  const pausedX = await page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { x: number } } }).game!;
    return game.localPlayer.x;
  });
  expect(pausedX).toBe(beforePause);

  await page.keyboard.press('Enter');
  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { active: boolean } }).menu!;
    return menu.active;
  })).toBe(false);

  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { active: boolean; selected: number; screen: string } }).menu!;
    return { active: menu.active, selected: menu.selected, screen: menu.screen };
  })).toEqual({ active: true, selected: 0, screen: 'team' });

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(async () => page.evaluate(() => {
    const menu = (window as Window & { menu?: { active: boolean }; game?: { localPlayer: { team: string } } }).menu!;
    const game = (window as Window & { game?: { localPlayer: { team: string } } }).game!;
    return { active: menu.active, team: game.localPlayer.team };
  })).toEqual({ active: false, team: 'blu' });
});

test('tab shows original statistics overlay grouped by team', async ({ page }) => {
  await page.goto(playUrl('/?mode=ctf&team=red&level=/levels/ctf/struggel.rmm&sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { name: string; team: string; kills: number; deaths: number };
      upsertRemotePlayer: (state: unknown) => void;
    } }).game!;
    game.localPlayer.name = 'redone';
    game.localPlayer.team = 'red';
    game.localPlayer.kills = 2;
    game.localPlayer.deaths = 1;
    game.upsertRemotePlayer({
      id: 'blue-stat',
      x: 180,
      y: 180,
      hp: 100,
      ammo: 75,
      direction: 0,
      moving: false,
      shooting: false,
      kills: 4,
      deaths: 3,
      name: 'blueone',
      team: 'blu',
    });
  });

  await page.keyboard.down('Tab');
  await expect.poll(async () => page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const countBright = (x: number, y: number, w: number, h: number) => {
      const data = ctx.getImageData(x, y, w, h).data;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 180 && data[i + 1] > 180 && data[i + 2] > 180 && data[i + 3] > 0) count += 1;
      }
      return count;
    };
    const colWidth = 195;
    const nameX = canvas.width / 2 - colWidth / 2;
    const xOffset = -(canvas.width - colWidth) / 4 - 15;
    return {
      title: countBright(Math.round((canvas.width - 'statistics'.length * 16) / 2), 20, 160, 16),
      blue: countBright(Math.round(nameX + xOffset - 10), 55, 170, 25),
      red: countBright(Math.round(nameX - xOffset - 10), 55, 170, 25),
    };
  })).toMatchObject({
    title: expect.any(Number),
    blue: expect.any(Number),
    red: expect.any(Number),
  });
  await expect.poll(async () => page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const countBright = (x: number, y: number, w: number, h: number) => {
      const data = ctx.getImageData(x, y, w, h).data;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 180 && data[i + 1] > 180 && data[i + 2] > 180 && data[i + 3] > 0) count += 1;
      }
      return count;
    };
    const colWidth = 195;
    const nameX = canvas.width / 2 - colWidth / 2;
    const xOffset = -(canvas.width - colWidth) / 4 - 15;
    return {
      titleReady: countBright(Math.round((canvas.width - 'statistics'.length * 16) / 2), 20, 160, 16) > 80,
      blueReady: countBright(Math.round(nameX + xOffset - 10), 55, 170, 25) > 20,
      redReady: countBright(Math.round(nameX - xOffset - 10), 55, 170, 25) > 20,
    };
  })).toEqual({ titleReady: true, blueReady: true, redReady: true });

  await page.keyboard.up('Tab');
  await expect.poll(async () => page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const data = canvas.getContext('2d')!.getImageData(Math.round((canvas.width - 'statistics'.length * 16) / 2), 20, 160, 16).data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 180 && data[i + 1] > 180 && data[i + 2] > 180 && data[i + 3] > 0) count += 1;
    }
    return count;
  })).toBeLessThan(20);
});

test('water tiles animate after original skipped redraw cadence', async ({ page }) => {
  await page.goto(playUrl());
  const initial = await page.evaluate(() => {
    const game = (window as Window & { game?: { tileAtCell: (x: number, y: number) => { kind: string; frame: number } | undefined } }).game!;
    return game.tileAtCell(5, 4);
  });
  expect(initial).toMatchObject({ kind: 'water' });

  await expect.poll(async () => page.evaluate((startFrame) => {
    const game = (window as Window & { game?: { tileAtCell: (x: number, y: number) => { frame: number } | undefined } }).game!;
    return game.tileAtCell(5, 4)?.frame !== startFrame;
  }, initial!.frame)).toBe(true);
});

test('movement accepts simultaneous directional input', async ({ page }) => {
  await page.goto(playUrl());
  const start = await page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { x: number; y: number; direction: number } } }).game!;
    game.localPlayer.x = 180;
    game.localPlayer.y = 180;
    return { x: game.localPlayer.x, y: game.localPlayer.y };
  });

  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(250);
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyD');

  const end = await page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { x: number; y: number; direction: number } } }).game!;
    return { x: game.localPlayer.x, y: game.localPlayer.y, direction: game.localPlayer.direction };
  });
  expect(end.direction).toBe(0);
  expect(end.x).toBeGreaterThan(start.x);
  expect(end.y).toBeLessThan(start.y);
});

test('player track animation resets idle and advances while moving', async ({ page }) => {
  await page.goto(playUrl());
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { visualState: () => { trackState: number } } }).game!;
    return game.visualState().trackState;
  })).toBe(0);

  await page.keyboard.down('KeyD');
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { visualState: () => { trackState: number } } }).game!;
    return game.visualState().trackState;
  })).toBeGreaterThan(0);
  await page.keyboard.up('KeyD');
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { visualState: () => { trackState: number } } }).game!;
    return game.visualState().trackState;
  })).toBe(0);
});

test('bullet damages another player by original damage amount', async ({ page }) => {
  await page.goto(playUrl());
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(250);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(450);

  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localId: string;
      snapshot: () => { x: number; y: number; direction: number };
      upsertRemotePlayer: (state: unknown) => void;
    } }).game!;
    const local = game.snapshot();
    game.upsertRemotePlayer({
      id: 'remote-target',
      x: local.x + 52,
      y: local.y,
      hp: 100,
      ammo: 75,
      direction: local.direction,
      moving: false,
      shooting: false,
      kills: 0,
      deaths: 0,
      name: 'Target',
    });
  });

  await page.keyboard.press('Space');
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { players: Map<string, { hp: number }> } }).game!;
    return game.players.get('remote-target')?.hp;
  })).toBe(80);
});

test('team bullets pass through allies and damage enemies', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; direction: number; ammo: number; team: string };
      level: { entities: Array<unknown> };
      upsertRemotePlayer: (state: unknown) => void;
    } }).game!;
    game.localPlayer.x = 120;
    game.localPlayer.y = 120;
    game.localPlayer.direction = 1;
    game.localPlayer.ammo = 75;
    game.localPlayer.team = 'red';
    game.level.entities = [];
    game.upsertRemotePlayer({
      id: 'ally-target',
      x: 172,
      y: 120,
      hp: 100,
      ammo: 75,
      direction: 3,
      moving: false,
      shooting: false,
      kills: 0,
      deaths: 0,
      name: 'Ally',
      team: 'red',
    });
    game.upsertRemotePlayer({
      id: 'enemy-target',
      x: 212,
      y: 120,
      hp: 100,
      ammo: 75,
      direction: 3,
      moving: false,
      shooting: false,
      kills: 0,
      deaths: 0,
      name: 'Enemy',
      team: 'blu',
    });
  });

  await page.waitForTimeout(450);
  await page.keyboard.press('Space');

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { players: Map<string, { hp: number }> } }).game!;
    return {
      allyHp: game.players.get('ally-target')?.hp,
      enemyHp: game.players.get('enemy-target')?.hp,
    };
  })).toEqual({ allyHp: 100, enemyHp: 80 });
});

test('lethal bullet damage increments kills and deaths then respawns target', async ({ page }) => {
  await page.goto(playUrl());
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; direction: number; ammo: number };
      upsertRemotePlayer: (state: unknown) => void;
    } }).game!;
    game.localPlayer.x = 120;
    game.localPlayer.y = 120;
    game.localPlayer.direction = 1;
    game.localPlayer.ammo = 75;
    game.upsertRemotePlayer({
      id: 'remote-lethal',
      x: 172,
      y: 120,
      hp: 20,
      ammo: 3,
      direction: 3,
      moving: false,
      shooting: false,
      kills: 0,
      deaths: 0,
      name: 'Target',
    });
  });

  await page.waitForTimeout(450);
  await page.keyboard.press('Space');

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { kills: number };
      players: Map<string, { hp: number; ammo: number; deaths: number; x: number; y: number }>;
    } }).game!;
    const target = game.players.get('remote-lethal')!;
    return { localKills: game.localPlayer.kills, target };
  })).toMatchObject({
    localKills: 1,
    target: {
      deaths: 1,
      hp: 100,
      ammo: 75,
      x: 120,
      y: 480,
    },
  });
  const state = await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { kills: number };
      players: Map<string, { hp: number; ammo: number; deaths: number; x: number; y: number }>;
    } }).game!;
    return { localKills: game.localPlayer.kills, target: game.players.get('remote-lethal')! };
  });
  expect(state.localKills).toBe(1);
  expect(state.target.deaths).toBe(1);
  expect(state.target.hp).toBe(100);
  expect(state.target.ammo).toBe(75);
  expect(state.target.x).toBe(120);
  expect(state.target.y).toBe(480);
  const debris = await page.evaluate(() => {
    const game = (window as Window & { game?: {
      particles: Array<{ kind: string; x: number; y: number; direction: number; lifeTime: number; animationStates: number }>;
    } }).game!;
    return game.particles.find((candidate) => candidate.kind === 'robot-debris');
  });
  expect(debris).toMatchObject({ kind: 'robot-debris', x: 172, y: 120, direction: 3, lifeTime: 250, animationStates: 9 });
});

test('remote players render original health bar colors', async ({ page }) => {
  await page.goto(playUrl());
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number };
      upsertRemotePlayer: (state: unknown) => void;
    } }).game!;
    game.localPlayer.x = 120;
    game.localPlayer.y = 120;
    game.upsertRemotePlayer({
      id: 'remote-health',
      x: 160,
      y: 120,
      hp: 50,
      ammo: 75,
      direction: 2,
      moving: false,
      shooting: false,
      kills: 0,
      deaths: 0,
      name: 'Remote',
    });
  });
  await page.waitForTimeout(80);

  const pixel = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const data = ctx.getImageData(161, 147, 1, 1).data;
    return [data[0], data[1], data[2], data[3]];
  });
  expect(pixel[0]).toBeGreaterThan(200);
  expect(pixel[1]).toBeGreaterThan(200);
  expect(pixel[2]).toBeLessThan(80);
});

test('player gun sprites are tinted per original unit hue', async ({ page }) => {
  await page.goto(playUrl());
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number };
      upsertRemotePlayer: (state: unknown) => void;
    } }).game!;
    game.localPlayer.x = 120;
    game.localPlayer.y = 120;
    for (const [id, y] of [['1', 120], ['2', 170]] as const) {
      game.upsertRemotePlayer({
        id,
        x: 160,
        y,
        hp: 100,
        ammo: 75,
        direction: 2,
        moving: false,
        shooting: false,
        kills: 0,
        deaths: 0,
        name: `P${id}`,
      });
    }
  });
  await page.waitForTimeout(80);

  const samples = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const findColoredPixel = (left: number, top: number) => {
      const data = ctx.getImageData(left, top, 30, 30).data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0 && Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) > 30) {
          return [data[i], data[i + 1], data[i + 2]];
        }
      }
      return [0, 0, 0];
    };
    return [findColoredPixel(158, 108), findColoredPixel(158, 158)];
  });
  expect(samples[0]).not.toEqual(samples[1]);
});

test('bullets damage and destroy brick walls', async ({ page }) => {
  await page.goto(playUrl('/?level=/levels/dm/destro.rmm&sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; direction: number; ammo: number };
    } }).game!;
    game.localPlayer.x = 118;
    game.localPlayer.y = 66;
    game.localPlayer.direction = 1;
    game.localPlayer.ammo = 75;
  });

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { entityAtCell: (x: number, y: number) => { health: number; removed: boolean } | undefined } }).game!;
    return game.entityAtCell(5, 2)?.health;
  })).toBe(60);

  for (const expectedHealth of [40, 20, 0]) {
    await page.waitForTimeout(450);
    await page.keyboard.press('Space');
    await expect.poll(async () => page.evaluate((cell) => {
      const game = (window as Window & { game?: { entityAtCell: (x: number, y: number) => { health: number; removed: boolean } | undefined } }).game!;
      return game.entityAtCell(cell.x, cell.y);
    }, { x: 5, y: 2 })).toMatchObject({
      health: expectedHealth,
      removed: expectedHealth === 0,
    });
  }
  const particle = await page.evaluate(() => {
    const game = (window as Window & { game?: {
      particles: Array<{ kind: string; direction: number; lifeTime: number; animationStates: number }>;
    } }).game!;
    return game.particles.find((candidate) => candidate.kind === 'brick-dust');
  });
  expect(particle).toMatchObject({ kind: 'brick-dust', direction: 1, lifeTime: 4, animationStates: 3 });
  const debris = await page.evaluate(() => {
    const game = (window as Window & { game?: {
      particles: Array<{ kind: string; x: number; y: number; lifeTime: number; animationStates: number }>;
    } }).game!;
    return game.particles.find((candidate) => candidate.kind === 'wall-debris');
  });
  expect(debris).toMatchObject({ kind: 'wall-debris', x: 150, y: 60, lifeTime: 250, animationStates: 10 });
  const sounds = await page.evaluate(() => {
    const game = (window as Window & { game?: { soundEvents: () => string[] } }).game!;
    return game.soundEvents();
  });
  expect(sounds).toEqual(['shoot', 'brick-hit', 'shoot', 'brick-hit', 'shoot', 'brick-hit']);
});

test('movement rolls back when colliding with solid entities', async ({ page }) => {
  await page.goto(playUrl('/?level=/levels/dm/destro.rmm'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; direction: number };
    } }).game!;
    game.localPlayer.x = 118;
    game.localPlayer.y = 66;
    game.localPlayer.direction = 1;
  });

  await page.keyboard.down('KeyD');
  await page.waitForTimeout(900);
  await page.keyboard.up('KeyD');

  const state = await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number };
      entityAtCell: (x: number, y: number) => { removed: boolean } | undefined;
    } }).game!;
    return { x: game.localPlayer.x, y: game.localPlayer.y, wallRemoved: game.entityAtCell(5, 2)?.removed };
  });
  expect(state.x).toBeLessThan(125);
  expect(state.y).toBeCloseTo(66, 5);
  expect(state.wallRemoved).toBe(false);
});

test('bullets play original metal hit sound on metal entities', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; direction: number; ammo: number };
    } }).game!;
    game.localPlayer.x = 35;
    game.localPlayer.y = 120;
    game.localPlayer.direction = 3;
    game.localPlayer.ammo = 75;
  });

  await page.waitForTimeout(450);
  await page.keyboard.press('Space');

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: {
      particles: Array<{ kind: string; direction: number; lifeTime: number; animationStates: number }>;
      soundEvents: () => string[];
    } }).game!;
    return {
      particle: game.particles.find((candidate) => candidate.kind === 'spark'),
      sounds: game.soundEvents(),
    };
  })).toMatchObject({
    particle: { kind: 'spark', direction: 3, lifeTime: 4, animationStates: 3 },
    sounds: ['shoot', 'metal-hit'],
  });
});

test('ctf flags can be carried home to score and return', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; team: string; holdingFlag?: string };
      score: { red: number; blu: number };
      level: {
        entities: Array<{ kind: string; x: number; y: number; solid: boolean; health: number; maxHealth: number; removed: boolean }>;
      };
    } }).game!;
    game.level.entities = [
      { kind: 'flag-red', x: 90, y: 90, solid: false, health: Number.POSITIVE_INFINITY, maxHealth: Number.POSITIVE_INFINITY, removed: false },
      { kind: 'flag-blu', x: 180, y: 90, solid: false, health: Number.POSITIVE_INFINITY, maxHealth: Number.POSITIVE_INFINITY, removed: false },
    ];
    game.score.red = 0;
    game.score.blu = 0;
    game.localPlayer.team = 'red';
    game.localPlayer.x = 180;
    game.localPlayer.y = 90;
    game.localPlayer.holdingFlag = undefined;
  });

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { holdingFlag?: string };
      level: { entities: Array<{ kind: string; removed: boolean }> };
    } }).game!;
    return {
      holdingFlag: game.localPlayer.holdingFlag,
      blueFlagRemoved: game.level.entities.find((entity) => entity.kind === 'flag-blu')?.removed,
    };
  })).toEqual({ holdingFlag: 'blu', blueFlagRemoved: true });

  await page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { x: number; y: number } } }).game!;
    game.localPlayer.x = 90;
    game.localPlayer.y = 90;
  });

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { holdingFlag?: string };
      score: { red: number; blu: number };
      level: { entities: Array<{ kind: string; removed: boolean }> };
    } }).game!;
    return {
      holdingFlag: game.localPlayer.holdingFlag,
      score: game.score,
      blueFlagRemoved: game.level.entities.find((entity) => entity.kind === 'flag-blu')?.removed,
    };
  })).toEqual({ holdingFlag: undefined, score: { red: 1, blu: 0 }, blueFlagRemoved: false });
});

test('two clients exchange player state over WebRTC data channels', async ({ browser }) => {
  const context = await browser.newContext();
  const room = `pw-${Date.now()}`;
  const a = await context.newPage();
  const b = await context.newPage();

  await a.goto(playUrl(`/?room=${room}&signal=broadcast`));
  await b.goto(playUrl(`/?room=${room}&signal=broadcast`));

  await expect.poll(async () => a.evaluate(() => {
    const multiplayer = (window as Window & { multiplayer?: { connectedPeerCount: () => number } }).multiplayer;
    return multiplayer?.connectedPeerCount() ?? 0;
  })).toBe(1);
  await expect.poll(async () => b.evaluate(() => {
    const multiplayer = (window as Window & { multiplayer?: { connectedPeerCount: () => number } }).multiplayer;
    return multiplayer?.connectedPeerCount() ?? 0;
  })).toBe(1);

  await a.keyboard.down('KeyD');
  await a.waitForTimeout(300);
  await a.keyboard.up('KeyD');

  const aState = await a.evaluate(() => {
    const game = (window as Window & { game?: { localId: string; snapshot: () => { x: number } } }).game!;
    return { id: game.localId, x: game.snapshot().x };
  });

  await expect.poll(async () => b.evaluate((id) => {
    const game = (window as Window & { game?: { players: Map<string, { x: number }> } }).game!;
    return game.players.get(id)?.x ?? 0;
  }, aState.id)).toBeGreaterThan(aState.x - 0.1);

  await context.close();
});

test('two clients sync ctf score and returned flags over WebRTC', async ({ browser }) => {
  const context = await browser.newContext();
  const room = `pw-ctf-${Date.now()}`;
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

  await Promise.all([a, b].map((page) => page.evaluate(() => {
    const game = (window as Window & { game?: {
      score: { red: number; blu: number };
      level: {
        entities: Array<{ kind: string; x: number; y: number; solid: boolean; health: number; maxHealth: number; removed: boolean }>;
      };
    } }).game!;
    game.level.entities = [
      { kind: 'flag-red', x: 90, y: 90, solid: false, health: Number.POSITIVE_INFINITY, maxHealth: Number.POSITIVE_INFINITY, removed: false },
      { kind: 'flag-blu', x: 180, y: 90, solid: false, health: Number.POSITIVE_INFINITY, maxHealth: Number.POSITIVE_INFINITY, removed: false },
    ];
    game.score.red = 0;
    game.score.blu = 0;
  })));

  await a.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; team: string; holdingFlag?: string };
    } }).game!;
    game.localPlayer.team = 'red';
    game.localPlayer.x = 180;
    game.localPlayer.y = 90;
    game.localPlayer.holdingFlag = undefined;
  });

  await expect.poll(async () => a.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { holdingFlag?: string } } }).game!;
    return game.localPlayer.holdingFlag;
  })).toBe('blu');

  await a.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { x: number; y: number } } }).game!;
    game.localPlayer.x = 90;
    game.localPlayer.y = 90;
  });

  await expect.poll(async () => b.evaluate(() => {
    const game = (window as Window & { game?: {
      score: { red: number; blu: number };
      players: Map<string, { holdingFlag?: string; team: string }>;
      level: { entities: Array<{ kind: string; removed: boolean }> };
    } }).game!;
    return {
      score: game.score,
      blueFlagRemoved: game.level.entities.find((entity) => entity.kind === 'flag-blu')?.removed,
      remoteCarrier: [...game.players.values()].find((player) => player.team === 'red')?.holdingFlag,
    };
  })).toEqual({ score: { red: 1, blu: 0 }, blueFlagRemoved: false, remoteCarrier: undefined });

  await context.close();
});

test('two clients sync destructible wall damage over WebRTC', async ({ browser }) => {
  const context = await browser.newContext();
  const room = `pw-wall-${Date.now()}`;
  const a = await context.newPage();
  const b = await context.newPage();

  await a.goto(playUrl(`/?level=/levels/dm/destro.rmm&room=${room}&signal=broadcast`));
  await b.goto(playUrl(`/?level=/levels/dm/destro.rmm&room=${room}&signal=broadcast`));

  await expect.poll(async () => a.evaluate(() => {
    const multiplayer = (window as Window & { multiplayer?: { connectedPeerCount: () => number } }).multiplayer;
    return multiplayer?.connectedPeerCount() ?? 0;
  })).toBe(1);
  await expect.poll(async () => b.evaluate(() => {
    const multiplayer = (window as Window & { multiplayer?: { connectedPeerCount: () => number } }).multiplayer;
    return multiplayer?.connectedPeerCount() ?? 0;
  })).toBe(1);

  await a.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; direction: number; ammo: number };
    } }).game!;
    game.localPlayer.x = 118;
    game.localPlayer.y = 66;
    game.localPlayer.direction = 1;
    game.localPlayer.ammo = 75;
  });

  await a.waitForTimeout(450);
  await a.keyboard.press('Space');

  await expect.poll(async () => b.evaluate(() => {
    const game = (window as Window & { game?: { entityAtCell: (x: number, y: number) => { health: number; removed: boolean } | undefined } }).game!;
    return game.entityAtCell(5, 2);
  })).toMatchObject({ health: 40, removed: false });

  await context.close();
});

test('two clients sync bonuses and pickup removals over WebRTC', async ({ browser }) => {
  const context = await browser.newContext();
  const room = `pw-bonus-${Date.now()}`;
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

  const bonusId = await a.evaluate(() => {
    const game = (window as Window & { game?: {
      addBonus: (kind: string, x: number, y: number) => { id: string };
    } }).game!;
    return game.addBonus('small-ammo', 180, 180).id;
  });

  await expect.poll(async () => b.evaluate((id) => {
    const game = (window as Window & { game?: { bonuses: Map<string, { kind: string; x: number; y: number }> } }).game!;
    return game.bonuses.get(id);
  }, bonusId)).toMatchObject({ kind: 'small-ammo', x: 180, y: 180 });

  await b.evaluate((id) => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; ammo: number };
      bonuses: Map<string, { x: number; y: number }>;
    } }).game!;
    const bonus = game.bonuses.get(id)!;
    game.localPlayer.x = bonus.x;
    game.localPlayer.y = bonus.y;
    game.localPlayer.ammo = 80;
  }, bonusId);

  await expect.poll(async () => b.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { ammo: number }; bonuses: Map<string, unknown> } }).game!;
    return { ammo: game.localPlayer.ammo, bonuses: game.bonuses.size };
  })).toEqual({ ammo: 105, bonuses: 0 });

  await expect.poll(async () => a.evaluate((id) => {
    const game = (window as Window & { game?: { bonuses: Map<string, unknown> } }).game!;
    return game.bonuses.has(id);
  }, bonusId)).toBe(false);

  await context.close();
});

test('two clients sync placed inventory buildings over WebRTC', async ({ browser }) => {
  const context = await browser.newContext();
  const room = `pw-build-${Date.now()}`;
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

  const ownerId = await a.evaluate(() => {
    const game = (window as Window & { game?: {
      localId: string;
      localPlayer: {
        x: number;
        y: number;
        direction: number;
        inventory: Array<{ kind: string; activationKey: number; imageIndex: number; amount: number }>;
        currentInventoryKey: number;
      };
      level: { entities: Array<unknown> };
    } }).game!;
    game.level.entities = [];
    game.localPlayer.x = 180;
    game.localPlayer.y = 180;
    game.localPlayer.direction = 2;
    game.localPlayer.inventory = [
      { kind: 'cannon', activationKey: 1, imageIndex: 9, amount: 1 },
      { kind: 'dispenser', activationKey: 4, imageIndex: 10, amount: 1 },
    ];
    game.localPlayer.currentInventoryKey = 4;
    return game.localId;
  });

  await a.keyboard.press('Space');

  await expect.poll(async () => b.evaluate((id) => {
    const game = (window as Window & { game?: {
      level: { entities: Array<{ kind: string; x: number; y: number; owner?: string; health: number; maxHealth: number; solid: boolean; removed: boolean }> };
    } }).game!;
    return game.level.entities.find((entity) => entity.owner === id && entity.kind === 'dispenser');
  }, ownerId)).toMatchObject({
    kind: 'dispenser',
    x: 180,
    y: 211,
    owner: ownerId,
    health: 75,
    maxHealth: 75,
    solid: true,
    removed: false,
  });

  await context.close();
});

test('two clients sync dragged building movement over WebRTC', async ({ browser }) => {
  const context = await browser.newContext();
  const room = `pw-drag-${Date.now()}`;
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

  const ownerId = await a.evaluate(() => {
    const game = (window as Window & { game?: {
      localId: string;
      localPlayer: { x: number; y: number; direction: number; carriedBuildingId?: string };
      level: {
        entities: Array<{
          id?: string;
          kind: string;
          owner?: string;
          x: number;
          y: number;
          solid: boolean;
          health: number;
          maxHealth: number;
          removed: boolean;
          direction?: number;
          lastShot?: number;
          skippedAnimTicks?: number;
        }>;
      };
    } }).game!;
    game.level.entities = [{
      id: 'drag-sync-turret',
      kind: 'turret',
      owner: game.localId,
      x: 200,
      y: 180,
      solid: true,
      health: 125,
      maxHealth: 125,
      removed: false,
      direction: 0,
      lastShot: performance.now(),
      skippedAnimTicks: 0,
    }];
    game.localPlayer.x = 180;
    game.localPlayer.y = 180;
    game.localPlayer.direction = 1;
    game.localPlayer.carriedBuildingId = undefined;
    return game.localId;
  });

  await a.keyboard.press('KeyE');
  await expect.poll(async () => a.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { carriedBuildingId?: string } } }).game!;
    return game.localPlayer.carriedBuildingId;
  })).toBe('drag-sync-turret');

  await a.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { x: number; y: number } } }).game!;
    game.localPlayer.x = 240;
    game.localPlayer.y = 210;
  });

  await expect.poll(async () => b.evaluate((id) => {
    const game = (window as Window & { game?: {
      level: { entities: Array<{ id?: string; owner?: string; x: number; y: number; solid: boolean }> };
    } }).game!;
    return game.level.entities.find((entity) => entity.owner === id && entity.id === 'drag-sync-turret');
  }, ownerId)).toMatchObject({ x: 240, y: 210, solid: false });

  await context.close();
});

test('remote turret bullets damage the other client over WebRTC', async ({ browser }) => {
  const context = await browser.newContext();
  const room = `pw-turret-${Date.now()}`;
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

  const bId = await b.evaluate(() => {
    const game = (window as Window & { game?: {
      localId: string;
      localPlayer: { x: number; y: number; hp: number; direction: number };
      level: { entities: Array<unknown> };
    } }).game!;
    game.level.entities = [];
    game.localPlayer.x = 184;
    game.localPlayer.y = 310;
    game.localPlayer.hp = 100;
    game.localPlayer.direction = 0;
    return game.localId;
  });

  await expect.poll(async () => a.evaluate((id) => {
    const game = (window as Window & { game?: { players: Map<string, { x: number; y: number }> } }).game!;
    return game.players.get(id);
  }, bId)).toMatchObject({ x: 184, y: 310 });

  await a.evaluate(() => {
    const game = (window as Window & { game?: {
      localId: string;
      localPlayer: { x: number; y: number; direction: number };
      bullets: Map<string, unknown>;
      level: {
        entities: Array<{
          id?: string;
          kind: string;
          owner?: string;
          x: number;
          y: number;
          solid: boolean;
          health: number;
          maxHealth: number;
          removed: boolean;
          direction?: number;
          lastShot?: number;
          skippedAnimTicks?: number;
        }>;
      };
    } }).game!;
    game.level.entities = [{
      id: 'a-turret',
      kind: 'turret',
      owner: game.localId,
      x: 180,
      y: 180,
      solid: true,
      health: 125,
      maxHealth: 125,
      removed: false,
      direction: 0,
      lastShot: performance.now() - 500,
      skippedAnimTicks: 0,
    }];
    game.localPlayer.x = 120;
    game.localPlayer.y = 120;
    game.localPlayer.direction = 2;
    game.bullets.clear();
  });

  await expect.poll(async () => a.evaluate((id) => {
    const game = (window as Window & { game?: { players: Map<string, { x: number; y: number }> } }).game!;
    return game.players.get(id);
  }, bId)).toMatchObject({ x: 184, y: 310 });

  await expect.poll(async () => b.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { hp: number } } }).game!;
    return game.localPlayer.hp;
  })).toBe(80);

  await context.close();
});

test('remote mine explosions damage the other client over WebRTC', async ({ browser }) => {
  const context = await browser.newContext();
  const room = `pw-mine-${Date.now()}`;
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

  const bId = await b.evaluate(() => {
    const game = (window as Window & { game?: {
      localId: string;
      localPlayer: { x: number; y: number; hp: number; deaths: number; direction: number };
      level: { entities: Array<unknown> };
    } }).game!;
    game.level.entities = [];
    game.localPlayer.x = 190;
    game.localPlayer.y = 190;
    game.localPlayer.hp = 100;
    game.localPlayer.deaths = 0;
    game.localPlayer.direction = 0;
    return game.localId;
  });

  await expect.poll(async () => a.evaluate((id) => {
    const game = (window as Window & { game?: { players: Map<string, { x: number; y: number }> } }).game!;
    return game.players.get(id);
  }, bId)).toMatchObject({ x: 190, y: 190 });

  await a.evaluate(() => {
    const game = (window as Window & { game?: {
      localId: string;
      localPlayer: { x: number; y: number; direction: number };
      level: {
        entities: Array<{
          id?: string;
          kind: string;
          owner?: string;
          x: number;
          y: number;
          solid: boolean;
          health: number;
          maxHealth: number;
          removed: boolean;
          countdown?: boolean;
          skippedExplTicks?: number;
        }>;
      };
    } }).game!;
    game.level.entities = [{
      id: 'a-mine',
      kind: 'mine',
      owner: game.localId,
      x: 180,
      y: 180,
      solid: true,
      health: 0,
      maxHealth: 1,
      removed: false,
      countdown: true,
      skippedExplTicks: 25,
    }];
    game.localPlayer.x = 120;
    game.localPlayer.y = 120;
    game.localPlayer.direction = 2;
  });

  await expect.poll(async () => a.evaluate(() => {
    const game = (window as Window & { game?: { level: { entities: Array<{ kind: string; removed: boolean }> } } }).game!;
    return game.level.entities.find((entity) => entity.kind === 'mine')?.removed;
  })).toBe(true);

  await expect.poll(async () => b.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { hp: number; deaths: number } } }).game!;
    return { hp: game.localPlayer.hp, deaths: game.localPlayer.deaths };
  })).toEqual({ hp: 100, deaths: 1 });

  await context.close();
});

test('remote bullets damage the other client and sync health back', async ({ browser }) => {
  const context = await browser.newContext();
  const room = `pw-hit-${Date.now()}`;
  const a = await context.newPage();
  const b = await context.newPage();

  await a.goto(playUrl(`/?room=${room}&signal=broadcast`));
  await b.goto(playUrl(`/?room=${room}&signal=broadcast`));

  await expect.poll(async () => a.evaluate(() => {
    const multiplayer = (window as Window & { multiplayer?: { connectedPeerCount: () => number } }).multiplayer;
    return multiplayer?.connectedPeerCount() ?? 0;
  })).toBe(1);
  await expect.poll(async () => b.evaluate(() => {
    const multiplayer = (window as Window & { multiplayer?: { connectedPeerCount: () => number } }).multiplayer;
    return multiplayer?.connectedPeerCount() ?? 0;
  })).toBe(1);

  const bId = await b.evaluate(() => {
    const game = (window as Window & { game?: { localId: string } }).game!;
    return game.localId;
  });

  await a.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; direction: number; ammo: number };
    } }).game!;
    game.localPlayer.x = 120;
    game.localPlayer.y = 120;
    game.localPlayer.direction = 1;
    game.localPlayer.ammo = 75;
  });
  await b.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; direction: number; hp: number };
    } }).game!;
    game.localPlayer.x = 172;
    game.localPlayer.y = 120;
    game.localPlayer.direction = 3;
    game.localPlayer.hp = 100;
  });

  await a.waitForTimeout(450);
  await a.keyboard.press('Space');

  await expect.poll(async () => b.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { hp: number } } }).game!;
    return game.localPlayer.hp;
  })).toBe(80);

  await expect.poll(async () => a.evaluate((remoteId) => {
    const game = (window as Window & { game?: { players: Map<string, { hp: number }> } }).game!;
    return game.players.get(remoteId)?.hp;
  }, bId)).toBe(80);

  await context.close();
});

test('remote lethal hits sync death count and respawned health', async ({ browser }) => {
  const context = await browser.newContext();
  const room = `pw-death-${Date.now()}`;
  const a = await context.newPage();
  const b = await context.newPage();

  await a.goto(playUrl(`/?room=${room}&signal=broadcast`));
  await b.goto(playUrl(`/?room=${room}&signal=broadcast`));

  await expect.poll(async () => a.evaluate(() => {
    const multiplayer = (window as Window & { multiplayer?: { connectedPeerCount: () => number } }).multiplayer;
    return multiplayer?.connectedPeerCount() ?? 0;
  })).toBe(1);
  await expect.poll(async () => b.evaluate(() => {
    const multiplayer = (window as Window & { multiplayer?: { connectedPeerCount: () => number } }).multiplayer;
    return multiplayer?.connectedPeerCount() ?? 0;
  })).toBe(1);

  const bId = await b.evaluate(() => {
    const game = (window as Window & { game?: { localId: string } }).game!;
    return game.localId;
  });

  await a.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; direction: number; ammo: number };
    } }).game!;
    game.localPlayer.x = 120;
    game.localPlayer.y = 120;
    game.localPlayer.direction = 1;
    game.localPlayer.ammo = 75;
  });
  await b.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; direction: number; hp: number; deaths: number };
    } }).game!;
    game.localPlayer.x = 172;
    game.localPlayer.y = 120;
    game.localPlayer.direction = 3;
    game.localPlayer.hp = 20;
    game.localPlayer.deaths = 0;
  });

  await a.waitForTimeout(450);
  await a.keyboard.press('Space');

  await expect.poll(async () => b.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { hp: number; deaths: number; ammo: number } } }).game!;
    return game.localPlayer;
  })).toMatchObject({ hp: 100, deaths: 1, ammo: 75 });

  await expect.poll(async () => a.evaluate((remoteId) => {
    const game = (window as Window & { game?: { players: Map<string, { hp: number; deaths: number }> } }).game!;
    return game.players.get(remoteId);
  }, bId)).toMatchObject({ hp: 100, deaths: 1 });

  await context.close();
});

test('respawn skips a spawner occupied by another player and uses the next one', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; hp: number };
      level: { entities: unknown[]; spawners: unknown[] };
      upsertRemotePlayer: (state: unknown) => void;
    } }).game!;
    game.level.entities = [];
    const spawner = (x: number, y: number) => ({ kind: 'spawner-red', x, y, solid: false, health: Number.POSITIVE_INFINITY, maxHealth: Number.POSITIVE_INFINITY, removed: false });
    game.level.spawners = [spawner(120, 480), spawner(300, 480)];
    game.upsertRemotePlayer({
      id: 'spawn-camper',
      x: 120,
      y: 480,
      hp: 100,
      ammo: 75,
      direction: 0,
      moving: false,
      shooting: false,
      kills: 0,
      deaths: 0,
      name: 'Camper',
    });
    game.localPlayer.x = 180;
    game.localPlayer.y = 180;
    game.localPlayer.hp = 10;
  });

  await page.keyboard.press('KeyZ');

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { x: number; y: number; hp: number } } }).game!;
    return { x: game.localPlayer.x, y: game.localPlayer.y, hp: game.localPlayer.hp };
  })).toEqual({ x: 300, y: 480, hp: 100 });
});

test('respawn picks nearest free space when every spawner is occupied', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; hp: number };
      level: { entities: unknown[]; spawners: unknown[] };
      upsertRemotePlayer: (state: unknown) => void;
    } }).game!;
    game.level.entities = [];
    game.level.spawners = [{ kind: 'spawner-red', x: 120, y: 480, solid: false, health: Number.POSITIVE_INFINITY, maxHealth: Number.POSITIVE_INFINITY, removed: false }];
    game.upsertRemotePlayer({
      id: 'spawn-camper',
      x: 120,
      y: 480,
      hp: 100,
      ammo: 75,
      direction: 0,
      moving: false,
      shooting: false,
      kills: 0,
      deaths: 0,
      name: 'Camper',
    });
    game.localPlayer.x = 180;
    game.localPlayer.y = 180;
    game.localPlayer.hp = 10;
  });

  await page.keyboard.press('KeyZ');

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: {
      localId: string;
      localPlayer: { x: number; y: number; hp: number };
      players: Map<string, { x: number; y: number }>;
    } }).game!;
    const local = game.localPlayer;
    const overlapsAnyone = [...game.players.entries()].some(([id, other]) => id !== game.localId
      && local.x < other.x + 26 && local.x + 26 > other.x && local.y < other.y + 27 && local.y + 27 > other.y);
    const distance = Math.hypot(local.x - 120, local.y - 480);
    return { hp: local.hp, overlapsAnyone, nearSpawner: distance > 0 && distance <= 45 };
  })).toEqual({ hp: 100, overlapsAnyone: false, nearSpawner: true });
});

test('respawn waits for remote positions and avoids a spawner claimed meanwhile', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; hp: number };
      level: { entities: unknown[]; spawners: unknown[] };
    } }).game!;
    game.level.entities = [];
    const spawner = (x: number, y: number) => ({ kind: 'spawner-red', x, y, solid: false, health: Number.POSITIVE_INFINITY, maxHealth: Number.POSITIVE_INFINITY, removed: false });
    game.level.spawners = [spawner(120, 480), spawner(300, 480)];
    game.localPlayer.x = 180;
    game.localPlayer.y = 180;
    game.localPlayer.hp = 10;
  });

  await page.keyboard.press('KeyZ');

  // The kill leaves the player dead in place instead of respawning instantly.
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { x: number; y: number; hp: number } } }).game!;
    return { x: game.localPlayer.x, y: game.localPlayer.y, hp: game.localPlayer.hp };
  })).toEqual({ x: 180, y: 180, hp: 0 });

  // A remote update arrives after the death (network latency): someone now camps spawner 0.
  await page.evaluate(() => {
    const game = (window as Window & { game?: { upsertRemotePlayer: (state: unknown) => void } }).game!;
    game.upsertRemotePlayer({
      id: 'late-camper',
      x: 120,
      y: 480,
      hp: 100,
      ammo: 75,
      direction: 0,
      moving: false,
      shooting: false,
      kills: 0,
      deaths: 0,
      name: 'Camper',
    });
  });

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: { localPlayer: { x: number; y: number; hp: number } } }).game!;
    return { x: game.localPlayer.x, y: game.localPlayer.y, hp: game.localPlayer.hp };
  }), { timeout: 10_000 }).toEqual({ x: 300, y: 480, hp: 100 });
});

test('joining player relocates when late remote positions reveal an occupied spawn', async ({ page }) => {
  await page.goto(playUrl('/?sound=off'));
  // The local player spawned at spawners[0] knowing nothing about other players.
  // Now the first remote update arrives: an established player stands exactly there.
  await page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number };
      level: { spawners: Array<{ x: number; y: number }> };
      upsertRemotePlayer: (state: unknown) => void;
    } }).game!;
    const spawn = game.level.spawners[0];
    game.upsertRemotePlayer({
      id: 'earlier-player',
      x: spawn.x,
      y: spawn.y,
      hp: 100,
      ammo: 75,
      direction: 0,
      moving: false,
      shooting: false,
      kills: 0,
      deaths: 0,
      name: 'Veteran',
    });
  });

  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { game?: {
      localPlayer: { x: number; y: number; hp: number };
      players: Map<string, { x: number; y: number }>;
    } }).game!;
    const local = game.localPlayer;
    const other = game.players.get('earlier-player')!;
    const overlaps = local.x < other.x + 26 && local.x + 26 > other.x && local.y < other.y + 27 && local.y + 27 > other.y;
    return { overlaps, hp: local.hp };
  })).toEqual({ overlaps: false, hp: 100 });
});
