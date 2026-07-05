import { Assets, writeFont } from './assets';
import { EditorHost, EditorMode, FILL_TILES, MAX_MAP_NAME, MAX_MAP_SIZE, MIN_MAP_SIZE, MODE_SPRITES, inferModeFromBuffer } from './editor';
import type { Game } from './game';
import { createThumbnail } from './level';
import { listLocalMaps, loadGameStats, loadLocalMap, localMapPath, saveGameSettings } from './storage';
import type { Team } from './types';

const MENU_ITEMS = ['create game', 'join game', 'map editor', 'settings', 'how to play', 'credits', 'quit'];
const MODE_ITEMS = ['deathmatch', 'team deathmatch', 'capture the flag'];
const MAP_EDITOR_ITEMS = ['Create map', 'Open map', 'Download map', 'How to use'];
const TEAM_ITEMS: Team[] = ['red', 'blu'];
const MODE_KEYS = ['dm', 'tdm', 'ctf'];
const MODE_NUMBERS: Record<string, number> = { dm: 1, tdm: 2, ctf: 3 };
const LEVEL_NAMES: Record<string, string[]> = {
  dm: ['BARRICADES', 'borderless', 'compli', 'destro', 'gauss', 'open', 'warehouses'],
  tdm: ['vertical'],
  ctf: ['IMAGINATION', 'MAXIMUM', 'struggel'],
};
const GRID_X = 100;
const GRID_Y = 60;
const GRID_COLUMNS = 4;
const GRID_ITEM_SIZE = 100;
const GRID_MARGIN = 5;
const GRID_BORDER = 3;
const HELP_LINES = [
  'use wasd or arrows to move, and break or space to shoot.',
  'to show up statistics, press tab during game.',
  '',
  'in deathmatch mode, you are to kill everything moveable.',
  'in teamdeathmatch mode, your team is to kill everything moveable.',
  'and in capture the flag mode, you team must sneak more hostile',
  'flags than enemies do in 5 minutes.',
  '',
  "isn't that easy?",
];
const CREDIT_LINES = [
  'dedicated to java.',
  '',
  'andrey podkolzin - network, map editor',
  'alexey - the code',
  'stanislav matviychuck - graphics',
];
const MAP_EDITOR_HELP_LINES = [
  'arrows or wasd to move.',
  'shift for multiple selection.',
  'Ctrl+C, Ctrl+V, Ctrl+X to copy, paste and cut, accordingly.',
  'Ctrl+Z, Ctrl+Y to undo and redo.',
  'M to activate minimap.',
  'Q to preview the whole level.',
  'Ctrl+S to save.',
  'F1 and F2 to activate the lines of',
  'vertical and horizontal symmetry, accordingly.',
  'F3 to deactivate the lines of symmetry.',
  '',
  'maps are saved in your browser and appear in create game.',
  '',
  "isn't that easy?",
];
const CREATE_FORM_LABELS = ['title: ', 'base: ', 'mode: ', 'width: ', 'height: '];
const SETTINGS_OPTIONS_Y = [60, 175, 195];
const DIMENSIONS: Array<[number, number]> = [[640, 480], [800, 600], [960, 600]];
const MAX_PLAYER_NAME = 16;
type MenuScreen = 'main' | 'mode' | 'level' | 'join' | 'join-code' | 'team' | 'pause' | 'help' | 'credits' | 'settings'
  | 'map-editor' | 'map-editor-help' | 'map-editor-create' | 'map-editor-open' | 'map-editor-download';

interface RoomListItem {
  room: string;
  players: number;
  mode: string;
  level: string;
}

interface LevelGridItem {
  name: string;
  path: string;
  thumbnail?: HTMLCanvasElement;
}

interface MapGridItem {
  mode: string;
  name: string;
  source: 'local' | 'bundled';
  thumbnail?: HTMLCanvasElement;
}

interface CreateFormState {
  title: string;
  base: number;
  mode: number;
  width: number;
  height: number;
  focus: number;
}

