import { expect, test } from '@playwright/test';

interface EditorWindow {
  editor?: {
    active: boolean;
    editor: {
      name: string;
      mode: string;
      brushIndex: number;
      saved: boolean;
      symmetryX: number;
      selectionX: number;
      selectionY: number;
      cells: { width: number; height: number };
      tileAt: (x: number, y: number) => string;
      entityAt: (x: number, y: number) => string | null;
    } | null;
  };
  menu?: { active: boolean; screen: string; selected: number };
  game?: { levelSummary: () => { tiles: number; spawners: number } };
}

async function openCreateForm(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as EditorWindow).menu?.active)).toBe(true);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as EditorWindow).menu?.screen)).toBe('map-editor');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as EditorWindow).menu?.screen)).toBe('map-editor-create');
}

async function createMap(page: import('@playwright/test').Page, name: string): Promise<void> {
  await openCreateForm(page);
  await page.keyboard.type(name);
  await page.keyboard.press('Tab');
  for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as EditorWindow).editor?.active)).toBe(true);
}

async function moveTo(page: import('@playwright/test').Page, x: number, y: number): Promise<void> {
  for (let i = 0; i < x; i += 1) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < y; i += 1) await page.keyboard.press('ArrowDown');
}

test('create map form opens the editor with the chosen settings', async ({ page }) => {
  await createMap(page, 'mymap');
  const state = await page.evaluate(() => {
    const editor = (window as EditorWindow).editor!.editor!;
    return {
      name: editor.name,
      mode: editor.mode,
      width: editor.cells.width,
      height: editor.cells.height,
      fill: editor.tileAt(10, 10),
      borderEntity: editor.entityAt(6, 10),
      menuActive: (window as EditorWindow).menu?.active,
    };
  });
  expect(state).toEqual({ name: 'mymap', mode: 'dm', width: 20, height: 20, fill: 'gravel', borderEntity: 'metal', menuActive: false });
});

test('map title typing works on non-latin keyboard layouts', async ({ page }) => {
  await openCreateForm(page);
  const title = await page.evaluate(() => {
    // Ukrainian layout: physical KeyM/KeyA/KeyP produce Cyrillic key values.
    const type = (key: string, code: string, shift = false) =>
      window.dispatchEvent(new KeyboardEvent('keydown', { key, code, shiftKey: shift, bubbles: true, cancelable: true }));
    type('ь', 'KeyM');
    type('ф', 'KeyA');
    type('з', 'KeyP');
    type('_', 'Minus', true);
    type('1', 'Digit1');
    return (window as EditorWindow & { menu?: { createForm?: { title: string } } }).menu?.createForm?.title;
  });
  expect(title).toBe('map_1');
});

test('painting, undo and redo work like the desktop editor', async ({ page }) => {
  await createMap(page, 'paint');
  await moveTo(page, 7, 7);
  await page.keyboard.press('Digit1');
  await expect.poll(() => page.evaluate(() => (window as EditorWindow).editor?.editor?.brushIndex)).toBe(0);
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => (window as EditorWindow).editor?.editor?.entityAt(7, 7))).toBe('wall');
  await page.keyboard.press('Control+KeyZ');
  await expect.poll(() => page.evaluate(() => (window as EditorWindow).editor?.editor?.entityAt(7, 7))).toBe(null);
  await page.keyboard.press('Control+KeyY');
  await expect.poll(() => page.evaluate(() => (window as EditorWindow).editor?.editor?.entityAt(7, 7))).toBe('wall');
});

test('vertical symmetry mirrors painted cells', async ({ page }) => {
  await createMap(page, 'mirror');
  await moveTo(page, 10, 8);
  await page.keyboard.press('F1');
  await expect.poll(() => page.evaluate(() => (window as EditorWindow).editor?.editor?.symmetryX)).toBe(10);
  await page.keyboard.press('Digit1');
  await page.keyboard.press('Space');
  const cells = await page.evaluate(() => {
    const editor = (window as EditorWindow).editor!.editor!;
    return { painted: editor.entityAt(10, 8), mirrored: editor.entityAt(9, 8) };
  });
  expect(cells).toEqual({ painted: 'wall', mirrored: 'wall' });
});

test('flag brushes are locked outside capture the flag mode', async ({ page }) => {
  await createMap(page, 'noflags');
  await page.keyboard.press('Digit7');
  await expect.poll(() => page.evaluate(() => (window as EditorWindow).editor?.editor?.brushIndex)).toBe(1);
  await page.keyboard.press('Digit9');
  await expect.poll(() => page.evaluate(() => (window as EditorWindow).editor?.editor?.brushIndex)).toBe(8);
});

