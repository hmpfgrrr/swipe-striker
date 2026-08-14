export type Point = { x: number; y: number };
export type Defender = { center: Point; radius: number; patrolHalfWidth?: number };
export type Goal = { x: number; y: number; width: number; height: number };
export type ShotOutcome = 'goal' | 'saved' | 'blocked' | 'out' | 'missed';
export type PitchBounds = { left: number; right: number; top: number; bottom: number; ballRadius: number };
export type ShotPathResult = { valid: true; points: Point[] } | { valid: false; reason: 'too-short' | 'backward' };
