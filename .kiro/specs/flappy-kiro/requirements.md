# Requirements Document

## Introduction

Flappy Kiro is a browser-based retro endless scroller game. The player guides a ghost character ("Ghosty") through an infinite series of pipe obstacles by tapping, clicking, or pressing the spacebar to flap upward while gravity pulls the ghost down. The game runs entirely in the browser with no server-side dependencies. It features a hand-drawn visual style, sound effects, background music, particle and screen-shake feedback, and persistent high score tracking via localStorage. The game supports four distinct states: Idle, Playing, Paused, and Game Over.

## Glossary

- **Game**: The Flappy Kiro browser application as a whole.
- **Ghosty**: The player-controlled ghost character sprite rendered using `assets/ghosty.png`.
- **Pipe_Pair**: A pair of green Mario-style pipes (one from the top, one from the bottom) with a gap between them through which Ghosty must fly.
- **Gap**: The vertical opening between the top and bottom pipe of a Pipe_Pair through which Ghosty must pass.
- **Score**: The integer count of Pipe_Pairs successfully passed by Ghosty in the current session.
- **High_Score**: The highest Score achieved across all sessions, persisted in localStorage.
- **Canvas**: The HTML5 `<canvas>` element on which the game is rendered.
- **Game_Loop**: The requestAnimationFrame-driven update-and-render cycle that drives gameplay.
- **Gravity**: The constant downward acceleration applied to Ghosty each frame.
- **Flap**: The upward velocity impulse applied to Ghosty in response to player input.
- **Collision**: Contact between Ghosty's bounding box and a pipe, the top edge, or the bottom edge of the Canvas.
- **Score_Bar**: The dark footer bar at the bottom of the Canvas displaying current Score and High_Score.
- **Cloud**: A decorative rounded-rectangle shape rendered in the background to suggest a sky environment, assigned to a depth layer that determines its scroll speed and opacity.
- **Cloud_Layer**: A depth tier (e.g., far, mid, near) assigned to each Cloud that controls its horizontal scroll speed and transparency to simulate parallax perspective.
- **Idle_State**: The state before the first input of a session where Ghosty hovers and the game has not started. The main menu screen; prominently displays the High_Score.
- **Playing_State**: The state during active gameplay after the first input.
- **Paused_State**: The state entered from Playing_State when the player pauses the game; all physics and scrolling are frozen until the player resumes.
- **Game_Over_State**: The state after a Collision, before the player restarts.
- **Background_Music**: A looping ambient audio track played during Playing_State. **Note: no background music asset currently exists in the `assets/` folder. This asset must be provided or generated before this requirement can be fully implemented.**
- **Screen_Shake**: A brief camera-shake effect applied to the Canvas render offset on Collision to provide tactile feedback.
- **Particle_Trail**: Small short-lived particle shapes emitted continuously from Ghosty's position while in Playing_State to convey motion and energy.
- **Score_Popup**: A transient "+1" text animation that appears near the Score_Bar or the scored Pipe_Pair and fades out over a short duration when the Score increments.
- **Pipe_Spacing**: The fixed horizontal distance in pixels between the left edge of one Pipe_Pair and the left edge of the next Pipe_Pair.
- **Gap_Height**: The fixed vertical height in pixels of the Gap opening between the top and bottom pipe of a Pipe_Pair.
- **Pipe_Speed**: The current horizontal scroll speed of all Pipe_Pairs, measured in pixels per frame, applied uniformly to all active pipes.
- **Speed_Increment**: The fixed amount by which Pipe_Speed increases each time a Score_Milestone is reached.
- **Score_Milestone**: A Score value that is an exact multiple of a defined interval (e.g., every 5 points) at which Pipe_Speed is increased by Speed_Increment.

---

## Requirements

### Requirement 1: Game Initialization and Rendering

**User Story:** As a player, I want the game to load instantly in my browser and display the game canvas, so that I can start playing without any installation or setup.

#### Acceptance Criteria

1. THE Game SHALL render entirely within a single HTML file that can be opened directly in a modern browser without a build step or server.
2. THE Game SHALL display a Canvas with a light blue, sketchy/hand-drawn background texture.
3. THE Game SHALL render decorative Cloud shapes as semi-transparent rounded rectangles in the background during all states, with each Cloud assigned to a Cloud_Layer that determines its scroll speed and opacity.
4. THE Game SHALL display the Score_Bar as a dark horizontal bar at the bottom of the Canvas showing "Score: X | High: X" where X is the current Score and High_Score respectively.
5. WHEN the Game initializes, THE Game SHALL load `assets/ghosty.png` as the Ghosty sprite and use it for all Ghosty rendering.
6. WHEN the Game initializes, THE Game SHALL load `assets/jump.wav` and `assets/game_over.wav` as audio assets.
7. IF an audio asset fails to load, THEN THE Game SHALL continue operating without sound rather than halting.

