import { describe, expect, it } from 'vitest';
import { AUDIO_ASSETS, AUDIO_PROFILES, type AudioProfile } from '../src/game/audio';

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
});
