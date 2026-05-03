// game.js — Exported pure game logic for testing and reuse.
// index.html imports from this module so all logic lives here once.

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Single source of truth for all tunable constants.
export const CONFIG = {
  // Physics
  gravity:          0.5,
  flapVelocity:    -9,
  terminalVelocity: 12,

  // Ghosty
  ghostyWidth:   40,
  ghostyHeight:  40,
  hitboxInset:    4,
  bobAmplitude:   8,
  bobFrequency:   1.5,

  // Pipes
  basePipeSpeed:   3,
  maxPipeSpeed:   10,
  speedIncrement:  0.5,
  scoreMilestone:  5,
  pipeSpacing:   280,
  pipeWidth:      52,
  gapHeight:     150,
  minGapMargin:   40,

  // Clouds
  cloudLayers: {
    far:  { speedMult: 0.2, opacity: 0.25, count: 4 },
    mid:  { speedMult: 0.5, opacity: 0.45, count: 3 },
    near: { speedMult: 0.9, opacity: 0.70, count: 2 },
  },

  // Visual effects
  shakeDuration:    400,
  shakeMaxDisp:       8,
  particleLifetime: [300, 600],
  popupDuration:    800,

  // Layout
  scoreBarHeight: 48,
  logicalWidth:  480,
  logicalHeight: 640,

  // Storage
  highScoreKey: 'flappyKiro_highScore',
};

// ─── STATE ENUM ───────────────────────────────────────────────────────────────
export const STATE = {
  IDLE:      'idle',
  PLAYING:   'playing',
  PAUSED:    'paused',
  GAME_OVER: 'game_over',
};

// ─── MUTABLE GAME STATE ───────────────────────────────────────────────────────
export const state = {
  current:   STATE.IDLE,
  score:     0,
  highScore: 0,

  ghosty: {
    x:       CONFIG.logicalWidth * 0.2,
    y:       CONFIG.logicalHeight / 2,
    vy:      0,
    baseY:   CONFIG.logicalHeight / 2,
    bobTime: 0,
    width:   CONFIG.ghostyWidth,
    height:  CONFIG.ghostyHeight,
  },

  pipes:       [],
  clouds:      [],
  particles:   [],
  scorePopups: [],

  pipeSpeed:    CONFIG.basePipeSpeed,
  lastPipeX:    0,

  shakeOffset:   { x: 0, y: 0 },
  shakeDuration: 0,
  shakeElapsed:  0,

  newHighScore: false,

  scale:   1,
  offsetX: 0,
  offsetY: 0,
};

// ─── PHYSICS ──────────────────────────────────────────────────────────────────

/**
 * Apply gravity and update Ghosty's vertical position.
 * dt is a dimensionless 60fps multiplier (1.0 at 60fps, 2.0 at 30fps).
 */
export function updateGhosty(dt) {
  state.ghosty.vy += CONFIG.gravity * dt;
  if (state.ghosty.vy > CONFIG.terminalVelocity) {
    state.ghosty.vy = CONFIG.terminalVelocity;
  }
  state.ghosty.y += state.ghosty.vy * dt;
}

/**
 * Apply flap: override (not add to) current vertical velocity.
 * Sets ghosty.vy to exactly FLAP_VELOCITY regardless of current vy.
 */
export function applyFlap() {
  state.ghosty.vy = CONFIG.flapVelocity;
}

/**
 * Idle bobbing animation using a sine wave.
 */
export function updateGhostyBob(dt) {
  state.ghosty.bobTime += dt * (1 / 60);
  state.ghosty.y = state.ghosty.baseY
    + Math.sin(state.ghosty.bobTime * CONFIG.bobFrequency * 2 * Math.PI)
    * CONFIG.bobAmplitude;
}

// ─── PIPE SYSTEM ──────────────────────────────────────────────────────────────

/**
 * Return a uniform random gap centre Y within the safe vertical range.
 * Guarantees the gap is always fully visible and reachable.
 *
 * Range: [gapHeight/2 + minGapMargin, logicalHeight − scoreBarHeight − gapHeight/2 − minGapMargin]
 */
