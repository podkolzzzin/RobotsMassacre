import { Assets, writeFont } from './assets';
import { createThumbnail, spriteForEntity, spriteForTile } from './level';
import { saveLocalMap } from './storage';
import { MapEntity, TILE_SIZE, TileKind } from './types';

export type EditorMode = 'dm' | 'tdm' | 'ctf';
export type EditorEntity = 'wall' | 'metal' | 'spawner-red' | 'spawner-blu' | 'flag-red' | 'flag-blu';

export interface EditorCells {
  width: number;
  height: number;
  tiles: TileKind[];
  entities: (EditorEntity | null)[];
}

export interface CreateMapOptions {
  name: string;
  fillTile: number;
  mode: EditorMode;
  width: number;
  height: number;
}

export const BORDER_WIDTH = 7;
export const MIN_MAP_SIZE = 20;
export const MAX_MAP_SIZE = 120;
export const MAX_MAP_NAME = 18;

export const FILL_TILES: Array<[number, number]> = [[0, 2], [0, 4], [0, 6], [0, 5], [0, 3], [1, 4]];
export const MODE_SPRITES: Array<[number, number]> = [[23, 19], [24, 19], [25, 19]];
const BRUSH_SPRITES: Array<[number, number]> = [[0, 2], [0, 4], [0, 6], [0, 5], [0, 3], [1, 4], [3, 18], [2, 18], [5, 18], [4, 18]];
const BRUSH_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const DIGIT_TO_BRUSH: Record<string, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 0: 9 };
const MODE_TITLES: Record<EditorMode, string> = { dm: 'deathmatch', tdm: 'team deathmatch', ctf: 'capture the flag' };

const HEADER_HEIGHT = 28;
const BOTTOM_HEIGHT = 65;
const ERROR_FRAMES = 90;
const ASKER_OPTIONS = ['yes', 'no', 'cencel'];

interface CellPatch {
  index: number;
  tile: TileKind;
  entity: EditorEntity | null;
}

interface ClipboardCell {
  tile: TileKind;
  entity: 'wall' | 'metal' | null;
}

export function decodeCell(value: MapEntity): { tile: TileKind; entity: EditorEntity | null } {
  switch (value) {
    case MapEntity.WallOnGravel: return { tile: 'gravel', entity: 'wall' };
    case MapEntity.WallOnWater: return { tile: 'water', entity: 'wall' };
    case MapEntity.WallOnSand: return { tile: 'sand', entity: 'wall' };
    case MapEntity.WallOnGrass: return { tile: 'grass', entity: 'wall' };
    case MapEntity.Metal: return { tile: 'empty', entity: 'metal' };
    case MapEntity.Gravel: return { tile: 'gravel', entity: null };
    case MapEntity.Sand: return { tile: 'sand', entity: null };
    case MapEntity.Grass: return { tile: 'grass', entity: null };
    case MapEntity.Water: return { tile: 'water', entity: null };
    case MapEntity.RedSpawnerOnGravel: return { tile: 'gravel', entity: 'spawner-red' };
    case MapEntity.RedSpawnerOnSand: return { tile: 'sand', entity: 'spawner-red' };
    case MapEntity.RedSpawnerOnWater: return { tile: 'water', entity: 'spawner-red' };
    case MapEntity.RedSpawnerOnGrass: return { tile: 'grass', entity: 'spawner-red' };
    case MapEntity.BluSpawnerOnGravel: return { tile: 'gravel', entity: 'spawner-blu' };
    case MapEntity.BluSpawnerOnSand: return { tile: 'sand', entity: 'spawner-blu' };
    case MapEntity.BluSpawnerOnWater: return { tile: 'water', entity: 'spawner-blu' };
    case MapEntity.BluSpawnerOnGrass: return { tile: 'grass', entity: 'spawner-blu' };
    case MapEntity.RedFlagOnGravel: return { tile: 'gravel', entity: 'flag-red' };
    case MapEntity.RedFlagOnSand: return { tile: 'sand', entity: 'flag-red' };
    case MapEntity.RedFlagOnWater: return { tile: 'water', entity: 'flag-red' };
    case MapEntity.RedFlagOnGrass: return { tile: 'grass', entity: 'flag-red' };
    case MapEntity.BluFlagOnGravel: return { tile: 'gravel', entity: 'flag-blu' };
    case MapEntity.BluFlagOnSand: return { tile: 'sand', entity: 'flag-blu' };
    case MapEntity.BluFlagOnWater: return { tile: 'water', entity: 'flag-blu' };
    case MapEntity.BluFlagOnGrass: return { tile: 'grass', entity: 'flag-blu' };
    default: return { tile: 'gravel', entity: null };
  }
}

