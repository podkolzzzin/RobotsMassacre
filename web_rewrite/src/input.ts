export class InputState {
  readonly down = new Set<string>();
  attackClicked = false;
  interactClicked = false;
  selfDamageClicked = false;
  private readonly inventoryClicked = new Set<number>();
  private readonly movementOrder: string[] = [];
  private suppressAttackHeld = false;
  private suspended = false;

  constructor(target: Window) {
    target.addEventListener('keydown', (event) => {
      if (this.suspended) return;
      this.press(event.code, !event.repeat);
      const digit = inventoryDigit(event.code);
      if (digit !== undefined) this.inventoryClicked.add(digit);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'Tab'].includes(event.code)) event.preventDefault();
    });
    target.addEventListener('keyup', (event) => {
      if (this.suspended) return;
      this.release(event.code);
    });
    target.addEventListener('blur', () => this.releaseAll());
  }

  // While a text field (the in-game chat) owns the keyboard, ignore game keys so
  // typing WASD into a message never drives the tank, and release anything held.
  suspend(): void {
    if (this.suspended) return;
    this.suspended = true;
    this.releaseAll();
    this.attackClicked = false;
    this.interactClicked = false;
    this.selfDamageClicked = false;
    this.inventoryClicked.clear();
  }

  resume(): void {
    this.suspended = false;
  }

  get isSuspended(): boolean {
    return this.suspended;
  }

  consumeAttack(): boolean {
    if (this.suppressAttackHeld) {
      if (!this.down.has('Space')) this.suppressAttackHeld = false;
      this.attackClicked = false;
      return false;
    }
    const clicked = this.attackClicked;
    this.attackClicked = false;
    return clicked || this.down.has('Space');
  }

  suppressAttackUntilRelease(): void {
    this.attackClicked = false;
    if (this.down.has('Space')) this.suppressAttackHeld = true;
  }

  pressVirtual(code: string): void {
    this.press(code, true);
  }

  releaseVirtual(code: string): void {
    this.release(code);
  }

  // Diagonal movement is prohibited by game design (sprites only face
  // up/down/left/right), so only the most recently pressed movement key
  // that is still held drives movement — never two axes at once. This is
  // the same "latest press wins" tie-break already used for opposite keys,
  // just applied across all movement keys instead of per-axis.
  movementVector(): { x: number; y: number } {
    return axisVectorForCode(this.latestMovementCode());
  }

  latestMovementCode(): string | undefined {
    for (let i = this.movementOrder.length - 1; i >= 0; i -= 1) {
      const code = this.movementOrder[i];
      if (this.down.has(code)) return code;
    }
    return undefined;
  }

  consumeInventoryKey(): number | undefined {
    const [key] = this.inventoryClicked;
    if (key !== undefined) this.inventoryClicked.delete(key);
    return key;
  }

  consumeInteract(): boolean {
    const clicked = this.interactClicked;
    this.interactClicked = false;
    return clicked;
  }

  consumeSelfDamage(): boolean {
    const clicked = this.selfDamageClicked;
    this.selfDamageClicked = false;
    return clicked;
  }

  private press(code: string, clicked: boolean): void {
    const wasDown = this.down.has(code);
    this.down.add(code);
    if (!wasDown && isMovementCode(code)) this.movementOrder.push(code);
    if (code === 'Space' && clicked) this.attackClicked = true;
    if (code === 'KeyE' && clicked) this.interactClicked = true;
    if (code === 'KeyZ' && clicked) this.selfDamageClicked = true;
  }

  private release(code: string): void {
    this.down.delete(code);
    if (isMovementCode(code)) {
      const index = this.movementOrder.indexOf(code);
      if (index !== -1) this.movementOrder.splice(index, 1);
    }
    if (code === 'Space') this.suppressAttackHeld = false;
  }

  private releaseAll(): void {
    this.down.clear();
    this.movementOrder.length = 0;
    this.suppressAttackHeld = false;
  }
}

export function mountPointerControls(input: InputState, root: HTMLElement = document.body): HTMLElement {
  const existing = document.querySelector<HTMLElement>('.touch-layer');
  if (existing) return existing;

  const layer = document.createElement('div');
  layer.className = 'touch-layer';
  layer.setAttribute('aria-label', 'On-screen controls');

  // Editor mode keeps a d-pad cluster: precise single-cell steps beat a joystick there.
  const controls = document.createElement('div');
  controls.className = 'touch-controls';
  const pad = document.createElement('div');
  pad.className = 'touch-pad';
  pad.append(
    controlButton('W', 'KeyW', input, 'touch-w'),
    controlButton('A', 'KeyA', input, 'touch-a'),
    controlButton('S', 'KeyS', input, 'touch-s'),
    controlButton('D', 'KeyD', input, 'touch-d'),
  );
  const actions = document.createElement('div');
  actions.className = 'touch-actions';
  actions.append(controlButton('SPACE', 'Space', input, 'touch-space'));
  controls.append(pad, actions);

  // Contextual actions collapse away when they have nothing to act on.
  const actionStack = document.createElement('div');
  actionStack.className = 'action-stack';
  actionStack.append(
    controlButton('DROP', 'KeyZ', input, 'drop-button', 150),
    controlButton('GRAB', 'KeyE', input, 'grab-button'),
  );

  layer.append(
    controls,
    buildJoystick(input),
    actionStack,
    controlButton('FIRE', 'Space', input, 'fire-button'),
    controlButton('ESC', 'Escape', input, 'esc-button'),
  );
  root.append(layer);
  return layer;
}

