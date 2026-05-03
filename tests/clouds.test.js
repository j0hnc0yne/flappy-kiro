/**
 * Cloud parallax system property-based tests
 *
 * Property 15: Cloud parallax ordering — nearer layers scroll faster and are more opaque
 * Validates: Requirements 9.3, 9.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { initClouds, updateClouds, state, CONFIG } from '../game.js';

beforeEach(() => {
  initClouds();
});

// ─── Property 15: Cloud parallax ordering ────────────────────────────────────
// Validates: Requirements 9.3, 9.4
//
// Nearer layers must scroll faster (higher speed) and be more opaque (higher opacity)
// than farther layers.
describe('Property 15: Cloud parallax ordering — nearer layers scroll faster and are more opaque', () => {
  it('near layer clouds scroll faster than mid layer clouds', () => {
    /**
     * **Validates: Requirements 9.3, 9.4**
     *
     * The near layer has speedMult > mid layer speedMult, so near clouds
     * must have a higher speed than mid clouds.
     */
    const nearClouds = state.clouds.filter(c => c.layer === 'near');
    const midClouds  = state.clouds.filter(c => c.layer === 'mid');

    expect(nearClouds.length).toBeGreaterThan(0);
    expect(midClouds.length).toBeGreaterThan(0);

    const nearSpeed = nearClouds[0].speed;
    const midSpeed  = midClouds[0].speed;

    expect(nearSpeed).toBeGreaterThan(midSpeed);
  });

  it('mid layer clouds scroll faster than far layer clouds', () => {
    /**
     * **Validates: Requirements 9.3**
     */
    const midClouds = state.clouds.filter(c => c.layer === 'mid');
    const farClouds = state.clouds.filter(c => c.layer === 'far');

    expect(midClouds.length).toBeGreaterThan(0);
    expect(farClouds.length).toBeGreaterThan(0);

    const midSpeed = midClouds[0].speed;
    const farSpeed = farClouds[0].speed;

    expect(midSpeed).toBeGreaterThan(farSpeed);
  });

  it('near layer clouds are more opaque than mid layer clouds', () => {
    /**
     * **Validates: Requirements 9.4**
     */
    const nearClouds = state.clouds.filter(c => c.layer === 'near');
    const midClouds  = state.clouds.filter(c => c.layer === 'mid');

    expect(nearClouds[0].opacity).toBeGreaterThan(midClouds[0].opacity);
  });

  it('mid layer clouds are more opaque than far layer clouds', () => {
    /**
     * **Validates: Requirements 9.4**
     */
    const midClouds = state.clouds.filter(c => c.layer === 'mid');
    const farClouds = state.clouds.filter(c => c.layer === 'far');

    expect(midClouds[0].opacity).toBeGreaterThan(farClouds[0].opacity);
  });

  it('initClouds() creates the correct total number of clouds', () => {
    const expectedCount =
      CONFIG.cloudLayers.far.count +
      CONFIG.cloudLayers.mid.count +
      CONFIG.cloudLayers.near.count;

    expect(state.clouds).toHaveLength(expectedCount);
  });

  it('all clouds have width in [60, 160] and height in [30, 60]', () => {
    for (const cloud of state.clouds) {
      expect(cloud.width).toBeGreaterThanOrEqual(60);
      expect(cloud.width).toBeLessThanOrEqual(160);
      expect(cloud.height).toBeGreaterThanOrEqual(30);
      expect(cloud.height).toBeLessThanOrEqual(60);
    }
  });

  it('updateClouds() scrolls clouds left by cloud.speed * dt', () => {
    /**
     * **Validates: Requirements 9.3**
     *
     * For clouds that are not about to wrap, each cloud must move left
     * by exactly cloud.speed * dt.
     */
    fc.assert(
      fc.property(
        fc.float({ min: 0.5, max: 2.0, noNaN: true }),
        (dt) => {
          initClouds();

          // Only test clouds that won't wrap (x + width > 0 after scrolling)
          const testClouds = state.clouds.filter(c => c.x - c.speed * dt + c.width > 0);
          const snapshots  = testClouds.map(c => ({ id: c, initialX: c.x, speed: c.speed }));

          updateClouds(dt);

          for (const snap of snapshots) {
            const expectedX = snap.initialX - snap.speed * dt;
            expect(snap.id.x).toBeCloseTo(expectedX, 5);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('clouds that scroll off the left edge wrap back to the right edge', () => {
    /**
     * **Validates: Requirements 9.3**
     *
     * A cloud with x + width < 0 after scrolling must be repositioned
     * to just off the right edge (x >= logicalWidth).
     */
    // Force a cloud to be just off-screen
    initClouds();
    const cloud = state.clouds[0];
    cloud.x = -(cloud.width + 10); // already off-screen

    updateClouds(1);

    // After wrapping, x should be >= logicalWidth
    expect(cloud.x).toBeGreaterThanOrEqual(CONFIG.logicalWidth);
  });
});