export function encodeCell(tile: TileKind, entity: EditorEntity | null): MapEntity {
  if (entity === 'metal') return MapEntity.Metal;
  if (entity === 'wall') {
    if (tile === 'water') return MapEntity.WallOnWater;
    if (tile === 'sand') return MapEntity.WallOnSand;
    if (tile === 'grass') return MapEntity.WallOnGrass;
    return MapEntity.WallOnGravel;
  }
  if (entity === 'spawner-red') {
    if (tile === 'water') return MapEntity.RedSpawnerOnWater;
    if (tile === 'sand') return MapEntity.RedSpawnerOnSand;
    if (tile === 'grass') return MapEntity.RedSpawnerOnGrass;
    return MapEntity.RedSpawnerOnGravel;
  }
  if (entity === 'spawner-blu') {
    if (tile === 'water') return MapEntity.BluSpawnerOnWater;
    if (tile === 'sand') return MapEntity.BluSpawnerOnSand;
    if (tile === 'grass') return MapEntity.BluSpawnerOnGrass;
    return MapEntity.BluSpawnerOnGravel;
  }
  if (entity === 'flag-red') {
    if (tile === 'water') return MapEntity.RedFlagOnWater;
    if (tile === 'sand') return MapEntity.RedFlagOnSand;
    if (tile === 'grass') return MapEntity.RedFlagOnGrass;
    return MapEntity.RedFlagOnGravel;
  }
  if (entity === 'flag-blu') {
    if (tile === 'water') return MapEntity.BluFlagOnWater;
    if (tile === 'sand') return MapEntity.BluFlagOnSand;
    if (tile === 'grass') return MapEntity.BluFlagOnGrass;
    return MapEntity.BluFlagOnGravel;
  }
  if (tile === 'water') return MapEntity.Water;
  if (tile === 'sand') return MapEntity.Sand;
  if (tile === 'grass') return MapEntity.Grass;
  return MapEntity.Gravel;
}

export function decodeEditorCells(buffer: ArrayBuffer): EditorCells {
  const view = new DataView(buffer);
  const width = view.getInt32(0, true);
  const height = view.getInt32(4, true);
  const tiles = new Array<TileKind>(width * height);
  const entities = new Array<EditorEntity | null>(width * height);
  let offset = 8;
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      const { tile, entity } = decodeCell(view.getUint8(offset) as MapEntity);
      offset += 1;
      tiles[y * width + x] = tile;
      entities[y * width + x] = entity;
    }
  }
  return { width, height, tiles, entities };
}

export function encodeEditorCells(cells: EditorCells): { buffer: ArrayBuffer; spawners: number } {
  const buffer = new ArrayBuffer(8 + cells.width * cells.height);
  const view = new DataView(buffer);
  view.setInt32(0, cells.width, true);
  view.setInt32(4, cells.height, true);
  let offset = 8;
  let spawners = 0;
  for (let x = 0; x < cells.width; x += 1) {
    for (let y = 0; y < cells.height; y += 1) {
      const index = y * cells.width + x;
      const entity = cells.entities[index];
      if (entity === 'spawner-red' || entity === 'spawner-blu') spawners += 1;
      view.setUint8(offset, encodeCell(cells.tiles[index], entity));
      offset += 1;
    }
  }
  return { buffer, spawners };
}

export function createFilledCells(width: number, height: number, fillTile: number): EditorCells {
  const tiles = new Array<TileKind>(width * height);
  const entities = new Array<EditorEntity | null>(width * height).fill(null);
  const fillKinds: TileKind[] = ['gravel', 'empty', 'sand', 'water', 'gravel', 'grass'];
  const fillEntities: (EditorEntity | null)[] = ['wall', 'metal', null, null, null, null];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (isBorderCell(x, y, width, height)) {
        tiles[index] = 'empty';
        entities[index] = 'metal';
      } else {
        tiles[index] = fillKinds[fillTile] ?? 'gravel';
        entities[index] = fillEntities[fillTile] ?? null;
      }
    }
  }
  return { width, height, tiles, entities };
}

