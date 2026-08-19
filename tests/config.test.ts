import { describe, expect, it } from 'vitest';
import packageJson from '../package.json';
import { APP_VERSION, GAME_HEIGHT, GAME_WIDTH, PORTRAIT_ASPECT_RATIO } from '../src/game/config';
describe('mobile game configuration', () => {
  it('uses a portrait canvas baseline', () => {
    expect(GAME_WIDTH).toBeLessThan(GAME_HEIGHT);
    expect(PORTRAIT_ASPECT_RATIO).toBeCloseTo(390 / 844);
  });

  it('exposes the complete app version', () => {
    expect(APP_VERSION).toBe(packageJson.version);
  });
});
