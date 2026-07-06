import './styles.css';
import { SoundBank } from './audio';
import { loadAssets } from './assets';
import { gameConfigFromParams } from './config';
import { EditorHost } from './editor';
import { Game } from './game';
import { InputState, mountPointerControls } from './input';
import { loadLevel, parseLevel } from './level';
import { MainMenu, resizeCanvas } from './menu';
import { isLocalMapPath, loadGameSettings, loadGameStats, loadLocalMapByPath, saveGameStats } from './storage';
import { TICK_MS } from './types';
import { Multiplayer } from './webrtc';

async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#game');
  if (!canvas) throw new Error('Missing canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');

  const params = new URLSearchParams(location.search);
  const settings = loadGameSettings();
  if (settings.width && settings.height && !isTouchLayout()) resizeCanvas(canvas, settings.width, settings.height);
  const levelPath = params.get('level') ?? '/levels/dm/open.rmm';
  const localBuffer = isLocalMapPath(levelPath) ? loadLocalMapByPath(levelPath) : undefined;
  const [assets, level] = await Promise.all([
    loadAssets(),
    localBuffer ? Promise.resolve(parseLevel(localBuffer)) : loadLevel(levelPath),
  ]);
  const sounds = new SoundBank(params.get('sound') !== 'off');
  const mode = params.get('mode') ?? 'dm';
  const input = new InputState(window);
  mountPointerControls(input);
  const game = new Game(canvas, ctx, level, assets, input, sounds, mode, gameConfigFromParams(params));
  if (settings.name) game.localPlayer.name = settings.name;
  const team = params.get('team');
  if (team === 'red' || team === 'blu') game.localPlayer.team = team;

  const playing = params.get('play') === '1';
  const sessionStart = performance.now();
  window.addEventListener('pagehide', () => {
    const stats = loadGameStats();
    stats.kills += game.localPlayer.kills;
    stats.deaths += game.localPlayer.deaths;
    stats.shots += game.localStats.shots;
    stats.hits += game.localStats.hits;
    if (playing) {
      stats.timeMs += performance.now() - sessionStart;
      stats.games += 1;
    }
    saveGameStats(stats);
    if (game.localPlayer.kills > 0) {
      navigator.sendBeacon('/kills', new Blob([JSON.stringify({ name: game.localPlayer.name, kills: game.localPlayer.kills })], { type: 'application/json' }));
    }
  });
  const editorHost = new EditorHost(canvas, ctx, assets);
  const menu = new MainMenu(canvas, ctx, assets, game, params.get('play') !== '1' && params.get('menu') !== '0', mode, editorHost);
  editorHost.onExit = () => {
    menu.active = true;
    menu.screen = 'main';
    menu.selected = 0;
  };
  const multiplayer = new Multiplayer(game);
  const room = params.get('room');
  const signal = params.get('signal') === 'broadcast' ? 'broadcast' : 'worker';
  if (room) multiplayer.connect(room, signal);
  registerServiceWorker(params);

  // On touch layouts the canvas fills the screen; keep its logical resolution
  // matched to the CSS size so pixels stay square and nothing is letterboxed.
  const fitCanvas = () => {
    if (!isTouchLayout()) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width > 0 && height > 0 && (canvas.width !== width || canvas.height !== height)) {
      canvas.width = width;
      canvas.height = height;
    }
  };
  fitCanvas();
  new ResizeObserver(fitCanvas).observe(canvas);
  window.addEventListener('resize', fitCanvas);

  canvas.addEventListener('pointerdown', (event) => {
    if (menu.active || editorHost.active) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    game.handleHudTap(
      (event.clientX - rect.left) * (canvas.width / rect.width),
      (event.clientY - rect.top) * (canvas.height / rect.height),
    );
  });

  let lastTick = performance.now();
  function frame(now: number): void {
    const inputMode = editorHost.active ? 'editor' : menu.active ? 'menu' : 'game';
    if (document.body.dataset.inputMode !== inputMode) document.body.dataset.inputMode = inputMode;
    const inGame = inputMode === 'game';
    document.body.classList.toggle('touch-can-grab', inGame && game.canGrabBuilding());
    document.body.classList.toggle('touch-holding-flag', inGame && game.localPlayer.holdingFlag !== undefined);
    if (editorHost.active) {
      lastTick = now;
      editorHost.frame();
    } else if (menu.active) {
      lastTick = now;
      menu.render();
    } else {
      while (now - lastTick >= TICK_MS) {
        game.tick(now);
        multiplayer.broadcast();
        lastTick += TICK_MS;
      }
      game.render();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  Object.assign(window, { game, multiplayer, menu, editor: editorHost });
}

function registerServiceWorker(params: URLSearchParams): void {
  if (params.get('sw') === 'off' || !('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV && params.get('sw') !== 'on') return;
  const register = () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // The game remains playable when install support is unavailable.
    });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

function isTouchLayout(): boolean {
  return matchMedia('(pointer: coarse)').matches || innerWidth <= 820 || innerHeight <= 520;
}

void main();
