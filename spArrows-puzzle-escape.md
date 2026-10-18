# PRD — "Arrows – Puzzle Escape" Replica

**Working title:** Arrow Escape (placeholder; see §12 on branding)
**Reference product:** Arrows – Puzzle Escape by Lessmore GmbH (`com.ecffri.arrows`, Android / iOS)
**Document status:** Draft v0.1
**Platforms:** Android (primary), iOS (secondary), optional web build

---

## 1. Summary

A minimalist, no-timer logic puzzle. The board is a dotted grid holding several arrows. The player taps an arrow to launch it in the direction it points. If the path is clear it leaves the board; if another arrow is in the way it bounces back and the player loses a heart. The player clears the board by choosing a collision-free order. The game is built for calm, short-to-long sessions, with thousands of levels, a hint system, a daily challenge with streaks, and ad/IAP monetization.

**One-line pitch:** "Extract every arrow without a single collision."

## 2. Research basis and confidence

I could not load the Google Play page directly (it is JavaScript-rendered and returned no usable content). This PRD is assembled from the Apple App Store listing, APK mirror listings (APKPure, APK4Fun), the Play listing text as quoted by search results, and CrazyGames titles in the same genre. **No hands-on play of the reference app was possible**, so items are tagged:

- **[Confirmed]** stated on at least one store listing
- **[Likely]** consistent with the genre or the sources, not stated explicitly
- **[Verify]** must be checked by playing the reference app before build

| Fact | Tag | Source |
|---|---|---|
| Tap an arrow, it flies in its direction and leaves the level | Confirmed | Play/App Store copy |
| Collision: arrow bounces back, stays on board, move wasted | Confirmed | Play listing copy, CrazyGames |
| 3 hearts per round; 3 mistakes end the level | Confirmed | App Store |
| No timer, no move limit; resume where you left off | Confirmed | App Store, APKPure |
| Hint system that nudges toward the next useful step | Confirmed | APKPure |
| Dotted grid as spatial aid | Confirmed | App Store |
| Thousands of handcrafted levels; random levels after a complexity threshold | Confirmed | App Store |
| Daily challenge, streaks, monthly trophies | Confirmed | App Store |
| Dark mode, multiple languages | Confirmed | App Store release notes |
| Ad shown on restart after losing all hearts; Remove Ads IAP | Confirmed | App Store |
| IAPs: Remove Ads, Streak Freezer, Streak Fixer, Buy Hints, Refill Lives | Confirmed | App Store |
| Arrows are multi-segment lines (an elbowed body ending in an arrowhead) rather than single-cell tiles | Likely | "path crossings", "lanes", dotted grid |
| Whole arrow slides out along its own body path, head first | Verify | — |
| Pinch-zoom and drag-pan on large boards | Likely | Genre norm; CrazyGames sibling title |
| Hearts refill over time, and "Global Lives" are shared across levels | Verify | IAP name "Refill Global Lives" |
| Exact heart regen timer, hint pricing, ad cadence | Verify | — |

## 3. Goals and non-goals

### Goals
1. Reproduce the core loop, feel and pacing: tap, launch, clear or bounce, hearts, hints, calm.
2. Ship thousands of levels through an authored + procedurally generated, **guaranteed-solvable** pipeline.
3. Reproduce the retention layer: daily challenge, streaks, monthly trophies.
4. Reproduce the monetization layer: interstitial on failure, Remove Ads, consumables.

### Non-goals
- Timers, leaderboards, PvP, or social features (the reference has none).
- Copying the reference's name, icon, art, sounds, level data, or code (see §12).
- Physics-heavy simulation. Movement is deterministic and grid-based.

## 4. Target users

- **Casual mobile puzzle players**, 25–55, playing in short sessions (commute, bed, waiting).
- **Logic-puzzle fans** who want a scalable difficulty ceiling.
- Rated 9+ on iOS, "Everyone" on Google Play. UI must be legible and calm; no violence.

## 5. Core gameplay specification

### 5.1 Board
- Rectangular grid rendered as **dots at cell intersections**. Board sizes range roughly from 4×4 (tutorial) to 30×30+ (late levels). Boards larger than the viewport support pan and pinch-zoom.
- Grid coordinates `(x, y)`, origin top-left.

