# Product Requirements Document: Sweat Ledger — Workout Tracking iOS App

## Overview

A workout tracking application targeting iPhone that enables users to log strength training workouts in real-time, manage exercise templates, view historical performance data, and integrate with Apple Health. The app emphasizes granular set-by-set tracking with intelligent previous-performance context to support progressive overload.

## Target Platform

iPhone (iOS). Built with React Native and Expo, enabling full development on Windows. A Mac is required only for final build, signing, and App Store submission — this can be handled via a CI service (e.g., Codemagic, EAS Build).

---

## Feature 1: Active Workout Session

The core flow of the app. A user starts a workout, logs exercises and sets as they train, and finishes when done.

**Requirements**

A user can start a new workout from a blank slate or from a template. The workout has a user-editable name and displays the start date. A live elapsed timer runs from the moment the workout starts and updates continuously (per second) until the workout is finished. The timer must persist correctly if the app is backgrounded or the phone is locked — elapsed time must reflect real wall-clock time, not foreground time.

Within an active workout, the user can add exercises from the exercise library (see Feature 2). For each exercise, the user can add an arbitrary number of sets. Each set captures weight (in pounds) and reps as separate fields. Adding a new set should be a single-tap action that pre-fills values from the previous set in that exercise for fast entry.

**Bodyweight and assisted exercises** use reps as the primary field, with an optional "added weight" field (e.g., a weight belt for weighted pull-ups). Volume calculations for these exercises use added weight if specified, otherwise treat weight as 0.

**Per-set notes:** Each set has an optional free-text notes field ("felt heavy," "left shoulder tight").

**Rest timer:** After a set is logged, a configurable rest timer starts automatically. The user can set a default rest duration globally and override it per exercise. The timer runs in the foreground and fires a local notification when time is up, allowing the user to dismiss or extend it.

When an exercise is added that the user has performed before, the UI must display the previous performance — weight × reps for each set from the most recent session with that exercise — adjacent to the current input fields. This is a critical UX requirement and the primary reference point for progressive overload.

The user can finish the workout, which persists the full session: name, date, total duration, all exercises, and all sets with their weights, reps, and notes. The user can also cancel/discard an in-progress workout with a confirmation prompt.

**Definition of done:** User can start, name, log multiple exercises with multiple sets (including bodyweight exercises with optional added weight), enter per-set notes, see previous performance for known exercises, watch a live elapsed timer, use the rest timer between sets, and save the completed workout. Force-quitting and reopening the app preserves the in-progress workout state.

---

## Feature 2: Exercise Library

A pre-populated catalog of exercises that powers exercise selection across the app.

**Requirements**

The app ships with a curated library of common strength exercises (bicep curl, lateral raise, bench press, squat, deadlift, row, overhead press, pull-up, etc.). Each exercise has a name, a primary muscle group (chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes, calves, core), and an equipment type (barbell, dumbbell, cable, machine, band, bodyweight, kettlebell). The same movement with different equipment is a distinct exercise — "Cable Lateral Raise" and "Dumbbell Lateral Raise" are separate entries.

Users can create custom exercises by specifying a name, muscle group, and equipment type. Custom exercises are saved to the library and behave identically to shipped exercises in all contexts (logging, templates, stats).

The library is browsable and filterable by muscle group and equipment type. The user can view all exercises or filter to only exercises they've personally performed.

For each exercise the user has performed, the library shows:
- **Best set weight** — heaviest single set ever logged
- **Best set volume** — highest single-set weight × reps
- **Best session volume** — highest total weight × reps across all sets in a single session for this exercise
- **Estimated 1RM** — highest estimated one-rep max across all sets, using the Epley formula (`weight × (1 + reps / 30)`), applied only to sets of 15 reps or fewer

**Definition of done:** User can browse, filter, and search the full library; create custom exercises; see exercises they've performed with the four personal stats above; and the library is the single source from which exercises are added to workouts and templates.

---

## Feature 3: Workout Templates

Reusable workout structures the user can start from instead of building from scratch each time.

**Requirements**

The user can create a template from scratch or save a completed workout as a template. A template has a user-defined name and a list of exercises, each with a set count and target rep ranges per set.