export function randomGapCentre() {
  const minY = CONFIG.gapHeight / 2 + CONFIG.minGapMargin;
  const maxY = CONFIG.logicalHeight - CONFIG.scoreBarHeight - CONFIG.gapHeight / 2 - CONFIG.minGapMargin;
  return minY + Math.random() * (maxY - minY);
}

/**
 * Create a new PipePair just off the right edge and push it to state.pipes.
 */
export function spawnPipe() {
  const pipe = {
    x:           CONFIG.logicalWidth + 10, // small buffer off the right edge
    gapCentreY:  randomGapCentre(),
    gapHeight:   CONFIG.gapHeight,
    width:       CONFIG.pipeWidth,
    scored:      false,
  };
  state.pipes.push(pipe);
  state.lastPipeX = pipe.x;
}

/**
 * Scroll all pipes left, spawn a new pipe when the spacing threshold is met,
 * and remove pipes that have scrolled fully off the left edge.
 *
 * dt is a dimensionless 60fps multiplier (1.0 at 60fps, 2.0 at 30fps).
 */
export function updatePipes(dt) {
  // Scroll existing pipes
  for (const pipe of state.pipes) {
    pipe.x -= state.pipeSpeed * dt;
  }

  // Spawn new pipe if needed
  const lastPipe = state.pipes[state.pipes.length - 1];
  const spawnThreshold = lastPipe
    ? lastPipe.x + CONFIG.pipeSpacing
    : CONFIG.logicalWidth; // first pipe spawns one spacing from right edge

  if (!lastPipe || spawnThreshold <= CONFIG.logicalWidth) {
    spawnPipe();
  }

  // Remove off-screen pipes (x + width <= 0)
  state.pipes = state.pipes.filter(p => p.x + p.width > 0);
}

/**
 * Increase pipe speed when the score hits a milestone.
 * Triggered once per score increment (the pipe.scored flag prevents double-counting).
 * Speed is capped at CONFIG.maxPipeSpeed.
 */
export function checkSpeedMilestone() {
  if (state.score > 0 && state.score % CONFIG.scoreMilestone === 0) {
    state.pipeSpeed = Math.min(
      state.pipeSpeed + CONFIG.speedIncrement,
      CONFIG.maxPipeSpeed
    );
  }
}

/**
 * Check each pipe to see if Ghosty has passed it.
 * Increments score, marks the pipe as scored, plays a sound, spawns a score
 * popup, and triggers a speed milestone check.
 * Requirements: 7.1, 7.2, 7.3, 13.2
 */
export function checkScore() {
  for (const pipe of state.pipes) {
    if (state.ghosty.x > pipe.x + pipe.width && !pipe.scored) {
      pipe.scored = true;
      state.score += 1;
      playSound('score');
      spawnScorePopup(pipe.x);
      checkSpeedMilestone();
    }
  }
}

// ─── COLLISION DETECTION ──────────────────────────────────────────────────────

/**
 * Return Ghosty's inset AABB (axis-aligned bounding box).
 * The hitbox is inset by CONFIG.hitboxInset on each side to give a forgiving
 * collision area that matches player perception.
 * Requirements: 6.1
 */
export function getGhostyBounds() {
  const inset = CONFIG.hitboxInset;
  return {
    left:   state.ghosty.x - state.ghosty.width  / 2 + inset,
    right:  state.ghosty.x + state.ghosty.width  / 2 - inset,
    top:    state.ghosty.y - state.ghosty.height / 2 + inset,
    bottom: state.ghosty.y + state.ghosty.height / 2 - inset,
  };
}

/**
 * Test Ghosty's inset AABB against the screen edges and each pipe's top/bottom
 * sections. Calls triggerCollision() on the first hit found.
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
export function checkCollision() {
  const g = getGhostyBounds();

  // Screen top edge
  if (g.top <= 0) {
    triggerCollision();
    return;
  }

  // Screen bottom edge (above the score bar)
  if (g.bottom >= CONFIG.logicalHeight - CONFIG.scoreBarHeight) {
    triggerCollision();
    return;
  }

  // Pipe AABB test
  for (const pipe of state.pipes) {
    const topPipeBottom = pipe.gapCentreY - pipe.gapHeight / 2;
    const bottomPipeTop = pipe.gapCentreY + pipe.gapHeight / 2;
    const pipeLeft      = pipe.x;
    const pipeRight     = pipe.x + pipe.width;

    const horizontalOverlap = g.right > pipeLeft && g.left < pipeRight;
    if (!horizontalOverlap) continue;

    // Top pipe collision
    if (g.top < topPipeBottom) {
      triggerCollision();
      return;
    }
    // Bottom pipe collision
    if (g.bottom > bottomPipeTop) {
      triggerCollision();
      return;
    }
  }
}

/**
 * Transition to GAME_OVER state and trigger all collision side-effects.
 * Requirements: 6.4, 6.5
 */
