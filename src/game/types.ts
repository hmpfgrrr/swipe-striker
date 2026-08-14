export type Point = { x: number; y: number };
export type Defender = { center: Point; radius: number };
export type Goal = { x: number; y: number; width: number; height: number };
export type ShotOutcome = 'goal' | 'saved' | 'blocked' | 'missed';
