export class SpriteSheet {
  readonly image: HTMLImageElement;
  readonly tileWidth: number;
  readonly tileHeight: number;
  ready: Promise<void>;
  private readonly hueCache = new Map<string, HTMLCanvasElement>();
  private sheetPixels: ImageData | undefined;

  constructor(url: string, tileWidth: number, tileHeight: number) {
    this.image = new Image();
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.ready = new Promise((resolve, reject) => {
      this.image.onload = () => resolve();
      this.image.onerror = () => reject(new Error(`Failed to load ${url}`));
      this.image.src = url;
    });
  }

  draw(ctx: CanvasRenderingContext2D, sx: number, sy: number, dx: number, dy: number, rotation = 0): void {
    if (rotation === 0) {
      ctx.drawImage(this.image, sx * this.tileWidth, sy * this.tileHeight, this.tileWidth, this.tileHeight, Math.round(dx), Math.round(dy), this.tileWidth, this.tileHeight);
      return;
    }

    ctx.save();
    ctx.translate(Math.round(dx) + this.tileWidth / 2, Math.round(dy) + this.tileHeight / 2);
    ctx.rotate(rotation);
    ctx.drawImage(this.image, sx * this.tileWidth, sy * this.tileHeight, this.tileWidth, this.tileHeight, -this.tileWidth / 2, -this.tileHeight / 2, this.tileWidth, this.tileHeight);
    ctx.restore();
  }

  drawHue(ctx: CanvasRenderingContext2D, sx: number, sy: number, dx: number, dy: number, hueDelta: number, rotation = 0): void {
    const source = this.getHueSprite(sx, sy, hueDelta);
    if (rotation === 0) {
      ctx.drawImage(source, Math.round(dx), Math.round(dy));
      return;
    }

    ctx.save();
    ctx.translate(Math.round(dx) + this.tileWidth / 2, Math.round(dy) + this.tileHeight / 2);
    ctx.rotate(rotation);
    ctx.drawImage(source, -this.tileWidth / 2, -this.tileHeight / 2);
    ctx.restore();
  }

  // The whole sheet is read back exactly once; hue sprites are then cut from
  // this CPU-side copy with plain array math. Reading a fresh GPU-backed
  // scratch canvas per sprite can return uninitialized memory on some
  // drivers, which used to get hue-shifted and cached as a garbage square
  // over the robot.
  private getSheetPixels(): ImageData {
    if (this.sheetPixels) return this.sheetPixels;
    const canvas = document.createElement('canvas');
    canvas.width = this.image.naturalWidth;
    canvas.height = this.image.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2D canvas is not available');
    ctx.drawImage(this.image, 0, 0);
    this.sheetPixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return this.sheetPixels;
  }

  private getHueSprite(sx: number, sy: number, hueDelta: number): HTMLCanvasElement {
    const key = `${sx}:${sy}:${Math.round(hueDelta * 1000)}`;
    const cached = this.hueCache.get(key);
    if (cached) return cached;

    const sheet = this.getSheetPixels();
    const sprite = new ImageData(this.tileWidth, this.tileHeight);
    for (let y = 0; y < this.tileHeight; y += 1) {
      const sourceY = sy * this.tileHeight + y;
      if (sourceY >= sheet.height) break;
      for (let x = 0; x < this.tileWidth; x += 1) {
        const sourceX = sx * this.tileWidth + x;
        if (sourceX >= sheet.width) break;
        const si = (sourceY * sheet.width + sourceX) * 4;
        const alpha = sheet.data[si + 3];
        if (alpha === 0) continue;
        const [h, s, v] = rgbToHsv(sheet.data[si], sheet.data[si + 1], sheet.data[si + 2]);
        const [r, g, b] = hsvToRgb(clamp(h + hueDelta, 0, 255), s, v);
        const di = (y * this.tileWidth + x) * 4;
        sprite.data[di] = r;
        sprite.data[di + 1] = g;
        sprite.data[di + 2] = b;
        sprite.data[di + 3] = alpha;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = this.tileWidth;
    canvas.height = this.tileHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    ctx.putImageData(sprite, 0, 0);
    this.hueCache.set(key, canvas);
    return canvas;
  }
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;
  const saturation = max === 0 ? 0 : 1 - min / max;
  return [hue, saturation, max / 255];
}

function hsvToRgb(hue: number, saturation: number, value: number): [number, number, number] {
  const hi = Math.floor(hue / 60) % 6;
  const f = hue / 60 - Math.floor(hue / 60);
  const v = Math.round(value * 255);
  const p = Math.round(value * 255 * (1 - saturation));
  const q = Math.round(value * 255 * (1 - f * saturation));
  const t = Math.round(value * 255 * (1 - (1 - f) * saturation));

  if (hi === 0) return [v, t, p];
  if (hi === 1) return [q, v, p];
  if (hi === 2) return [p, v, t];
  if (hi === 3) return [p, q, v];
  if (hi === 4) return [t, p, v];
  return [v, p, q];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface Assets {
  graphics: SpriteSheet;
  graphicsBig: SpriteSheet;
  font: SpriteSheet;
  fontBig: SpriteSheet;
}

export async function loadAssets(): Promise<Assets> {
  const graphics = new SpriteSheet('/assets/art/Graphics.png', 30, 30);
  const graphicsBig = new SpriteSheet('/assets/art/GraphicsBig.png', 48, 48);
  const font = new SpriteSheet('/assets/art/Font.png', 8, 8);
  const fontBig = new SpriteSheet('/assets/art/FontBig.png', 16, 16);
  await Promise.all([graphics.ready, graphicsBig.ready, font.ready, fontBig.ready]);
  return { graphics, graphicsBig, font, fontBig };
}

const FONT_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789.,!?'\"-+=/\\%()<>:; ";

export function writeFont(ctx: CanvasRenderingContext2D, assets: Assets, message: string, size: 1 | 2, x: number, y: number): void {
  const font = size === 1 ? assets.font : assets.fontBig;
  const letterSize = 8 * size;
  const text = message.toLowerCase();
  for (let i = 0; i < text.length; i += 1) {
    const letter = FONT_ALPHABET.indexOf(text[i]);
    if (letter >= 0) font.draw(ctx, letter, 0, x + i * letterSize, y);
  }
}
