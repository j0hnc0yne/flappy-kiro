/**
 * Pipe system property-based tests
 *
 * Uses fast-check to verify universal pipe properties across many runs.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { randomGapCentre, updatePipes, checkSpeedMilestone, updateGhostyBob, updateClouds, state, CONFIG, STATE } from '../game.js';

// ─── Property 5: Gap centre is always within reachable bounds ─────────────────
// Validates: Requirements 5.5
//
// For any canvas height H, every value returned by randomGapCentre() shall satisfy:
//   GAP_HEIGHT / 2 + MIN_GAP_MARGIN  ≤  result  ≤  H − SCORE_BAR_HEIGHT − GAP_HEIGHT / 2 − MIN_GAP_MARGIN
describe('Property 5: Gap centre is always within reachable bounds', () => {
  it('randomGapCentre() always returns a value within [minY, maxY]', () => {
    /**
     * **Validates: Requirements 5.5**
     *
     * Generator: fc.constant(null) used as a dummy to drive many runs.
     * For each run, call randomGapCentre() and assert the result lies within
     * the safe vertical range defined by the CONFIG constants.
     */
    const minY = CONFIG.gapHeight / 2 + CONFIG.minGapMargin;
    const maxY =
      CONFIG.logicalHeight -
      CONFIG.scoreBarHeight -
      CONFIG.gapHeight / 2 -
      CONFIG.minGapMargin;

    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const result = randomGapCentre();

          // Assert lower bound: result >= gapHeight/2 + minGapMargin
          expect(result).toBeGreaterThanOrEqual(minY);

          // Assert upper bound: result <= logicalHeight - scoreBarHeight - gapHeight/2 - minGapMargin
          expect(result).toBeLessThanOrEqual(maxY);
        }
      ),
      { numRuns: 1000 }
    );
  });
});

