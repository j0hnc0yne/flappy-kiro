/**
 * Physics property-based tests
 *
 * Uses fast-check to verify universal physics properties across arbitrary inputs.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { applyFlap, updateGhosty, state, CONFIG } from '../game.js';

// Reset ghosty state before each test to avoid cross-test contamination.
beforeEach(() => {
  state.ghosty.vy = 0;
  state.ghosty.y  = CONFIG.logicalHeight / 2;
});

// ─── Property 2: Flap overrides velocity ─────────────────────────────────────
// Validates: Requirements 3.4
//
// For any current value of ghosty.vy (positive, negative, or zero),
// after applyFlap() is called, ghosty.vy shall equal exactly CONFIG.flapVelocity
// (not CONFIG.flapVelocity + previous_vy).
describe('Property 2: Flap overrides velocity', () => {
  it('sets ghosty.vy to exactly FLAP_VELOCITY regardless of prior vy', () => {
    /**
     * **Validates: Requirements 3.4**
     *
     * Generator: arbitrary float covering positive, negative, and zero values.
     * For each arbitrary vy, set ghosty.vy to that value, call applyFlap(),
     * and assert the result is exactly CONFIG.flapVelocity (-9).
     */
    fc.assert(
      fc.property(
        fc.float({ min: -1000, max: 1000, noNaN: true }),
        (arbitraryVy) => {
          // Arrange: set ghosty to an arbitrary vertical velocity
          state.ghosty.vy = arbitraryVy;

          // Act: apply flap
          applyFlap();

          // Assert: vy is exactly FLAP_VELOCITY, not FLAP_VELOCITY + arbitraryVy
          expect(state.ghosty.vy).toBe(CONFIG.flapVelocity);
        }
      )
    );
  });

  it('flap result is always -9 (the defined FLAP_VELOCITY constant)', () => {
    // Spot-check: verify the constant itself is -9 as per the design
    expect(CONFIG.flapVelocity).toBe(-9);

    // Verify for a few representative values
    const testCases = [0, 12, -9, 100, -100, 0.001, -0.001];
    for (const vy of testCases) {
      state.ghosty.vy = vy;
      applyFlap();
      expect(state.ghosty.vy).toBe(-9);
    }
  });
});
