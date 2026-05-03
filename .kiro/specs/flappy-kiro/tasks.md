# Implementation Plan: Flappy Kiro

## Overview

Implement Flappy Kiro as a single `index.html` file with no build step and no external dependencies. All game logic, rendering, audio, and persistence live in one HTML file structured as HTML markup, CSS styling, and a JavaScript module. The implementation follows the four-state machine (IDLE → PLAYING → PAUSED → GAME_OVER), uses a delta-time normalised `requestAnimationFrame` loop, and renders entirely on an HTML5 `<canvas>` element using a logical 480×640 coordinate system scaled to the viewport.

## Tasks

- [x] 1. Set up project scaffold and CONFIG object
  - Create `index.html` with `<head>`, `<body>`, `<canvas id="gameCanvas">`, and `<script type="module">`
  - Add CSS reset: zero margin/padding on `html`/`body`, `overflow: hidden`, canvas fills viewport, import a pixel/monospace font via `@font-face` or Google Fonts
  - Define the `CONFIG` object at the top of the script with all tunable constants grouped as specified:
    - **Physics**: `gravity` (0.5), `flapVelocity` (−9), `terminalVelocity` (12)
    - **Ghosty**: `ghostyWidth`, `ghostyHeight`, `hitboxInset` (4), `bobAmplitude` (8), `bobFrequency` (1.5)
    - **Pipes**: `basePipeSpeed` (3), `maxPipeSpeed` (10), `speedIncrement` (0.5), `scoreMilestone` (5), `pipeSpacing` (280), `pipeWidth` (52), `gapHeight` (150), `minGapMargin` (40)
    - **Clouds**: `cloudLayers` object with `far`, `mid`, `near` entries each having `speedMult`, `opacity`, `count`
    - **Visual effects**: `shakeDuration` (400), `shakeMaxDisp` (8), `particleLifetime` ([300, 600]), `popupDuration` (800)
    - **Layout**: `scoreBarHeight` (48), `logicalWidth` (480), `logicalHeight` (640)
    - **Storage**: `highScoreKey` (`'flappyKiro_highScore'`)
  - Define `STATE` enum object (`IDLE`, `PLAYING`, `PAUSED`, `GAME_OVER`)
  - Define the mutable `state` object with all fields from the design (`current`, `score`, `highScore`, `ghosty`, `pipes`, `clouds`, `particles`, `scorePopups`, `pipeSpeed`, `lastPipeX`, `shakeOffset`, `shakeDuration`, `shakeElapsed`, `newHighScore`, `scale`, `offsetX`, `offsetY`)
  - _Requirements: 1.1, 1.2_

- [x] 2. Implement asset loading and audio system
  - [x] 2.1 Implement image loader for `assets/ghosty.png` with fallback to a white rectangle if load fails
    - Store loaded image in a module-level variable
    - _Requirements: 1.5_
  - [x] 2.2 Implement `loadAudio()` — load `jump`, `game_over`, `score`, `music` assets into a `sounds` map; treat any load error as a silent skip
    - _Requirements: 1.6, 1.7, 13.3, 13.8_
  - [x] 2.3 Implement `playSound(key)`, `startMusic()`, `pauseMusic()`, `resumeMusic()` with full try/catch wrapping and autoplay-policy handling (clone node for jump sound)
    - _Requirements: 3.5, 6.5, 13.1, 13.2, 13.4, 13.5, 13.6, 13.7_

- [x] 3. Implement responsive canvas scaling
  - [x] 3.1 Implement `resizeCanvas()` — set `canvas.width`/`canvas.height` to viewport dimensions, compute `scale = min(W / logicalWidth, H / logicalHeight)`, store `state.scale`, `state.offsetX`, `state.offsetY`; guard against zero dimensions
    - _Requirements: 10.1, 10.2_
  - [x] 3.2 Implement `toLogical(clientX, clientY)` — convert physical input coordinates to logical space using stored scale and offsets
    - _Requirements: 10.3_
  - [x] 3.3 Wire `window.addEventListener('resize', resizeCanvas)` and call `resizeCanvas()` on init
    - _Requirements: 10.2_
  - [ ]* 3.4 Write property test for coordinate scaling round-trip
    - **Property 16: Coordinate scaling round-trip**
    - **Validates: Requirements 10.3**
    - File: `tests/scaling.test.js`

