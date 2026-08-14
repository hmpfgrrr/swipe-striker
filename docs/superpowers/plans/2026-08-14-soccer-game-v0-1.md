# Soccer Game v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an iPhone-optimized, installable PWA football mini-game in which the player draws a swipe trajectory from the ball and tries to score past a goalkeeper and defenders.

**Architecture:** A Vite + TypeScript application hosts one Phaser 3 scene in portrait orientation. Pure game rules (trajectory sampling, collision, shot outcome) live in dependency-free modules so they can be tested with Vitest; the Phaser scene owns rendering, touch input, animation, and feedback. Standard vector shapes and generated gradients are used instead of external image assets.

**Tech Stack:** TypeScript, Vite, Phaser 3, Vitest, vite-plugin-pwa, npm.

## Global Constraints

- The game must work in portrait mode and use touch/pointer input without a backend, login, or external asset URLs.
- The playfield is a 2D, lightly isometric football scene with the player and ball at the bottom, goal and goalkeeper at the top, and 2–4 defenders between them.
- A shot starts only when the pointer begins close to the ball; releasing the pointer sends the ball along the drawn curve.
- The PWA must provide a web app manifest, service worker registration, safe-area-aware mobile layout, and iPhone home-screen metadata.
- Every feature task follows red-green-refactor: write a focused failing test, run it to observe failure, implement the smallest solution, run focused and full tests, then commit.
- No copyrighted or externally hosted image assets are required; all visuals are Phaser primitives, text, and CSS.

## File Map

- Create `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore` for project/tooling configuration.
- Create `src/main.ts` for bootstrapping Phaser and the PWA registration.
- Create `src/game/config.ts` for responsive portrait dimensions and palette constants.
- Create `src/game/types.ts` for shared point, defender, and outcome types.
- Create `src/game/trajectory.ts` for pointer-path normalization, smoothing, and sampling.
- Create `src/game/collision.ts` for segment-vs-circle and point-in-goal checks.
- Create `src/game/rules.ts` for deterministic shot outcome evaluation.
- Create `src/game/scene.ts` for Phaser rendering, input state, shot animation, feedback, and reset behavior.
- Create `src/ui/styles.css` for the mobile shell, HUD, and restart button.
- Create `public/icon.svg` as a self-contained app icon.
- Create `tests/trajectory.test.ts`, `tests/collision.test.ts`, `tests/rules.test.ts` for pure logic.
- Create `tests/config.test.ts` for portrait/mobile configuration invariants.
- Create `README.md` with local development and iPhone installation instructions.

---

### Task 1: Bootstrap a testable Vite + Phaser PWA shell

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`
- Create: `src/main.ts`, `src/game/config.ts`, `src/ui/styles.css`, `public/icon.svg`
- Create: `tests/config.test.ts`

**Interfaces:**
- Produce `GAME_WIDTH = 390`, `GAME_HEIGHT = 844`, `PORTRAIT_ASPECT_RATIO = GAME_WIDTH / GAME_HEIGHT` from `src/game/config.ts`.
- Produce a browser entry that mounts a Phaser game to `#game-root`, uses `Phaser.Scale.FIT`, `Phaser.Scale.CENTER_BOTH`, and registers the generated PWA service worker in production.

- [ ] **Step 1: Write the failing configuration test**

```ts
import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH, PORTRAIT_ASPECT_RATIO } from '../src/game/config';

describe('mobile game configuration', () => {
  it('uses a portrait canvas baseline', () => {
    expect(GAME_WIDTH).toBeLessThan(GAME_HEIGHT);
    expect(PORTRAIT_ASPECT_RATIO).toBeCloseTo(390 / 844);
  });
});
```

- [ ] **Step 2: Run `npm test -- --run tests/config.test.ts` and observe failure because the project files do not exist.**
- [ ] **Step 3: Add the Vite/TypeScript/Phaser/Vitest/PWA configuration and the minimal DOM shell.** Use `vite-plugin-pwa` with `registerType: 'autoUpdate'`, an inline manifest name `Swipe Striker`, `display: 'standalone'`, `orientation: 'portrait'`, theme color `#0b1720`, and `public/icon.svg` as the 192px and 512px icon source.
- [ ] **Step 4: Run `npm install` and then `npm test -- --run tests/config.test.ts`; expect one passing test.**
- [ ] **Step 5: Run `npm run build`; expect a production build with a generated manifest and service worker.
- [ ] **Step 6: Commit with `git add . && git commit -m "chore: bootstrap swipe striker pwa"`.**

### Task 2: Add trajectory and collision primitives with TDD

**Files:**
- Create: `src/game/types.ts`, `src/game/trajectory.ts`, `src/game/collision.ts`
- Create: `tests/trajectory.test.ts`, `tests/collision.test.ts`

**Interfaces:**
- `Point = { x: number; y: number }`.
- `normalizePath(points: Point[], maxPoints?: number): Point[]` returns a copy with duplicate consecutive points removed and at most `maxPoints` evenly distributed points.
- `samplePolyline(points: Point[], spacing: number): Point[]` returns points spaced along the polyline, including the first and last point.
- `segmentIntersectsCircle(start: Point, end: Point, center: Point, radius: number): boolean`.
- `pointInGoal(point: Point, goal: { x: number; y: number; width: number; height: number }): boolean`.

