spArrows is a calm logic puzzle. The board is a dotted grid with arrows on it. When you tap an arrow it flies off in the direction it points. If another arrow is in the way, it bounces back and you lose one of your 3 hearts. You win by clearing the board.

The code is split into four layers. Data and control flow from top to bottom:

```
src/app/        screens (Expo Router)      → what the player sees
src/components/ Board + arrow rendering    → drawing, gestures, animation
src/game/       pure puzzle logic          → rules, solver, generator, levels
src/state/      progress + persistence     → saves, streaks, settings
src/services/   audio, haptics, ads, IAP, analytics (thin wrappers)
```

---

## 1. The puzzle model: [src/game/types.ts](src/game/types.ts)

- An **Arrow** is an ordered list of grid cells from tail to head, plus a head direction (`U/D/L/R`). Arrows can bend, so they're "snakes", not single tiles.
- A **Level** is a width, a height and a list of arrows. Its `key` is `main:<n>` or `daily:<YYYY-MM-DD>`, and that key is used for saves.

## 2. The rules: [src/game/board.ts](src/game/board.ts)

- **`exitRay`**: lists the cells the head would pass through, from just in front of it until it leaves the board.
- **`findBlocker`**: walks that ray and returns the first other arrow in the way, plus `steps`, the number of free cells before it. The animation uses `steps` to know how far the arrow travels before it hits.
- **`launchable`**: lists every arrow whose ray is clear right now.
- **`solve`**: removing an arrow can only *unblock* others, never block anything new. So a greedy approach is enough: keep removing every launchable arrow. If the board empties, the level is solvable. If it gets stuck, it isn't.
- **`hintArrow`**: from the launchable arrows, picks the one whose removal frees the most other arrows. It can never steer you into a mistake.
- **`analyzeLevel`**: scores difficulty from 0 to 1. It looks at how much of the board is covered, how long the longest chain of "A waits for B waits for C" is, how many moves are open at the start, how many bends there are, and how many arrows there are.

## 3. Level generation: [generator.ts](src/game/generator.ts), [levels.ts](src/game/levels.ts), [rng.ts](src/game/rng.ts)

- **Building levels so they're always solvable** (`generateLevel`):
  1. Pick a random head cell and direction.
  2. Grow the body backwards with a random walk, which may turn based on `bendChance`.
  3. Accept the arrow only if its exit ray is clear of every arrow already placed (and of its own body).

  Launching the arrows in reverse order of placement therefore always works. `solve()` runs at the end only as a safety check.
- **Same levels on every device:** the random number generator (`mulberry32`) is seeded from a hash of the level key. Level 237, or today's daily, is identical for everyone. Levels are never stored, only regenerated.
- **Difficulty ramp** (`paramsForLevel`):
  - Board size, coverage, arrow length and bend chance all grow with the level number.
  - Levels up to 20 have straight arrows only.
  - Every 7th level is an easier "breather".
  - After level 500, levels are drawn from a hard band of settings.
  - Levels 1–3 are handcrafted tutorials.
- **Daily level** (`getDailyLevel`): seeded by the date, with a difficulty picked from roughly levels 60–180.

## 4. The game loop: [src/game/useGame.ts](src/game/useGame.ts)

This React hook connects the rules to the UI. It holds:
- `remaining`: ids of arrows still on the board
- `hearts` and `moves`
- `movers`: arrows currently animating, either `launch` or `bounce`
- `hintId` and `flashId`: the arrow to highlight as a hint, or to flash red after a collision

What `tap(arrow)` does:
- **Path clear:**
  1. Play the whoosh sound and haptic.
  2. Remove the arrow from `remaining` straight away.
  3. Add a `launch` mover so it animates off the board.
- **Path blocked:**
  1. Play the bounce sound.
  2. Add a `bounce` mover with the blocker's `steps`.
  3. Flash the blocking arrow red.
  4. Take one heart.

Other behaviour:
- **Win:** no arrows left and nothing still launching.
- **Loss:** no hearts left and all animations finished.
- **Autosave:** an effect saves `{levelKey, remaining, hearts, moves}` after every change, so you can quit and resume. Saving only the ids is enough because the level itself can be regenerated.
- **On a win:** the hook records progress. For main levels it moves your level pointer forward. For dailies it updates the streak.

## 5. Rendering and input: [Board.tsx](src/components/Board.tsx), [ArrowShapes.tsx](src/components/ArrowShapes.tsx), [geometry.ts](src/game/geometry.ts)