export function isBorderCell(x: number, y: number, width: number, height: number): boolean {
  const onLine = x === BORDER_WIDTH - 1 || y === BORDER_WIDTH - 1 || x === width - BORDER_WIDTH || y === height - BORDER_WIDTH;
  return onLine && !isOutsideBorderCell(x, y, width, height);
}

export function isOutsideBorderCell(x: number, y: number, width: number, height: number): boolean {
  return x < BORDER_WIDTH - 1 || y < BORDER_WIDTH - 1 || x > width - BORDER_WIDTH || y > height - BORDER_WIDTH;
}

export class MapEditor {
  cells: EditorCells;
  brushIndex = 1;
  symmetryX = -1;
  symmetryY = -1;
  tileOffsetX = 0;
  tileOffsetY = 0;
  showMinimap = false;
  previewHeld = false;
  askerVisible = false;
  askerSelected = 0;
  saved = false;
  private anchorX = 0;
  private anchorY = 0;
  private cursorX = 0;
  private cursorY = 0;
  private readonly undoStack: CellPatch[][] = [];
  private readonly redoStack: CellPatch[][] = [];
  private clipboard: { width: number; height: number; cells: ClipboardCell[] } | null = null;
  private errorFrames = 0;
  private minimapImage: HTMLCanvasElement | null = null;
  private previewImage: HTMLCanvasElement | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ctx: CanvasRenderingContext2D,
    private readonly assets: Assets,
    public readonly name: string,
    public readonly mode: EditorMode,
    cells: EditorCells,
    private readonly onExit: () => void,
  ) {
    this.cells = cells;
  }

  get selectionX(): number {
    return Math.min(this.anchorX, this.cursorX);
  }

  get selectionY(): number {
    return Math.min(this.anchorY, this.cursorY);
  }

  get selectionWidth(): number {
    return Math.abs(this.anchorX - this.cursorX) + 1;
  }

  get selectionHeight(): number {
    return Math.abs(this.anchorY - this.cursorY) + 1;
  }

  private get displayHeight(): number {
    return this.canvas.height - HEADER_HEIGHT - BOTTOM_HEIGHT;
  }

  private get displayedCols(): number {
    return Math.floor(this.canvas.width / TILE_SIZE);
  }

  private get displayedRows(): number {
    return Math.floor(this.displayHeight / TILE_SIZE);
  }

  tileAt(x: number, y: number): TileKind {
    return this.cells.tiles[y * this.cells.width + x];
  }

  entityAt(x: number, y: number): EditorEntity | null {
    return this.cells.entities[y * this.cells.width + x];
  }

  onKeyDown(event: KeyboardEvent, keysDown: Set<string>): void {
    if (this.askerVisible) {
      this.handleAskerKey(event);
      return;
    }

    const { code } = event;
    if (code === 'Escape') {
      this.askerVisible = true;
      this.askerSelected = 0;
    } else if (code === 'KeyQ') {
      this.previewHeld = true;
    } else if (code === 'KeyM') {
      this.showMinimap = !this.showMinimap;
    } else if (event.ctrlKey && code === 'KeyZ') {
      this.undo();
    } else if (event.ctrlKey && code === 'KeyY') {
      this.redo();
    } else if (event.ctrlKey && code === 'KeyS') {
      this.trySave();
    } else if (event.ctrlKey && code === 'KeyC') {
      this.copySelection();
    } else if (event.ctrlKey && code === 'KeyV') {
      this.paste();
    } else if (event.ctrlKey && code === 'KeyX') {
      this.copySelection();
      this.deleteSelection();
    } else if (code === 'F1') {
      this.symmetryX = this.selectionX;
    } else if (code === 'F2') {
      this.symmetryY = this.selectionY;
    } else if (code === 'F3') {
      this.symmetryX = -1;
      this.symmetryY = -1;
    } else if (code === 'Delete') {
      this.deleteSelection();
    } else if (code === 'Space' || code === 'Enter') {
      this.paintSelection();
    } else if (isDigitCode(code)) {
      this.selectBrush(DIGIT_TO_BRUSH[code.slice(-1)]);
    } else {
      const moved = this.handleMovement(code, event.shiftKey);
      if (!moved) return;
      if (keysDown.has('F1')) this.symmetryX = this.selectionX;
      if (keysDown.has('F2')) this.symmetryY = this.selectionY;
      if (keysDown.has('Space') || keysDown.has('Enter')) this.paintSelection();
    }
    event.preventDefault();
  }

  onKeyUp(code: string): void {
    if (code === 'KeyQ') this.previewHeld = false;
  }

  onPointerDown(x: number, y: number): void {
    if (this.askerVisible || this.previewHeld) return;
    const boxX = Math.floor((this.canvas.width - 350) / 2);
    const boxY = this.canvas.height - 55;
    if (y >= boxY && y < boxY + 50) {
      const index = Math.floor((x - boxX + 3) / 35);
      if (index >= 0 && index < 10) this.selectBrush(index);
      return;
    }
    if (y < HEADER_HEIGHT || y >= HEADER_HEIGHT + this.displayHeight) return;
    const cellX = this.tileOffsetX + Math.floor((x - this.mapOffsetX()) / TILE_SIZE);
    const cellY = this.tileOffsetY + Math.floor((y - HEADER_HEIGHT) / TILE_SIZE);
    if (cellX < 0 || cellY < 0 || cellX >= this.cells.width || cellY >= this.cells.height) return;
    this.anchorX = this.cursorX = cellX;
    this.anchorY = this.cursorY = cellY;
  }

  private handleAskerKey(event: KeyboardEvent): void {
    const { code } = event;
    if (code === 'ArrowLeft' || code === 'KeyA') this.askerSelected = (this.askerSelected + ASKER_OPTIONS.length - 1) % ASKER_OPTIONS.length;
    else if (code === 'ArrowRight' || code === 'KeyD') this.askerSelected = (this.askerSelected + 1) % ASKER_OPTIONS.length;
    else if (code === 'Escape') this.askerVisible = false;
    else if (code === 'Enter' || code === 'Space') {
      if (this.askerSelected === 0) {
        this.trySave();
        this.askerVisible = false;
        this.onExit();
      } else if (this.askerSelected === 1) {
        this.askerVisible = false;
        this.onExit();
      } else {
        this.askerVisible = false;
      }
    } else {
      return;
    }
    event.preventDefault();
  }

  private handleMovement(code: string, shift: boolean): boolean {
    let dx = 0;
    let dy = 0;
    if (code === 'ArrowUp' || code === 'KeyW') dy = -1;
    else if (code === 'ArrowDown' || code === 'KeyS') dy = 1;
    else if (code === 'ArrowLeft' || code === 'KeyA') dx = -1;
    else if (code === 'ArrowRight' || code === 'KeyD') dx = 1;
    else return false;

    if (shift) {
      this.cursorX = clamp(this.cursorX + dx, 0, this.cells.width - 1);
      this.cursorY = clamp(this.cursorY + dy, 0, this.cells.height - 1);
    } else {
      this.cursorX = clamp(this.cursorX + dx, 0, this.cells.width - 1);
      this.cursorY = clamp(this.cursorY + dy, 0, this.cells.height - 1);
      this.anchorX = this.cursorX;
      this.anchorY = this.cursorY;
    }
    this.scrollToSelection();
    return true;
  }

  private scrollToSelection(): void {
    if (this.cursorX < this.tileOffsetX) this.tileOffsetX = this.cursorX;
    else if (this.cursorX >= this.tileOffsetX + this.displayedCols) this.tileOffsetX = this.cursorX - this.displayedCols + 1;
    if (this.cursorY < this.tileOffsetY) this.tileOffsetY = this.cursorY;
    else if (this.cursorY >= this.tileOffsetY + this.displayedRows) this.tileOffsetY = this.cursorY - this.displayedRows + 1;
    this.tileOffsetX = clamp(this.tileOffsetX, 0, Math.max(0, this.cells.width - this.displayedCols));
    this.tileOffsetY = clamp(this.tileOffsetY, 0, Math.max(0, this.cells.height - this.displayedRows));
  }

  selectBrush(index: number): void {
    if ((index === 6 || index === 7) && this.mode !== 'ctf') return;
    this.brushIndex = index;
  }

  private paintSelection(): void {
    const { width, height } = this.cells;
    if (isBorderCell(this.selectionX, this.selectionY, width, height)) return;
    const targets = new Map<number, [number, number]>();
    for (let x = this.selectionX; x < this.selectionX + this.selectionWidth; x += 1) {
      for (let y = this.selectionY; y < this.selectionY + this.selectionHeight; y += 1) {
        this.collectPaintTargets(x, y, targets);
      }
    }
    if (targets.size === 0) return;
    const historyIndices = new Set(targets.keys());
    // A moved flag clears its previous cell, so include it in the same history patch.
    if (this.brushIndex === 6 || this.brushIndex === 7) {
      const kind: EditorEntity = this.brushIndex === 6 ? 'flag-red' : 'flag-blu';
      for (let i = 0; i < this.cells.entities.length; i += 1) {
        if (this.cells.entities[i] === kind) historyIndices.add(i);
      }
    }
    const patch = this.snapshot([...historyIndices]);
    for (const [x, y] of targets.values()) this.applyBrush(x, y);
    this.pushHistory(patch);
  }

  private collectPaintTargets(x: number, y: number, targets: Map<number, [number, number]>): void {
    const add = (tx: number, ty: number) => {
      if (!this.isPaintable(tx, ty)) return;
      targets.set(ty * this.cells.width + tx, [tx, ty]);
    };
    add(x, y);
    if (this.symmetryX !== -1) {
      add(2 * this.symmetryX - 1 - x, y);
      if (this.symmetryY !== -1) add(2 * this.symmetryX - 1 - x, 2 * this.symmetryY - 1 - y);
    }
    if (this.symmetryY !== -1) add(x, 2 * this.symmetryY - 1 - y);
  }

  private isPaintable(x: number, y: number): boolean {
    const { width, height } = this.cells;
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    if (isBorderCell(x, y, width, height)) return false;
    if (this.brushIndex >= 6 && isOutsideBorderCell(x, y, width, height)) return false;
    return true;
  }

  private applyBrush(x: number, y: number): void {
    const index = y * this.cells.width + x;
    switch (this.brushIndex) {
      case 0:
        this.cells.entities[index] = 'wall';
        break;
      case 1:
        this.cells.entities[index] = 'metal';
        break;
      case 2:
        this.setTile(index, 'sand');
        break;
      case 3:
        this.setTile(index, 'water');
        break;
      case 4:
        this.setTile(index, 'gravel');
        break;
      case 5:
        this.setTile(index, 'grass');
        break;
      case 6:
        this.placeFlag(index, 'flag-red');
        break;
      case 7:
        this.placeFlag(index, 'flag-blu');
        break;
      case 8:
        this.cells.entities[index] = 'spawner-red';
        break;
      case 9:
        this.cells.entities[index] = 'spawner-blu';
        break;
    }
    this.invalidateImages();
  }

  private setTile(index: number, kind: TileKind): void {
    this.cells.tiles[index] = kind;
    this.cells.entities[index] = null;
  }

  private placeFlag(index: number, kind: EditorEntity): void {
    for (let i = 0; i < this.cells.entities.length; i += 1) {
      if (this.cells.entities[i] === kind) this.cells.entities[i] = null;
    }
    this.cells.entities[index] = kind;
  }

  private deleteSelection(): void {
    const indices: number[] = [];
    for (let x = this.selectionX; x < this.selectionX + this.selectionWidth; x += 1) {
      for (let y = this.selectionY; y < this.selectionY + this.selectionHeight; y += 1) {
        if (x < 0 || y < 0 || x >= this.cells.width || y >= this.cells.height) continue;
        if (isBorderCell(x, y, this.cells.width, this.cells.height)) continue;
        indices.push(y * this.cells.width + x);
      }
    }
    if (indices.length === 0) return;
    const patch = this.snapshot(indices);
    for (const index of indices) this.cells.entities[index] = null;
    this.invalidateImages();
    this.pushHistory(patch);
  }

  private copySelection(): void {
    if (this.selectionWidth <= 1 || this.selectionHeight <= 1) return;
    const cells: ClipboardCell[] = [];
    for (let y = this.selectionY; y < this.selectionY + this.selectionHeight; y += 1) {
      for (let x = this.selectionX; x < this.selectionX + this.selectionWidth; x += 1) {
        const index = y * this.cells.width + x;
        const tile = this.cells.tiles[index];
        const entity = this.cells.entities[index];
        cells.push({
          tile: tile === 'empty' ? 'gravel' : tile,
          entity: entity === 'wall' || entity === 'metal' ? entity : null,
        });
      }
    }
    this.clipboard = { width: this.selectionWidth, height: this.selectionHeight, cells };
  }

  private paste(): void {
    if (!this.clipboard) return;
    const indices: number[] = [];
    for (let dy = 0; dy < this.clipboard.height; dy += 1) {
      for (let dx = 0; dx < this.clipboard.width; dx += 1) {
        const x = this.selectionX + dx;
        const y = this.selectionY + dy;
        if (x < 0 || y < 0 || x >= this.cells.width || y >= this.cells.height) continue;
        if (isBorderCell(x, y, this.cells.width, this.cells.height)) continue;
        indices.push(y * this.cells.width + x);
      }
    }
    if (indices.length === 0) return;
    const patch = this.snapshot(indices);
    for (let dy = 0; dy < this.clipboard.height; dy += 1) {
      for (let dx = 0; dx < this.clipboard.width; dx += 1) {
        const x = this.selectionX + dx;
        const y = this.selectionY + dy;
        if (x < 0 || y < 0 || x >= this.cells.width || y >= this.cells.height) continue;
        if (isBorderCell(x, y, this.cells.width, this.cells.height)) continue;
        const cell = this.clipboard.cells[dy * this.clipboard.width + dx];
        const index = y * this.cells.width + x;
        this.cells.tiles[index] = cell.tile;
        this.cells.entities[index] = cell.entity;
      }
    }
    this.invalidateImages();
    this.pushHistory(patch);
  }

  private snapshot(indices: number[]): CellPatch[] {
    return indices.map((index) => ({ index, tile: this.cells.tiles[index], entity: this.cells.entities[index] }));
  }

  private pushHistory(patch: CellPatch[]): void {
    this.undoStack.push(patch);
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack.length = 0;
    this.saved = false;
  }

  undo(): void {
    const patch = this.undoStack.pop();
    if (!patch) return;
    this.redoStack.push(this.snapshot(patch.map((cell) => cell.index)));
    this.applyPatch(patch);
  }

  redo(): void {
    const patch = this.redoStack.pop();
    if (!patch) return;
    this.undoStack.push(this.snapshot(patch.map((cell) => cell.index)));
    this.applyPatch(patch);
  }

  private applyPatch(patch: CellPatch[]): void {
    for (const cell of patch) {
      this.cells.tiles[cell.index] = cell.tile;
      this.cells.entities[cell.index] = cell.entity;
    }
    this.invalidateImages();
  }

  trySave(): boolean {
    const { buffer, spawners } = encodeEditorCells(this.cells);
    if (spawners === 0) {
      this.errorFrames = ERROR_FRAMES;
      return false;
    }
    saveLocalMap(this.mode, this.name, buffer);
    this.saved = true;
    return true;
  }

  private invalidateImages(): void {
    this.minimapImage = null;
    this.previewImage = null;
  }

  render(): void {
    const { ctx, canvas } = this;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (this.askerVisible) {
      this.renderAsker();
      return;
    }

    this.renderHeader();
    this.renderMap();
    this.renderToolbox();
    if (this.showMinimap) this.renderMinimap();
    if (this.previewHeld) this.renderPreview();
    if (this.errorFrames > 0) {
      this.errorFrames -= 1;
      this.renderSaveError();
    }
  }

  private mapOffsetX(): number {
    const mapWidth = this.cells.width * TILE_SIZE;
    return mapWidth < this.canvas.width ? Math.floor((this.canvas.width - mapWidth) / 2) : 0;
  }

  private renderHeader(): void {
    const { ctx, assets } = this;
    writeFont(ctx, assets, `map: ${this.name}`, 1, 10, 10);
    const sizeText = `${this.cells.width}x${this.cells.height}`;
    writeFont(ctx, assets, sizeText, 1, Math.round((this.canvas.width - sizeText.length * 8) / 2), 10);
    const modeText = `mode: ${MODE_TITLES[this.mode]}`;
    writeFont(ctx, assets, modeText, 1, this.canvas.width - modeText.length * 8 - 10, 10);
  }

  private renderMap(): void {
    const { ctx } = this;
    const offsetX = this.mapOffsetX();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, HEADER_HEIGHT, this.canvas.width, this.displayHeight);
    ctx.clip();

    const lastCol = Math.min(this.cells.width, this.tileOffsetX + this.displayedCols + 1);
    const lastRow = Math.min(this.cells.height, this.tileOffsetY + this.displayedRows + 1);
    for (let x = this.tileOffsetX; x < lastCol; x += 1) {
      for (let y = this.tileOffsetY; y < lastRow; y += 1) {
        const index = y * this.cells.width + x;
        const dx = offsetX + (x - this.tileOffsetX) * TILE_SIZE;
        const dy = HEADER_HEIGHT + (y - this.tileOffsetY) * TILE_SIZE;
        const tile = this.cells.tiles[index];
        if (tile !== 'empty') {
          const [sx, sy] = spriteForTile(tile);
          this.assets.graphics.draw(ctx, sx, sy, dx, dy);
        }
        const entity = this.cells.entities[index];
        if (entity) {
          const [sx, sy] = spriteForEntity(entity);
          this.assets.graphics.draw(ctx, sx, sy, dx, dy);
        }
      }
    }

    this.renderSymmetryLines(offsetX);
    this.renderSelection(offsetX);
    ctx.restore();
  }

  private renderSymmetryLines(offsetX: number): void {
    const { ctx } = this;
    ctx.fillStyle = 'rgb(255, 250, 250)';
    if (this.symmetryX !== -1 && this.symmetryX >= this.tileOffsetX && this.symmetryX <= this.tileOffsetX + this.displayedCols) {
      const x = offsetX + (this.symmetryX - this.tileOffsetX) * TILE_SIZE;
      ctx.fillRect(x - 2, HEADER_HEIGHT, 4, this.displayHeight);
    }
    if (this.symmetryY !== -1 && this.symmetryY >= this.tileOffsetY && this.symmetryY <= this.tileOffsetY + this.displayedRows) {
      const y = HEADER_HEIGHT + (this.symmetryY - this.tileOffsetY) * TILE_SIZE;
      ctx.fillRect(0, y - 2, this.canvas.width, 4);
    }
  }

  private renderSelection(offsetX: number): void {
    const { ctx } = this;
    const { width, height } = this.cells;
    if (isOutsideBorderCell(this.selectionX, this.selectionY, width, height)) ctx.strokeStyle = 'rgb(192, 192, 192)';
    else if (isBorderCell(this.selectionX, this.selectionY, width, height)) ctx.strokeStyle = 'rgb(255, 0, 0)';
    else ctx.strokeStyle = 'rgb(255, 255, 255)';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      offsetX + (this.selectionX - this.tileOffsetX) * TILE_SIZE + 1,
      HEADER_HEIGHT + (this.selectionY - this.tileOffsetY) * TILE_SIZE + 1,
      this.selectionWidth * TILE_SIZE - 2,
      this.selectionHeight * TILE_SIZE - 2,
    );
  }

  private renderToolbox(): void {
    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, canvas.height - BOTTOM_HEIGHT, canvas.width, BOTTOM_HEIGHT);
    const boxX = Math.floor((canvas.width - 350) / 2);
    const boxY = canvas.height - 55;
    ctx.fillStyle = 'rgb(128, 128, 128)';
    ctx.fillRect(boxX + this.brushIndex * 35 - 3, boxY, 35, 50);
    for (let i = 0; i < BRUSH_SPRITES.length; i += 1) {
      const [sx, sy] = BRUSH_SPRITES[i];
      writeFont(ctx, this.assets, BRUSH_LABELS[i], 1, boxX + i * 35 + 11, boxY + 2);
      this.assets.graphics.draw(ctx, sx, sy, boxX + i * 35, boxY + 14);
    }
    if (this.mode !== 'ctf') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
      ctx.fillRect(boxX + 35 * 6 - 3, boxY, 35 * 2, 50);
    }
  }

  private renderMinimap(): void {
    if (!this.minimapImage) this.minimapImage = this.buildMinimap();
    this.ctx.drawImage(this.minimapImage, 0, this.canvas.height - this.minimapImage.height);
  }

  private buildMinimap(): HTMLCanvasElement {
    const { width, height } = this.cells;
    const ms = Math.max(height, Math.floor(width / 1.8));
    const zoom = ms < 25 ? 3 : ms < 45 ? 2 : 1;
    const thumbnail = createThumbnail(encodeEditorCells(this.cells).buffer);
    const canvas = document.createElement('canvas');
    canvas.width = width * zoom;
    canvas.height = height * zoom;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(thumbnail, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  private renderPreview(): void {
    if (!this.previewImage) this.previewImage = this.buildPreview();
    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const zoom = Math.min(1, canvas.width / this.previewImage.width, canvas.height / this.previewImage.height);
    const width = Math.floor(this.previewImage.width * zoom);
    const height = Math.floor(this.previewImage.height * zoom);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.previewImage, Math.floor((canvas.width - width) / 2), Math.floor((canvas.height - height) / 2), width, height);
  }

  private buildPreview(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.cells.width * TILE_SIZE;
    canvas.height = this.cells.height * TILE_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < this.cells.height; y += 1) {
      for (let x = 0; x < this.cells.width; x += 1) {
        const index = y * this.cells.width + x;
        const tile = this.cells.tiles[index];
        if (tile !== 'empty') {
          const [sx, sy] = spriteForTile(tile);
          this.assets.graphics.draw(ctx, sx, sy, x * TILE_SIZE, y * TILE_SIZE);
        }
        const entity = this.cells.entities[index];
        if (entity) {
          const [sx, sy] = spriteForEntity(entity);
          this.assets.graphics.draw(ctx, sx, sy, x * TILE_SIZE, y * TILE_SIZE);
        }
      }
    }
    return canvas;
  }

  private renderSaveError(): void {
    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(0, HEADER_HEIGHT, canvas.width, this.displayHeight);
    writeCentered(ctx, this.assets, 'impossible to save map. it has no spawners', 1, Math.floor(canvas.height / 2), canvas.width);
  }

  private renderAsker(): void {
    const { ctx, canvas, assets } = this;
    writeCentered(ctx, assets, 'save map before exit?', 2, 250, canvas.width);
    const labels = ASKER_OPTIONS.map((option, i) => (i === this.askerSelected ? `> ${option} <` : option));
    const line = labels.join('   ');
    writeCentered(ctx, assets, line, 2, 300, canvas.width);
  }
}