- [x] 4. Implement physics — gravity, flap, and idle bob
  - [x] 4.1 Implement `updateGhosty(dt)` — apply `CONFIG.gravity * dt` to `ghosty.vy`, clamp to `CONFIG.terminalVelocity`, update `ghosty.y += ghosty.vy * dt`
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 4.2 Implement `applyFlap()` — set `ghosty.vy = CONFIG.flapVelocity` (override, not add)
    - _Requirements: 3.4_
  - [x] 4.3 Implement `updateGhostyBob(dt)` — accumulate `ghosty.bobTime`, set `ghosty.y` using sine wave with `CONFIG.bobAmplitude` and `CONFIG.bobFrequency`
    - _Requirements: 2.2_
  - [x] 4.4 Write property test for flap velocity override
    - **Property 2: Flap overrides velocity**
    - **Validates: Requirements 3.4**
    - File: `tests/physics.test.js`
  - [ ]* 4.5 Write property test for gravity accumulation and terminal velocity cap
    - **Property 3: Gravity accumulates and terminal velocity caps**
    - **Validates: Requirements 4.1, 4.2, 4.3**
    - File: `tests/physics.test.js`

- [x] 5. Implement pipe generation and scrolling system
  - [x] 5.1 Implement `randomGapCentre()` — return a uniform random value in `[gapHeight/2 + minGapMargin, logicalHeight − scoreBarHeight − gapHeight/2 − minGapMargin]`
    - _Requirements: 5.5_
  - [x] 5.2 Implement `spawnPipe()` — create a `PipePair` object off the right edge with randomised gap centre, push to `state.pipes`
    - _Requirements: 5.1, 5.3, 5.4_
  - [x] 5.3 Implement `updatePipes(dt)` — scroll all pipes left by `state.pipeSpeed * dt`, spawn new pipe when spacing threshold is met, remove off-screen pipes (`x + width ≤ 0`)
    - _Requirements: 4.4, 5.1, 5.2, 5.6, 5.8_
  - [x] 5.4 Write property test for gap centre always within reachable bounds
    - **Property 5: Gap centre is always within reachable bounds**
    - **Validates: Requirements 5.5**
    - File: `tests/pipes.test.js`
  - [x] 5.5 Write property test for uniform pipe scrolling
    - **Property 4: Pipes scroll uniformly at pipe speed**
    - **Validates: Requirements 4.4, 5.6, 11.6**
    - File: `tests/pipes.test.js`
  - [x] 5.6 Write property test for off-screen pipe removal
    - **Property 6: Off-screen pipes are removed**
    - **Validates: Requirements 5.8**
    - File: `tests/pipes.test.js`

- [x] 6. Implement progressive difficulty — speed milestones
  - [x] 6.1 Implement `checkSpeedMilestone()` — when `state.score > 0 && state.score % CONFIG.scoreMilestone === 0`, increase `state.pipeSpeed` by `CONFIG.speedIncrement`, capped at `CONFIG.maxPipeSpeed`
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [x] 6.2 Write property test for speed milestone increases and cap
    - **Property 7: Speed milestone increases pipe speed, capped at maximum**
    - **Validates: Requirements 11.1, 11.4**
    - File: `tests/pipes.test.js`

- [x] 7. Implement collision detection and scoring
  - [x] 7.1 Implement `getGhostyBounds()` — return inset AABB using `CONFIG.hitboxInset`
    - _Requirements: 6.1_
  - [x] 7.2 Implement `checkCollision()` — test screen top/bottom edges and AABB overlap with each pipe's top and bottom sections; call `triggerCollision()` on hit
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 7.3 Implement `triggerCollision()` — set `state.current = STATE.GAME_OVER`, call `playSound('game_over')`, `startScreenShake()`, `pauseMusic()`, `updateHighScore()`
    - _Requirements: 6.4, 6.5_
  - [x] 7.4 Implement `checkScore()` — for each pipe where `ghosty.x > pipe.x + pipe.width && !pipe.scored`, increment `state.score`, set `pipe.scored = true`, call `playSound('score')`, `spawnScorePopup(pipe.x)`, `checkSpeedMilestone()`
    - _Requirements: 7.1, 7.2, 7.3, 13.2_
  - [x] 7.5 Write property test for AABB collision detection correctness
    - **Property 8: AABB collision detection is correct for pipes and screen edges**
    - **Validates: Requirements 6.1, 6.2, 6.3**
    - File: `tests/collision.test.js`
  - [ ]* 7.6 Write property test for scoring increments exactly once per pipe
    - **Property 9: Scoring increments score exactly once per pipe**
    - **Validates: Requirements 7.1**
    - File: `tests/scoring.test.js`