---

### Requirement 2: Idle State / Main Menu

**User Story:** As a player, I want to see the game in a ready state when it first loads, so that I know how to start playing and can see my best score at a glance.

#### Acceptance Criteria

1. WHEN the Game initializes, THE Game SHALL enter Idle_State and display Ghosty centered horizontally on the Canvas.
2. WHILE in Idle_State, THE Game SHALL apply a gentle vertical bobbing animation to Ghosty to indicate it is alive and waiting.
3. WHILE in Idle_State, THE Game SHALL display an instructional prompt (e.g., "Tap or press Space to start") on the Canvas.
4. WHILE in Idle_State, THE Game SHALL NOT scroll pipes or increment the Score.
5. WHILE in Idle_State, THE Game SHALL prominently display the current High_Score on the Canvas in a visually distinct style (e.g., larger font or highlighted label) so that the player can see their personal best before starting a new session.
6. WHEN the Game transitions back to Idle_State after a session, THE Game SHALL display the updated High_Score reflecting any improvement made in the session that just ended.

---

### Requirement 3: Player Input and Flap Mechanic

**User Story:** As a player, I want to control Ghosty by tapping, clicking, or pressing spacebar, so that I can navigate through the pipes.

#### Acceptance Criteria

1. WHEN the player presses the spacebar, THE Game SHALL apply a Flap impulse to Ghosty.
2. WHEN the player clicks or taps the Canvas, THE Game SHALL apply a Flap impulse to Ghosty.
3. WHEN a Flap is applied while in Idle_State, THE Game SHALL transition to Playing_State.
4. WHEN a Flap is applied while in Playing_State, THE Game SHALL apply an upward velocity to Ghosty, overriding any current vertical velocity.
5. WHEN a Flap is applied, THE Game SHALL play the `assets/jump.wav` sound effect.
6. WHILE in Game_Over_State, THE Game SHALL NOT apply a Flap impulse in response to player input.

---

### Requirement 4: Physics — Gravity and Movement

**User Story:** As a player, I want Ghosty to fall naturally under gravity and respond to my flaps, so that the game feels physically intuitive.

#### Acceptance Criteria

1. WHILE in Playing_State, THE Game_Loop SHALL apply a constant downward Gravity acceleration to Ghosty's vertical velocity each frame.
2. WHILE in Playing_State, THE Game_Loop SHALL update Ghosty's vertical position by adding its current vertical velocity each frame.
3. THE Game SHALL cap Ghosty's maximum downward velocity at a defined terminal velocity to prevent uncontrollably fast falling.
4. WHILE in Playing_State, THE Game_Loop SHALL scroll all Pipe_Pairs horizontally from right to left at Pipe_Speed pixels per frame.

---

### Requirement 5: Pipe Generation and Scrolling

**User Story:** As a player, I want an endless series of pipe obstacles to appear at consistent intervals with fair, reachable gaps, so that the game provides a continuous and predictable challenge.

#### Acceptance Criteria

1. WHILE in Playing_State, THE Game SHALL generate a new Pipe_Pair whenever the horizontal distance between the right edge of the Canvas and the most recently spawned Pipe_Pair's left edge equals Pipe_Spacing.
2. THE Game SHALL set Pipe_Spacing to a fixed value of at least 200 pixels so that consecutive Pipe_Pairs never overlap and the player always has time to react.
3. THE Game SHALL render each Pipe_Pair as two green pipes with Mario-style caps — one extending downward from the top of the Canvas and one extending upward from the bottom.
4. THE Game SHALL set Gap_Height to a fixed value of at least 120 pixels for all Pipe_Pairs within a session, ensuring the opening is always large enough for Ghosty to pass through.
5. WHEN a new Pipe_Pair is generated, THE Game SHALL select the vertical centre of its Gap using a uniform random value within the range [Gap_Height / 2 + minimum_margin, Canvas_height − Score_Bar_height − Gap_Height / 2 − minimum_margin], where minimum_margin is at least 40 pixels, so that the Gap is always fully visible and reachable.
6. WHILE in Playing_State, THE Game SHALL scroll all active Pipe_Pairs horizontally from right to left at Pipe_Speed pixels per frame.
7. WHEN the Game transitions to Playing_State, THE Game SHALL initialise Pipe_Speed to a defined base value of at least 2 pixels per frame.
8. WHEN a Pipe_Pair scrolls completely off the left edge of the Canvas, THE Game SHALL remove it from the active pipe list.

---

### Requirement 11: Progressive Difficulty — Speed Increase

**User Story:** As a player, I want the game to become progressively harder as my score grows, so that skilled play is rewarded with a greater challenge.

#### Acceptance Criteria

