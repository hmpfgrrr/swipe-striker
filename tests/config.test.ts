import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH, PORTRAIT_ASPECT_RATIO } from '../src/game/config';
describe('mobile game configuration', () => {
  it('uses a portrait canvas baseline', () => {
    expect(GAME_WIDTH).toBeLessThan(GAME_HEIGHT);
    expect(PORTRAIT_ASPECT_RATIO).toBeCloseTo(390 / 844);
  });
});
