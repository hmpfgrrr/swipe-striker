import type { Goal, Point } from './types';
export function segmentIntersectsCircle(start: Point, end: Point, center: Point, radius: number): boolean {
  const dx = end.x - start.x,
    dy = end.y - start.y,
    length2 = dx * dx + dy * dy;
  const t = length2 ? Math.max(0, Math.min(1, ((center.x - start.x) * dx + (center.y - start.y) * dy) / length2)) : 0;
  return Math.hypot(start.x + t * dx - center.x, start.y + t * dy - center.y) <= radius;
}
export function pointInGoal(point: Point, goal: Goal): boolean {
  return point.x >= goal.x && point.x <= goal.x + goal.width && point.y >= goal.y && point.y <= goal.y + goal.height;
}
