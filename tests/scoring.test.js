/**
 * Scoring and high score persistence property-based tests
 *
 * Uses fast-check to verify:
 *   Property 9: Scoring increments score exactly once per pipe
 *   Property 10: High score update and localStorage round-trip
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  checkScore,
  updateHighScore,
  loadHighScore,
  saveHighScore,
  state,
  CONFIG,
  STATE,
} from '../game.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetState() {
  state.current    = STATE.PLAYING;
  state.score      = 0;
  state.highScore  = 0;
  state.newHighScore = false;
  state.pipes      = [];
  state.scorePopups = [];
  state.ghosty.x   = CONFIG.logicalWidth * 0.2;
  state.ghosty.y   = CONFIG.logicalHeight / 2;
  state.ghosty.vy  = 0;
  state.ghosty.width  = CONFIG.ghostyWidth;
  state.ghosty.height = CONFIG.ghostyHeight;
  state.pipeSpeed  = CONFIG.basePipeSpeed;
}

beforeEach(resetState);

afterEach(() => {
  // Clean up localStorage after each test
  try {
    localStorage.removeItem(CONFIG.highScoreKey);
  } catch {
    // ignore
  }
});

// ─── Property 9: Scoring increments score exactly once per pipe ───────────────
// Validates: Requirements 7.1
//
// For any pipe where ghosty.x > pipe.x + pipe.width and pipe.scored === false,
// after checkScore(), state.score shall have increased by exactly 1 and
// pipe.scored shall be true. Calling checkScore() again shall not increment
// the score a second time.
describe('Property 9: Scoring increments score exactly once per pipe', () => {
  it('increments score by exactly 1 when ghosty passes an unscored pipe', () => {
    /**
     * **Validates: Requirements 7.1**
     *
     * Generator: pipe x-positions such that ghosty.x > pipe.x + pipe.width
     * (ghosty has already passed the pipe). pipe.scored starts as false.
     *
     * After checkScore(), score must be exactly 1 and pipe.scored must be true.
     */
    fc.assert(
      fc.property(
        // pipe x: ghosty must be to the right of pipe.x + pipe.width
        // ghosty.x = logicalWidth * 0.2 = 96; pipe.x + pipeWidth < 96
        fc.integer({ min: -200, max: Math.floor(CONFIG.logicalWidth * 0.2) - CONFIG.pipeWidth - 1 }),
        fc.integer({ min: 100, max: 400 }),
        (pipeX, gapCentreY) => {
          resetState();

          state.pipes = [{
            x:          pipeX,
            gapCentreY: gapCentreY,
            gapHeight:  CONFIG.gapHeight,
            width:      CONFIG.pipeWidth,
            scored:     false,
          }];

          const scoreBefore = state.score;
          checkScore();

          // Score must have increased by exactly 1
          expect(state.score).toBe(scoreBefore + 1);
          // Pipe must be marked as scored
          expect(state.pipes[0].scored).toBe(true);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('does NOT increment score a second time when checkScore() is called again', () => {
    /**
     * **Validates: Requirements 7.1**
     *
     * After the first checkScore() call marks pipe.scored = true, a second
     * call must not increment the score again.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: -200, max: Math.floor(CONFIG.logicalWidth * 0.2) - CONFIG.pipeWidth - 1 }),
        fc.integer({ min: 100, max: 400 }),
        (pipeX, gapCentreY) => {
          resetState();

          state.pipes = [{
            x:          pipeX,
            gapCentreY: gapCentreY,
            gapHeight:  CONFIG.gapHeight,
            width:      CONFIG.pipeWidth,
            scored:     false,
          }];

          // First call — scores the pipe
          checkScore();
          const scoreAfterFirst = state.score;

          // Second call — must not score again
          checkScore();

          expect(state.score).toBe(scoreAfterFirst);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('does NOT increment score when ghosty has not yet passed the pipe', () => {
    /**
     * **Validates: Requirements 7.1 (negative case)**
     *
     * When ghosty.x <= pipe.x + pipe.width, the pipe has not been passed yet
     * and the score must remain unchanged.
     */
    fc.assert(
      fc.property(
        // pipe x: ghosty has NOT passed (ghosty.x <= pipe.x + pipe.width)
        fc.integer({ min: Math.floor(CONFIG.logicalWidth * 0.2) - CONFIG.pipeWidth, max: CONFIG.logicalWidth }),
        fc.integer({ min: 100, max: 400 }),
        (pipeX, gapCentreY) => {
          resetState();

          state.pipes = [{
            x:          pipeX,
            gapCentreY: gapCentreY,
            gapHeight:  CONFIG.gapHeight,
            width:      CONFIG.pipeWidth,
            scored:     false,
          }];

          const scoreBefore = state.score;
          checkScore();

          expect(state.score).toBe(scoreBefore);
          expect(state.pipes[0].scored).toBe(false);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('does NOT increment score for an already-scored pipe', () => {
    /**
     * **Validates: Requirements 7.1 (negative case)**
     *
     * A pipe with scored === true must never cause a score increment,
     * even if ghosty is past it.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: -200, max: Math.floor(CONFIG.logicalWidth * 0.2) - CONFIG.pipeWidth - 1 }),
        fc.integer({ min: 100, max: 400 }),
        (pipeX, gapCentreY) => {
          resetState();

          state.pipes = [{
            x:          pipeX,
            gapCentreY: gapCentreY,
            gapHeight:  CONFIG.gapHeight,
            width:      CONFIG.pipeWidth,
            scored:     true, // already scored
          }];

          const scoreBefore = state.score;
          checkScore();

          expect(state.score).toBe(scoreBefore);
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ─── Property 10: High score update and localStorage round-trip ───────────────
// Validates: Requirements 7.5, 7.6
//
// Part A: For any score S > state.highScore, after updateHighScore(),
//         state.highScore shall equal S.
// Part B: For any integer V, loadHighScore() called after saveHighScore(V)
//         shall return V.
describe('Property 10: High score update and localStorage round-trip', () => {
  it('Part A: updateHighScore() sets state.highScore to state.score when score > highScore', () => {
    /**
     * **Validates: Requirements 7.5**
     *
     * Generator: score S and highScore H where S > H.
     * After updateHighScore(), state.highScore must equal S and
     * state.newHighScore must be true.
     */
    fc.assert(
      fc.property(
        // highScore H: any non-negative integer
        fc.integer({ min: 0, max: 1000 }),
        // delta: positive integer so that score = H + delta > H
        fc.integer({ min: 1, max: 1000 }),
        (highScore, delta) => {
          resetState();
          state.highScore = highScore;
          state.score     = highScore + delta; // score > highScore

          updateHighScore();

          expect(state.highScore).toBe(highScore + delta);
          expect(state.newHighScore).toBe(true);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('Part A (negative): updateHighScore() does NOT change highScore when score <= highScore', () => {
    /**
     * **Validates: Requirements 7.5 (negative case)**
     *
     * When state.score <= state.highScore, updateHighScore() must leave
     * state.highScore unchanged and state.newHighScore must remain false.
     */
    fc.assert(
      fc.property(
        // highScore H: any positive integer
        fc.integer({ min: 1, max: 1000 }),
        // score: 0 to H (not greater than highScore)
        fc.integer({ min: 0, max: 1000 }),
        (highScore, score) => {
          // Ensure score <= highScore
          const clampedScore = score % (highScore + 1); // 0..highScore
          resetState();
          state.highScore    = highScore;
          state.score        = clampedScore;
          state.newHighScore = false;

          updateHighScore();

          expect(state.highScore).toBe(highScore);
          expect(state.newHighScore).toBe(false);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('Part B: loadHighScore() returns the value written by saveHighScore()', () => {
    /**
     * **Validates: Requirements 7.6**
     *
     * For any non-negative integer V, saveHighScore(V) followed by
     * loadHighScore() must return V.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        (value) => {
          saveHighScore(value);
          const loaded = loadHighScore();
          expect(loaded).toBe(value);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('Part B: loadHighScore() returns 0 when no value has been saved', () => {
    /**
     * **Validates: Requirements 7.7, 8.8**
     *
     * When localStorage has no entry for the high score key,
     * loadHighScore() must return 0.
     */
    try {
      localStorage.removeItem(CONFIG.highScoreKey);
    } catch {
      // localStorage unavailable — skip
      return;
    }
    expect(loadHighScore()).toBe(0);
  });
});
