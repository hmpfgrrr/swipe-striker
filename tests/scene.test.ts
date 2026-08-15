import { describe, expect, it } from 'vitest';
import { createInitialDefenders, getFieldLayout } from '../src/game/layout';

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
});
