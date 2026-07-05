export class InputState {
  readonly down = new Set<string>();
  attackClicked = false;
  interactClicked = false;
  selfDamageClicked = false;
  private readonly inventoryClicked = new Set<number>();
  private readonly movementOrder: string[] = [];
  private suppressAttackHeld = false;

  constructor(target: Window) {
    target.addEventListener('keydown', (event) => {
      this.press(event.code, !event.repeat);
      const digit = inventoryDigit(event.code);
      if (digit !== undefined) this.inventoryClicked.add(digit);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'Tab'].includes(event.code)) event.preventDefault();
    });
    target.addEventListener('keyup', (event) => {
      this.release(event.code);
    });
    target.addEventListener('blur', () => this.releaseAll());
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

  movementVector(): { x: number; y: number } {
    const left = this.down.has('KeyA') || this.down.has('ArrowLeft');
    const right = this.down.has('KeyD') || this.down.has('ArrowRight');
    const up = this.down.has('KeyW') || this.down.has('ArrowUp');
    const down = this.down.has('KeyS') || this.down.has('ArrowDown');
    return {
      x: (right ? 1 : 0) - (left ? 1 : 0),
      y: (down ? 1 : 0) - (up ? 1 : 0),
    };
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

  layer.append(controls, buildJoystick(input), controlButton('FIRE', 'Space', input, 'fire-button'), controlButton('ESC', 'Escape', input, 'esc-button'));
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

function controlButton(label: string, code: string, input: InputState, className: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `touch-button ${className}`;
  button.textContent = label;
  button.setAttribute('aria-label', label === 'SPACE' ? 'Shoot' : `Move ${label}`);

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
    button.classList.add('is-pressed');
  };
  const release = (event: PointerEvent) => {
    event.preventDefault();
    if (event.pointerId !== undefined && button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    input.releaseVirtual(code);
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    button.classList.remove('is-pressed');
  };

  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', () => {
    input.releaseVirtual(code);
    button.classList.remove('is-pressed');
  });
  button.addEventListener('contextmenu', (event) => event.preventDefault());
  return button;
}