- [ ] **Step 1: Write tests for duplicate removal, point limiting, polyline sampling, circle crossing, and goal bounds.**
- [ ] **Step 2: Run `npm test -- --run tests/trajectory.test.ts tests/collision.test.ts`; expect failures for missing modules/functions.**
- [ ] **Step 3: Implement the smallest pure TypeScript functions, handling empty paths and zero/negative spacing without throwing.**
- [ ] **Step 4: Run the two focused test files; expect all tests to pass.**
- [ ] **Step 5: Run `npm test -- --run`; expect the Task 1 test and both new suites to pass.**
- [ ] **Step 6: Commit with `git add src tests && git commit -m "feat: add shot trajectory and collision primitives"`.**

### Task 3: Implement deterministic shot rules with TDD

**Files:**
- Create: `src/game/rules.ts`
- Create: `tests/rules.test.ts`

**Interfaces:**
- `Defender = { center: Point; radius: number }`.
- `Goal = { x: number; y: number; width: number; height: number }`.
- `ShotOutcome = 'goal' | 'saved' | 'blocked' | 'missed'`.
- `evaluateShot(path: Point[], defenders: Defender[], goalkeeper: { center: Point; radius: number }, goal: Goal): ShotOutcome` evaluates the path in order: defender intersection yields `blocked`, goalkeeper intersection inside the goal yields `saved`, endpoint in goal without those collisions yields `goal`, otherwise `missed`.

- [ ] **Step 1: Write tests covering a clean goal, defender block, goalkeeper save, and miss, including precedence when a defender is hit before the goal.**
- [ ] **Step 2: Run `npm test -- --run tests/rules.test.ts`; expect failure because `evaluateShot` is absent.**
- [ ] **Step 3: Implement `evaluateShot` using the collision primitives and explicit path-length guards.**
- [ ] **Step 4: Run the focused suite, then the full suite; expect all tests to pass.**
- [ ] **Step 5: Commit with `git add src/game/rules.ts tests/rules.test.ts && git commit -m "feat: define shot outcomes"`.**

### Task 4: Build the playable Phaser scene and touch interaction

**Files:**
- Create: `src/game/scene.ts`
- Modify: `src/main.ts`, `src/ui/styles.css`

**Interfaces:**
- `GameScene` is a Phaser.Scene with `create()`, `update()`, `resetLevel()`, pointer handlers, and no network dependencies.
- The scene draws the pitch, 3 defenders, striker, ball, goal, goalkeeper, HUD, trajectory preview, and restart button with Phaser Graphics/Text primitives.

- [ ] **Step 1: Add a scene-level test seam by exporting `createInitialDefenders(width: number, height: number): Defender[]` and `getFieldLayout(width: number, height: number)`; add tests asserting exactly 3 defenders and that all entities remain inside the field.**
- [ ] **Step 2: Run the new focused test and observe failure for missing scene exports.**
- [ ] **Step 3: Implement the scene with a world coordinate system based on the 390x844 baseline and scale-relative positions. Start input within 48px of the ball, append pointer points while held, render a dashed preview path, and on release normalize/sample the path and animate a ball sprite along it with a 550ms tween.
- [ ] **Step 4: On tween completion call `evaluateShot`; show `TOR!`, `GEHALTEN`, `GEBLOCKT`, or `DANEBEN` for 900ms, tint the scene briefly, and enable the `NOCHMAL SPIELEN` button.**
- [ ] **Step 5: Connect the restart button to `resetLevel()` and reset ball, path, feedback, and input state without reloading the page.**
- [ ] **Step 6: Run the full unit suite and `npm run build`; expect both to pass.**
- [ ] **Step 7: Commit with `git add src tests && git commit -m "feat: add playable swipe shot scene"`.**

### Task 5: Verify PWA installability and document the handoff

**Files:**
- Modify: `README.md`, `index.html`, `vite.config.ts`, `src/ui/styles.css` as needed by verification findings.

- [ ] **Step 1: Add README instructions for `npm install`, `npm run dev`, `npm test -- --run`, `npm run build`, local-network iPhone testing, Safari Share → Add to Home Screen, and the fact that HTTPS is required outside localhost.**
- [ ] **Step 2: Run `npm test -- --run`; expect all tests to pass.**
- [ ] **Step 3: Run `npm run build`; inspect `dist/` for `manifest.webmanifest`, service worker output, icon, and JavaScript bundles.**
- [ ] **Step 4: Run a production preview, request `/`, `/manifest.webmanifest`, and `/sw.js` with a local HTTP client, and verify successful responses plus the portrait/standalone manifest fields.**
- [ ] **Step 5: Review the implementation against every Global Constraint and every requested MVP behavior; fix any concrete gap with a focused test first.**
- [ ] **Step 6: Commit documentation or verification fixes with `git add . && git commit -m "docs: add iphone pwa setup instructions"`.**

## Plan Self-Review

- **Coverage:** Tasks 1–5 cover the empty-project bootstrap, mobile/PWA metadata, touch trajectory, path sampling, defender/goalkeeper/goal outcomes, restart flow, no external assets, automated tests, production build, and iPhone installation handoff.
- **Placeholder scan:** No TBD/TODO or unspecified implementation steps remain; all named functions, values, test commands, and output expectations are explicit.
- **Type consistency:** `Point`, `Defender`, `Goal`, and `ShotOutcome` are defined before use; `evaluateShot` consumes the exact collision interfaces; the scene exports the exact layout seams required by its tests.
- **Scope:** This is one cohesive MVP with pure game logic separated from Phaser integration; no backend, account, multiplayer, or asset pipeline is included.
