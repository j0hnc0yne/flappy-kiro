/**
 * Collision detection property-based tests
 *
 * Uses fast-check to verify Property 8: AABB collision detection is correct
 * for pipes and screen edges.
 *
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  checkCollision,
  getGhostyBounds,
  state,
  CONFIG,
  STATE,
} from '../game.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Reset game state to a clean PLAYING baseline before each test.
 * We also reset state.current so triggerCollision() can set it to GAME_OVER.
 */
function resetState() {
  state.current    = STATE.PLAYING;
  state.score      = 0;
  state.highScore  = 0;
  state.pipes      = [];
  state.scorePopups = [];
  state.ghosty.x   = CONFIG.logicalWidth * 0.2;
  state.ghosty.y   = CONFIG.logicalHeight / 2;
  state.ghosty.vy  = 0;
  state.ghosty.width  = CONFIG.ghostyWidth;
  state.ghosty.height = CONFIG.ghostyHeight;
}

beforeEach(resetState);

// ─── Property 8: AABB collision detection is correct for pipes and screen edges
// Validates: Requirements 6.1, 6.2, 6.3
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 8: AABB collision detection is correct for pipes and screen edges', () => {

  // ── 8a: Top edge collision ──────────────────────────────────────────────────
  it('triggers collision when ghosty top bound <= 0 (screen top edge)', () => {
    /**
     * **Validates: Requirements 6.2**
     *
     * Generator: ghosty y-positions that place the inset top bound at or above 0.
     *   top = y - height/2 + inset <= 0
     *   => y <= height/2 - inset
     *
     * For each such y, checkCollision() must set state.current to GAME_OVER.
     */
    const inset      = CONFIG.hitboxInset;
    const halfHeight = CONFIG.ghostyHeight / 2;
    // Maximum y that still puts the top bound at exactly 0
    const maxY = halfHeight - inset;

    fc.assert(
      fc.property(
        // y in range that puts top bound <= 0
        fc.float({ min: -200, max: maxY, noNaN: true }),
        (y) => {
          resetState();
          state.ghosty.y = y;

          checkCollision();

          expect(state.current).toBe(STATE.GAME_OVER);
        }
      ),
      { numRuns: 500 }
    );
  });

  // ── 8b: Bottom edge collision ───────────────────────────────────────────────
  it('triggers collision when ghosty bottom bound >= logicalHeight - scoreBarHeight (screen bottom edge)', () => {
    /**
     * **Validates: Requirements 6.3**
     *
     * Generator: ghosty y-positions that place the inset bottom bound at or
     * below the play area floor.
     *   bottom = y + height/2 - inset >= logicalHeight - scoreBarHeight
     *   => y >= logicalHeight - scoreBarHeight - height/2 + inset
     */
    const inset      = CONFIG.hitboxInset;
    const halfHeight = CONFIG.ghostyHeight / 2;
    const floor      = CONFIG.logicalHeight - CONFIG.scoreBarHeight;
    // Minimum y that puts the bottom bound at exactly the floor
    const minY = floor - halfHeight + inset;

    fc.assert(
      fc.property(
        // y in range that puts bottom bound >= floor
        fc.float({ min: minY, max: CONFIG.logicalHeight + 200, noNaN: true }),
        (y) => {
          resetState();
          state.ghosty.y = y;

          checkCollision();

          expect(state.current).toBe(STATE.GAME_OVER);
        }
      ),
      { numRuns: 500 }
    );
  });

  // ── 8c: Pipe collision — ghosty overlaps top pipe ───────────────────────────
  it('triggers collision when ghosty overlaps the top pipe section', () => {
    /**
     * **Validates: Requirements 6.1**
     *
     * Strategy: place ghosty horizontally overlapping a pipe, then position
     * ghosty's y so its top bound is inside the top pipe (above topPipeBottom).
     *
     * Pipe layout:
     *   topPipeBottom = gapCentreY - gapHeight / 2
     *   bottomPipeTop = gapCentreY + gapHeight / 2
     *
     * For a top-pipe collision we need:
     *   horizontalOverlap: g.right > pipeLeft && g.left < pipeRight
     *   g.top < topPipeBottom  (ghosty is inside the top pipe)
     *
     * We also need g.bottom NOT to be below bottomPipeTop (otherwise the
     * bottom-pipe check fires first, which is fine — still a collision).
     */
    const inset      = CONFIG.hitboxInset;
    const halfW      = CONFIG.ghostyWidth  / 2;
    const halfH      = CONFIG.ghostyHeight / 2;

    fc.assert(
      fc.property(
        // gapCentreY: keep gap well within the play area
        fc.integer({ min: 200, max: 400 }),
        // ghosty x: centred on the pipe so there is definite horizontal overlap
        fc.integer({ min: 50, max: CONFIG.logicalWidth - 100 }),
        (gapCentreY, ghostyX) => {
          resetState();

          const topPipeBottom = gapCentreY - CONFIG.gapHeight / 2;

          // Place a pipe whose left edge is to the left of ghosty so ghosty
          // is horizontally inside the pipe.
          const pipeX = ghostyX - CONFIG.pipeWidth / 2;

          state.pipes = [{
            x:          pipeX,
            gapCentreY: gapCentreY,
            gapHeight:  CONFIG.gapHeight,
            width:      CONFIG.pipeWidth,
            scored:     false,
          }];

          // Position ghosty so its top bound is inside the top pipe.
          // g.top = y - halfH + inset < topPipeBottom
          // => y < topPipeBottom + halfH - inset
          // Use topPipeBottom - 1 as the target top bound (clearly inside top pipe).
          const targetTop = topPipeBottom - 1;
          state.ghosty.x = ghostyX;
          state.ghosty.y = targetTop + halfH - inset;

          checkCollision();

          expect(state.current).toBe(STATE.GAME_OVER);
        }
      ),
      { numRuns: 500 }
    );
  });

  // ── 8d: Pipe collision — ghosty overlaps bottom pipe ───────────────────────
  it('triggers collision when ghosty overlaps the bottom pipe section', () => {
    /**
     * **Validates: Requirements 6.1**
     *
     * For a bottom-pipe collision we need:
     *   horizontalOverlap: g.right > pipeLeft && g.left < pipeRight
     *   g.bottom > bottomPipeTop  (ghosty is inside the bottom pipe)
     */
    const inset = CONFIG.hitboxInset;
    const halfW = CONFIG.ghostyWidth  / 2;
    const halfH = CONFIG.ghostyHeight / 2;

    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 400 }),
        fc.integer({ min: 50, max: CONFIG.logicalWidth - 100 }),
        (gapCentreY, ghostyX) => {
          resetState();

          const bottomPipeTop = gapCentreY + CONFIG.gapHeight / 2;

          const pipeX = ghostyX - CONFIG.pipeWidth / 2;

          state.pipes = [{
            x:          pipeX,
            gapCentreY: gapCentreY,
            gapHeight:  CONFIG.gapHeight,
            width:      CONFIG.pipeWidth,
            scored:     false,
          }];

          // Position ghosty so its bottom bound is inside the bottom pipe.
          // g.bottom = y + halfH - inset > bottomPipeTop
          // => y > bottomPipeTop - halfH + inset
          const targetBottom = bottomPipeTop + 1;
          state.ghosty.x = ghostyX;
          state.ghosty.y = targetBottom - halfH + inset;

          checkCollision();

          expect(state.current).toBe(STATE.GAME_OVER);
        }
      ),
      { numRuns: 500 }
    );
  });

  // ── 8e: No collision when ghosty is safely in the gap ──────────────────────
  it('does NOT trigger collision when ghosty is safely within the pipe gap', () => {
    /**
     * **Validates: Requirements 6.1 (negative case)**
     *
     * When ghosty is horizontally overlapping a pipe but vertically centred
     * inside the gap, no collision should be triggered.
     *
     * Safe zone (vertical):
     *   g.top  >= topPipeBottom  (not inside top pipe)
     *   g.bottom <= bottomPipeTop (not inside bottom pipe)
     *
     * Which means:
     *   y - halfH + inset >= topPipeBottom  => y >= topPipeBottom + halfH - inset
     *   y + halfH - inset <= bottomPipeTop  => y <= bottomPipeTop - halfH + inset
     *
     * The gap must be large enough to fit ghosty's inset hitbox:
     *   gapHeight >= ghostyHeight - 2*inset + 2  (at least 1px clearance each side)
     *
     * CONFIG.gapHeight (150) >> CONFIG.ghostyHeight - 2*inset (32), so this
     * always holds with the default config.
     */
    const inset  = CONFIG.hitboxInset;
    const halfH  = CONFIG.ghostyHeight / 2;

    fc.assert(
      fc.property(
        // gapCentreY: well within the play area
        fc.integer({ min: 200, max: 400 }),
        // ghosty x: centred on the pipe (horizontal overlap guaranteed)
        fc.integer({ min: 50, max: CONFIG.logicalWidth - 100 }),
        (gapCentreY, ghostyX) => {
          resetState();

          const topPipeBottom = gapCentreY - CONFIG.gapHeight / 2;
          const bottomPipeTop = gapCentreY + CONFIG.gapHeight / 2;

          // Safe y range for ghosty centre (inset hitbox fully inside gap)
          const minSafeY = topPipeBottom + halfH - inset;
          const maxSafeY = bottomPipeTop - halfH + inset;

          // If the gap is too small for ghosty (shouldn't happen with default config),
          // skip this run.
          if (minSafeY >= maxSafeY) return;

          // Place ghosty at the gap centre — always safe
          const safeY = gapCentreY;

          const pipeX = ghostyX - CONFIG.pipeWidth / 2;

          state.pipes = [{
            x:          pipeX,
            gapCentreY: gapCentreY,
            gapHeight:  CONFIG.gapHeight,
            width:      CONFIG.pipeWidth,
            scored:     false,
          }];

          state.ghosty.x = ghostyX;
          state.ghosty.y = safeY;

          checkCollision();

          // State must remain PLAYING — no collision triggered
          expect(state.current).toBe(STATE.PLAYING);
        }
      ),
      { numRuns: 500 }
    );
  });

  // ── 8f: No collision when ghosty is horizontally clear of a pipe ────────────
  it('does NOT trigger collision when ghosty has no horizontal overlap with a pipe', () => {
    /**
     * **Validates: Requirements 6.1 (negative case)**
     *
     * When ghosty is to the left or right of a pipe (no horizontal overlap),
     * no collision should be triggered regardless of vertical position.
     */
    const inset = CONFIG.hitboxInset;
    const halfW = CONFIG.ghostyWidth / 2;

    fc.assert(
      fc.property(
        // gapCentreY: any valid gap position
        fc.integer({ min: 150, max: 450 }),
        // pipe x: well within the canvas
        fc.integer({ min: 200, max: 350 }),
        // ghosty y: anywhere in the vertical danger zone (inside a pipe vertically)
        fc.integer({ min: 0, max: 100 }),
        (gapCentreY, pipeX, ghostyY) => {
          resetState();

          // Place ghosty clearly to the left of the pipe so there is no
          // horizontal overlap.
          // g.right = ghostyX + halfW - inset < pipeX
          // => ghostyX < pipeX - halfW + inset
          const ghostyX = pipeX - halfW - 10; // 10px clearance

          state.pipes = [{
            x:          pipeX,
            gapCentreY: gapCentreY,
            gapHeight:  CONFIG.gapHeight,
            width:      CONFIG.pipeWidth,
            scored:     false,
          }];

          state.ghosty.x = ghostyX;
          state.ghosty.y = ghostyY;

          // Ghosty y is in the top-pipe zone vertically, but no horizontal overlap
          // means no pipe collision. Also ensure ghosty is not hitting screen edges.
          const g = getGhostyBounds();
          const hitEdge = g.top <= 0 ||
            g.bottom >= CONFIG.logicalHeight - CONFIG.scoreBarHeight;

          checkCollision();

          if (!hitEdge) {
            expect(state.current).toBe(STATE.PLAYING);
          }
          // If it hit an edge, GAME_OVER is correct — we just don't assert in that case.
        }
      ),
      { numRuns: 500 }
    );
  });

});