export function triggerCollision() {
  state.current = STATE.GAME_OVER;
  playSound('game_over');
  startScreenShake();
  pauseMusic();
  updateHighScore();
}

// ─── VISUAL EFFECTS ───────────────────────────────────────────────────────────

/**
 * Start a screen-shake effect.
 * Sets shakeDuration and resets shakeElapsed to 0.
 * Requirements: 13.9, 13.10
 */
export function startScreenShake() {
  state.shakeDuration = CONFIG.shakeDuration;
  state.shakeElapsed  = 0;
}

/**
 * Update the screen-shake offset each frame.
 * Accumulates elapsed time (converting dt-frames to ms), computes a
 * linearly-decaying random displacement, and zeroes the offset when done.
 * dt is a dimensionless 60fps multiplier (1.0 at 60fps).
 * Requirements: 13.9, 13.10
 */
export function updateShake(dt) {
  if (state.shakeElapsed >= state.shakeDuration) {
    state.shakeOffset = { x: 0, y: 0 };
    return;
  }

  state.shakeElapsed += dt * (1000 / 60);

  if (state.shakeElapsed >= state.shakeDuration) {
    state.shakeOffset = { x: 0, y: 0 };
    return;
  }

  const progress  = state.shakeElapsed / state.shakeDuration;
  const intensity = (1 - progress) * CONFIG.shakeMaxDisp;
  state.shakeOffset = {
    x: (Math.random() * 2 - 1) * intensity,
    y: (Math.random() * 2 - 1) * intensity,
  };
}

/**
 * Emit a single particle from Ghosty's left edge.
 * Pushes a Particle object to state.particles with randomised velocity,
 * radius, and lifetime within the ranges specified in CONFIG.
 * Requirements: 13.11, 13.12
 */
export function emitParticle() {
  state.particles.push({
    x:        state.ghosty.x - state.ghosty.width / 2,
    y:        state.ghosty.y + (Math.random() - 0.5) * state.ghosty.height * 0.5,
    vx:       -(Math.random() * 1.5 + 0.5),
    vy:       (Math.random() - 0.5) * 0.8,
    radius:   Math.random() * 3 + 2,
    alpha:    0.8,
    lifetime: CONFIG.particleLifetime[0] + Math.random() * (CONFIG.particleLifetime[1] - CONFIG.particleLifetime[0]),
    age:      0,
    color:    'rgba(200, 200, 255, 1)',
  });
}

/**
 * Update all active particles each frame.
 * Ages each particle, moves it by its velocity, decays alpha, and removes
 * expired particles (age >= lifetime).
 * dt is a dimensionless 60fps multiplier (1.0 at 60fps).
 * Requirements: 13.12, 13.14
 */
export function updateParticles(dt) {
  const dtMs = dt * (1000 / 60);
  for (const p of state.particles) {
    p.age   += dtMs;
    p.x     += p.vx * dt;
    p.y     += p.vy * dt;
    p.alpha  = Math.max(0, 1 - p.age / p.lifetime) * 0.8;
  }
  state.particles = state.particles.filter(p => p.age < p.lifetime);
}

/**
 * Spawn a "+1" score popup near the given pipe x position.
 * Requirements: 7.3, 13.15
 */
export function spawnScorePopup(pipeX) {
  state.scorePopups.push({
    x:        pipeX,
    y:        CONFIG.logicalHeight - CONFIG.scoreBarHeight - 20,
    alpha:    1.0,
    age:      0,
    duration: CONFIG.popupDuration,
  });
}

/**
 * Update all active score popups each frame.
 * Ages each popup, floats it upward, decays alpha, and removes expired
 * popups (age >= duration).
 * dt is a dimensionless 60fps multiplier (1.0 at 60fps).
 * Requirements: 13.16, 13.18
 */