export class EditorHost {
  active = false;
  editor: MapEditor | null = null;
  onExit: (() => void) | null = null;
  handledEvent: KeyboardEvent | null = null;
  private readonly keysDown = new Set<string>();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ctx: CanvasRenderingContext2D,
    private readonly assets: Assets,
  ) {
    window.addEventListener('keydown', (event) => {
      if (!this.active || !this.editor) return;
      this.handledEvent = event;
      this.keysDown.add(event.code);
      this.editor.onKeyDown(event, this.keysDown);
    });
    window.addEventListener('keyup', (event) => {
      this.keysDown.delete(event.code);
      if (!this.active || !this.editor) return;
      this.editor.onKeyUp(event.code);
    });
    window.addEventListener('blur', () => this.keysDown.clear());
    canvas.addEventListener('pointerdown', (event) => {
      if (!this.active || !this.editor) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      event.preventDefault();
      this.editor.onPointerDown(
        (event.clientX - rect.left) * (canvas.width / rect.width),
        (event.clientY - rect.top) * (canvas.height / rect.height),
      );
    });
  }

  create(options: CreateMapOptions): void {
    const cells = createFilledCells(options.width, options.height, options.fillTile);
    this.start(options.name, options.mode, cells);
  }

  open(mode: EditorMode, name: string, buffer: ArrayBuffer): void {
    this.start(name, mode, decodeEditorCells(buffer));
  }

  frame(): void {
    this.editor?.render();
  }

  private start(name: string, mode: EditorMode, cells: EditorCells): void {
    this.editor = new MapEditor(this.canvas, this.ctx, this.assets, name, mode, cells, () => this.exit());
    this.active = true;
  }

  private exit(): void {
    this.active = false;
    this.editor = null;
    this.onExit?.();
  }
}

export function inferModeFromBuffer(buffer: ArrayBuffer): EditorMode {
  const bytes = new Uint8Array(buffer);
  const flagValues = new Set<number>([
    MapEntity.RedFlagOnGravel, MapEntity.RedFlagOnSand, MapEntity.RedFlagOnWater, MapEntity.RedFlagOnGrass,
    MapEntity.BluFlagOnGravel, MapEntity.BluFlagOnSand, MapEntity.BluFlagOnWater, MapEntity.BluFlagOnGrass,
  ]);
  for (let i = 8; i < bytes.length; i += 1) {
    if (flagValues.has(bytes[i])) return 'ctf';
  }
  return 'dm';
}

function isDigitCode(code: string): boolean {
  return /^(Digit|Numpad)\d$/.test(code);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function writeCentered(ctx: CanvasRenderingContext2D, assets: Assets, text: string, size: 1 | 2, y: number, width: number): void {
  writeFont(ctx, assets, text, size, Math.round((width - text.length * 8 * size) / 2), y);
}