- **Drawing:** everything is one SVG (`react-native-svg`): a dot grid plus a path for each arrow.
- **Tracks:** `buildTrack` joins an arrow's body, its exit ray, and a few cells past the edge into one polyline. The arrow is drawn as a window of length `len` sliding along it, starting at position `t`:
  - `t = 0` is the arrow at rest.
  - `t = exitT` means it has fully left the board.

  `bodyPath` and `headPath` are Reanimated **worklets**. They turn `t` into SVG path strings on the UI thread, which keeps the animation smooth.
- **Motion:**
  - **Launch:** `t` speeds up from 0 to `exitT` (ease-in).
  - **Bounce:** `t` moves to the contact point, knocks twice, then eases back to 0.
  - When an animation finishes, `onMoverDone` removes the mover.
- **Gestures** (`react-native-gesture-handler`):
  - Pinch-zoom and pan run together, and a tap competes with them (`Race`).
  - The board transform (scale and offset) lives in shared values, so panning never re-renders React.
  - A tap's screen position is converted back to board coordinates and passed to the JS thread with `scheduleOnRN`.
  - There, the nearest arrow cell within a 44dp touch target counts as the hit.

## 6. Screens: [src/app/](src/app/)

- **[_layout.tsx](src/app/_layout.tsx):** wraps the app in the gesture root, safe-area provider and `ProgressProvider`, then sets up a headerless Stack.
- **[index.tsx](src/app/index.tsx):** the home menu.
- **[play.tsx](src/app/play.tsx):** the game screen.
  - It fixes the `levelKey` at mount, so finishing a level doesn't swap the board underneath you.
  - It renders `<Game key={levelKey}>`, so "Next" remounts a fresh game.
  - It shows the hearts, the tutorial text, and the Hint/Restart buttons.
  - It has three bottom sheets: won, out of hearts (restart with an ad, or refill hearts by ad or purchase), and no hints.
- **[daily.tsx](src/app/daily.tsx):** streak stats, a month calendar, trophies, and the Streak Fixer.
- **[shop.tsx](src/app/shop.tsx)** and **[settings.tsx](src/app/settings.tsx):** what their names say.

## 7. Saved data: [src/state/](src/state/)

- **[progress.ts](src/state/progress.ts):** the single `Progress` object holds:
  - the next level and the in-progress saves (main and daily)
  - hints and the remove-ads flag
  - settings
  - daily/streak data

  `migrate()` fills in fields added later, so old saves keep loading.
- **[ProgressProvider.tsx](src/state/ProgressProvider.tsx):**
  - Loads the save from AsyncStorage once and shows nothing until it's ready, so screens never flash default values.
  - Writes every change through a promise queue, so writes always land in order.
  - Passes the sound and haptics settings to those services.
- **[streak.ts](src/state/streak.ts):** pure streak logic.
  - `reconcileStreak` runs on launch. It uses Streak Freezers to cover missed days, or else breaks the streak and remembers it.
  - `fixStreak` can restore a broken streak within 3 days.
  - A month's trophy unlocks after 20 completed dailies.

## 8. Services: [src/services/](src/services/)

Each is a small facade, so the screens never call SDKs directly:
- **audio:** uses `expo-audio`, with sound effects generated by [scripts/generate-sounds.mjs](scripts/generate-sounds.mjs).
- **haptics:** uses `expo-haptics`.
- **analytics:** only logs to the console in dev for now.
- **ads and purchases:** **placeholders** that show a confirm dialog instead of a real ad or store purchase. They let you test the full flows in Expo Go. Before release they need a real ad SDK and billing library, which means a development build.

## Tooling

- `npm run validate-levels` ([scripts/validate-levels.ts](scripts/validate-levels.ts)) generates levels 1–1000 plus 60 daily levels. It checks that arrows don't overlap, bodies are connected, heads point the right way, no arrow points into its own body, and every level is solvable. It then prints the difficulty curve.
- [spArrows-puzzle-escape.md](spArrows-puzzle-escape.md) is the product spec. The `PRD §x.y` comments in the code point to sections in it.

**In short:** pure puzzle logic (always-solvable, seeded levels) feeds a `useGame` hook that holds the game's state. That hook feeds an SVG board animated on the UI thread with Reanimated. Progress lives in one object saved to AsyncStorage.