// Floating virtual joystick: the base appears where the thumb lands on the left
// side of the screen and the drag direction maps to the dominant movement axis.
function buildJoystick(input: InputState): HTMLElement {
  const zone = document.createElement('div');
  zone.className = 'joy-zone';
  zone.setAttribute('aria-label', 'Virtual joystick area');
  const base = document.createElement('div');
  base.className = 'joy-base';
  const knob = document.createElement('div');
  knob.className = 'joy-knob';
  base.append(knob);
  zone.append(base);

  const MAX_RADIUS = 44;
  const DEAD_ZONE = 12;
  let activePointer: number | null = null;
  let originX = 0;
  let originY = 0;
  let currentCode: string | null = null;

  const setCode = (code: string | null) => {
    if (code === currentCode) return;
    if (currentCode) {
      input.releaseVirtual(currentCode);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: currentCode, bubbles: true }));
    }
    currentCode = code;
    if (code) {
      input.pressVirtual(code);
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }));
    }
  };

  const update = (event: PointerEvent) => {
    const dx = event.clientX - originX;
    const dy = event.clientY - originY;
    const length = Math.hypot(dx, dy);
    const clamp = length > MAX_RADIUS ? MAX_RADIUS / length : 1;
    knob.style.transform = `translate(${dx * clamp}px, ${dy * clamp}px)`;
    if (length < DEAD_ZONE) setCode(null);
    else if (Math.abs(dx) >= Math.abs(dy)) setCode(dx > 0 ? 'KeyD' : 'KeyA');
    else setCode(dy > 0 ? 'KeyS' : 'KeyW');
  };

  const end = () => {
    activePointer = null;
    setCode(null);
    base.classList.remove('is-active');
  };

  zone.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    activePointer = event.pointerId;
    try {
      zone.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic test events do not always register an active pointer.
    }
    originX = event.clientX;
    originY = event.clientY;
    base.style.left = `${event.clientX}px`;
    base.style.top = `${event.clientY}px`;
    base.classList.add('is-active');
    update(event);
  });
  zone.addEventListener('pointermove', (event) => {
    if (event.pointerId === activePointer) update(event);
  });
  zone.addEventListener('pointerup', (event) => {
    if (event.pointerId === activePointer) end();
  });
  zone.addEventListener('pointercancel', end);
  window.addEventListener('blur', end);
  zone.addEventListener('contextmenu', (event) => event.preventDefault());
  return zone;
}

function inventoryDigit(code: string): number | undefined {
  if (/^Digit[1-9]$/.test(code)) return Number(code.slice(5));
  if (/^Numpad[1-9]$/.test(code)) return Number(code.slice(6));
  return undefined;
}

function isMovementCode(code: string): boolean {
  return ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(code);
}

function axisVectorForCode(code: string | undefined): { x: number; y: number } {
  if (code === 'KeyA' || code === 'ArrowLeft') return { x: -1, y: 0 };
  if (code === 'KeyD' || code === 'ArrowRight') return { x: 1, y: 0 };
  if (code === 'KeyW' || code === 'ArrowUp') return { x: 0, y: -1 };
  if (code === 'KeyS' || code === 'ArrowDown') return { x: 0, y: 1 };
  return { x: 0, y: 0 };
}

function controlButton(label: string, code: string, input: InputState, className: string, repeatMs?: number): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `touch-button ${className}`;
  button.textContent = label;
  button.setAttribute('aria-label', label === 'SPACE' ? 'Shoot' : `Move ${label}`);
  let repeatTimer: number | undefined;

  const press = (event: PointerEvent) => {
    event.preventDefault();
    if (event.pointerId !== undefined) {
      try {
        button.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic test events do not always register an active pointer.
      }
    }
    input.pressVirtual(code);
    // Menus and the map editor listen for keyboard events, so on-screen buttons emit them too.
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }));
    // Mimic keyboard auto-repeat for actions that expect it (e.g. held self-damage).
    if (repeatMs && repeatTimer === undefined) {
      repeatTimer = window.setInterval(() => {
        input.pressVirtual(code);
        window.dispatchEvent(new KeyboardEvent('keydown', { code, repeat: true, bubbles: true, cancelable: true }));
      }, repeatMs);
    }
    button.classList.add('is-pressed');
  };
  const stopRepeat = () => {
    if (repeatTimer !== undefined) {
      window.clearInterval(repeatTimer);
      repeatTimer = undefined;
    }
  };
  const release = (event: PointerEvent) => {
    event.preventDefault();
    if (event.pointerId !== undefined && button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    stopRepeat();
    input.releaseVirtual(code);
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    button.classList.remove('is-pressed');
  };

  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', () => {
    stopRepeat();
    input.releaseVirtual(code);
    button.classList.remove('is-pressed');
  });
  button.addEventListener('contextmenu', (event) => event.preventDefault());
  return button;
}