1. WHEN the Score reaches a Score_Milestone, THE Game SHALL increase Pipe_Speed by Speed_Increment.
2. THE Game SHALL define a Score_Milestone as every 5 points scored, so that the first speed increase occurs at Score 5, the second at Score 10, and so on.
3. THE Game SHALL set Speed_Increment to a fixed value of 0.5 pixels per frame per Score_Milestone so that the difficulty increase is gradual and perceptible.
4. THE Game SHALL cap Pipe_Speed at a defined maximum value of no more than 10 pixels per frame so that the game remains playable at high scores.
5. WHEN the Game resets to Idle_State, THE Game SHALL reset Pipe_Speed to its base value so that each new session starts at the same initial difficulty.
6. WHILE in Playing_State, THE Game SHALL apply the current Pipe_Speed uniformly to all active Pipe_Pairs so that no pipe moves at a different speed than another.

---

### Requirement 6: Collision Detection

**User Story:** As a player, I want the game to end when Ghosty hits a pipe or the screen boundary, so that the game has meaningful stakes.

#### Acceptance Criteria

1. WHEN Ghosty's bounding box overlaps with any part of a Pipe_Pair, THE Game SHALL trigger a Collision.
2. WHEN Ghosty's bounding box reaches or exceeds the top edge of the Canvas, THE Game SHALL trigger a Collision.
3. WHEN Ghosty's bounding box reaches or exceeds the bottom edge of the Canvas (above the Score_Bar), THE Game SHALL trigger a Collision.
4. WHEN a Collision is triggered, THE Game SHALL transition to Game_Over_State.
5. WHEN a Collision is triggered, THE Game SHALL play the `assets/game_over.wav` sound effect.

---

### Requirement 7: Scoring

**User Story:** As a player, I want my score to increase as I pass through pipes, so that I have a clear measure of my progress.

#### Acceptance Criteria

1. WHEN Ghosty's horizontal position passes the trailing edge of a Pipe_Pair's Gap, THE Game SHALL increment the Score by 1.
2. THE Score_Bar SHALL display the updated Score immediately after each increment.
3. WHEN the Score increments, THE Game SHALL display a Score_Popup animation near the Score_Bar or the scored Pipe_Pair that shows "+1" and fades out within 800 milliseconds.
4. WHEN the Game transitions to Game_Over_State, THE Game SHALL compare the current Score to the High_Score.
5. WHEN the current Score exceeds the High_Score, THE Game SHALL update the High_Score to the current Score.
6. THE Game SHALL persist the High_Score to localStorage under a defined key so that it survives page reloads.
7. WHEN the Game initializes, THE Game SHALL read the High_Score from localStorage and display it in the Score_Bar.

---

### Requirement 8: Game Over State

**User Story:** As a player, I want to see a game over screen after a collision that clearly shows my final score and high score, so that I know the round has ended and can choose to restart.

#### Acceptance Criteria

1. WHEN the Game enters Game_Over_State, THE Game SHALL display a "Game Over" message on the Canvas.
2. WHEN the Game enters Game_Over_State, THE Game SHALL display the final Score and the current High_Score on the Canvas in clearly labelled fields (e.g., "Score: X" and "Best: X").
3. WHEN the current Score equals the High_Score and the High_Score was updated in the current session, THE Game SHALL display a "New High Score!" indicator alongside the score values.
4. WHILE in Game_Over_State, THE Game SHALL display a prompt instructing the player how to restart (e.g., "Tap or press Space to restart").
5. WHILE in Game_Over_State, THE Game SHALL freeze all pipe scrolling and physics updates.
6. WHEN the player presses spacebar or clicks/taps the Canvas while in Game_Over_State, THE Game SHALL reset the Score to 0, clear all active Pipe_Pairs, reposition Ghosty to its starting position, and transition to Idle_State.
7. WHEN the Game enters Game_Over_State, THE Game SHALL persist the updated High_Score to localStorage under a defined key so that the value survives a page reload.
8. WHEN the Game initializes, THE Game SHALL read the High_Score from localStorage and use it as the initial High_Score value for the session.

---

### Requirement 12: Pause State

**User Story:** As a player, I want to pause and resume the game mid-session, so that I can take a break without losing my current run.

#### Acceptance Criteria

1. WHILE in Playing_State, WHEN the player presses the Escape key or the P key, THE Game SHALL transition to Paused_State.
2. WHILE in Paused_State, THE Game SHALL freeze all pipe scrolling, physics updates, and Particle_Trail emission.
3. WHILE in Paused_State, THE Game SHALL display a "Paused" overlay message on the Canvas along with a prompt instructing the player how to resume (e.g., "Press Escape or P to resume").
4. WHILE in Paused_State, THE Game SHALL continue to display the current Score and High_Score in the Score_Bar.
5. WHILE in Paused_State, WHEN the player presses the Escape key or the P key, THE Game SHALL transition back to Playing_State and resume all physics, scrolling, and audio from the point at which the game was paused.
6. WHILE in Paused_State, THE Game SHALL NOT apply Flap impulses in response to spacebar or tap/click input.
7. WHILE in Paused_State, THE Game SHALL NOT transition to Game_Over_State.

