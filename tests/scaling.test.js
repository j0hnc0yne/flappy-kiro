/**
 * Coordinate scaling property-based tests
 *
 * Property 16: Coordinate scaling round-trip
 * Validates: Requirements 10.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { toLogical, state, CONFIG } from '../game.js';

// ─── Property 16: Coordinate scaling round-trip ───────────────────────────────
// Validates: Requirements 10.3
//
// For any physical (clientX, clientY) coordinate, toLogical() must correctly
// convert it to logical space using the stored scale and offsets.
//
// The inverse relationship is:
//   logicalX = (clientX - offsetX) / scale
//   logicalY = (clientY - offsetY) / scale
describe('Property 16: Coordinate scaling round-trip', () => {
  it('toLogical() converts physical coordinates to logical space correctly', () => {
    /**
     * **Validates: Requirements 10.3**
     *
     * Generator:
     *   - scale: any positive scale factor in [0.5, 3.0]
     *   - offsetX, offsetY: any reasonable canvas offsets in [0, 200]
     *   - logicalX, logicalY: any logical coordinates in [0, logicalWidth/logicalHeight]
     *
     * Strategy: compute the physical coordinates from known logical coordinates,
     * then verify toLogical() recovers the original logical coordinates.
     */
    fc.assert(
      fc.property(
        // scale: positive scale factor
        fc.float({ min: 0.5, max: 3.0, noNaN: true }),
        // offsets: canvas letterbox offsets
        fc.float({ min: 0, max: 200, noNaN: true }),
        fc.float({ min: 0, max: 200, noNaN: true }),
        // logical coordinates to round-trip
        fc.float({ min: 0, max: CONFIG.logicalWidth,  noNaN: true }),
        fc.float({ min: 0, max: CONFIG.logicalHeight, noNaN: true }),
        (scale, offsetX, offsetY, logicalX, logicalY) => {
          // Set up state with the generated scale and offsets
          state.scale   = scale;
          state.offsetX = offsetX;
          state.offsetY = offsetY;

          // Compute physical coordinates from logical ones
          const physicalX = logicalX * scale + offsetX;
          const physicalY = logicalY * scale + offsetY;

          // Convert back to logical space
          const result = toLogical(physicalX, physicalY);

          // Should recover the original logical coordinates
          expect(result.x).toBeCloseTo(logicalX, 5);
          expect(result.y).toBeCloseTo(logicalY, 5);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('toLogical() handles zero offset correctly', () => {
    /**
     * **Validates: Requirements 10.3**
     *
     * When offsetX and offsetY are both 0, toLogical() is a simple division by scale.
     */
    fc.assert(
      fc.property(
        fc.float({ min: 0.5, max: 3.0, noNaN: true }),
        fc.float({ min: 0, max: 1000, noNaN: true }),
        fc.float({ min: 0, max: 1000, noNaN: true }),
        (scale, physicalX, physicalY) => {
          state.scale   = scale;
          state.offsetX = 0;
          state.offsetY = 0;

          const result = toLogical(physicalX, physicalY);

          expect(result.x).toBeCloseTo(physicalX / scale, 5);
          expect(result.y).toBeCloseTo(physicalY / scale, 5);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('toLogical() returns logical origin (0,0) when physical coords equal the offset', () => {
    /**
     * **Validates: Requirements 10.3**
     *
     * When clientX === offsetX and clientY === offsetY, the result should be (0, 0).
     */
    fc.assert(
      fc.property(
        fc.float({ min: 0.5, max: 3.0, noNaN: true }),
        fc.float({ min: 0, max: 500, noNaN: true }),
        fc.float({ min: 0, max: 500, noNaN: true }),
        (scale, offsetX, offsetY) => {
          state.scale   = scale;
          state.offsetX = offsetX;
          state.offsetY = offsetY;

          const result = toLogical(offsetX, offsetY);

          expect(result.x).toBeCloseTo(0, 5);
          expect(result.y).toBeCloseTo(0, 5);
        }
      ),
      { numRuns: 500 }
    );
  });
});