### 5.2 Arrow model
- An arrow is an **ordered list of grid cells** `[tail … head]`, where consecutive cells are orthogonally adjacent (a polyline that may bend), plus a **head direction** ∈ {U, D, L, R} that continues from the last segment.
- Arrows never overlap on a cell. Bends are allowed; the body is drawn as a rounded stroke with an arrowhead.
- **[Verify]** whether early levels use straight one-segment arrows only. Recommended: levels 1–20 introduce straight arrows, then bends.

### 5.3 Tap and launch
1. Player taps an arrow (hit-test on its body or head, with a minimum 44 dp touch target).
2. The game evaluates the **exit path**: every cell the head would enter, continuing in the head direction until it leaves the board.
3. **Path clear** (no cell of any other arrow on that ray): the arrow travels along the path, head first with the body following (snake-style), exits the board, and is removed. Increment "cleared" count.
4. **Path blocked**: the arrow advances until it touches the blocker, plays a collision animation, then **bounces back** to its original position. It stays on the board. **Lose one heart.**

### 5.4 Win / lose
- **Win:** the board is empty. Show the completion screen, then advance to the next level.
- **Lose:** hearts reach 0 (three collisions). Show the out-of-hearts sheet (see §6.2).
- No timer and no move limit. A move counter may be tracked internally for analytics but is not shown as a constraint. **[Verify]** whether the reference shows one.

### 5.5 Determinism and solvability
- Every level must have at least one full-clear ordering with zero collisions.
- The validator (see §7) proves solvability before a level ships. A player cannot reach an unsolvable state, because a bounce leaves the board unchanged.

