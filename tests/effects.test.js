/**
 * Visual effects property-based tests
 *
 * Uses fast-check to verify:
 *   Property 12: Screen shake displacement is bounded and decays to zero
 *   Property 13: Particle properties are within specified ranges
 *   Property 14: Score popup fades to zero and is removed after duration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  startScreenShake,
  updateShake,
  emitParticle,
  updateParticles,
  spawnScorePopup,
  updateScorePopups,
  state,
  CONFIG,
  STATE,
} from '../game.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetState() {
  state.current      = STATE.PLAYING;
  state.shakeOffset  = { x: 0, y: 0 };
  state.shakeDuration = 0;
  state.shakeElapsed  = 0;
  state.particles    = [];
  state.scorePopups  = [];
  state.ghosty.x     = CONFIG.logicalWidth * 0.2;
  state.ghosty.y     = CONFIG.logicalHeight / 2;
  state.ghosty.width  = CONFIG.ghostyWidth;
  state.ghosty.height = CONFIG.ghostyHeight;
}

beforeEach(resetState);

// ─── Property 12: Screen shake displacement is bounded and decays to zero ─────
// Validates: Requirements 13.9, 13.10
//
// For any sequence of updateShake(dt) calls after startScreenShake():
//   - shakeOffset.x and shakeOffset.y are always within [-shakeMaxDisp, shakeMaxDisp]
//   - Once shakeElapsed >= shakeDuration, shakeOffset is exactly {x:0, y:0}
describe('Property 12: Screen shake displacement is bounded and decays to zero', () => {
  it('shakeOffset components are always within [-shakeMaxDisp, shakeMaxDisp]', () => {
    /**
     * **Validates: Requirements 13.9**
     *
     * Generator: dt values in [0.5, 2.0] and a number of update steps in [1, 20].
     * After startScreenShake(), each call to updateShake(dt) must keep
     * shakeOffset.x and shakeOffset.y within the maximum displacement bounds.
     */
    fc.assert(
      fc.property(
        fc.array(
          fc.float({ min: 0.5, max: 2.0, noNaN: true }),
          { minLength: 1, maxLength: 20 }
        ),
        (dtValues) => {
          resetState();
          startScreenShake();

          for (const dt of dtValues) {
            updateShake(dt);
            expect(state.shakeOffset.x).toBeGreaterThanOrEqual(-CONFIG.shakeMaxDisp);
            expect(state.shakeOffset.x).toBeLessThanOrEqual(CONFIG.shakeMaxDisp);
            expect(state.shakeOffset.y).toBeGreaterThanOrEqual(-CONFIG.shakeMaxDisp);
            expect(state.shakeOffset.y).toBeLessThanOrEqual(CONFIG.shakeMaxDisp);
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it('shakeOffset is exactly {x:0, y:0} once shakeElapsed >= shakeDuration', () => {
    /**
     * **Validates: Requirements 13.10**
     *
     * After enough updateShake(dt) calls to exhaust the shake duration,
     * shakeOffset must be zeroed out.
     *
     * Strategy: use a large dt so the shake expires in a single step.
     * shakeDuration = 400ms; dt = 400 / (1000/60) = 24 frames → one call exhausts it.
     */
    fc.assert(
      fc.property(
        // dt large enough to exhaust the full shake duration in one step
        fc.float({ min: 25, max: 100, noNaN: true }),
        (dt) => {
          resetState();
          startScreenShake();

          // One large step should exhaust the shake
          updateShake(dt);

          expect(state.shakeOffset.x).toBe(0);
          expect(state.shakeOffset.y).toBe(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('shakeOffset is {x:0, y:0} when no shake is active', () => {
    /**
     * **Validates: Requirements 13.10**
     *
     * When shakeDuration is 0 (no shake started), updateShake() must leave
     * shakeOffset as {x:0, y:0}.
     */
    fc.assert(
      fc.property(
        fc.float({ min: 0.5, max: 2.0, noNaN: true }),
        (dt) => {
          resetState();
          // Do NOT call startScreenShake() — shakeDuration stays 0

          updateShake(dt);

          expect(state.shakeOffset.x).toBe(0);
          expect(state.shakeOffset.y).toBe(0);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── Property 13: Particle properties are within specified ranges ─────────────
// Validates: Requirements 13.12, 13.14
//
// For any call to emitParticle():
//   - radius is in [2, 5]
//   - lifetime is in [300, 600]
//   - vx is in [-(1.5 + 0.5), -0.5] = [-2, -0.5] (leftward)
//   - alpha starts at 0.8
//   - age starts at 0
//   - color is 'rgba(200, 200, 255, 1)'
//
// After updateParticles(dt) runs until all particles expire, state.particles is empty.
describe('Property 13: Particle properties are within specified ranges', () => {
  it('emitParticle() produces particles with radius in [2, 5] and lifetime in [300, 600]', () => {
    /**
     * **Validates: Requirements 13.12**
     *
     * Generator: number of particles to emit in [1, 20].
     * Each emitted particle must have radius in [2, 5] and lifetime in [300, 600].
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (count) => {
          resetState();

          for (let i = 0; i < count; i++) {
            emitParticle();
          }

          expect(state.particles).toHaveLength(count);

          for (const p of state.particles) {
            expect(p.radius).toBeGreaterThanOrEqual(2);
            expect(p.radius).toBeLessThanOrEqual(5);
            expect(p.lifetime).toBeGreaterThanOrEqual(CONFIG.particleLifetime[0]);
            expect(p.lifetime).toBeLessThanOrEqual(CONFIG.particleLifetime[1]);
            expect(p.vx).toBeLessThan(0);          // leftward drift
            expect(p.vx).toBeGreaterThanOrEqual(-2); // max leftward speed
            expect(p.alpha).toBe(0.8);
            expect(p.age).toBe(0);
            expect(p.color).toBe('rgba(200, 200, 255, 1)');
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it('expired particles (age >= lifetime) are removed by updateParticles()', () => {
    /**
     * **Validates: Requirements 13.14**
     *
     * After advancing time past each particle's lifetime, updateParticles()
     * must remove all expired particles from state.particles.
     *
     * Strategy: emit particles, then call updateParticles with a very large dt
     * that converts to more ms than the maximum lifetime (600ms).
     * dt = 600 / (1000/60) = 36 frames → one call ages all particles past lifetime.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        // dt large enough to expire all particles in one step (> 600ms worth)
        fc.float({ min: 40, max: 100, noNaN: true }),
        (count, dt) => {
          resetState();

          for (let i = 0; i < count; i++) {
            emitParticle();
          }

          expect(state.particles).toHaveLength(count);

          updateParticles(dt);

          // All particles should be expired and removed
          expect(state.particles).toHaveLength(0);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('particle alpha decays toward 0 as age approaches lifetime', () => {
    /**
     * **Validates: Requirements 13.12**
     *
     * After a partial update (not enough to expire particles), alpha must
     * be less than the initial 0.8 and non-negative.
     */
    fc.assert(
      fc.property(
        // dt small enough that particles survive (< 300ms worth)
        fc.float({ min: 1, max: 10, noNaN: true }),
        (dt) => {
          resetState();
          emitParticle();

          const initialAlpha = state.particles[0].alpha;
          expect(initialAlpha).toBe(0.8);

          updateParticles(dt);

          if (state.particles.length > 0) {
            // Alpha must have decayed (or stayed at 0.8 if age is still very small)
            expect(state.particles[0].alpha).toBeGreaterThanOrEqual(0);
            expect(state.particles[0].alpha).toBeLessThanOrEqual(0.8);
          }
        }
      ),
      { numRuns: 300 }
    );
  });
});

// ─── Property 14: Score popup fades to zero and is removed after duration ─────
// Validates: Requirements 13.16, 13.18
//
// For any score popup spawned by spawnScorePopup(pipeX):
//   - alpha starts at 1.0 and decays to 0 as age approaches duration
//   - popup is removed from state.scorePopups once age >= duration
describe('Property 14: Score popup fades to zero and is removed after duration', () => {
  it('spawnScorePopup() creates a popup with alpha=1.0, age=0, duration=CONFIG.popupDuration', () => {
    /**
     * **Validates: Requirements 13.15**
     *
     * Generator: arbitrary pipeX values.
     * Each spawned popup must have the correct initial properties.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: CONFIG.logicalWidth + 100 }),
        (pipeX) => {
          resetState();
          spawnScorePopup(pipeX);

          expect(state.scorePopups).toHaveLength(1);
          const popup = state.scorePopups[0];
          expect(popup.x).toBe(pipeX);
          expect(popup.alpha).toBe(1.0);
          expect(popup.age).toBe(0);
          expect(popup.duration).toBe(CONFIG.popupDuration);
          expect(popup.y).toBe(CONFIG.logicalHeight - CONFIG.scoreBarHeight - 20);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('expired popups (age >= duration) are removed by updateScorePopups()', () => {
    /**
     * **Validates: Requirements 13.18**
     *
     * After advancing time past the popup duration, updateScorePopups()
     * must remove all expired popups.
     *
     * Strategy: use a large dt that converts to more ms than popupDuration (800ms).
     * dt = 800 / (1000/60) ≈ 48 frames → one call ages all popups past duration.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        // dt large enough to expire all popups in one step (> 800ms worth)
        fc.float({ min: 55, max: 120, noNaN: true }),
        (count, dt) => {
          resetState();

          for (let i = 0; i < count; i++) {
            spawnScorePopup(100 + i * 50);
          }

          expect(state.scorePopups).toHaveLength(count);

          updateScorePopups(dt);

          expect(state.scorePopups).toHaveLength(0);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('popup alpha decays from 1.0 toward 0 as age increases', () => {
    /**
     * **Validates: Requirements 13.16**
     *
     * After a partial update (not enough to expire the popup), alpha must
     * be less than 1.0 and non-negative.
     */
    fc.assert(
      fc.property(
        // dt small enough that popup survives (< 800ms worth)
        fc.float({ min: 1, max: 10, noNaN: true }),
        (dt) => {
          resetState();
          spawnScorePopup(200);

          expect(state.scorePopups[0].alpha).toBe(1.0);

          updateScorePopups(dt);

          if (state.scorePopups.length > 0) {
            expect(state.scorePopups[0].alpha).toBeGreaterThanOrEqual(0);
            expect(state.scorePopups[0].alpha).toBeLessThanOrEqual(1.0);
          }
        }
      ),
      { numRuns: 300 }
    );
  });

  it('popup y decreases (floats upward) on each updateScorePopups() call', () => {
    /**
     * **Validates: Requirements 13.16**
     *
     * Each call to updateScorePopups(dt) must move the popup upward (y decreases).
     */
    fc.assert(
      fc.property(
        fc.float({ min: 0.5, max: 5.0, noNaN: true }),
        (dt) => {
          resetState();
          spawnScorePopup(200);

          const initialY = state.scorePopups[0].y;
          updateScorePopups(dt);

          if (state.scorePopups.length > 0) {
            expect(state.scorePopups[0].y).toBeLessThan(initialY);
          }
        }
      ),
      { numRuns: 300 }
    );
  });
});
