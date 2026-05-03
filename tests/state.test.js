/**
 * State machine transition tests
 *
 * Tests for:
 *   Property 11: Frozen states do not mutate game physics
 *   Unit tests for all state transitions (toPlaying, toPaused, toGameOver, toIdle)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  toPlaying,
  toPaused,
  toGameOver,
  toIdle,
  state,
  CONFIG,
  STATE,
} from '../game.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetState() {
  state.current      = STATE.IDLE;
  state.score        = 0;
  state.highScore    = 0;
  state.newHighScore = false;
  state.pipes        = [];
  state.pipeSpeed    = CONFIG.basePipeSpeed;
  state.ghosty.x     = CONFIG.logicalWidth * 0.2;
  state.ghosty.y     = CONFIG.logicalHeight / 2;
  state.ghosty.vy    = 0;
  state.ghosty.bobTime = 0;
}

beforeEach(resetState);

// ─── Unit tests: state transitions ───────────────────────────────────────────

describe('toPlaying()', () => {
  it('sets state.current to PLAYING', () => {
    state.current = STATE.IDLE;
    toPlaying();
    expect(state.current).toBe(STATE.PLAYING);
  });

  it('resets score to 0', () => {
    state.score = 42;
    toPlaying();
    expect(state.score).toBe(0);
  });

  it('resets pipeSpeed to basePipeSpeed', () => {
    state.pipeSpeed = CONFIG.maxPipeSpeed;
    toPlaying();
    expect(state.pipeSpeed).toBe(CONFIG.basePipeSpeed);
  });

  it('clears all pipes', () => {
    state.pipes = [{ x: 100, gapCentreY: 300, gapHeight: 150, width: 52, scored: false }];
    toPlaying();
    expect(state.pipes).toHaveLength(0);
  });

  it('resets ghosty position and velocity', () => {
    state.ghosty.x  = 999;
    state.ghosty.y  = 999;
    state.ghosty.vy = 99;
    toPlaying();
    expect(state.ghosty.x).toBe(CONFIG.logicalWidth * 0.2);
    expect(state.ghosty.y).toBe(CONFIG.logicalHeight / 2);
    expect(state.ghosty.vy).toBe(0);
  });
});

describe('toPaused()', () => {
  it('sets state.current to PAUSED', () => {
    state.current = STATE.PLAYING;
    toPaused();
    expect(state.current).toBe(STATE.PAUSED);
  });

  it('does not change score', () => {
    state.current = STATE.PLAYING;
    state.score = 7;
    toPaused();
    expect(state.score).toBe(7);
  });

  it('does not clear pipes', () => {
    state.current = STATE.PLAYING;
    state.pipes = [{ x: 200, gapCentreY: 300, gapHeight: 150, width: 52, scored: false }];
    toPaused();
    expect(state.pipes).toHaveLength(1);
  });
});

describe('toGameOver()', () => {
  it('sets state.current to GAME_OVER', () => {
    state.current = STATE.PLAYING;
    toGameOver();
    expect(state.current).toBe(STATE.GAME_OVER);
  });

  it('does not change score', () => {
    state.current = STATE.PLAYING;
    state.score = 15;
    toGameOver();
    expect(state.score).toBe(15);
  });
});

describe('toIdle()', () => {
  it('sets state.current to IDLE', () => {
    state.current = STATE.GAME_OVER;
    toIdle();
    expect(state.current).toBe(STATE.IDLE);
  });

  it('resets score to 0', () => {
    state.score = 20;
    toIdle();
    expect(state.score).toBe(0);
  });

  it('clears all pipes', () => {
    state.pipes = [{ x: 100, gapCentreY: 300, gapHeight: 150, width: 52, scored: false }];
    toIdle();
    expect(state.pipes).toHaveLength(0);
  });

  it('resets newHighScore to false', () => {
    state.newHighScore = true;
    toIdle();
    expect(state.newHighScore).toBe(false);
  });

  it('repositions ghosty to base Y', () => {
    state.ghosty.y  = 999;
    state.ghosty.vy = 5;
    toIdle();
    expect(state.ghosty.y).toBe(state.ghosty.baseY);
    expect(state.ghosty.vy).toBe(0);
  });
});