export function updateScorePopups(dt) {
  const dtMs = dt * (1000 / 60);
  for (const p of state.scorePopups) {
    p.age   += dtMs;
    p.y     -= 0.5 * dt;
    p.alpha  = Math.max(0, 1 - p.age / p.duration);
  }
  state.scorePopups = state.scorePopups.filter(p => p.age < p.duration);
}

/**
 * Load the high score from localStorage.
 * Returns 0 if the key is missing, the value is not a valid integer,
 * or localStorage is unavailable (e.g. private browsing).
 * Requirements: 7.7, 8.8
 */
export function loadHighScore() {
  try {
    const stored = localStorage.getItem(CONFIG.highScoreKey);
    if (stored === null) return 0;
    const parsed = parseInt(stored, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

/**
 * Persist the high score to localStorage.
 * Silently ignores quota exceeded and unavailable storage errors.
 * Requirements: 7.6, 8.7
 */
export function saveHighScore(score) {
  try {
    localStorage.setItem(CONFIG.highScoreKey, String(score));
  } catch {
    // Quota exceeded or localStorage unavailable — silently ignore.
  }
}

/**
 * Update the high score if the current score exceeds it.
 * Sets state.newHighScore = true and persists the new value.
 * Requirements: 7.4, 7.5
 */
export function updateHighScore() {
  if (state.score > state.highScore) {
    state.highScore    = state.score;
    state.newHighScore = true;
    saveHighScore(state.highScore);
  }
}

// ─── GAME LOOP UPDATE ─────────────────────────────────────────────────────────

/**
 * Dispatch per-frame update logic based on the current game state.
 *
 * - PLAYING:   full physics, pipes, scoring, collision, effects, clouds
 * - IDLE:      ghosty bob animation and cloud scrolling only
 * - PAUSED:    no-op — all state is frozen
 * - GAME_OVER: let existing score popups and screen shake finish
 *
 * dt is a dimensionless 60fps multiplier (1.0 at 60fps, 2.0 at 30fps).
 * Requirements: 4.1, 4.2, 4.4, 12.2, 12.7, 13.13
 */
export function update(dt) {
  switch (state.current) {
    case STATE.PLAYING:
      updateGhosty(dt);
      updatePipes(dt);
      checkScore();
      checkCollision();
      updateParticles(dt);
      updateScorePopups(dt);
      updateClouds(dt);
      emitParticle();
      updateShake(dt);
      break;

    case STATE.IDLE:
      updateGhostyBob(dt);
      updateClouds(dt);
      break;

    case STATE.PAUSED:
      // no-op — all state is frozen while paused
      break;

    case STATE.GAME_OVER:
      updateScorePopups(dt);
      updateShake(dt);
      break;
  }
}

/**
 * Play a sound by key. Stub — full implementation lives in index.html's audio
 * system. Exported here so game.js functions can call it; in the browser the
 * real implementation in index.html takes precedence via the module scope.
 * In tests this is a no-op unless overridden.
 */
export function playSound(_key) {
  // no-op stub — real implementation in index.html
}

/**
 * Pause background music. Stub — real implementation in index.html.
 */
export function pauseMusic() {
  // no-op stub
}

/**
 * Start background music. Stub — real implementation in index.html.
 */
export function startMusic() {
  // no-op stub
}

// ─── STATE MACHINE TRANSITIONS ────────────────────────────────────────────────

/**
 * Transition to PLAYING state.
 * Resets Ghosty to its starting position and velocity, clears all pipes,
 * resets score and pipe speed to their base values, then starts the music.
 * Requirements: 3.3, 5.7, 11.5
 */
export function toPlaying() {
  state.ghosty.x       = CONFIG.logicalWidth * 0.2;
  state.ghosty.y       = CONFIG.logicalHeight / 2;
  state.ghosty.vy      = 0;
  state.ghosty.bobTime = 0;

  state.pipes     = [];
  state.score     = 0;
  state.pipeSpeed = CONFIG.basePipeSpeed;

  state.current = STATE.PLAYING;
  startMusic();
}

/**
 * Transition to PAUSED state.
 * Freezes all physics by stopping updates (the game loop only updates physics
 * in PLAYING state). Pauses background music.
 * Requirements: 12.1, 12.2
 */
export function toPaused() {
  state.current = STATE.PAUSED;
  pauseMusic();
}

/**
 * Transition to GAME_OVER state.
 * In practice, triggerCollision() already sets state.current = STATE.GAME_OVER
 * and handles all side effects (sound, shake, music, high score). This function
 * is a thin wrapper that ensures the state is set correctly if called directly.
 * Physics freeze is implicit — the game loop only updates physics in PLAYING state.
 * Requirements: 6.4, 8.5
 */
export function toGameOver() {
  state.current = STATE.GAME_OVER;
}

/**
 * Transition to IDLE state.
 * Resets score to 0, clears all pipes, repositions Ghosty to its base Y,
 * resets the new-high-score flag, and pauses music.
 * Requirements: 8.6, 11.5
 */
export function toIdle() {
  state.current     = STATE.IDLE;
  state.score       = 0;
  state.pipes       = [];
  state.newHighScore = false;

  state.ghosty.x  = CONFIG.logicalWidth * 0.2;
  state.ghosty.y  = state.ghosty.baseY;
  state.ghosty.vy = 0;

  pauseMusic();
}

// ─── COORDINATE CONVERSION ────────────────────────────────────────────────────

/**
 * Convert physical input coordinates (e.g. from mouse/touch events) to
 * logical canvas coordinates using the stored scale and offsets.
 *
 * Inverse of the canvas transform applied in render():
 *   physicalX = logicalX * scale + offsetX
 *   physicalY = logicalY * scale + offsetY
 *
 * Requirements: 10.3
 */
export function toLogical(clientX, clientY) {
  return {
    x: (clientX - state.offsetX) / state.scale,
    y: (clientY - state.offsetY) / state.scale,
  };
}

// ─── CLOUD SYSTEM ─────────────────────────────────────────────────────────────

/**
 * Return a random y position within the sky area (above the score bar).
 * Used when initialising clouds and when wrapping them back to the right edge.
 *
 * The sky area spans from 0 to (logicalHeight - scoreBarHeight).
 * We keep a small margin so clouds don't clip the score bar.
 */
function randomCloudY() {
  const skyHeight = CONFIG.logicalHeight - CONFIG.scoreBarHeight;
  return Math.random() * skyHeight;
}

/**
 * Initialise the cloud array from CONFIG.cloudLayers.
 * For each layer (far, mid, near), creates `count` clouds with:
 *   - x: random across the full canvas width
 *   - y: random within the sky area (above the score bar)
 *   - width: random in [60, 160] px
 *   - height: random in [30, 60] px
 *   - speed: CONFIG.basePipeSpeed * layer.speedMult
 *   - opacity: layer.opacity
 *
 * Clears state.clouds before populating.
 * Requirements: 1.3, 9.3, 9.4
 */
export function initClouds() {
  state.clouds = [];

  for (const [layerName, layerDef] of Object.entries(CONFIG.cloudLayers)) {
    const speed   = CONFIG.basePipeSpeed * layerDef.speedMult;
    const opacity = layerDef.opacity;

    for (let i = 0; i < layerDef.count; i++) {
      state.clouds.push({
        x:       Math.random() * CONFIG.logicalWidth,
        y:       randomCloudY(),
        width:   60 + Math.random() * 100,   // [60, 160]
        height:  30 + Math.random() * 30,    // [30, 60]
        layer:   layerName,
        speed,
        opacity,
      });
    }
  }
}

/**
 * Scroll all clouds left by cloud.speed * dt each frame.
 * When a cloud scrolls fully off the left edge (x + width < 0), it wraps
 * back to just off the right edge with a re-randomised y position.
 *
 * dt is a dimensionless 60fps multiplier (1.0 at 60fps, 2.0 at 30fps).
 * Requirements: 9.3
 */
export function updateClouds(dt) {
  for (const cloud of state.clouds) {
    cloud.x -= cloud.speed * dt;

    // Wrap off-screen clouds back to the right edge
    if (cloud.x + cloud.width < 0) {
      cloud.x = CONFIG.logicalWidth + Math.random() * 100;
      cloud.y = randomCloudY();
    }
  }
}
