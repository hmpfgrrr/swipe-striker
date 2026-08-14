import { segmentIntersectsCircle } from './collision';
import type { Defender, Goal, PitchBounds, Point, ShotOutcome } from './types';

export function evaluateShotFrame(previousBall: Point, ball: Point, defenders: Defender[], goalkeeper: Defender, goal: Goal, bounds: PitchBounds): ShotOutcome | null {
  for (const defender of defenders) if (segmentIntersectsCircle(previousBall, ball, defender.center, defender.radius)) return 'blocked';
  if (segmentIntersectsCircle(previousBall, ball, goalkeeper.center, goalkeeper.radius)) return 'saved';

  const goalLine = goal.y + goal.height;
  const crossesGoalLine = previousBall.y > goalLine && ball.y <= goalLine;
  if (crossesGoalLine && ball.x >= goal.x && ball.x <= goal.x + goal.width) return 'goal';

  const minimumX = bounds.left + bounds.ballRadius;
  const maximumX = bounds.right - bounds.ballRadius;
  const minimumY = bounds.top + bounds.ballRadius;
  if (ball.x < minimumX || ball.x > maximumX || ball.y < minimumY) return 'out';
  return null;
}

export function evaluateShot(path: Point[], defenders: Defender[], goalkeeper: Defender, goal: Goal): ShotOutcome {
  if (path.length < 2) return 'missed';
  const unbounded: PitchBounds = { left: Number.NEGATIVE_INFINITY, right: Number.POSITIVE_INFINITY, top: Number.NEGATIVE_INFINITY, bottom: Number.POSITIVE_INFINITY, ballRadius: 0 };
  for (let index = 1; index < path.length; index++) {
    const outcome = evaluateShotFrame(path[index - 1], path[index], defenders, goalkeeper, goal, unbounded);
    if (outcome) return outcome;
  }
  return 'missed';
}
