import type { PitchBounds, Point, ShotPathResult } from './types';

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));
const reflect = (value: number, minimum: number, maximum: number): number => {
  const range = maximum - minimum;
  if (range <= 0) return minimum;
  const period = range * 2;
  const normalized = (((value - minimum) % period) + period) % period;
  return minimum + (normalized <= range ? normalized : period - normalized);
};

export function createShotPath(gesture: Point[], start: Point, bounds: PitchBounds): ShotPathResult {
  const minX = bounds.left + bounds.ballRadius;
  const maxX = bounds.right - bounds.ballRadius;
  const minY = bounds.top - bounds.ballRadius;
  const maxY = bounds.bottom - bounds.ballRadius;
  const accepted: Point[] = [{ x: clamp(start.x, minX, maxX), y: clamp(start.y, minY, maxY) }];
  let rawEndX = start.x;

  for (const rawPoint of gesture) {
    const x = bounds.sideBounce ? reflect(rawPoint.x, minX, maxX) : clamp(rawPoint.x, minX, maxX);
    const point = { x, y: clamp(rawPoint.y, minY, maxY) };
    if (point.y < accepted[accepted.length - 1].y) {
      accepted.push(point);
      rawEndX = rawPoint.x;
    }
  }

  if (accepted.length === 1) return { valid: false, reason: 'backward' };
  const end = accepted[accepted.length - 1];
  const upwardProgress = accepted[0].y - end.y;
  if (upwardProgress < 80) return { valid: false, reason: 'too-short' };

  const deviations = accepted.slice(1, -1).map((point) => {
    const progress = (accepted[0].y - point.y) / upwardProgress;
    const straightX = accepted[0].x + (end.x - accepted[0].x) * progress;
    return point.x - straightX;
  });
  const averageDeviation = deviations.length
    ? deviations.reduce((sum, value) => sum + value, 0) / deviations.length
    : 0;
  const extendedEndY = Math.max(minY, end.y - 120);
  const extendedRawEndX = bounds.sideBounce ? rawEndX + (rawEndX - start.x) * 0.35 : end.x;
  const control = {
    x: bounds.sideBounce
      ? (accepted[0].x + extendedRawEndX) / 2 + clamp(averageDeviation, -90, 90)
      : clamp((accepted[0].x + end.x) / 2 + clamp(averageDeviation, -90, 90), minX, maxX),
    y: (accepted[0].y + extendedEndY) / 2,
  };
  const points = Array.from({ length: 32 }, (_, index) => {
    const t = index / 31;
    const inverse = 1 - t;
    return {
      x: bounds.sideBounce
        ? reflect(inverse * inverse * accepted[0].x + 2 * inverse * t * control.x + t * t * extendedRawEndX, minX, maxX)
        : clamp(inverse * inverse * accepted[0].x + 2 * inverse * t * control.x + t * t * end.x, minX, maxX),
      y: clamp(inverse * inverse * accepted[0].y + 2 * inverse * t * control.y + t * t * extendedEndY, minY, maxY),
    };
  });
  return { valid: true, points };
}
export function normalizePath(points: Point[], maxPoints = 32): Point[] {
  const clean = points
    .filter((p, i) => i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y)
    .map((p) => ({ ...p }));
  if (clean.length <= maxPoints || maxPoints < 2) return clean.slice(0, Math.max(0, maxPoints));
  return Array.from({ length: maxPoints }, (_, i) => clean[Math.round((i * (clean.length - 1)) / (maxPoints - 1))]);
}
export function samplePolyline(points: Point[], spacing: number): Point[] {
  if (!points.length) return [];
  if (points.length === 1 || spacing <= 0) return points.map((p) => ({ ...p }));
  const result: Point[] = [{ ...points[0] }];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      dx = b.x - a.x,
      dy = b.y - a.y,
      len = Math.hypot(dx, dy);
    if (!len) continue;
    let distance = spacing - carry;
    while (distance <= len) {
      const t = distance / len;
      result.push({ x: a.x + dx * t, y: a.y + dy * t });
      distance += spacing;
    }
    carry = len - (distance - spacing);
  }
  const last = points[points.length - 1];
  const tail = result[result.length - 1];
  if (tail.x !== last.x || tail.y !== last.y) result.push({ ...last });
  return result;
}