- [x] 8. Implement high score persistence
  - [x] 8.1 Implement `loadHighScore()` — read from `localStorage` using `CONFIG.highScoreKey`, parse as integer, return 0 on any error or missing key
    - _Requirements: 7.7, 8.8_
  - [x] 8.2 Implement `saveHighScore(score)` — write to `localStorage` using `CONFIG.highScoreKey`, silently ignore quota/unavailable errors
    - _Requirements: 7.6, 8.7_
  - [x] 8.3 Implement `updateHighScore()` — if `state.score > state.highScore`, update `state.highScore`, set `state.newHighScore = true`, call `saveHighScore()`
    - _Requirements: 7.4, 7.5_
  - [x] 8.4 Write property test for high score update and localStorage round-trip
    - **Property 10: High score update and localStorage round-trip**
    - **Validates: Requirements 7.5, 7.6**
    - File: `tests/scoring.test.js`

- [x] 9. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement visual effects — screen shake, particles, score popups
  - [x] 10.1 Implement `startScreenShake()`, `updateShake(dt)` — set `state.shakeDuration`, accumulate `state.shakeElapsed`, compute linearly-decaying random offset clamped to `CONFIG.shakeMaxDisp`; zero offset when elapsed ≥ duration
    - _Requirements: 13.9, 13.10_
  - [x] 10.2 Implement `emitParticle()` — push a `Particle` object with `radius` in [2, 5], `lifetime` in [300, 600], leftward `vx`, small random `vy`, `alpha` 0.8, colour `rgba(200, 200, 255, 1)`
    - _Requirements: 13.11, 13.12_
  - [x] 10.3 Implement `updateParticles(dt)` — age each particle, update position, decay alpha, remove expired particles (`age ≥ lifetime`)
    - _Requirements: 13.12, 13.14_
  - [x] 10.4 Implement `spawnScorePopup(pipeX)` — push a `ScorePopup` with `duration = CONFIG.popupDuration`, `alpha = 1.0`, `age = 0`
    - _Requirements: 7.3, 13.15_
  - [x] 10.5 Implement `updateScorePopups(dt)` — age each popup, float upward (`y -= 0.5 * dt`), decay alpha, remove expired popups (`age ≥ duration`)
    - _Requirements: 13.16, 13.18_
  - [x] 10.6 Write property test for screen shake displacement bounded and decays to zero
    - **Property 12: Screen shake displacement is bounded and decays to zero**
    - **Validates: Requirements 13.9, 13.10**
    - File: `tests/effects.test.js`
  - [x] 10.7 Write property test for particle properties within specified ranges and cleanup
    - **Property 13: Particle properties are within specified ranges**
    - **Validates: Requirements 13.12, 13.14**
    - File: `tests/effects.test.js`
  - [x] 10.8 Write property test for score popup fades to zero and is removed after duration
    - **Property 14: Score popup fades to zero and is removed after duration**
    - **Validates: Requirements 13.16, 13.18**
    - File: `tests/effects.test.js`

- [x] 11. Implement parallax cloud system
  - [x] 11.1 Implement `initClouds()` — create clouds for each layer using `CONFIG.cloudLayers` counts; randomise x across canvas width, y within sky area, width (60–160 px), height (30–60 px); derive `speed` and `opacity` from layer definition
    - _Requirements: 1.3, 9.3, 9.4_
  - [x] 11.2 Implement `updateClouds(dt)` — scroll each cloud left by `cloud.speed * dt`; wrap off-screen clouds back to right edge with re-randomised y
    - _Requirements: 9.3_
  - [ ]* 11.3 Write property test for cloud parallax ordering
    - **Property 15: Cloud parallax ordering — nearer layers scroll faster and are more opaque**
    - **Validates: Requirements 9.3, 9.4**
    - File: `tests/clouds.test.js`

