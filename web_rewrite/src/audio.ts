export type SoundName = 'shoot' | 'metal-hit' | 'brick-hit';

const SOUND_URLS: Record<SoundName, string> = {
  shoot: '/assets/audio/Shoot.wav',
  'metal-hit': '/assets/audio/MetalHit.wav',
  'brick-hit': '/assets/audio/BrickHit.wav',
};

const SOUND_VOLUMES: Record<SoundName, number> = {
  shoot: 0.125,
  'metal-hit': 0.125,
  'brick-hit': 0.5,
};

export class SoundBank {
  readonly events: SoundName[] = [];
  private readonly sounds = new Map<SoundName, HTMLAudioElement>();

  constructor(private readonly enabled = true) {
    for (const [name, url] of Object.entries(SOUND_URLS) as Array<[SoundName, string]>) {
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.sounds.set(name, audio);
    }
  }

  play(name: SoundName): void {
    this.events.push(name);
    if (!this.enabled) return;
    const source = this.sounds.get(name);
    if (!source) return;
    const audio = source.cloneNode(true) as HTMLAudioElement;
    audio.volume = SOUND_VOLUMES[name];
    const promise = audio.play();
    if (promise) promise.catch(() => undefined);
  }
}