### 5.6 Hint
- Tap the hint button: the game highlights **one arrow that is currently safe to launch** (a valid next move on some solution). It does not solve the puzzle.
- Hints are a limited inventory (starting stock plus IAP/rewarded-ad refills). Hint on an already-solvable board always returns a valid arrow.
- Hint choice should prefer an arrow that unblocks the most others (reduces the player's frustration) but must never be a losing move.

### 5.7 Controls
| Action | Touch | Web/desktop |
|---|---|---|
| Launch arrow | Tap | Click |
| Zoom | Pinch | Wheel |
| Pan | One-finger drag on empty space | Drag |
| Hint | Button | Button / `H` |
| Pause/menu | Button | `Esc` |

Tap vs drag must be disambiguated (movement threshold ≈ 8 dp).

## 6. Game systems

### 6.1 Level progression
- Linear numbered levels with a level counter in the HUD.
- Difficulty ramps smoothly: arrow count, board size, path length, number of bends, and dependency-chain depth all grow.
- After an authored range (target: first 300–500 levels), the game **draws randomly from a curated pool of harder levels** [Confirmed: "randomized level selection after reaching certain complexity thresholds"].
- Progress autosaves after each launch, so quitting and resuming restores the exact board, hearts, and hint count.

### 6.2 Hearts
- 3 hearts per level attempt, shown in the HUD. Each collision removes one, with an animated heart break.
- At 0 hearts: a "Out of hearts" sheet with **Restart level** (shows an interstitial ad unless Remove Ads is owned), **Refill hearts** (IAP or rewarded ad), and **Quit**.
- **[Verify]** whether hearts are per-level (reset on restart) or global with regeneration. The IAP name "Refill Global Lives" suggests a global pool exists in some form. Default in this PRD: **3 hearts reset per level attempt**; a global lives pool is an open question (§14).

### 6.3 Daily challenge, streaks, trophies
- One new **daily level** per calendar day (device local date, server-validated).
- **Streak** counts consecutive days with a completed daily challenge. Show it on the home screen and in a calendar view.
- **Streak Freezer** (consumable): protects the streak through one missed day.
- **Streak Fixer** (consumable): restores a recently broken streak.
- **Monthly trophy:** completing the daily challenge on enough days in a month (threshold TBD, **[Verify]**) awards a trophy displayed in a trophy shelf. Trophies are cosmetic.

### 6.4 Settings
Sound, music, haptics, dark/light theme (dark mode is confirmed), language, restore purchases, privacy policy link, consent (GDPR/ATT) management, contact support.

## 7. Level generation and validation

The reference has thousands of levels. A replica needs a pipeline rather than hand-authoring every one.

### 7.1 Generation (reverse construction)
Build a board by adding arrows in reverse removal order. Place a new arrow only if its **exit ray is clear of all arrows already placed**. This mirrors the approach used in the prototype in this workspace (`arrow-out-game.html`) and guarantees solvability by construction: playing the arrows back in reverse insertion order clears the board.

For multi-segment arrows: pick a random walk for the body, choose the head direction from the final segment, and reject placements whose exit ray intersects any existing arrow's cells.

### 7.2 Difficulty tuning
Score each level with:
- arrow count and board area (density),
- length of the longest dependency chain (A blocks B blocks C…),
- number of **valid first moves** (fewer means harder),
- number of distinct solution orderings (fewer means harder),
- average path length and bend count.

Bucket levels by score to fit the ramp. Include a "breather" level (low score) after each run of ~5–8 hard ones.

### 7.3 Validation (build-time, mandatory)
A solver does a greedy or DFS pass: repeatedly launch any arrow with a clear ray. Because launching only removes obstacles, **any order of clear-ray launches is safe** and the greedy pass succeeds iff the level is solvable. Reject the level if the greedy pass leaves arrows behind. Also reject levels where two arrows overlap on a cell, or where the head points into its own body.

### 7.4 Level data format (JSON)
```json
{
  "id": 42,
  "width": 9,
  "height": 12,
  "arrows": [
    { "id": 0, "cells": [[2,3],[3,3],[3,4]], "head": "D" }
  ],
  "difficulty": 0.31
}
```

## 8. UX and screens

1. **Splash / loading**
2. **Home:** current level (large "Play"), daily challenge card with streak flame, settings, trophies, Remove Ads.
3. **Game screen:** board center; top bar with level number, hearts, and menu; bottom bar with hint (with count badge) and restart. Nothing else, to keep the minimalist feel.
4. **Level complete:** brief celebration, then auto-advance or "Next".
5. **Out of hearts** sheet (§6.2).
6. **Daily challenge:** month calendar with completed days marked, streak count, trophy shelf, freezer/fixer inventory.
7. **Shop:** Remove Ads, hints, freezers, fixer, heart refill; Restore Purchases.
8. **Settings.**
9. **Tutorial:** first three levels use in-board callouts (tap here, this one is blocked, use a hint). No long text.

### 8.1 Feedback and juice (keep restrained)
- Launch: ease-in acceleration along the path with a soft trail; light haptic tick.
- Bounce: quick shake plus red flash on the blocker, heavier haptic, heart-break animation.
- Clear: brief pulse and settle. Music stays ambient and low.
- Respect the OS "reduce motion" setting.

## 9. Visual and audio direction

- **Minimalist:** flat colors, generous whitespace, thin rounded strokes, dotted grid. No decorative clutter.
- **Themes:** light and dark. Consider optional unlockable arrow palettes as a future retention item (not in v1).
- **Arrow color:** neutral single ink color by default; blockers flash a semantic red on collision. Use color plus shape/motion so state is not conveyed by color alone (accessibility).
- **Typography:** one clean geometric sans; numerals tabular for level/streak counters.
- **Audio:** soft, low-key SFX (tap, whoosh, bounce, chime) and a calm ambient loop; separate music/SFX toggles.

## 10. Monetization

| Item | Type | Reference price (iOS, USD) | Notes |
|---|---|---|---|
| Remove Ads | Non-consumable or subscription | $9.99 lifetime; timed variants observed | **[Verify]** current tiers; the iOS listing shows overlapping tiers |
| Buy Hints | Consumable | $1.99 | |
| Refill Lives | Consumable | $1.99 | |
| Streak Freezer | Consumable | $1.49 | |
| Streak Fixer | Consumable | $4.99 | |

- **Ads:** interstitial when the player restarts after losing all hearts (confirmed). Optional rewarded video for extra hint/heart refill. No banner ads on the game screen, to protect the calm feel. Frequency capped.
- Purchasing Remove Ads suppresses interstitials but keeps opt-in rewarded ads available.
- Use the platform billing library (Google Play Billing / StoreKit 2). Server-side receipt validation recommended.

## 11. Analytics and KPIs

**Events:** `level_start`, `arrow_launch` (result: cleared/bounced), `heart_lost`, `level_complete`, `level_fail`, `hint_used`, `ad_shown/clicked/rewarded`, `iap_purchase`, `daily_start/complete`, `streak_change`, `session_start/end`.

**Targets (initial, to be calibrated):**
- D1 ≥ 40%, D7 ≥ 15%, D30 ≥ 6%
- Median session ≥ 6 min; ≥ 2 sessions/day among retained users
- Tutorial completion ≥ 90%
- Level fail rate per level within a band of 5–35%; flag levels outside it
- Ad ARPDAU and IAP conversion tracked against the ad-fatigue signal (D7 retention by ad load)

## 12. Legal and IP

"Exact replica" here means **mechanical and experiential fidelity**. Game rules and mechanics are not protected, but the following are and **must not be copied**:
- the name "Arrows – Puzzle Escape", icon, logo, and store listing text/screenshots,
- art, animations, sound, and music assets,
- the handcrafted level layouts (we generate our own),
- decompiled code or data from the reference app.

Use an original name, icon and palette. Have counsel review the final name and trade dress. Privacy: publish a policy; implement consent for ad identifiers (GDPR/UMP on Android, ATT on iOS); complete Google Play Data Safety and App Store privacy labels. The reference collects identifiers, usage data, diagnostics, and advertising IDs; expect the same categories.

## 13. Technical requirements

- **Engine:** Unity (C#) or Godot or a native/Flutter renderer. Recommendation: **Unity 2D** for ad/IAP SDK maturity and pinch/pan handling on large boards. A web build (Canvas/WebGL) is optional for marketing and playtest.
- **Targets:** Android 7.0+ (reference minimum), iOS 15+. 60 fps on mid-range devices.
- **Size:** aim under 100 MB installed (the reference is ~140–230 MB).
- **Offline:** fully playable offline, including cached levels; daily challenge needs connectivity to validate the date, and falls back gracefully.
- **Save:** local persistent state, with optional cloud save (Play Games / iCloud) in a later release.
- **Backend (light):** level manifest and remote-config endpoint, daily-level service, anti-clock-tamper date check, receipt validation.
- **Accessibility:** 44 dp minimum touch target, color-independent state cues, screen-reader labels on menus, reduce-motion support, scalable text.
- **Localization:** string tables from day one; launch with English plus at least 5 major languages.

## 14. Open questions (resolve by playing the reference app)

1. Are arrows single-cell tiles, straight bars, or bent snakes? Do they slide out along their own body path?
2. Are hearts per level, or a global pool with regeneration? What is the refill time?
3. How many free hints at start, and how are more earned (ads, daily gift)?
4. Is there an undo button? A restart-level button on the game screen?
5. Ad cadence beyond the restart interstitial: any between-level ads?
6. The trophy threshold and whether trophies unlock anything.
7. Board-size range and the level at which random selection begins.
8. Exact Remove Ads tiers (lifetime vs subscription).

## 15. Milestones

| Phase | Scope | Exit criteria |
|---|---|---|
| M0 – Recon (1 wk) | Play the reference for ~2 hours, record screen, close §14 | Spec addendum signed off |
| M1 – Core (3 wks) | Board, arrow model, tap/launch/bounce, hearts, win/lose, 50 levels via generator, solver | Internal playtest finishes 50 levels, 0 unsolvable |
| M2 – Content pipeline (2 wks) | Difficulty scoring, 1,000 validated levels, tutorial, hint | Fail-rate curve inside target band |
| M3 – Meta (3 wks) | Daily challenge, streaks, trophies, settings, dark mode, localization | Feature-complete alpha |
| M4 – Monetization (2 wks) | Ads (interstitial + rewarded), IAPs, consent, analytics | Test purchases and ad flows pass |
| M5 – Polish and soft launch (3 wks) | Juice, haptics, performance, a11y, store assets, soft launch in 2–3 markets | KPIs in §11 within 20% of target |

## 16. Acceptance criteria (v1.0)

- [ ] Tapping a clear arrow removes it; tapping a blocked arrow bounces it back and costs one heart.
- [ ] Three collisions in a level triggers the out-of-hearts flow.
- [ ] Every shipped level passes the solver; zero player-reachable dead ends.
- [ ] Hint always highlights a currently launchable arrow.
- [ ] Quit and resume restores board, hearts, and hint count exactly.
- [ ] Daily challenge, streak, freezer, fixer, and monthly trophy work across a month boundary and across time-zone changes.
- [ ] Interstitial shows on restart after failure unless Remove Ads is owned; purchases restore on a fresh install.
- [ ] Boards larger than the screen pan and zoom smoothly at 60 fps on a mid-range Android device.
- [ ] Light and dark themes both pass contrast checks; reduce-motion respected.
- [ ] No timer anywhere in the game.

---

*Relationship to the existing prototype:* `arrow-out-game.html` in this workspace implements the simpler block-tile variant (one arrow per grid cell, instant exit, no hearts). It is a useful reference for the reverse-construction generator and the solver logic, but the reference game appears to use longer, bent arrows on a dotted grid with hearts and hints, which is what this PRD specifies.