- [x] 12. Implement state machine transitions
  - [x] 12.1 Implement `toPlaying()` — set `state.current = STATE.PLAYING`, reset `ghosty` position and velocity, clear `state.pipes`, reset `state.score` and `state.pipeSpeed` to base value, call `startMusic()`
    - _Requirements: 3.3, 5.7, 11.5_
  - [x] 12.2 Implement `toPaused()` — set `state.current = STATE.PAUSED`, call `pauseMusic()`
    - _Requirements: 12.1, 12.2_
  - [x] 12.3 Implement `toGameOver()` — set `state.current = STATE.GAME_OVER` (handled via `triggerCollision()`), freeze physics
    - _Requirements: 6.4, 8.5_
  - [x] 12.4 Implement `toIdle()` — set `state.current = STATE.IDLE`, reset `state.score` to 0, clear pipes, reposition ghosty, reset `state.newHighScore = false`, call `pauseMusic()`
    - _Requirements: 8.6, 11.5_
  - [x] 12.5 Write property test for idle state freezes pipes and score
    - **Property 1: Idle state freezes pipes and score**
    - **Validates: Requirements 2.4**
    - File: `tests/pipes.test.js`
  - [ ]* 12.6 Write property test for frozen states do not mutate game physics
    - **Property 11: Frozen states do not mutate game physics**
    - **Validates: Requirements 8.5, 12.2, 12.7**
    - File: `tests/state.test.js`
  - [ ]* 12.7 Write unit tests for all state transitions
    - Test `toPlaying()`, `toPaused()`, `toGameOver()`, `toIdle()` — verify `state.current`, reset values, and side effects (music calls, pipe clearing, score reset)
    - File: `tests/state.test.js`

- [x] 13. Implement input handling
  - [x] 13.1 Add `keydown` listener — spacebar triggers flap (IDLE → PLAYING or PLAYING flap); Escape/P toggles pause (PLAYING ↔ PAUSED); spacebar in GAME_OVER calls `toIdle()`; no flap in PAUSED or GAME_OVER
    - _Requirements: 3.1, 3.3, 3.6, 12.1, 12.5, 12.6, 8.6_
  - [x] 13.2 Add `click` and `touchstart` listeners on canvas — convert to logical coordinates via `toLogical()`, apply same flap/restart logic as keyboard; call `startMusic()` on first flap to satisfy autoplay policy
    - _Requirements: 3.2, 3.3, 3.6, 13.5_
  - [ ]* 13.3 Write unit tests for input handling in each state
    - Test spacebar, click, Escape/P in IDLE, PLAYING, PAUSED, GAME_OVER states
    - File: `tests/ui.test.js`

- [x] 14. Implement the game loop
  - [x] 14.1 Implement `update(dt)` — dispatch to per-state update logic:
    - PLAYING: `updateGhosty`, `updatePipes`, `checkScore`, `checkCollision`, `updateParticles`, `updateScorePopups`, `updateClouds`, `emitParticle`, `updateShake`
    - IDLE: `updateGhostyBob`, `updateClouds`
    - PAUSED: no-op
    - GAME_OVER: `updateScorePopups`, `updateShake`
    - _Requirements: 4.1, 4.2, 4.4, 12.2, 12.7, 13.13_
  - [x] 14.2 Implement `gameLoop(timestamp)` — compute `rawDelta`, clamp to 50ms, compute `dt = delta / (1000/60)`, call `update(dt)` then `render()`, schedule next frame via `requestAnimationFrame`
    - _Requirements: 4.1_

