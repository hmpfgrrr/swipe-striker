import { describe, expect, it } from 'vitest';
import { createInitialDefenders, getFieldLayout } from '../src/game/layout';
import { createDefenderNumbers, createDynamicDefenders } from '../src/game/layout';

describe('field layout', () => {
  it('creates three defenders inside the portrait field', () => {
    const defenders = createInitialDefenders(390, 844);
    expect(defenders).toHaveLength(3);
    defenders.forEach((defender) => {
      expect(defender.center.x).toBeGreaterThan(defender.radius);
      expect(defender.center.x).toBeLessThan(390 - defender.radius);
    });
  });
  it('assigns bounded patrol ranges to defenders', () => {
    expect(createInitialDefenders(390, 844).map((defender) => defender.patrolHalfWidth)).toEqual([35, 45, 30]);
  });
  it('keeps goal above ball and goalkeeper', () => {
    const field = getFieldLayout(390, 844);
    expect(field.goal.y + field.goal.height).toBeLessThan(field.ball.y);
    expect(field.goalkeeper.center.y).toBeLessThan(field.ball.y);
  });
  it('assigns every defender a unique free shirt number from 2 to 4', () => {
    expect(createDefenderNumbers(() => 0).sort()).toEqual([2, 3, 4]);
    expect(new Set(createDefenderNumbers(() => 0.8)).size).toBe(3);
    expect(createDefenderNumbers(() => 0.8).every((number) => number >= 2 && number <= 4)).toBe(true);
  });
  it('creates a different but bounded defender round from a different random seed', () => {
    const first = createDynamicDefenders(390, 844, () => 0.1);
    const second = createDynamicDefenders(390, 844, () => 0.9);
    expect(first).not.toEqual(second);
    [...first, ...second].forEach((defender) => {
      expect(defender.center.x).toBeGreaterThanOrEqual(defender.radius + 20);
      expect(defender.center.x).toBeLessThanOrEqual(370 - defender.radius);
      expect(defender.center.y).toBeGreaterThan(defender.radius);
      expect(defender.center.y).toBeLessThanOrEqual(844 * 0.56);
      expect(defender.patrolDuration).toBeGreaterThan(0);
      expect(defender.patrolStartAtEnd).toBeTypeOf('boolean');
    });
    for (let index = 0; index < first.length; index += 1) {
      for (let other = index + 1; other < first.length; other += 1) {
        expect(
          Math.hypot(first[index].center.x - first[other].center.x, first[index].center.y - first[other].center.y),
        ).toBeGreaterThanOrEqual(78);
      }
    }
  });
});
