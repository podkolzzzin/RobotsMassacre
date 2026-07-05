import './styles.css';
import { SoundBank } from './audio';
import { loadAssets } from './assets';
import { EditorHost } from './editor';
import { Game } from './game';
import { InputState } from './input';
import { loadLevel, parseLevel } from './level';
import { MainMenu } from './menu';
import { isLocalMapPath, loadLocalMapByPath } from './storage';
import { TICK_MS } from './types';
import { Multiplayer } from './webrtc';

async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#game');
  if (!canvas) throw new Error('Missing canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');

  const params = new URLSearchParams(location.search);
  const levelPath = params.get('level') ?? '/levels/dm/open.rmm';
  const localBuffer = isLocalMapPath(levelPath) ? loadLocalMapByPath(levelPath) : undefined;
  const [assets, level] = await Promise.all([
    loadAssets(),
    localBuffer ? Promise.resolve(parseLevel(localBuffer)) : loadLevel(levelPath),
  ]);
  const sounds = new SoundBank(params.get('sound') !== 'off');
  const mode = params.get('mode') ?? 'dm';
  const game = new Game(canvas, ctx, level, assets, new InputState(window), sounds, mode);
  const team = params.get('team');
  if (team === 'red' || team === 'blu') game.localPlayer.team = team;
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

  let lastTick = performance.now();
  function frame(now: number): void {
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

void main();