---

### Requirement 13: Audio and Visual Feedback

**User Story:** As a player, I want rich audio and visual feedback during gameplay, so that the game feels responsive, polished, and satisfying to play.

#### Acceptance Criteria

**Sound Effects**

1. WHEN a Flap is applied while in Playing_State, THE Game SHALL play the `assets/jump.wav` sound effect.
2. WHEN the Score increments, THE Game SHALL play a distinct scoring sound effect (e.g., a short chime or coin sound loaded from `assets/score.wav`).
3. IF `assets/score.wav` does not exist, THEN THE Game SHALL continue operating without the scoring sound rather than halting.
4. WHEN a Collision is triggered, THE Game SHALL play the `assets/game_over.wav` sound effect.

**Background Music**

5. WHEN the Game transitions to Playing_State, THE Game SHALL begin playing the Background_Music track on a continuous loop.
6. WHEN the Game transitions out of Playing_State (to Paused_State or Game_Over_State), THE Game SHALL pause or stop the Background_Music track.
7. WHEN the Game resumes from Paused_State to Playing_State, THE Game SHALL resume the Background_Music track from the point at which it was paused.
8. IF the Background_Music asset does not exist or fails to load, THEN THE Game SHALL continue operating without background music rather than halting. **Note: no background music asset currently exists in `assets/`. The asset (e.g., `assets/background_music.mp3` or `.ogg`) must be provided or generated before this criterion can be satisfied.**

**Screen Shake**

9. WHEN a Collision is triggered, THE Game SHALL apply a Screen_Shake effect to the Canvas render offset lasting no more than 500 milliseconds with a maximum displacement of 8 pixels in any direction.
10. WHEN the Screen_Shake effect completes, THE Game SHALL restore the Canvas render offset to its original position with no residual displacement.

**Particle Trail**

11. WHILE in Playing_State, THE Game_Loop SHALL emit at least one Particle_Trail particle per frame from Ghosty's current position.
12. THE Game SHALL render each Particle_Trail particle as a small semi-transparent shape (e.g., circle or star, radius 2–5 pixels) that drifts slightly backward and fades out within 300–600 milliseconds of emission.
13. WHILE in Paused_State or Game_Over_State, THE Game SHALL NOT emit new Particle_Trail particles.
14. WHEN a Particle_Trail particle's lifetime expires, THE Game SHALL remove it from the active particle list.

**Score Popup**

15. WHEN the Score increments, THE Game SHALL display a Score_Popup showing "+1" that originates near the Score_Bar or the scored Pipe_Pair.
16. THE Score_Popup SHALL animate upward and fade to fully transparent within 800 milliseconds of appearing.
17. THE Game SHALL render the Score_Popup text in a bright, high-contrast color (e.g., yellow or white) so that it is clearly visible against the background.
18. WHEN a Score_Popup's animation completes, THE Game SHALL remove it from the active display list.

---

### Requirement 9: Visual Style

**User Story:** As a player, I want the game to have a consistent retro hand-drawn aesthetic, so that it feels charming and cohesive.

#### Acceptance Criteria

1. THE Game SHALL render the Canvas background in a light blue color consistent with a daytime sky.
2. THE Game SHALL render pipes in green with a darker green cap/border to evoke a Mario-style appearance.
3. THE Game SHALL assign each Cloud to one of at least three Cloud_Layers (e.g., far, mid, near), where far-layer Clouds scroll slowest and near-layer Clouds scroll fastest, to produce a parallax scrolling effect that simulates depth.
4. THE Game SHALL render each Cloud with a semi-transparent fill, where far-layer Clouds are rendered at lower opacity and near-layer Clouds are rendered at higher opacity, reinforcing the perception of depth.
5. THE Game SHALL render the Score_Bar as a dark (near-black or dark grey) filled rectangle spanning the full width of the Canvas at the bottom.
6. THE Game SHALL render Score_Bar text in a light or white color for contrast against the dark background.
7. THE Game SHALL use a pixel-art or monospace font for all on-screen text to reinforce the retro aesthetic.

---

### Requirement 10: Responsive Canvas Sizing

**User Story:** As a player, I want the game to fit my browser window, so that I can play comfortably on different screen sizes.

#### Acceptance Criteria

1. THE Game SHALL size the Canvas to fill the full viewport width and height on initial load.
2. WHEN the browser window is resized, THE Game SHALL resize the Canvas to match the new viewport dimensions.
3. WHEN the Canvas is resized, THE Game SHALL scale all game element positions and sizes proportionally so that gameplay remains consistent.