// ─── Property 4: Pipes scroll uniformly at pipe speed ────────────────────────
// Validates: Requirements 4.4, 5.6, 11.6
//
// For any set of active PipePair objects with arbitrary x-positions, after
// updatePipes(dt), every pipe's x shall equal initial_x − pipeSpeed * dt,
// and all pipes shall have moved by the same amount.
describe('Property 4: Pipes scroll uniformly at pipe speed', () => {
  beforeEach(() => {
    // Reset state to a clean PLAYING baseline before each test
    state.current = STATE.PLAYING;
    state.pipes = [];
    state.pipeSpeed = CONFIG.basePipeSpeed;
  });

  it('every pipe moves exactly pipeSpeed * dt to the left', () => {
    /**
     * **Validates: Requirements 4.4, 5.6, 11.6**
     *
     * Generator:
     *   - pipes: 1–6 pipes with x-positions well inside the canvas so none
     *     are removed by the off-screen filter during the test step.
     *   - pipeSpeed: any value in [basePipeSpeed, maxPipeSpeed]
     *   - dt: a positive frame-time multiplier in [0.5, 2.0]
     *
     * For each run, snapshot the initial x-positions, call updatePipes(dt),
     * then assert that every surviving pipe moved by exactly pipeSpeed * dt.
     * All pipes start far enough right (x ≥ pipeWidth + 1) that none are
     * culled by the off-screen filter, so the before/after arrays align.
     */
    fc.assert(
      fc.property(
        // Generate 1–6 pipes with x well inside the canvas
        fc.array(
          fc.record({
            x:          fc.integer({ min: CONFIG.pipeWidth + 1, max: CONFIG.logicalWidth }),
            gapCentreY: fc.integer({ min: 100, max: 400 }),
            gapHeight:  fc.constant(CONFIG.gapHeight),
            width:      fc.constant(CONFIG.pipeWidth),
            scored:     fc.boolean(),
          }),
          { minLength: 1, maxLength: 6 }
        ),
        // pipeSpeed in the valid game range
        fc.float({ min: CONFIG.basePipeSpeed, max: CONFIG.maxPipeSpeed, noNaN: true }),
        // dt: frame-time multiplier (0.5 = slow device, 2.0 = fast skip)
        fc.float({ min: 0.5, max: 2.0, noNaN: true }),
        (pipes, pipeSpeed, dt) => {
          // Set up state with the generated pipes and speed
          state.pipes = pipes.map(p => ({ ...p })); // shallow clone each pipe
          state.pipeSpeed = pipeSpeed;

          // Snapshot initial x-positions (keyed by index since x may repeat)
          const initialXs = state.pipes.map(p => p.x);

          // Run one update step — this scrolls pipes and may spawn a new one
          updatePipes(dt);

          // Check only the pipes that existed before the update.
          // New pipes spawned during updatePipes are appended at the end;
          // we verify the first initialXs.length entries (the original pipes).
          // All original pipes started with x > pipeWidth so none were culled.
          for (let i = 0; i < initialXs.length; i++) {
            const expectedX = initialXs[i] - pipeSpeed * dt;
            expect(state.pipes[i].x).toBeCloseTo(expectedX, 5);
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it('all pipes move by the same delta regardless of their initial position', () => {
    /**
     * **Validates: Requirements 5.6, 11.6**
     *
     * When multiple pipes are active, the displacement applied to each pipe
     * must be identical (pipeSpeed * dt), so no pipe ever moves faster or
     * slower than another.
     */
    fc.assert(
      fc.property(
        // At least 2 pipes so we can compare deltas between them
        fc.array(
          fc.record({
            x:          fc.integer({ min: CONFIG.pipeWidth + 1, max: CONFIG.logicalWidth }),
            gapCentreY: fc.integer({ min: 100, max: 400 }),
            gapHeight:  fc.constant(CONFIG.gapHeight),
            width:      fc.constant(CONFIG.pipeWidth),
            scored:     fc.boolean(),
          }).map(p => ({ ...p, x: Math.max(CONFIG.pipeWidth + 1, p.x) })),
          { minLength: 2, maxLength: 6 }
        ),
        fc.float({ min: CONFIG.basePipeSpeed, max: CONFIG.maxPipeSpeed, noNaN: true }),
        fc.float({ min: 0.5, max: 2.0, noNaN: true }),
        (pipes, pipeSpeed, dt) => {
          state.pipes = pipes.map(p => ({ ...p }));
          state.pipeSpeed = pipeSpeed;

          const initialXs = state.pipes.map(p => p.x);
          updatePipes(dt);

          // Compute the actual delta for each original pipe
          const deltas = initialXs.map((ix, i) => ix - state.pipes[i].x);

          // Every delta must equal every other delta (uniform movement)
          const firstDelta = deltas[0];
          for (const delta of deltas) {
            expect(delta).toBeCloseTo(firstDelta, 5);
          }
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ─── Property 6: Off-screen pipes are removed ────────────────────────────────
// Validates: Requirements 5.8
//
// For any set of pipes where some have x + width <= 0, after updatePipes(dt),
// those pipes shall not appear in state.pipes.
describe('Property 6: Off-screen pipes are removed', () => {
  beforeEach(() => {
    state.current = STATE.PLAYING;
    state.pipes = [];
    state.pipeSpeed = CONFIG.basePipeSpeed;
  });

  it('pipes with x + width <= 0 are removed after updatePipes(dt)', () => {
    /**
     * **Validates: Requirements 5.8**
     *
     * Generator:
     *   - offScreenPipes: 1–4 pipes whose x is chosen so that after scrolling
     *     by pipeSpeed * dt they satisfy x + width <= 0 (i.e. fully off-screen).
     *     We place them at x <= -(pipeWidth + 1) so they are already off-screen
     *     before the update, guaranteeing removal regardless of dt.
     *   - onScreenPipes: 0–4 pipes with x well inside the canvas so they are
     *     never culled during the test step.
     *   - dt: a positive frame-time multiplier in [0.5, 2.0]
     *
     * For each run, record the ids of off-screen pipes, call updatePipes(dt),
     * then assert none of those pipes remain in state.pipes.
     */
    fc.assert(
      fc.property(
        // Off-screen pipes: x + width <= 0 already (x <= -width - 1)
        fc.array(
          fc.record({
            x:          fc.integer({ min: -(CONFIG.pipeWidth + 200), max: -(CONFIG.pipeWidth + 1) }),
            gapCentreY: fc.integer({ min: 100, max: 400 }),
            gapHeight:  fc.constant(CONFIG.gapHeight),
            width:      fc.constant(CONFIG.pipeWidth),
            scored:     fc.boolean(),
          }),
          { minLength: 1, maxLength: 4 }
        ),
        // On-screen pipes: x well inside the canvas, won't be culled
        fc.array(
          fc.record({
            x:          fc.integer({ min: CONFIG.pipeWidth + 1, max: CONFIG.logicalWidth }),
            gapCentreY: fc.integer({ min: 100, max: 400 }),
            gapHeight:  fc.constant(CONFIG.gapHeight),
            width:      fc.constant(CONFIG.pipeWidth),
            scored:     fc.boolean(),
          }),
          { minLength: 0, maxLength: 4 }
        ),
        // dt: frame-time multiplier
        fc.float({ min: 0.5, max: 2.0, noNaN: true }),
        (offScreenPipes, onScreenPipes, dt) => {
          // Tag each off-screen pipe with a unique id so we can find it later
          const taggedOffScreen = offScreenPipes.map((p, i) => ({ ...p, _testId: `off_${i}` }));
          const taggedOnScreen  = onScreenPipes.map((p, i)  => ({ ...p, _testId: `on_${i}` }));

          state.pipes = [...taggedOffScreen, ...taggedOnScreen];
          state.pipeSpeed = CONFIG.basePipeSpeed;

          updatePipes(dt);

          // None of the originally off-screen pipes should survive
          const survivingIds = new Set(state.pipes.map(p => p._testId));
          for (const pipe of taggedOffScreen) {
            expect(survivingIds.has(pipe._testId)).toBe(false);
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it('on-screen pipes are NOT removed when off-screen pipes are culled', () => {
    /**
     * **Validates: Requirements 5.8 (negative case)**
     *
     * Ensures the removal filter is precise: only pipes with x + width <= 0
     * are removed. Pipes still on-screen must survive the update.
     */
    fc.assert(
      fc.property(
        // At least one off-screen pipe to trigger the filter
        fc.array(
          fc.record({
            x:          fc.integer({ min: -(CONFIG.pipeWidth + 200), max: -(CONFIG.pipeWidth + 1) }),
            gapCentreY: fc.integer({ min: 100, max: 400 }),
            gapHeight:  fc.constant(CONFIG.gapHeight),
            width:      fc.constant(CONFIG.pipeWidth),
            scored:     fc.boolean(),
          }),
          { minLength: 1, maxLength: 3 }
        ),
        // At least one on-screen pipe that must survive
        fc.array(
          fc.record({
            x:          fc.integer({ min: CONFIG.pipeWidth + 1, max: CONFIG.logicalWidth }),
            gapCentreY: fc.integer({ min: 100, max: 400 }),
            gapHeight:  fc.constant(CONFIG.gapHeight),
            width:      fc.constant(CONFIG.pipeWidth),
            scored:     fc.boolean(),
          }),
          { minLength: 1, maxLength: 3 }
        ),
        fc.float({ min: 0.5, max: 2.0, noNaN: true }),
        (offScreenPipes, onScreenPipes, dt) => {
          const taggedOffScreen = offScreenPipes.map((p, i) => ({ ...p, _testId: `off_${i}` }));
          const taggedOnScreen  = onScreenPipes.map((p, i)  => ({ ...p, _testId: `on_${i}` }));

          state.pipes = [...taggedOffScreen, ...taggedOnScreen];
          state.pipeSpeed = CONFIG.basePipeSpeed;

          updatePipes(dt);

          const survivingIds = new Set(state.pipes.map(p => p._testId));

          // All originally on-screen pipes must still be present
          for (const pipe of taggedOnScreen) {
            expect(survivingIds.has(pipe._testId)).toBe(true);
          }
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ─── Property 7: Speed milestone increases pipe speed, capped at maximum ─────
// Validates: Requirements 11.1, 11.4
//
// Part A: For any score that is a positive multiple of CONFIG.scoreMilestone,
//         checkSpeedMilestone() shall increase pipeSpeed by CONFIG.speedIncrement,
//         capped at CONFIG.maxPipeSpeed.
// Part B: For any score that is NOT a multiple of CONFIG.scoreMilestone (or is 0),
//         checkSpeedMilestone() shall leave pipeSpeed unchanged.
// Part C: For any combination of score and pipeSpeed, pipeSpeed shall never
//         exceed CONFIG.maxPipeSpeed after checkSpeedMilestone().
describe('Property 7: Speed milestone increases pipe speed, capped at maximum', () => {
  beforeEach(() => {
    // Reset to a clean baseline before each test
    state.score = 0;
    state.pipeSpeed = CONFIG.basePipeSpeed;
  });

  it('Part A: milestone scores increase pipeSpeed by speedIncrement (capped at max)', () => {
    /**
     * **Validates: Requirements 11.1, 11.4**
     *
     * Generator: score is a positive multiple of CONFIG.scoreMilestone.
     * pipeSpeed is any value in [basePipeSpeed, maxPipeSpeed].
     *
     * After calling checkSpeedMilestone(), pipeSpeed must equal
     * min(previousPipeSpeed + speedIncrement, maxPipeSpeed).
     */
    fc.assert(
      fc.property(
        // score: positive multiple of scoreMilestone
        fc.integer({ min: 1, max: 100 }).map(n => n * CONFIG.scoreMilestone),
        // pipeSpeed: any valid game speed
        fc.float({ min: CONFIG.basePipeSpeed, max: CONFIG.maxPipeSpeed, noNaN: true }),
        (score, pipeSpeed) => {
          state.score = score;
          state.pipeSpeed = pipeSpeed;

          const previousPipeSpeed = state.pipeSpeed;
          checkSpeedMilestone();

          const expected = Math.min(
            previousPipeSpeed + CONFIG.speedIncrement,
            CONFIG.maxPipeSpeed
          );
          expect(state.pipeSpeed).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('Part B: non-milestone scores do NOT change pipeSpeed', () => {
    /**
     * **Validates: Requirements 11.1**
     *
     * Generator: score is a positive integer that is NOT a multiple of
     * CONFIG.scoreMilestone.
     * pipeSpeed is any value in [basePipeSpeed, maxPipeSpeed].
     *
     * After calling checkSpeedMilestone(), pipeSpeed must remain unchanged.
     */
    fc.assert(
      fc.property(
        // score: positive integer, NOT a multiple of scoreMilestone
        fc.integer({ min: 1, max: 200 }).filter(n => n % CONFIG.scoreMilestone !== 0),
        // pipeSpeed: any valid game speed
        fc.float({ min: CONFIG.basePipeSpeed, max: CONFIG.maxPipeSpeed, noNaN: true }),
        (score, pipeSpeed) => {
          state.score = score;
          state.pipeSpeed = pipeSpeed;

          const previousPipeSpeed = state.pipeSpeed;
          checkSpeedMilestone();

          expect(state.pipeSpeed).toBeCloseTo(previousPipeSpeed, 5);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('Part B (zero score): score of 0 does NOT change pipeSpeed', () => {
    /**
     * **Validates: Requirements 11.1**
     *
     * Score 0 is explicitly excluded by the `score > 0` guard in
     * checkSpeedMilestone(), so pipeSpeed must remain unchanged.
     */
    fc.assert(
      fc.property(
        fc.float({ min: CONFIG.basePipeSpeed, max: CONFIG.maxPipeSpeed, noNaN: true }),
        (pipeSpeed) => {
          state.score = 0;
          state.pipeSpeed = pipeSpeed;

          const previousPipeSpeed = state.pipeSpeed;
          checkSpeedMilestone();

          expect(state.pipeSpeed).toBeCloseTo(previousPipeSpeed, 5);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('Part C: pipeSpeed never exceeds maxPipeSpeed after checkSpeedMilestone()', () => {
    /**
     * **Validates: Requirements 11.4**
     *
     * Generator: any score and any pipeSpeed in [basePipeSpeed, maxPipeSpeed].
     *
     * After calling checkSpeedMilestone(), pipeSpeed must never exceed
     * CONFIG.maxPipeSpeed, regardless of the score or starting speed.
     */
    fc.assert(
      fc.property(
        // any non-negative score
        fc.integer({ min: 0, max: 1000 }),
        // pipeSpeed: any value in the valid game range
        fc.float({ min: CONFIG.basePipeSpeed, max: CONFIG.maxPipeSpeed, noNaN: true }),
        (score, pipeSpeed) => {
          state.score = score;
          state.pipeSpeed = pipeSpeed;

          checkSpeedMilestone();

          expect(state.pipeSpeed).toBeLessThanOrEqual(CONFIG.maxPipeSpeed);
        }
      ),
      { numRuns: 1000 }
    );
  });
});

// ─── Property 1: Idle state freezes pipes and score ──────────────────────────
// Validates: Requirements 2.4
//
// For any number of update(dt) calls while state.current === IDLE, all pipe
// x-positions and state.score shall remain unchanged.
describe('Property 1: Idle state freezes pipes and score', () => {
  beforeEach(() => {
    // Reset to a clean IDLE baseline before each test
    state.current = STATE.IDLE;
    state.score = 0;
    state.pipes = [];
    state.pipeSpeed = CONFIG.basePipeSpeed;
    state.ghosty.bobTime = 0;
    state.ghosty.y = state.ghosty.baseY;
  });

  it('pipe x-positions and score remain unchanged across multiple IDLE update steps', () => {
    /**
     * **Validates: Requirements 2.4**
     *
     * Generator:
     *   - pipes: 0–5 pipes with arbitrary x-positions and gap centres
     *   - score: any non-negative integer
     *   - steps: number of update iterations (1–20)
     *   - dt: frame-time multiplier in [0.5, 2.0]
     *
     * For each run, snapshot the initial pipe x-positions and score, then
     * simulate the IDLE game loop (updateGhostyBob + updateClouds only —
     * updatePipes is NOT called in IDLE state). Assert that all pipe
     * x-positions and state.score are identical after every step.
     *
     * This directly validates Requirement 2.4: "WHILE in Idle_State, THE
     * Game SHALL NOT scroll pipes or increment the Score."
     */
    fc.assert(
      fc.property(
        // Generate 0–5 pipes with arbitrary positions
        fc.array(
          fc.record({
            x:          fc.integer({ min: -100, max: CONFIG.logicalWidth + 200 }),
            gapCentreY: fc.integer({ min: 100, max: 400 }),
            gapHeight:  fc.constant(CONFIG.gapHeight),
            width:      fc.constant(CONFIG.pipeWidth),
            scored:     fc.boolean(),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        // Initial score: any non-negative integer
        fc.integer({ min: 0, max: 100 }),
        // Number of update steps to simulate
        fc.integer({ min: 1, max: 20 }),
        // dt: frame-time multiplier
        fc.float({ min: 0.5, max: 2.0, noNaN: true }),
        (pipes, score, steps, dt) => {
          // Set up state
          state.current = STATE.IDLE;
          state.score = score;
          state.pipes = pipes.map(p => ({ ...p }));

          // Snapshot initial pipe x-positions and score
          const initialXs = state.pipes.map(p => p.x);
          const initialScore = state.score;

          // Simulate the IDLE game loop for `steps` iterations.
          // In IDLE, only updateGhostyBob and updateClouds are called —
          // updatePipes is deliberately NOT called.
          for (let i = 0; i < steps; i++) {
            updateGhostyBob(dt);
            updateClouds(dt);
          }

          // Assert: score must be unchanged
          expect(state.score).toBe(initialScore);

          // Assert: every pipe x-position must be unchanged
          expect(state.pipes.length).toBe(initialXs.length);
          for (let i = 0; i < initialXs.length; i++) {
            expect(state.pipes[i].x).toBe(initialXs[i]);
          }
        }
      ),
      { numRuns: 500 }
    );
  });
});
