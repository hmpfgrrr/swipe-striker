# Shot Physics and Player Movement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace literal finger tracing with a constrained smooth football shot and add visible, fair goalkeeper and defender movement.

**Architecture:** Pure TypeScript modules generate a monotonic quadratic shot path, calculate bounded actor reactions, and resolve each animation sample. Phaser owns only rendering, input, synchronized tween progress, and feedback, so gameplay decisions remain deterministic and unit-testable.

**Tech Stack:** TypeScript 5, Phaser 3, Vitest, Vite, vite-plugin-pwa.

## Global Constraints

- The pointer must start within 48 world pixels of the ball.
- A valid gesture needs at least 80 world pixels of upward progress.
- Generated shots use one quadratic Bézier curve with 32 samples and at most 90 pixels of lateral control displacement.
- Every generated sample moves monotonically toward the top of the field; sharp hooks, S-curves, and backward movement are impossible.
- Playable bounds are `x = 20…370` and `y = 28…816`; the ball radius is 10 pixels.
- Crossing a side boundary or the top boundary outside the goal produces `out`, displayed as `AUS`; there are no rebounds or wall bounces.
- Defenders patrol 30–45 pixels horizontally and react at most 55 pixels toward a reachable future path sample.
- The goalkeeper patrols inside the goal and dives at most 90 pixels toward the predicted crossing position over 500 ms.
- Outcome precedence per sample is defender contact, goalkeeper contact, legal goal crossing, illegal boundary crossing, then missed.
- Every behavior change follows a witnessed red-green TDD cycle.

---

### Task 1: Generate constrained football shot curves

**Files:**
- Modify: `src/game/trajectory.ts`
- Modify: `src/game/types.ts`
- Modify: `tests/trajectory.test.ts`

**Interfaces:**
- Consumes: `Point = { x: number; y: number }` from `src/game/types.ts`.
- Produces: `PitchBounds = { left: number; right: number; top: number; bottom: number; ballRadius: number }`.
- Produces: `ShotPathResult = { valid: true; points: Point[] } | { valid: false; reason: 'too-short' | 'backward' }`.
- Produces: `createShotPath(gesture: Point[], start: Point, bounds: PitchBounds): ShotPathResult`.

- [ ] **Step 1: Add failing trajectory tests**

Add tests that call `createShotPath` and assert:

```ts
const bounds = { left: 20, right: 370, top: 28, bottom: 816, ballRadius: 10 };
const result = createShotPath(
  [{ x: 195, y: 692 }, { x: 280, y: 580 }, { x: 100, y: 430 }, { x: 230, y: 250 }],
  { x: 195, y: 692 },
  bounds,
);
expect(result.valid).toBe(true);
if (result.valid) {
  expect(result.points).toHaveLength(32);
  expect(result.points.every((point, index) => index === 0 || point.y <= result.points[index - 1].y)).toBe(true);
  expect(Math.max(...result.points.map(point => point.x))).toBeLessThanOrEqual(360);
  expect(Math.min(...result.points.map(point => point.x))).toBeGreaterThanOrEqual(30);
}
```

Add separate cases proving a 40-pixel upward gesture is `too-short`, a fully downward gesture is `backward`, and an extreme lateral hook still has no reversal in its successive x-direction changes beyond one smooth curve.

- [ ] **Step 2: Run `npm test -- --run tests/trajectory.test.ts` and verify RED**

Expected: FAIL because `createShotPath` and the new result types do not exist.

- [ ] **Step 3: Implement `createShotPath` minimally**

Filter the gesture to strictly decreasing y-values, reject no-progress and less-than-80-pixel progress, clamp accepted points to the radius-adjusted bounds, derive average lateral deviation from the straight start-to-end line, cap it to ±90, and sample one quadratic Bézier at `t = index / 31` for indices 0–31. Clamp every generated x to `[left + ballRadius, right - ballRadius]` and y to `[top - ballRadius, bottom - ballRadius]` so legal goal crossing can reach the top boundary while side crossings remain detectable.

