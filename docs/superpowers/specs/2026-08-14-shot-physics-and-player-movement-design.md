# Shot Physics and Player Movement Design

## Goal

Improve Swipe Striker v0.1 so shots feel like controlled football kicks rather than literal finger tracing. The goalkeeper and defenders should move visibly and react to each shot, while the ball must remain inside the playable pitch until it enters the goal or the attempt ends out of bounds.

## Root Cause

The current scene samples the raw pointer path and animates the ball through every sampled point. This permits backward segments, abrupt direction reversals, hooks, and coordinates outside the field. Actors are drawn once as static circles, while shot collision is evaluated only after the complete animation against their initial logical positions.

## Selected Approach

Use a constrained generated flight path plus lightweight deterministic reactions:

- The swipe communicates forward direction and lateral spin.
- A pure trajectory function converts the gesture into one smooth quadratic curve.
- Defenders patrol small horizontal zones before the shot and react toward reachable points on the generated curve after release.
- The goalkeeper patrols across the goal mouth and dives toward the predicted crossing position after release.
- Collision and boundary outcomes are evaluated against time-indexed ball and actor positions.

This provides visible life and fair reactions without introducing a full physics engine or general-purpose AI.

## Shot Input and Generated Curve

The pointer must still start within 48 world pixels of the ball. Input points are clamped to the playable pitch rectangle before use.

Only upward progress toward the goal contributes to the shot. Downward or stationary segments are discarded. The accepted gesture needs at least 80 world pixels of upward progress; shorter gestures produce `DANEBEN` without animating a shot.

The generated path is a quadratic Bézier curve with:

- start: the fixed initial ball position;
- end: the final accepted pointer x-coordinate clamped inside the field, at the pointer's final accepted y-coordinate;
- control point: midway vertically between start and end, with horizontal displacement derived from the gesture's average lateral deviation;
- maximum lateral control displacement: 90 world pixels;
- 32 evenly spaced samples from start to end.

This permits a straight shot, a single smooth curve, or visible sidespin. It cannot create an S-curve, reverse direction, or sharp hook. Every generated sample must move monotonically toward the top of the field.

## Boundaries and Outcomes

The playable pitch bounds are `x = 20…370` and `y = 28…816` on the 390×844 baseline. The ball has a 10-pixel radius, so its center must stay inside bounds reduced by that radius.

The ball may leave the top pitch boundary only through the horizontal goal opening. Crossing a side boundary or the top boundary outside the goal ends the shot immediately with the new outcome `out`, displayed as `AUS`.

Outcome precedence at each animation sample is:

1. defender contact → `blocked`;
2. goalkeeper contact → `saved`;
3. legal goal crossing → `goal`;
4. illegal boundary crossing → `out`;
5. path completed without another outcome → `missed`.

No rebound or sideline bounce is included in this version.

## Defender Movement

Each of the three defenders receives a patrol range of 30–45 pixels around its starting x-coordinate. Before a shot, each defender moves horizontally with a slow yoyo tween; their logical centers are updated from their visible game objects.

When a shot begins, patrol tweens stop. Each defender selects the closest reachable future ball sample within 70 pixels horizontally and no more than 45 pixels vertically from its current position. A defender with a reachable sample moves at most 55 pixels toward it over the 650 ms shot duration. A defender without a reachable sample stays in place. This keeps reactions readable and prevents teleporting or perfect interception.

## Goalkeeper Movement

Before a shot, the goalkeeper patrols horizontally inside the goal opening. On release, the generated trajectory is inspected for its first sample at the goalkeeper's y-coordinate. The goalkeeper dives toward that predicted x-coordinate, clamped so its body remains inside the goal opening.

The dive covers at most 90 pixels over 500 ms. Collision uses the goalkeeper's current interpolated center at each sample, so a well-placed or strongly curved shot can beat the dive.

## Scene Data Flow

1. Pointer movement is collected only while a valid drag is active.
2. `createShotPath` validates, clamps, and converts the gesture to a generated curve.
3. The preview displays the generated curve, not the raw pointer line.
4. On release, actor patrols stop and reaction targets are calculated.
5. A single progress tween updates ball, defenders, and goalkeeper from the same normalized progress value.
6. At each update, the rules engine checks collisions and bounds against current positions.
7. The first terminal outcome stops movement and shows feedback.
8. `NOCHMAL SPIELEN` restores starting positions and restarts patrol movement.

## Module Boundaries

- `src/game/trajectory.ts`: pure gesture validation, clamping, Bézier generation, and monotonicity.
- `src/game/movement.ts`: pure target selection and interpolation for goalkeeper and defenders.
- `src/game/rules.ts`: pure per-sample collision, legal goal crossing, and out-of-bounds evaluation.
- `src/game/scene.ts`: Phaser objects, pointer events, synchronized tweens, feedback, and reset.
- `src/game/types.ts`: extended shot outcome and movement types.

Phaser-dependent code does not enter the pure modules, keeping all gameplay decisions unit-testable in Node.

## Testing

Automated tests must prove:

- generated shot samples always move upward;
- a gesture with a sharp left-right hook becomes one smooth curve;
- lateral control displacement is capped;
- path coordinates are clamped to field bounds;
- short or backward gestures are rejected;
- legal top-boundary crossing inside the goal scores;
- side or non-goal top crossing returns `out`;
- defender reaction targets obey reach limits;
- goalkeeper targets the predicted crossing and respects its maximum dive distance;
- interpolation updates actor positions consistently;
- existing goal, save, block, and miss behavior remains covered.

Each behavior change follows a witnessed red-green TDD cycle. Final verification runs the complete test suite and production PWA build.

## Scope Exclusions

This change does not add rebounds, wall bounces, player animation sprites, stamina, difficulty levels, general pathfinding, a physics engine, audio, backend state, or multiplayer.