export class MainMenu {
  selected = 0;
  active: boolean;
  screen: MenuScreen;
  settingsOption = 0;
  private levelMode = 'dm';
  private levelItems: LevelGridItem[] = [];
  private joinCode = '';
  private mapItems: MapGridItem[] = [];
  private createForm: CreateFormState = { title: '', base: 0, mode: 0, width: MIN_MAP_SIZE, height: MIN_MAP_SIZE, focus: 0 };
  private joinRooms: RoomListItem[] = [];
  private joinStatus: 'loading' | 'ready' | 'error' = 'loading';

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ctx: CanvasRenderingContext2D,
    private readonly assets: Assets,
    private readonly game: Game,
    initialActive: boolean,
    private readonly mode = 'dm',
    private readonly editorHost?: EditorHost,
  ) {
    this.screen = initialActive ? 'main' : needsTeam(mode, game.localPlayer.team) ? 'team' : 'main';
    this.active = initialActive || this.screen === 'team';
    window.addEventListener('keydown', (event) => this.onKey(event));
  }

  render(): void {
    const { ctx } = this;
    ctx.imageSmoothingEnabled = false;
    if (this.screen === 'pause') {
      this.game.render();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.69)';
    } else {
      ctx.fillStyle = 'rgb(0, 0, 0)';
    }
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const title = this.title();
    if (this.screen === 'help' || this.screen === 'credits' || this.screen === 'map-editor-help') {
      writeCentered(ctx, this.assets, title, 2, 20, this.canvas.width);
      this.renderTextLines(this.textLines());
      if (this.screen === 'map-editor-help') writeCentered(ctx, this.assets, 'press esc to return', 1, this.canvas.height - 20, this.canvas.width);
      return;
    }
    if (this.screen === 'settings') {
      writeCentered(ctx, this.assets, title, 2, 20, this.canvas.width);
      this.renderSettings();
      return;
    }
    if (this.screen === 'level') {
      writeCentered(ctx, this.assets, title, 2, 28, this.canvas.width);
      writeFont(ctx, this.assets, `mode ${MODE_NUMBERS[this.levelMode]}`, 1, 10, 10);
      writeFont(ctx, this.assets, `levels ${this.levelItems.length}`, 1, 10, 20);
      this.renderLevelGrid();
      return;
    }
    if (this.screen === 'map-editor-create') {
      writeCentered(ctx, this.assets, title, 2, 28, this.canvas.width);
      this.renderCreateForm();
      return;
    }
    if (this.screen === 'map-editor-open' || this.screen === 'map-editor-download') {
      writeCentered(ctx, this.assets, title, 2, 28, this.canvas.width);
      this.renderMapGrid();
      const action = this.screen === 'map-editor-open' ? 'enter to open / f to import a file' : 'enter to download';
      writeCentered(ctx, this.assets, `${action} / esc to back`, 1, this.canvas.height - 20, this.canvas.width);
      return;
    }
    if (this.screen === 'join') {
      writeCentered(ctx, this.assets, title, 2, 28, this.canvas.width);
      this.renderRoomList();
      writeCentered(ctx, this.assets, 'enter to join / c to enter a code / r to refresh / esc to back', 1, this.canvas.height - 20, this.canvas.width);
      return;
    }
    if (this.screen === 'join-code') {
      writeCentered(ctx, this.assets, title, 2, 28, this.canvas.width);
      writeCentered(ctx, this.assets, `enter room: ${this.joinCode}-`, 1, 60, this.canvas.width);
      return;
    }

    const items = this.items();
    writeCentered(ctx, this.assets, title, 2, 28, this.canvas.width);

    if (this.screen === 'pause') {
      const room = new URLSearchParams(location.search).get('room');
      if (room) writeCentered(ctx, this.assets, `room ${room}`, 1, 46, this.canvas.width);
    }

    for (let i = 0; i < items.length; i += 1) {
      const label = i === this.selected ? `> ${items[i]} <` : items[i];
      writeCentered(ctx, this.assets, label, 2, 60 + i * 20, this.canvas.width);
    }
  }

  private onKey(event: KeyboardEvent): void {
    if (this.editorHost && (this.editorHost.active || this.editorHost.handledEvent === event)) return;
    if (!this.active && event.code === 'Escape') {
      this.openPause();
      event.preventDefault();
      return;
    }
    if (!this.active) return;
    if (this.screen === 'help' || this.screen === 'credits') {
      if (event.code === 'Escape') {
        this.screen = 'main';
        this.selected = 0;
        event.preventDefault();
      }
      return;
    }
    if (this.screen === 'map-editor-help') {
      if (event.code === 'Escape') {
        this.screen = 'map-editor';
        this.selected = 3;
        event.preventDefault();
      }
      return;
    }
    if (this.screen === 'settings') {
      this.onSettingsKey(event);
      return;
    }
    if (this.screen === 'level') {
      this.onLevelKey(event);
      return;
    }
    if (this.screen === 'map-editor-create') {
      this.onCreateFormKey(event);
      return;
    }
    if (this.screen === 'map-editor-open' || this.screen === 'map-editor-download') {
      this.onMapGridKey(event);
      return;
    }
    if (this.screen === 'join') {
      this.onJoinListKey(event);
      return;
    }
    if (this.screen === 'join-code') {
      this.onJoinCodeKey(event);
      return;
    }
    const items = this.items();
    if (event.code === 'Escape') {
      if (this.screen === 'pause') this.active = false;
      else if (this.screen === 'mode') {
        this.screen = 'main';
        this.selected = 0;
      } else if (this.screen === 'map-editor') {
        this.screen = 'main';
        this.selected = 0;
      }
      event.preventDefault();
    } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
      this.selected = (this.selected + 1) % items.length;
      event.preventDefault();
    } else if (event.code === 'ArrowUp' || event.code === 'KeyW') {
      this.selected = (this.selected + items.length - 1) % items.length;
      event.preventDefault();
    } else if (event.code === 'Enter' || event.code === 'Space') {
      this.choose();
      event.preventDefault();
    }
  }

  private items(): string[] {
    if (this.screen === 'mode') return MODE_ITEMS;
    if (this.screen === 'map-editor') return MAP_EDITOR_ITEMS;
    if (this.screen === 'team') return TEAM_ITEMS;
    if (this.screen === 'pause') return this.mode === 'dm' ? ['continue', 'disconnect', 'quit game'] : ['continue', 'change team', 'disconnect', 'quit game'];
    return MENU_ITEMS;
  }

  private choose(): void {
    if (this.screen === 'pause') {
      if (this.selected === 0) {
        this.active = false;
      } else if (this.mode !== 'dm' && this.selected === 1) {
        this.screen = 'team';
        this.selected = 0;
      } else {
        this.screen = 'main';
        this.selected = 0;
      }
      return;
    }

    if (this.screen === 'main') {
      if (this.selected === 0) {
        this.screen = 'mode';
        this.selected = 0;
      } else if (this.selected === 1) {
        this.openJoinList();
      } else if (this.selected === 2) {
        this.screen = 'map-editor';
        this.selected = 0;
      } else if (this.selected === 4) {
        this.screen = 'help';
      } else if (this.selected === 5) {
        this.screen = 'credits';
      } else if (this.selected === 3) {
        this.screen = 'settings';
      } else {
        window.close();
        // window.close() is ignored for tabs the user opened; leave the game either way.
        location.href = 'about:blank';
      }
      return;
    }

    if (this.screen === 'map-editor') {
      if (this.selected === 0) {
        this.createForm = { title: '', base: 0, mode: 0, width: MIN_MAP_SIZE, height: MIN_MAP_SIZE, focus: 0 };
        this.screen = 'map-editor-create';
      } else if (this.selected === 1) {
        this.openMapGrid('map-editor-open');
      } else if (this.selected === 2) {
        this.openMapGrid('map-editor-download');
      } else if (this.selected === 3) {
        this.screen = 'map-editor-help';
      }
      return;
    }

    if (this.screen === 'mode') {
      this.openLevelSelect(MODE_KEYS[this.selected]);
      return;
    }

    this.game.localPlayer.team = TEAM_ITEMS[this.selected];
    this.active = false;
  }

  private openPause(): void {
    this.screen = 'pause';
    this.selected = 0;
    this.active = true;
  }

  private openLevelSelect(mode: string): void {
    this.levelMode = mode;
    this.levelItems = (LEVEL_NAMES[mode] ?? []).map((name) => ({ name, path: `/levels/${mode}/${name}.rmm` }));
    for (const info of listLocalMaps(mode)) {
      const item: LevelGridItem = { name: `${info.name}+`, path: localMapPath(info.mode, info.name) };
      const buffer = loadLocalMap(info.mode, info.name);
      if (buffer) item.thumbnail = createThumbnail(buffer);
      this.levelItems.push(item);
    }
    this.screen = 'level';
    this.selected = 0;
    for (const item of this.levelItems) {
      if (item.thumbnail || !item.path.startsWith('/')) continue;
      void fetch(item.path)
        .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(`Failed to load ${item.path}`))))
        .then((buffer) => {
          item.thumbnail = createThumbnail(buffer);
        })
        .catch(() => {});
    }
  }

  private onLevelKey(event: KeyboardEvent): void {
    const count = this.levelItems.length;
    if (event.code === 'Escape') {
      this.screen = 'mode';
      this.selected = Math.max(0, MODE_KEYS.indexOf(this.levelMode));
      event.preventDefault();
      return;
    }
    if ((event.code === 'Enter' || event.code === 'Space') && count > 0) {
      this.startLevel(this.levelItems[this.selected]);
      event.preventDefault();
      return;
    }
    if (count === 0) return;
    let moveToLast = false;
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') this.selected -= 1;
    else if (event.code === 'ArrowRight' || event.code === 'KeyD') this.selected += 1;
    else if (event.code === 'ArrowUp' || event.code === 'KeyW') this.selected -= GRID_COLUMNS;
    else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
      this.selected += GRID_COLUMNS;
      moveToLast = true;
    } else return;
    if (this.selected < 0) this.selected += count;
    if (this.selected >= count) this.selected = moveToLast ? count - 1 : this.selected - count;
    event.preventDefault();
  }

  private startLevel(item: LevelGridItem): void {
    const params = new URLSearchParams(location.search);
    params.set('play', '1');
    params.set('mode', this.levelMode);
    params.set('level', item.path);
    if (!params.get('room')) params.set('room', generateRoomCode());
    location.search = params.toString();
  }

  private openJoinList(): void {
    this.screen = 'join';
    this.selected = 0;
    this.joinRooms = [];
    this.joinStatus = 'loading';
    void fetch('/rooms')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Failed to load rooms'))))
      .then((data: { rooms?: RoomListItem[] }) => {
        this.joinRooms = data.rooms ?? [];
        this.joinStatus = 'ready';
        this.selected = 0;
      })
      .catch(() => {
        this.joinStatus = 'error';
      });
  }

  private onJoinListKey(event: KeyboardEvent): void {
    const { code } = event;
    if (code === 'Escape') {
      this.screen = 'main';
      this.selected = 1;
    } else if (code === 'KeyC') {
      this.screen = 'join-code';
      this.joinCode = '';
    } else if (code === 'KeyR') {
      this.openJoinList();
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      if (this.joinRooms.length > 0) this.selected = (this.selected + 1) % this.joinRooms.length;
    } else if (code === 'ArrowUp' || code === 'KeyW') {
      if (this.joinRooms.length > 0) this.selected = (this.selected + this.joinRooms.length - 1) % this.joinRooms.length;
    } else if (code === 'Enter' || code === 'Space') {
      const room = this.joinRooms[this.selected];
      if (room) this.joinRoom(room.room, room);
    } else {
      return;
    }
    event.preventDefault();
  }

  private onJoinCodeKey(event: KeyboardEvent): void {
    if (event.code === 'Escape') {
      this.openJoinList();
    } else if (event.code === 'Enter') {
      if (this.joinCode.length > 0) this.joinRoom(this.joinCode);
    } else if (event.code === 'Backspace') {
      this.joinCode = this.joinCode.slice(0, -1);
    } else if (this.joinCode.length < 15) {
      const char = titleCharForKey(event);
      if (char && char !== '_') this.joinCode += char;
    }
    event.preventDefault();
  }

  private joinRoom(room: string, meta?: RoomListItem): void {
    const params = new URLSearchParams(location.search);
    params.set('room', room);
    params.set('play', '1');
    if (meta) {
      params.set('mode', meta.mode);
      if (meta.level) params.set('level', meta.level);
    }
    location.search = params.toString();
  }

  private renderRoomList(): void {
    const { ctx, assets } = this;
    if (this.joinStatus === 'loading') {
      writeCentered(ctx, assets, 'looking for rooms...', 1, 60, this.canvas.width);
      return;
    }
    if (this.joinStatus === 'error') {
      writeCentered(ctx, assets, 'room list is unavailable', 1, 60, this.canvas.width);
      writeCentered(ctx, assets, 'press c to join with a room code', 1, 75, this.canvas.width);
      return;
    }
    if (this.joinRooms.length === 0) {
      writeCentered(ctx, assets, 'no open rooms found', 1, 60, this.canvas.width);
      writeCentered(ctx, assets, 'press r to refresh or c to join with a code', 1, 75, this.canvas.width);
      return;
    }
    writeCentered(ctx, assets, `room          players  mode  level`, 1, 55, this.canvas.width);
    for (let i = 0; i < this.joinRooms.length; i += 1) {
      const room = this.joinRooms[i];
      const line = `${room.room.padEnd(12)}  ${String(room.players).padEnd(7)}  ${room.mode.padEnd(4)}  ${levelDisplayName(room.level)}`;
      const label = i === this.selected ? `> ${line} <` : `  ${line}  `;
      writeCentered(ctx, assets, label, 1, 75 + i * 15, this.canvas.width);
    }
  }

  private onSettingsKey(event: KeyboardEvent): void {
    const { code } = event;
    if (code === 'Escape') {
      saveGameSettings({ name: this.game.localPlayer.name, width: this.canvas.width, height: this.canvas.height });
      this.screen = 'main';
      this.selected = 0;
    } else if (code === 'Tab') {
      this.settingsOption = (this.settingsOption + 1) % SETTINGS_OPTIONS_Y.length;
    } else if (this.settingsOption === 1 && (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'ArrowUp' || code === 'ArrowDown')) {
      const delta = code === 'ArrowLeft' || code === 'ArrowDown' ? -1 : 1;
      const current = DIMENSIONS.findIndex(([w, h]) => w === this.canvas.width && h === this.canvas.height);
      const next = DIMENSIONS[((current < 0 ? DIMENSIONS.length - 1 : current) + delta + DIMENSIONS.length) % DIMENSIONS.length];
      resizeCanvas(this.canvas, next[0], next[1]);
    } else if (this.settingsOption === 2 && code === 'Backspace') {
      this.game.localPlayer.name = this.game.localPlayer.name.slice(0, -1);
    } else if (this.settingsOption === 2 && this.game.localPlayer.name.length < MAX_PLAYER_NAME) {
      const char = titleCharForKey(event);
      if (char) this.game.localPlayer.name += char;
    } else {
      return;
    }
    event.preventDefault();
  }

  private onCreateFormKey(event: KeyboardEvent): void {
    const form = this.createForm;
    const { code } = event;
    if (code === 'Escape') {
      this.screen = 'map-editor';
      this.selected = 0;
    } else if (code === 'Tab') {
      form.focus = (form.focus + 1) % CREATE_FORM_LABELS.length;
    } else if (code === 'Enter') {
      if (form.title.length > 0 && this.editorHost) {
        this.editorHost.create({
          name: form.title,
          fillTile: form.base,
          mode: MODE_KEYS[form.mode] as EditorMode,
          width: form.width,
          height: form.height,
        });
        this.active = false;
        this.screen = 'main';
        this.selected = 0;
      }
    } else if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'ArrowUp' || code === 'ArrowDown') {
      const delta = code === 'ArrowLeft' || code === 'ArrowDown' ? -1 : 1;
      if (form.focus === 1) form.base = (form.base + delta + FILL_TILES.length) % FILL_TILES.length;
      else if (form.focus === 2) form.mode = (form.mode + delta + MODE_SPRITES.length) % MODE_SPRITES.length;
      else if (form.focus === 3) form.width = clampSize(form.width + delta);
      else if (form.focus === 4) form.height = clampSize(form.height + delta);
    } else if (form.focus === 0 && code === 'Backspace') {
      form.title = form.title.slice(0, -1);
    } else if (form.focus === 0 && form.title.length < MAX_MAP_NAME) {
      const char = titleCharForKey(event);
      if (char) form.title += char;
    }
    event.preventDefault();
  }

  private renderCreateForm(): void {
    const { ctx, assets } = this;
    const form = this.createForm;
    const labelX = Math.round((this.canvas.width - 300) / 2);
    const valueX = labelX + 'height: '.length * 16 + 20;
    const startY = Math.round((this.canvas.height - 240) / 2);
    for (let i = 0; i < CREATE_FORM_LABELS.length; i += 1) {
      const y = startY + i * 40;
      writeFont(ctx, assets, CREATE_FORM_LABELS[i], 2, labelX, y);
      if (form.focus === i) writeFont(ctx, assets, '>', 2, labelX - 25, y);
    }
    writeFont(ctx, assets, form.title + (form.focus === 0 ? '-' : ''), 2, valueX, startY);
    for (let i = 0; i < FILL_TILES.length; i += 1) {
      const [sx, sy] = FILL_TILES[i];
      if (i === form.base) {
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.fillRect(valueX + i * 35 - 2, startY + 40 - 9, 34, 34);
      }
      assets.graphics.draw(ctx, sx, sy, valueX + i * 35, startY + 40 - 7);
    }
    for (let i = 0; i < MODE_SPRITES.length; i += 1) {
      const [sx, sy] = MODE_SPRITES[i];
      if (i === form.mode) {
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.fillRect(valueX + i * 35 - 2, startY + 80 - 9, 34, 34);
      }
      assets.graphics.draw(ctx, sx, sy, valueX + i * 35, startY + 80 - 7);
    }
    writeFont(ctx, assets, `${form.width}`, 2, valueX, startY + 120);
    writeFont(ctx, assets, `${form.height}`, 2, valueX, startY + 160);
    writeCentered(ctx, assets, 'tab to switch, arrows to change, enter to create, esc to back', 1, this.canvas.height - 20, this.canvas.width);
  }

  private openMapGrid(screen: 'map-editor-open' | 'map-editor-download'): void {
    this.mapItems = [];
    for (const info of listLocalMaps()) {
      this.mapItems.push({ mode: info.mode, name: info.name, source: 'local' });
    }
    for (const mode of MODE_KEYS) {
      for (const name of LEVEL_NAMES[mode] ?? []) {
        if (!this.mapItems.some((item) => item.mode === mode && item.name === name)) {
          this.mapItems.push({ mode, name, source: 'bundled' });
        }
      }
    }
    this.screen = screen;
    this.selected = 0;
    for (const item of this.mapItems) {
      void this.mapBuffer(item)
        .then((buffer) => {
          item.thumbnail = createThumbnail(buffer);
        })
        .catch(() => {});
    }
  }

  private async mapBuffer(item: MapGridItem): Promise<ArrayBuffer> {
    if (item.source === 'local') {
      const buffer = loadLocalMap(item.mode, item.name);
      if (!buffer) throw new Error(`Missing local map ${item.mode}/${item.name}`);
      return buffer;
    }
    const response = await fetch(`/levels/${item.mode}/${item.name}.rmm`);
    if (!response.ok) throw new Error(`Failed to load ${item.mode}/${item.name}`);
    return response.arrayBuffer();
  }

  private onMapGridKey(event: KeyboardEvent): void {
    const count = this.mapItems.length;
    if (event.code === 'Escape') {
      this.selected = this.screen === 'map-editor-open' ? 1 : 2;
      this.screen = 'map-editor';
      event.preventDefault();
      return;
    }
    if (event.code === 'KeyF' && this.screen === 'map-editor-open') {
      this.importMapFile();
      event.preventDefault();
      return;
    }
    if ((event.code === 'Enter' || event.code === 'Space') && count > 0) {
      const item = this.mapItems[this.selected];
      if (this.screen === 'map-editor-open') this.openInEditor(item);
      else this.downloadMap(item);
      event.preventDefault();
      return;
    }
    if (count === 0) return;
    let moveToLast = false;
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') this.selected -= 1;
    else if (event.code === 'ArrowRight' || event.code === 'KeyD') this.selected += 1;
    else if (event.code === 'ArrowUp' || event.code === 'KeyW') this.selected -= GRID_COLUMNS;
    else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
      this.selected += GRID_COLUMNS;
      moveToLast = true;
    } else return;
    if (this.selected < 0) this.selected += count;
    if (this.selected >= count) this.selected = moveToLast ? count - 1 : this.selected - count;
    event.preventDefault();
  }

  private openInEditor(item: MapGridItem): void {
    void this.mapBuffer(item)
      .then((buffer) => {
        if (!this.editorHost) return;
        this.editorHost.open(item.mode as EditorMode, item.name, buffer);
        this.active = false;
        this.screen = 'main';
        this.selected = 0;
      })
      .catch(() => {});
  }

  private downloadMap(item: MapGridItem): void {
    void this.mapBuffer(item)
      .then((buffer) => {
        const url = URL.createObjectURL(new Blob([buffer], { type: 'application/octet-stream' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${item.name}.rmm`;
        anchor.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {});
  }

  private importMapFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.rmm';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void file.arrayBuffer().then((buffer) => {
        if (!this.editorHost || buffer.byteLength < 8) return;
        const name = file.name.replace(/\.rmm$/i, '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, MAX_MAP_NAME) || 'imported';
        this.editorHost.open(inferModeFromBuffer(buffer), name, buffer);
        this.active = false;
        this.screen = 'main';
        this.selected = 0;
      });
    };
    input.click();
  }

  private renderMapGrid(): void {
    const { ctx } = this;
    let cols = 0;
    let x = GRID_X;
    let y = GRID_Y;
    for (let index = 0; index < this.mapItems.length; index += 1) {
      const item = this.mapItems[index];
      if (index === this.selected) {
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.fillRect(x - GRID_BORDER, y - GRID_BORDER, GRID_ITEM_SIZE + GRID_BORDER, GRID_ITEM_SIZE + GRID_BORDER);
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(x, y, GRID_ITEM_SIZE - GRID_BORDER, GRID_ITEM_SIZE - GRID_BORDER);
      }
      const thumb = item.thumbnail;
      if (thumb) {
        ctx.drawImage(thumb, x + Math.floor((GRID_ITEM_SIZE - thumb.width) / 2), y + Math.floor((GRID_ITEM_SIZE - thumb.height) / 2));
      }
      writeFont(ctx, this.assets, item.name, 1, x + Math.round((GRID_ITEM_SIZE - item.name.length * 8) / 2), y + GRID_ITEM_SIZE + 4);
      const tag = item.source === 'local' ? `${item.mode}+` : item.mode;
      writeFont(ctx, this.assets, tag, 1, x + Math.round((GRID_ITEM_SIZE - tag.length * 8) / 2), y + GRID_ITEM_SIZE + 14);
      cols += 1;
      x += GRID_ITEM_SIZE + GRID_MARGIN;
      if (cols >= GRID_COLUMNS) {
        cols = 0;
        x = GRID_X;
        y += GRID_ITEM_SIZE + 25 + GRID_MARGIN;
      }
    }
  }

  private renderLevelGrid(): void {
    const { ctx } = this;
    let cols = 0;
    let x = GRID_X;
    let y = GRID_Y;
    for (let index = 0; index < this.levelItems.length; index += 1) {
      const item = this.levelItems[index];
      if (index === this.selected) {
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.fillRect(x - GRID_BORDER, y - GRID_BORDER, GRID_ITEM_SIZE + GRID_BORDER, GRID_ITEM_SIZE + GRID_BORDER);
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(x, y, GRID_ITEM_SIZE - GRID_BORDER, GRID_ITEM_SIZE - GRID_BORDER);
      }
      const thumb = item.thumbnail;
      if (thumb) {
        ctx.drawImage(thumb, x + Math.floor((GRID_ITEM_SIZE - thumb.width) / 2), y + Math.floor((GRID_ITEM_SIZE - thumb.height) / 2));
      }
      writeFont(ctx, this.assets, item.name, 1, x + Math.round((GRID_ITEM_SIZE - item.name.length * 8) / 2), y + GRID_ITEM_SIZE + 10);
      cols += 1;
      x += GRID_ITEM_SIZE + GRID_MARGIN;
      if (cols >= GRID_COLUMNS) {
        cols = 0;
        x = GRID_X;
        y += GRID_ITEM_SIZE + 20 + GRID_MARGIN;
      }
    }
  }

  private title(): string {
    if (this.screen === 'main') return 'robots massacre';
    if (this.screen === 'mode') return 'select game mode';
    if (this.screen === 'level') return 'select level';
    if (this.screen === 'join' || this.screen === 'join-code') return 'join game';
    if (this.screen === 'pause') return 'paused';
    if (this.screen === 'help') return 'how to play';
    if (this.screen === 'credits') return 'credits';
    if (this.screen === 'settings') return 'settings';
    if (this.screen === 'map-editor') return 'map editor';
    if (this.screen === 'map-editor-help') return 'Map editor help';
    if (this.screen === 'map-editor-create') return 'create map';
    if (this.screen === 'map-editor-open') return 'open map';
    if (this.screen === 'map-editor-download') return 'download map';
    return 'select team';
  }

  private textLines(): string[] {
    if (this.screen === 'help') return HELP_LINES;
    if (this.screen === 'credits') return CREDIT_LINES;
    return MAP_EDITOR_HELP_LINES;
  }

  private renderTextLines(lines: string[]): void {
    let y = 60;
    for (const line of lines) {
      writeCentered(this.ctx, this.assets, line, 1, y, this.canvas.width);
      y += 15;
    }
  }

  private renderSettings(): void {
    const x = 100;
    writeFont(this.ctx, this.assets, 'statistics:', 1, x, 60);
    const stored = loadGameStats();
    const kills = stored.kills + this.game.localPlayer.kills;
    const deaths = stored.deaths + this.game.localPlayer.deaths;
    const shots = stored.shots + this.game.localStats.shots;
    const hits = stored.hits + this.game.localStats.hits;
    const seconds = Math.floor(stored.timeMs / 1000);
    const stats = [
      `${kills} kills`,
      `${deaths} deaths`,
      `${Math.floor(seconds / 3600)} hours ${Math.floor(seconds / 60) % 60} min ${seconds % 60} sec in game`,
      `${stored.games} games played`,
      `${shots > 0 ? Math.round((hits / shots) * 100) / 100 : 0} is your accuracy`,
    ];
    let y = 80;
    for (const line of stats) {
      writeFont(this.ctx, this.assets, line, 1, x + 15, y);
      y += 15;
    }

    writeFont(this.ctx, this.assets, 'dimension:', 1, x, 175);
    writeFont(this.ctx, this.assets, `< ${this.canvas.width}x${this.canvas.height} >`, 1, x + 100, 175);
    writeFont(this.ctx, this.assets, 'username:', 1, x, 195);
    writeFont(this.ctx, this.assets, this.game.localPlayer.name + (this.settingsOption === 2 ? '-' : ''), 1, x + 92, 195);
    writeFont(this.ctx, this.assets, '>', 1, 85, SETTINGS_OPTIONS_Y[this.settingsOption]);
    writeCentered(this.ctx, this.assets, 'esc to save / tab to change active option', 1, this.canvas.height - 20, this.canvas.width);
  }
}

function writeCentered(ctx: CanvasRenderingContext2D, assets: Assets, text: string, size: 1 | 2, y: number, width: number): void {
  const letterSize = 8 * size;
  writeFont(ctx, assets, text, size, Math.round((width - text.length * letterSize) / 2), y);
}

export function resizeCanvas(canvas: HTMLCanvasElement, width: number, height: number): void {
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `min(100vw, ${width}px)`;
  canvas.style.height = `min(100vh, ${height}px)`;
}

// Map physical keys to title characters so typing works on any keyboard layout.
function titleCharForKey(event: KeyboardEvent): string | undefined {
  const { code } = event;
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^(Digit|Numpad)\d$/.test(code)) return code.slice(-1);
  if (code === 'Minus') return event.shiftKey ? '_' : '-';
  return undefined;
}

function levelDisplayName(level: string): string {
  if (!level) return '?';
  const base = level.slice(level.lastIndexOf('/') + 1);
  return base.replace(/\.rmm$/i, '');
}

function clampSize(value: number): number {
  return Math.max(MIN_MAP_SIZE, Math.min(MAX_MAP_SIZE, value));
}

function needsTeam(mode: string, team: Team): boolean {
  return (mode === 'tdm' || mode === 'ctf') && team === 'none';
}

function generateRoomCode(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}