- [ ] **Step 4: Run focused and full tests**

Run `npm test -- --run tests/trajectory.test.ts` and then `npm test -- --run`. Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/game/trajectory.ts src/game/types.ts tests/trajectory.test.ts
git commit -m "feat: constrain swipe shots to smooth curves"
```

### Task 2: Calculate bounded actor reactions

**Files:**
- Create: `src/game/movement.ts`
- Create: `tests/movement.test.ts`

**Interfaces:**
- Consumes: `Point` and `Defender` from `src/game/types.ts`.
- Produces: `Reaction = { start: Point; target: Point }`.
- Produces: `selectDefenderReaction(defender: Defender, path: Point[], maxXReach?: number, maxYReach?: number, maxMove?: number): Reaction` with defaults `70`, `45`, and `55`.
- Produces: `selectGoalkeeperReaction(goalkeeper: Defender, path: Point[], goalLeft: number, goalRight: number, maxDive?: number): Reaction` with default `90`.
- Produces: `interpolateReaction(reaction: Reaction, progress: number): Point` with progress clamped to 0…1.

- [ ] **Step 1: Add failing movement tests**

```ts
const defender = { center: { x: 100, y: 400 }, radius: 18 };
expect(selectDefenderReaction(defender, [
  { x: 190, y: 500 },
  { x: 145, y: 420 },
  { x: 130, y: 380 },
])).toEqual({ start: { x: 100, y: 400 }, target: { x: 130, y: 380 } });

const keeper = { center: { x: 195, y: 160 }, radius: 21 };
const reaction = selectGoalkeeperReaction(keeper, [{ x: 320, y: 160 }], 78, 312);
expect(reaction.target.x).toBe(285);
expect(reaction.target.y).toBe(160);
```

Add cases proving unreachable defenders remain in place, defender movement is capped at 55 pixels, goalkeeper target respects body radius and goal edges, and interpolation clamps progress.

- [ ] **Step 2: Run `npm test -- --run tests/movement.test.ts` and verify RED**

Expected: FAIL because `src/game/movement.ts` does not exist.

- [ ] **Step 3: Implement the pure movement functions**

Choose the reachable path sample with the smallest Euclidean distance. Move toward it by at most `maxMove`. For the goalkeeper, choose the path sample whose y is closest to the goalkeeper y, clamp its x to `[goalLeft + radius, goalRight - radius]`, and cap horizontal displacement to `maxDive`. Interpolate x and y linearly from immutable copies of start and target.

- [ ] **Step 4: Run focused and full tests**

Run `npm test -- --run tests/movement.test.ts` and then `npm test -- --run`. Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/game/movement.ts tests/movement.test.ts
git commit -m "feat: add bounded player reactions"
```

### Task 3: Resolve collisions and field boundaries per animation sample

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/rules.ts`
- Modify: `tests/rules.test.ts`

**Interfaces:**
- Extend `ShotOutcome` to `'goal' | 'saved' | 'blocked' | 'out' | 'missed'`.
- Produce `evaluateShotFrame(previousBall: Point, ball: Point, defenders: Defender[], goalkeeper: Defender, goal: Goal, bounds: PitchBounds): ShotOutcome | null`.
- Preserve `evaluateShot(...)` for compatibility by delegating across path samples with fixed actors.

- [ ] **Step 1: Add failing boundary and moving-collision tests**

```ts
expect(evaluateShotFrame(
  { x: 40, y: 200 }, { x: 25, y: 180 }, [], keeper, goal, bounds,
)).toBe('out');

expect(evaluateShotFrame(
  { x: 195, y: 40 }, { x: 195, y: 20 }, [], keeper, goal, bounds,
)).toBe('goal');

