// The ten emoji offered above the input while typing. CTRL+1..9 pick the first
// nine, CTRL+0 picks the tenth, matching the on-screen number hints.
export const CHAT_EMOJIS = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '😎', '😢', '😡', '🚀'];

const MAX_MESSAGE_LENGTH = 120;
const MESSAGE_LIFETIME_MS = 9000;
const MAX_VISIBLE_MESSAGES = 6;
// Height of the bottom HUD bar in the canvas' logical pixels (see renderHud).
const HUD_BAR_HEIGHT = 45;

export interface ChatMessage {
  name: string;
  text: string;
  at: number;
}

// DOM-based chat overlay: a real <input> is used so mobile keyboards (and their
// built-in dictation and emoji) work without extra models, while messages are
// rendered as HTML so the nickname can be bold and emoji render natively.
export class Chat {
  open = false;
  readonly messages: ChatMessage[] = [];
  onSubmit?: (text: string) => void;
  onOpen?: () => void;
  onClose?: () => void;

  private readonly layer: HTMLDivElement;
  private readonly log: HTMLDivElement;
  private readonly form: HTMLDivElement;
  private readonly emojiRow: HTMLDivElement;
  private readonly input: HTMLInputElement;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly canOpen: () => boolean,
    root: HTMLElement = document.body,
  ) {
    this.layer = document.createElement('div');
    this.layer.className = 'chat-layer';

    this.log = document.createElement('div');
    this.log.className = 'chat-log';
    this.log.setAttribute('aria-live', 'polite');

    this.form = document.createElement('div');
    this.form.className = 'chat-form';

    this.emojiRow = document.createElement('div');
    this.emojiRow.className = 'chat-emoji-row';
    CHAT_EMOJIS.forEach((emoji, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chat-emoji';
      const hint = (index + 1) % 10;
      button.textContent = emoji;
      button.title = `Ctrl+${hint}`;
      button.setAttribute('aria-label', `Insert ${emoji} (Ctrl+${hint})`);
      button.dataset.hint = `${hint}`;
      // pointerdown keeps focus on the input (a plain click would blur and close it).
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        this.insertEmoji(emoji);
      });
      this.emojiRow.append(button);
    });

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'chat-input';
    this.input.maxLength = MAX_MESSAGE_LENGTH;
    this.input.autocomplete = 'off';
    this.input.setAttribute('aria-label', 'Chat message');
    this.input.placeholder = 'say something…';
    this.input.enterKeyHint = 'send';

    this.input.addEventListener('keydown', (event) => {
      // The game listens on window; stop chat keystrokes from leaking there.
      event.stopPropagation();
      if (event.ctrlKey && /^(Digit|Numpad)[0-9]$/.test(event.code)) {
        const digit = Number(event.code.slice(-1));
        const index = digit === 0 ? 9 : digit - 1;
        if (index < CHAT_EMOJIS.length) {
          event.preventDefault();
          this.insertEmoji(CHAT_EMOJIS[index]);
        }
        return;
      }
      if (event.code === 'Enter' || event.code === 'NumpadEnter') {
        event.preventDefault();
        this.submit();
      } else if (event.code === 'Escape') {
        event.preventDefault();
        this.close();
      }
    });
    this.input.addEventListener('blur', () => {
      if (this.open) this.close();
    });

    this.form.append(this.emojiRow, this.input);
    this.layer.append(this.log, this.form);
    root.append(this.layer);

    window.addEventListener('keydown', (event) => {
      if (this.open || event.code !== 'KeyT') return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (!this.canOpen()) return;
      event.preventDefault();
      this.openInput();
    });
  }

  private openInput(): void {
    if (this.open) return;
    this.open = true;
    this.input.value = '';
    this.layer.classList.add('is-typing');
    this.onOpen?.();
    // Focus after the current event so the 'T' keystroke never lands in the field.
    window.setTimeout(() => this.input.focus(), 0);
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.input.value = '';
    this.layer.classList.remove('is-typing');
    this.input.blur();
    this.onClose?.();
  }

  private submit(): void {
    const text = this.input.value.trim();
    this.close();
    if (text) this.onSubmit?.(text);
  }

  private insertEmoji(emoji: string): void {
    const { value } = this.input;
    const start = this.input.selectionStart ?? value.length;
    const end = this.input.selectionEnd ?? value.length;
    this.input.value = `${value.slice(0, start)}${emoji}${value.slice(end)}`;
    const caret = start + emoji.length;
    this.input.setSelectionRange(caret, caret);
    this.input.focus();
  }

  addMessage(name: string, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.messages.push({ name, text: trimmed.slice(0, MAX_MESSAGE_LENGTH), at: performance.now() });
    if (this.messages.length > MAX_VISIBLE_MESSAGES) this.messages.splice(0, this.messages.length - MAX_VISIBLE_MESSAGES);
    this.renderLog();
  }

  // Drops expired messages and keeps the overlay aligned to the canvas so the
  // log always sits just above the bottom HUD bar, centered horizontally.
  update(now = performance.now()): void {
    const before = this.messages.length;
    while (this.messages.length > 0 && now - this.messages[0].at > MESSAGE_LIFETIME_MS) this.messages.shift();
    if (this.messages.length !== before) this.renderLog();
    this.layout();
  }

  private layout(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const scale = rect.height / this.canvas.height;
    this.layer.style.left = `${rect.left}px`;
    this.layer.style.top = `${rect.top}px`;
    this.layer.style.width = `${rect.width}px`;
    this.layer.style.height = `${Math.max(0, rect.height - HUD_BAR_HEIGHT * scale)}px`;
  }

  private renderLog(): void {
    this.log.replaceChildren();
    for (const message of this.messages) {
      const line = document.createElement('div');
      line.className = 'chat-line';
      const name = document.createElement('span');
      name.className = 'chat-name';
      name.textContent = message.name;
      const body = document.createElement('span');
      body.className = 'chat-text';
      body.textContent = message.text;
      line.append(name, body);
      this.log.append(line);
    }
  }
}
