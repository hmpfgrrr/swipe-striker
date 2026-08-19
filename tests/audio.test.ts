import { describe, expect, it } from 'vitest';
import {
  AUDIO_ASSETS,
  AUDIO_PROFILES,
  primeAudioElement,
  shouldPauseAudio,
  type AudioProfile,
} from '../src/game/audio';

describe('audio profiles', () => {
  it('references the local stadium assets', () => {
    expect(AUDIO_ASSETS.stadiumAtmosphere).toBe('/audio/stadium-crowd.mp3');
    expect(AUDIO_ASSETS.goalCheer).toBe('/audio/goal-cheer.mp3');
  });

  it('provides restrained stadium and arcade variants', () => {
    const profiles = Object.keys(AUDIO_PROFILES) as AudioProfile[];

    expect(profiles).toEqual(['stadium', 'arcade']);
    expect(AUDIO_PROFILES.stadium.atmosphere).toMatchObject({ duration: 4, volume: 0.035 });
    expect(AUDIO_PROFILES.stadium.goal.duration).toBe(0.72);
    expect(AUDIO_PROFILES.stadium.negative.duration).toBe(0.48);
    expect(AUDIO_PROFILES.stadium.missed.duration).toBe(0.3);
    expect(AUDIO_PROFILES.arcade.atmosphere).toMatchObject({ duration: 2.4, volume: 0.02 });
    expect(AUDIO_PROFILES.arcade.goal.duration).toBe(0.34);
    expect(AUDIO_PROFILES.arcade.negative.duration).toBe(0.24);
    expect(AUDIO_PROFILES.arcade.missed.duration).toBe(0.18);
  });

  it('pauses audio when the app becomes hidden or leaves the page', () => {
    expect(shouldPauseAudio('hidden', 'visibilitychange')).toBe(true);
    expect(shouldPauseAudio('visible', 'pagehide')).toBe(true);
    expect(shouldPauseAudio('visible', 'visibilitychange')).toBe(false);
  });

  it('primes a goal audio element during the user gesture', async () => {
    let playCount = 0;
    let pauseCount = 0;
    const audio = {
      currentTime: 1.2,
      volume: 0.5,
      play: () => {
        playCount += 1;
        return Promise.resolve();
      },
      pause: () => {
        pauseCount += 1;
      },
    };

    await primeAudioElement(audio, 0.5);

    expect(playCount).toBe(1);
    expect(pauseCount).toBe(1);
    expect(audio.currentTime).toBe(0);
    expect(audio.volume).toBe(0.5);
  });
});
