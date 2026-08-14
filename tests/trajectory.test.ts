import { describe, expect, it } from 'vitest';
import * as trajectory from '../src/game/trajectory';

const bounds = { left: 20, right: 370, top: 28, bottom: 816, ballRadius: 10 };

function signChanges(points: { x: number; y: number }[]): number {
  const signs = points
    .slice(1)
    .map((point, index) => Math.sign(point.x - points[index].x))
    .filter(sign => sign !== 0);

  return signs.slice(1).reduce((count, sign, index) => count + (sign !== signs[index] ? 1 : 0), 0);
}

describe('trajectory', () => {
  it('removes duplicates and limits points', () =>
    expect(trajectory.normalizePath([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], 2)).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 2 },
    ]));

  it('samples a line including its endpoints', () =>
    expect(trajectory.samplePolyline([{ x: 0, y: 0 }, { x: 10, y: 0 }], 4)).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 8, y: 0 },
      { x: 10, y: 0 },
    ]));

  it('turns a hook-shaped gesture into one smooth 32-sample upward shot inside the playable bounds', () => {
    const createShotPath = (trajectory as any).createShotPath as any;

    expect(createShotPath).toBeTypeOf('function');

    const result = createShotPath(
      [
        { x: 195, y: 692 },
        { x: 280, y: 580 },
        { x: 100, y: 430 },
        { x: 230, y: 250 },
      ],
      { x: 195, y: 692 },
      bounds,
    );

    expect(result.valid).toBe(true);
    if (!result.valid) return;

    expect(result.points).toHaveLength(32);
    expect(result.points.every((point, index) => index === 0 || point.y <= result.points[index - 1].y)).toBe(true);
    expect(Math.max(...result.points.map(point => point.x))).toBeLessThanOrEqual(360);
    expect(Math.min(...result.points.map(point => point.x))).toBeGreaterThanOrEqual(30);
    expect(result.points.every(point => point.y >= 18 && point.y <= 806)).toBe(true);
    expect(signChanges(result.points)).toBeLessThanOrEqual(1);
  });

  it('rejects a 40px upward gesture as too-short', () => {
    const createShotPath = (trajectory as any).createShotPath as any;

    expect(createShotPath).toBeTypeOf('function');

    const result = createShotPath(
      [
        { x: 200, y: 500 },
        { x: 220, y: 460 },
      ],
      { x: 200, y: 500 },
      bounds,
    );

    expect(result).toEqual({ valid: false, reason: 'too-short' });
  });

  it('rejects a fully downward gesture as backward', () => {
    const createShotPath = (trajectory as any).createShotPath as any;

    expect(createShotPath).toBeTypeOf('function');

    const result = createShotPath(
      [
        { x: 200, y: 500 },
        { x: 220, y: 540 },
        { x: 240, y: 580 },
      ],
      { x: 200, y: 500 },
      bounds,
    );

    expect(result).toEqual({ valid: false, reason: 'backward' });
  });

  it('caps lateral displacement without reversing direction more than once', () => {
    const createShotPath = (trajectory as any).createShotPath as any;

    expect(createShotPath).toBeTypeOf('function');

    const result = createShotPath(
      [
        { x: 195, y: 700 },
        { x: 340, y: 620 },
        { x: 60, y: 420 },
        { x: 300, y: 240 },
      ],
      { x: 195, y: 700 },
      bounds,
    );

    expect(result.valid).toBe(true);
    if (!result.valid) return;

    expect(result.points).toHaveLength(32);
    expect(signChanges(result.points)).toBeLessThanOrEqual(1);
    expect(Math.max(...result.points.map(point => point.x))).toBeLessThanOrEqual(360);
    expect(Math.min(...result.points.map(point => point.x))).toBeGreaterThanOrEqual(30);
  });
});
