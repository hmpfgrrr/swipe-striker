import type { Defender, Goal, Point } from './types';
export type FieldLayout = { ball: Point; goal: Goal; goalkeeper: Defender; defenders: Defender[]; striker: Point };
export type RandomSource = () => number;

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));
const randomBetween = (random: RandomSource, minimum: number, maximum: number): number =>
  minimum + (maximum - minimum) * random();

export function createDefenderNumbers(random: RandomSource = Math.random): number[] {
  const numbers = [2, 3, 4];
  for (let index = numbers.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [numbers[index], numbers[swapIndex]] = [numbers[swapIndex], numbers[index]];
  }
  return numbers;
}

export function createInitialDefenders(width: number, height: number): Defender[] {
  return [
    { center: { x: width * 0.29, y: height * 0.48 }, radius: 18, patrolHalfWidth: 35 },
    { center: { x: width * 0.7, y: height * 0.4 }, radius: 18, patrolHalfWidth: 45 },
    { center: { x: width * 0.48, y: height * 0.29 }, radius: 18, patrolHalfWidth: 30 },
  ];
}

export function createDynamicDefenders(width: number, height: number, random: RandomSource = Math.random): Defender[] {
  const baseDefenders = createInitialDefenders(width, height);
  const positions: Point[] = [];
  const minimumSpacing = 78;
  const minimumX = width * 0.16;
  const maximumX = width * 0.84;
  const minimumY = height * 0.25;
  const maximumY = height * 0.56;

  baseDefenders.forEach((defender) => {
    let candidate = { x: width / 2, y: height * 0.45 };
    for (let attempt = 0; attempt < 20; attempt += 1) {
      candidate = {
        x: randomBetween(random, minimumX, maximumX),
        y: randomBetween(random, minimumY, maximumY),
      };
      if (
        positions.every((position) => Math.hypot(position.x - candidate.x, position.y - candidate.y) >= minimumSpacing)
      )
        break;
    }
    if (positions.some((position) => Math.hypot(position.x - candidate.x, position.y - candidate.y) < minimumSpacing)) {
      candidate = {
        x: width * [0.2, 0.5, 0.8][positions.length],
        y: height * [0.3, 0.43, 0.55][positions.length],
      };
    }
    positions.push(candidate);
  });

  return baseDefenders.map((defender, index) => ({
    ...defender,
    center: positions[index],
    patrolHalfWidth: clamp((defender.patrolHalfWidth ?? 30) + randomBetween(random, -8, 4), 22, 32),
    patrolDuration: Math.round(randomBetween(random, 900, 1750)),
    patrolStartAtEnd: random() >= 0.5,
  }));
}
export function getFieldLayout(width: number, height: number): FieldLayout {
  return {
    ball: { x: width / 2, y: height * 0.8 },
    striker: { x: width / 2, y: height * 0.86 },
    goal: { x: width * 0.2, y: height * 0.1, width: width * 0.6, height: height * 0.07 },
    goalkeeper: { center: { x: width / 2, y: height * 0.19 }, radius: 21 },
    defenders: createInitialDefenders(width, height),
  };
}
