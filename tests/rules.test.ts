import { describe, expect, it } from 'vitest';
import { evaluateShot, evaluateShotFrame, getShotOutcomeLabel } from '../src/game/rules';

const goal = { x: 40, y: 0, width: 20, height: 10 };
const keeper = { center: { x: 0, y: 20 }, radius: 4 };
const bounds = { left: 0, right: 100, top: 0, bottom: 100, ballRadius: 0 };

describe('shot rules', () => {
  it('labels a shot that does not reach the goal line as verhungert', () => {
    expect(getShotOutcomeLabel('missed')).toBe('VERHUNGERT');
  });
  it('scores a clean shot', () =>
    expect(
      evaluateShot(
        [
          { x: 0, y: 50 },
          { x: 50, y: 5 },
        ],
        [],
        keeper,
        goal,
      ),
    ).toBe('goal'));
  it('blocks before goal', () =>
    expect(
      evaluateShot(
        [
          { x: 0, y: 50 },
          { x: 50, y: 5 },
        ],
        [{ center: { x: 20, y: 32 }, radius: 5 }],
        keeper,
        goal,
      ),
    ).toBe('blocked'));
  it('saves at keeper', () =>
    expect(
      evaluateShot(
        [
          { x: 0, y: 50 },
          { x: 0, y: 20 },
          { x: 50, y: 5 },
        ],
        [],
        keeper,
        goal,
      ),
    ).toBe('saved'));
  it('misses outside goal', () =>
    expect(
      evaluateShot(
        [
          { x: 0, y: 50 },
          { x: 80, y: 5 },
        ],
        [],
        keeper,
        goal,
      ),
    ).toBe('missed'));
  it('returns out at a side boundary', () =>
    expect(evaluateShotFrame({ x: 5, y: 40 }, { x: -1, y: 35 }, [], keeper, goal, bounds)).toBe('out'));
  it('scores a legal goal crossing', () =>
    expect(evaluateShotFrame({ x: 50, y: 15 }, { x: 50, y: 5 }, [], keeper, goal, bounds)).toBe('goal'));
  it('uses the segment intersection x for a diagonal goal crossing', () =>
    expect(evaluateShotFrame({ x: 30, y: 15 }, { x: 70, y: 5 }, [], keeper, goal, bounds)).toBe('goal'));
  it('returns out across the top outside the goal', () =>
    expect(evaluateShotFrame({ x: 20, y: 5 }, { x: 20, y: -1 }, [], keeper, goal, bounds)).toBe('out'));
  it('gives defender contact precedence over a goal crossing', () =>
    expect(
      evaluateShotFrame(
        { x: 50, y: 15 },
        { x: 50, y: 5 },
        [{ center: { x: 50, y: 10 }, radius: 3 }],
        keeper,
        goal,
        bounds,
      ),
    ).toBe('blocked'));
  it('gives goalkeeper contact precedence over a goal crossing', () =>
    expect(
      evaluateShotFrame({ x: 50, y: 15 }, { x: 50, y: 5 }, [], { center: { x: 50, y: 10 }, radius: 3 }, goal, bounds),
    ).toBe('saved'));
  it('gives defender contact precedence over goalkeeper contact', () =>
    expect(
      evaluateShotFrame(
        { x: 50, y: 20 },
        { x: 50, y: 5 },
        [{ center: { x: 50, y: 12 }, radius: 3 }],
        { center: { x: 50, y: 12 }, radius: 3 },
        goal,
        bounds,
      ),
    ).toBe('blocked'));
  it('includes the ball radius in visible defender contact', () =>
    expect(
      evaluateShotFrame({ x: 20, y: 30 }, { x: 80, y: 30 }, [{ center: { x: 50, y: 48 }, radius: 10 }], keeper, goal, {
        ...bounds,
        ballRadius: 10,
      }),
    ).toBe('blocked'));
  it('includes the ball radius in visible goalkeeper contact', () =>
    expect(
      evaluateShotFrame({ x: 20, y: 30 }, { x: 80, y: 30 }, [], { center: { x: 50, y: 48 }, radius: 10 }, goal, {
        ...bounds,
        ballRadius: 10,
      }),
    ).toBe('saved'));
  it('returns null for an in-bounds nonterminal frame', () =>
    expect(evaluateShotFrame({ x: 50, y: 50 }, { x: 52, y: 45 }, [], keeper, goal, bounds)).toBeNull());
});
