export class InputState {
  readonly down = new Set<string>();
  attackClicked = false;
  interactClicked = false;
  selfDamageClicked = false;
  private readonly inventoryClicked = new Set<number>();

  constructor(target: Window) {
    target.addEventListener('keydown', (event) => {
      this.down.add(event.code);
      if (event.code === 'Space') this.attackClicked = true;
      if (event.code === 'KeyE') this.interactClicked = true;
      if (event.code === 'KeyZ') this.selfDamageClicked = true;
      const digit = inventoryDigit(event.code);
      if (digit !== undefined) this.inventoryClicked.add(digit);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(event.code)) event.preventDefault();
    });
    target.addEventListener('keyup', (event) => {
      this.down.delete(event.code);
    });
    target.addEventListener('blur', () => this.down.clear());
  }

  consumeAttack(): boolean {
    const clicked = this.attackClicked;
    this.attackClicked = false;
    return clicked || this.down.has('Space');
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
}

function inventoryDigit(code: string): number | undefined {
  if (/^Digit[1-9]$/.test(code)) return Number(code.slice(5));
  if (/^Numpad[1-9]$/.test(code)) return Number(code.slice(6));
  return undefined;
}
