import type { Defender, Point } from './types';

export type Reaction = { start: Point; target: Point };

const copyPoint = (point: Point): Point => ({ x: point.x, y: point.y });
const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));

export function selectDefenderReaction(defender: Defender, path: Point[], maxXReach = 70, maxYReach = 45, maxMove = 55): Reaction {
  const start = copyPoint(defender.center);
  const reachable = path.filter(point => Math.abs(point.x - start.x) <= maxXReach && Math.abs(point.y - start.y) <= maxYReach);
  if (!reachable.length) return { start, target: copyPoint(start) };
  const selected = reachable.reduce((best, point) => Math.hypot(point.x - start.x, point.y - start.y) < Math.hypot(best.x - start.x, best.y - start.y) ? point : best);
  const dx = selected.x - start.x;
  const dy = selected.y - start.y;
  const distance = Math.hypot(dx, dy);
  const scale = distance > maxMove ? maxMove / distance : 1;
  return { start, target: { x: start.x + dx * scale, y: start.y + dy * scale } };
}

export function selectGoalkeeperReaction(goalkeeper: Defender, path: Point[], goalLeft: number, goalRight: number, maxDive = 90): Reaction {
  const start = copyPoint(goalkeeper.center);
  if (!path.length) return { start, target: copyPoint(start) };
  const crossing = path.reduce((best, point) => Math.abs(point.y - start.y) < Math.abs(best.y - start.y) ? point : best);
  const legalX = clamp(crossing.x, goalLeft + goalkeeper.radius, goalRight - goalkeeper.radius);
  return { start, target: { x: start.x + clamp(legalX - start.x, -maxDive, maxDive), y: start.y } };
}

export function interpolateReaction(reaction: Reaction, progress: number): Point {
  const t = clamp(progress, 0, 1);
  return { x: reaction.start.x + (reaction.target.x - reaction.start.x) * t, y: reaction.start.y + (reaction.target.y - reaction.start.y) * t };
}
