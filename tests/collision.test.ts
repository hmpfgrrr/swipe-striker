import { describe, expect, it } from 'vitest';
import { pointInGoal, segmentIntersectsCircle } from '../src/game/collision';
describe('collision', () => {
  it('detects a segment crossing a defender', () =>
    expect(segmentIntersectsCircle({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 }, 2)).toBe(true));
  it('checks goal bounds', () => {
    const goal = { x: 10, y: 10, width: 20, height: 10 };
    expect(pointInGoal({ x: 20, y: 15 }, goal)).toBe(true);
    expect(pointInGoal({ x: 31, y: 15 }, goal)).toBe(false);
  });
});