Target rep ranges are pre-populated from the user's most recent session for each exercise, mirroring the exact per-set rep counts (e.g., if they last did 12, 10, 8 reps across three sets, the template pre-fills those three targets). The user can edit target rep ranges manually after creation. Templates do not store target weights — weights progress over time and are filled in during the active session.

The user can view a list of all saved templates, tap into any to see exercises, set counts, and target rep ranges. Starting a workout from a template pre-populates the active session with that structure, ready for the user to enter weights and reps.

The user can edit and delete templates.

**Definition of done:** User can create, view, edit, delete, and start a workout from a template. Templates pre-populate target reps from the user's last performance of each exercise.

---

## Feature 4: Workout History

A historical record of every completed workout with rich detail and personal record callouts.

**Requirements**

The user can view a chronological list of all completed workouts. Each list entry shows the workout name, date, and duration.

Tapping a workout opens a detail view showing: every exercise performed, every set logged (weight × reps and any set notes), the date, total workout duration, and total session tonnage (sum of weight × reps across all sets in the workout).

The best set of each exercise — defined as the set with the highest estimated 1RM (Epley, ≤15 reps) — must be visually highlighted.

Personal records achieved during the workout must be flagged. A PR is a new highest estimated 1RM for that exercise. Sets above 15 reps are excluded from PR consideration.

**Definition of done:** User can browse all past workouts, drill into any workout to see complete set-by-set detail including notes, identify the best set per exercise visually, and see PR badges where earned.

---

## Feature 5: Exercise Performance Detail

A per-exercise view of historical performance, accessible from the exercise library.

**Requirements**

For any exercise the user has performed, tapping through from the library shows:
- Complete session history: every session that included this exercise, with date, sets, weights, reps, and notes
- Best set weight ever
- Best set volume (weight × reps)
- Best session volume (total weight × reps in a single session for this exercise)
- Estimated 1RM over time as a chart showing progression (Epley, ≤15 reps)
- Total number of sessions performed

**Definition of done:** From the exercise library, the user can tap any performed exercise and see complete history and all progression stats.

---

## Feature 6: Apple Health Integration *(lower priority)*

Two-way data exchange with Apple Health and Apple Fitness.

**Requirements**

*Outbound:* When a workout is finished, write it to Apple Health as a "Traditional Strength Training" workout with start time, end time, duration, and an estimated calorie burn. Calorie estimation uses MET values × bodyweight × duration as the primary method. If an Apple Watch is paired and heart rate data is available, use heart rate data instead. Note: Apple Watch integration is untestable in development; implement the heart-rate path but the MET path is the primary validated flow for v1.

*Inbound:* Read user's current bodyweight and body fat percentage from Apple Health for display in the app and use in calorie calculations.

The app must request appropriate HealthKit permissions on first use and gracefully degrade if the user declines.

**Definition of done:** Completed workouts appear in Apple Fitness with reasonable calorie estimates; user's current weight and body fat are visible in the app.

---

## Decisions Log

| Topic | Decision |
|---|---|
| Tech stack | React Native + Expo; Mac required only for App Store builds (CI-friendly) |
| Units | Pounds only for v1 |
| Rest timers | In scope — configurable, auto-starts after each set is logged |
| Set types | Working sets only for v1 |
| Bodyweight / assisted | Reps-only with optional added weight; negative (assisted) weight out of scope for v1 |
| Cardio | Out of scope for v1 |
| Per-set notes | In scope |
| Custom exercises | In scope — saved to library, identical behavior to shipped exercises |
| 1RM formula | Epley (`w × (1 + reps/30)`), applied only to sets of ≤15 reps |
| PR definition | Estimated 1RM PR only; rep-specific PRs (5RM, 10RM, etc.) deferred post-v1 |
| Tonnage tracking | Three distinct metrics: best set volume, best session volume per exercise, total session tonnage |
| Template rep ranges | Structure + target rep ranges; targets pre-populate from exact per-set reps of most recent session |
| Data / sync | Local-only for v1; iCloud/CloudKit sync a post-v1 consideration |
| Apple Health workout type | Traditional Strength Training |
| Calorie estimation | MET × bodyweight × duration; heart rate if Apple Watch paired (untested path in v1) |

## Remaining Open Items

- **Onboarding:** First-launch experience is undefined. At minimum the app must handle empty states gracefully: no workout history, library with no performed exercises, and no templates.