test('repainting a flag moves it instead of duplicating or bouncing back', async ({ page }) => {
  await openCreateForm(page);
  await page.keyboard.type('flags');
  await page.keyboard.press('Tab');
  for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as EditorWindow).editor?.editor?.mode)).toBe('ctf');

  await moveTo(page, 8, 8);
  await page.keyboard.press('Digit7');
  await page.keyboard.press('Space');
  await moveTo(page, 3, 0);
  await page.keyboard.press('Space');
  const flags = await page.evaluate(() => {
    const editor = (window as EditorWindow).editor!.editor!;
    const found: Array<[string, number, number]> = [];
    for (let y = 0; y < editor.cells.height; y += 1) {
      for (let x = 0; x < editor.cells.width; x += 1) {
        const entity = editor.entityAt(x, y);
        if (entity === 'flag-red') found.push([entity, x, y]);
      }
    }
    return found;
  });
  expect(flags).toEqual([['flag-red', 11, 8]]);
});

test('saving requires a spawner, persists to browser storage and the map is playable', async ({ page }) => {
  await createMap(page, 'arena');
  await page.keyboard.press('Control+KeyS');
  const refused = await page.evaluate(() => ({
    saved: (window as EditorWindow).editor?.editor?.saved,
    stored: localStorage.getItem('rmm-map:dm:arena') !== null,
  }));
  expect(refused).toEqual({ saved: false, stored: false });

  await moveTo(page, 7, 7);
  await page.keyboard.press('Digit9');
  await page.keyboard.press('Space');
  await page.keyboard.press('Control+KeyS');
  const saved = await page.evaluate(() => ({
    saved: (window as EditorWindow).editor?.editor?.saved,
    stored: localStorage.getItem('rmm-map:dm:arena') !== null,
    index: localStorage.getItem('rmm-maps'),
  }));
  expect(saved.saved).toBe(true);
  expect(saved.stored).toBe(true);
  expect(saved.index).toContain('arena');

  await page.goto(`/?play=1&mode=dm&level=${encodeURIComponent('local:dm/arena')}`);
  await expect.poll(() => page.evaluate(() => (window as EditorWindow).game?.levelSummary().spawners)).toBe(1);
  const tiles = await page.evaluate(() => (window as EditorWindow).game?.levelSummary().tiles);
  expect(tiles).toBe(400);
});

test('escape asks to save before exiting back to the menu', async ({ page }) => {
  await createMap(page, 'quitter');
  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as EditorWindow).editor?.active)).toBe(false);
  await expect.poll(() => page.evaluate(() => {
    const menu = (window as EditorWindow).menu;
    return menu && menu.active && menu.screen === 'main';
  })).toBe(true);
});

test('bundled maps open in the editor from the open map screen', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as EditorWindow).menu?.active)).toBe(true);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as EditorWindow).menu?.screen)).toBe('map-editor-open');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as EditorWindow).editor?.active)).toBe(true);
  const state = await page.evaluate(() => {
    const editor = (window as EditorWindow).editor!.editor!;
    return { name: editor.name, mode: editor.mode, width: editor.cells.width };
  });
  expect(state.name).toBe('BARRICADES');
  expect(state.mode).toBe('dm');
  expect(state.width).toBeGreaterThanOrEqual(20);
});

test('rmm codec round-trips every bundled level byte for byte', async ({ page }) => {
  await page.goto('/');
  const results = await page.evaluate(async () => {
    const modulePath = '/src/editor.ts';
    const { decodeEditorCells, encodeEditorCells } = (await import(modulePath)) as typeof import('../src/editor');
    const paths = [
      '/levels/dm/BARRICADES.rmm', '/levels/dm/borderless.rmm', '/levels/dm/compli.rmm', '/levels/dm/destro.rmm',
      '/levels/dm/gauss.rmm', '/levels/dm/open.rmm', '/levels/dm/warehouses.rmm',
      '/levels/tdm/vertical.rmm',
      '/levels/ctf/IMAGINATION.rmm', '/levels/ctf/MAXIMUM.rmm', '/levels/ctf/struggel.rmm',
    ];
    const mismatches: string[] = [];
    for (const path of paths) {
      const original = new Uint8Array(await (await fetch(path)).arrayBuffer());
      const encoded = new Uint8Array(encodeEditorCells(decodeEditorCells(original.buffer)).buffer);
      if (original.length !== encoded.length) {
        mismatches.push(`${path}: length ${original.length} vs ${encoded.length}`);
        continue;
      }
      for (let i = 0; i < original.length; i += 1) {
        if (original[i] !== encoded[i]) {
          mismatches.push(`${path}: byte ${i} ${original[i]} vs ${encoded[i]}`);
          break;
        }
      }
    }
    return mismatches;
  });
  expect(results).toEqual([]);
});
