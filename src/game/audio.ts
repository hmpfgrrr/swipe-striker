export type AudioProfile = 'stadium' | 'arcade';

export const AUDIO_ASSETS = {
  stadiumAtmosphere: '/audio/stadium-crowd.mp3',
  goalCheer: '/audio/goal-cheer.mp3',
} as const;

type Tone = {
  duration: number;
  volume: number;
};

type AudioProfileDefinition = {
  atmosphere: Tone;
  goal: Tone;
  negative: Tone;
  missed: Tone;
};

export const AUDIO_PROFILES: Record<AudioProfile, AudioProfileDefinition> = {
  stadium: {
    atmosphere: { duration: 4, volume: 0.035 },
    goal: { duration: 0.72, volume: 0.18 },
    negative: { duration: 0.48, volume: 0.12 },
    missed: { duration: 0.3, volume: 0.1 },
  },
  arcade: {
    atmosphere: { duration: 2.4, volume: 0.02 },
    goal: { duration: 0.34, volume: 0.16 },
    negative: { duration: 0.24, volume: 0.1 },
    missed: { duration: 0.18, volume: 0.09 },
  },
};

type AudioContextConstructor = typeof AudioContext;

const getAudioContextConstructor = (): AudioContextConstructor | undefined => {
  const scope = globalThis as typeof globalThis & {
    webkitAudioContext?: AudioContextConstructor;
  };
  return scope.AudioContext ?? scope.webkitAudioContext;
};

export class GameAudio {
  private context?: AudioContext;
  private atmosphere?: { source: AudioBufferSourceNode; gain: GainNode };
  private stadiumAtmosphere?: HTMLAudioElement;
  private stadiumGoal?: HTMLAudioElement;
  private profile: AudioProfile;

  constructor(profile: AudioProfile = 'stadium') {
    this.profile = profile;
  }

  setProfile(profile: AudioProfile): void {
    if (profile !== 'stadium') this.stopStadiumAtmosphere();
    this.profile = profile;
  }

  startAtmosphere(): void {
    if (this.profile === 'stadium') {
      this.startStadiumAtmosphere();
      return;
    }
    const context = this.getContext();
    if (!context || this.atmosphere) return;
    const definition = AUDIO_PROFILES[this.profile].atmosphere;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * definition.duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;
    source.buffer = buffer;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 650;
    gain.gain.value = definition.volume;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
    this.atmosphere = { source, gain };
  }

  stopAtmosphere(): void {
    this.stopStadiumAtmosphere();
    this.atmosphere?.source.stop();
    this.atmosphere = undefined;
  }

  playGoal(): void {
    if (this.profile === 'stadium') {
      this.playStadiumGoal();
      return;
    }
    this.playReaction('goal');
  }

  playNegative(): void {
    this.playReaction('negative');
  }

  playMissed(): void {
    this.playReaction('missed');
  }

  private playReaction(kind: 'goal' | 'negative' | 'missed'): void {
    const context = this.getContext();
    if (!context) return;
    const definition = AUDIO_PROFILES[this.profile][kind];
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const isGoal = kind === 'goal';
    const isMissed = kind === 'missed';
    oscillator.type = this.profile === 'arcade' ? 'square' : 'triangle';
    oscillator.frequency.setValueAtTime(isGoal ? 520 : isMissed ? 240 : 180, now);
    oscillator.frequency.exponentialRampToValueAtTime(isGoal ? 820 : isMissed ? 160 : 115, now + definition.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(definition.volume, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + definition.duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + definition.duration + 0.02);
    this.playCrowdBurst(context, now, definition);
  }

  private playCrowdBurst(context: AudioContext, now: number, definition: Tone): void {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * definition.duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      const progress = index / samples.length;
      samples[index] = (Math.random() * 2 - 1) * (1 - progress);
    }
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = this.profile === 'stadium' ? 720 : 1200;
    filter.Q.value = 0.6;
    gain.gain.setValueAtTime(definition.volume * 0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + definition.duration);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(now);
    source.stop(now + definition.duration + 0.02);
  }

  private startStadiumAtmosphere(): void {
    this.stadiumAtmosphere ??= new Audio(`${import.meta.env.BASE_URL}audio/stadium-crowd.mp3`);
    this.stadiumAtmosphere.loop = true;
    this.stadiumAtmosphere.volume = 0.12;
    void this.stadiumAtmosphere.play().catch(() => undefined);
  }

  private stopStadiumAtmosphere(): void {
    this.stadiumAtmosphere?.pause();
    if (this.stadiumAtmosphere) this.stadiumAtmosphere.currentTime = 0;
  }

  private playStadiumGoal(): void {
    this.stadiumGoal ??= new Audio(`${import.meta.env.BASE_URL}audio/goal-cheer.mp3`);
    this.stadiumGoal.volume = 0.5;
    this.stadiumGoal.currentTime = 0;
    void this.stadiumGoal.play().catch(() => undefined);
  }

  private getContext(): AudioContext | undefined {
    const AudioContextClass = getAudioContextConstructor();
    if (!AudioContextClass) return undefined;
    this.context ??= new AudioContextClass();
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }
}