- [x] 15. Implement the rendering pipeline
  - [x] 15.1 Implement `drawBackground()` — fill with light blue; draw pre-computed sketchy texture lines at low opacity
    - _Requirements: 1.2, 9.1_
  - [x] 15.2 Implement `drawClouds(layer)` — draw clouds for the given layer as semi-transparent rounded rectangles using `ctx.roundRect` or manual arc path; apply layer opacity
    - _Requirements: 1.3, 9.3, 9.4_
  - [x] 15.3 Implement `drawPipes()` — for each pipe, draw top and bottom pipe bodies in `#4caf50` and caps in `#388e3c` with cap overhang; derive `topPipeBottom` and `bottomPipeTop` from `gapCentreY` and `gapHeight`
    - _Requirements: 5.3, 9.2_
  - [x] 15.4 Implement `drawGhosty()` — draw `assets/ghosty.png` centred on `ghosty.x / ghosty.y`; fall back to white rectangle if image failed to load
    - _Requirements: 1.5_
  - [x] 15.5 Implement `drawParticles()` — draw each particle as a filled circle with current `alpha`
    - _Requirements: 13.12_
  - [x] 15.6 Implement `drawScorePopups()` — draw "+1" text at each popup's position with current `alpha` in bright high-contrast colour
    - _Requirements: 7.3, 13.15, 13.16, 13.17_
  - [x] 15.7 Implement `drawScoreBar()` — draw dark filled rectangle spanning full logical width at bottom; render "Score: X | High: X" in light/white pixel font
    - _Requirements: 1.4, 7.2, 9.5, 9.6, 9.7_
  - [x] 15.8 Implement `drawOverlay()` — render state-specific overlay:
    - IDLE: instructional prompt, prominent high score display
    - PAUSED: "Paused" message, resume prompt, current score and high score
    - GAME_OVER: "Game Over" message, final score, high score, conditional "New High Score!" indicator, restart prompt
    - _Requirements: 2.1, 2.3, 2.5, 8.1, 8.2, 8.3, 8.4, 12.3, 12.4_
  - [x] 15.9 Implement `render()` — apply `ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY)`, apply shake translate, draw all layers in correct order (background → far clouds → mid clouds → near clouds → pipes → ghosty → particles → popups → restore → score bar → overlay)
    - _Requirements: 1.2, 1.3, 9.3_
  - [ ]* 15.10 Write unit tests for overlay rendering
    - Test that IDLE overlay shows instructional prompt and high score; PAUSED overlay shows "Paused" and resume prompt; GAME_OVER overlay shows "Game Over", score, high score, and conditional "New High Score!" text
    - File: `tests/ui.test.js`

- [x] 16. Implement `init()` entry point and wire everything together
  - [x] 16.1 Implement `init()` — call `resizeCanvas()`, `loadHighScore()` → `state.highScore`, `loadAudio()`, `initClouds()`, pre-compute background texture lines, set `state.current = STATE.IDLE`, call `requestAnimationFrame(gameLoop)`
    - _Requirements: 1.5, 1.6, 2.1, 7.7, 8.8_
  - [x] 16.2 Call `init()` at the bottom of the script module to start the game on page load
    - _Requirements: 1.1_
  - [ ]* 16.3 Write unit tests for asset failure graceful degradation
    - Test that game initialises successfully when `assets/ghosty.png` fails to load and when audio assets fail to load
    - File: `tests/ui.test.js`

- [x] 17. Set up Vitest and fast-check test infrastructure
  - Create `package.json` with `vitest` and `fast-check` as dev dependencies (exact versions)
  - Create `vitest.config.js` (or inline config in `package.json`) targeting the `tests/` directory
  - Create stub test files for each module: `tests/physics.test.js`, `tests/pipes.test.js`, `tests/collision.test.js`, `tests/scoring.test.js`, `tests/state.test.js`, `tests/effects.test.js`, `tests/clouds.test.js`, `tests/scaling.test.js`, `tests/ui.test.js`
  - Export all pure functions (`updateGhosty`, `applyFlap`, `randomGapCentre`, `updatePipes`, `checkCollision`, `checkScore`, `updateHighScore`, `loadHighScore`, `saveHighScore`, `updateShake`, `emitParticle`, `updateParticles`, `spawnScorePopup`, `updateScorePopups`, `toLogical`, `initClouds`, `updateClouds`, state transition functions) so they are importable by tests
  - _Requirements: (testing infrastructure)_

- [x] 18. Final checkpoint — Ensure all tests pass
  - Run `npx vitest --run` and confirm all property-based and unit tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties across the full input space using fast-check
- Unit tests validate specific examples, state transitions, and integration points
- All pure functions must be exported from `index.html`'s script module (or extracted to a separate `game.js` module) to be importable by Vitest
- The `CONFIG` object is the single source of truth for all tunable constants — no magic numbers elsewhere in the code
- `assets/score.wav` and `assets/background_music.mp3` are optional; the game must work without them