expect(evaluateShotFrame(
  { x: 40, y: 40 }, { x: 40, y: 20 }, [], keeper, goal, bounds,
)).toBe('out');
```

Add cases proving defender precedence over goalkeeper and legal goal crossing, goalkeeper precedence over goal, and `null` for a nonterminal in-bounds sample.

- [ ] **Step 2: Run `npm test -- --run tests/rules.test.ts` and verify RED**

Expected: FAIL because `evaluateShotFrame` and the `out` outcome are missing.

- [ ] **Step 3: Implement per-frame resolution**

Check each previous-to-current ball segment against current defender and goalkeeper circles. Detect a goal only when the ball crosses `goal.y + goal.height` downward-to-upward with x inside the goal opening. Return `out` when the center violates radius-adjusted left/right bounds or crosses the top outside the goal. Return `null` otherwise. Update `evaluateShot` to return the first terminal frame outcome and `missed` after path exhaustion.

- [ ] **Step 4: Run focused and full tests**

Run `npm test -- --run tests/rules.test.ts` and then `npm test -- --run`. Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/rules.ts tests/rules.test.ts
git commit -m "feat: resolve shots against live field bounds"
```

### Task 4: Integrate generated shots and moving actors into Phaser

**Files:**
- Modify: `src/game/scene.ts`
- Modify: `src/game/layout.ts`
- Modify: `tests/scene.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consume `createShotPath`, reaction selectors, interpolation, and `evaluateShotFrame` from Tasks 1–3.
- Keep `GameScene`, `createInitialDefenders`, and `getFieldLayout` public names stable.
- Add no new browser or runtime dependencies.

- [ ] **Step 1: Add a failing scene layout test for patrol metadata**

Extend the pure layout with `patrolHalfWidth` per defender and assert:

```ts
const defenders = createInitialDefenders(390, 844);
expect(defenders.map(defender => defender.patrolHalfWidth)).toEqual([35, 45, 30]);
```

Update `Defender` with optional `patrolHalfWidth?: number` so collision callers remain compatible.

- [ ] **Step 2: Run `npm test -- --run tests/scene.test.ts` and verify RED**

Expected: FAIL because patrol metadata is absent.

- [ ] **Step 3: Add patrol metadata and refactor Phaser actor storage**

Store each visible actor as `{ body: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text; logical: Defender }`. Start horizontal yoyo patrol tweens for defenders and goalkeeper after `create()` and `resetLevel()`. Tween callbacks update both body/label positions and logical centers.

- [ ] **Step 4: Replace raw-path preview and animation**

During pointer movement, call `createShotPath` and render its generated points when valid. On release, reject invalid paths with `DANEBEN`; otherwise stop patrol tweens, calculate reactions once, and run one 650 ms counter tween. On each update, interpolate the ball along the 32 samples, interpolate actor positions using the same progress, and call `evaluateShotFrame` with current centers. Stop at the first outcome and map `out` to `AUS`.

- [ ] **Step 5: Restore movement on reset and update instructions**

`resetLevel()` kills shot and patrol tweens, restores the ball and all actor starting centers, clears feedback and preview, then restarts patrols. Update README control text to describe smooth spin curves, moving opponents, and `AUS`.

- [ ] **Step 6: Run full verification**

Run `npm test -- --run` and `npm run build`. Expected: all tests pass and Vite generates `dist/manifest.webmanifest` plus `dist/sw.js`.

- [ ] **Step 7: Commit**

```bash
git add src/game/scene.ts src/game/layout.ts src/game/types.ts tests/scene.test.ts README.md
git commit -m "feat: animate defenders and goalkeeper during shots"
```

## Plan Self-Review

- **Spec coverage:** Tasks 1–4 cover smooth monotonic shots, clamping, short/backward rejection, out-of-bounds, no bounce, defender patrol/reaction, goalkeeper patrol/dive, synchronized collision checks, reset behavior, copy changes, tests, and production build.
- **Placeholder scan:** The plan contains no deferred decisions or unnamed implementations; all functions, types, constants, commands, and expected failures are explicit.
- **Type consistency:** `PitchBounds`, `ShotPathResult`, `Reaction`, `ShotOutcome`, and all function signatures are defined before their consumers and use the existing `Point`, `Defender`, and `Goal` shapes.
- **Scope:** No full physics engine, pathfinding, sprite animation, audio, backend, or unrelated refactor is included.
