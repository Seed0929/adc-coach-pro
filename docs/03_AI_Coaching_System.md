# 03 — AI Coaching System

The coaching engine converts raw Riot data into personalized, evidence-based
coaching. It is deterministic first (always works), AI-enhanced second (when a
provider is available). This document describes every subsystem.

## Player Memory

Long-term model of who the player is. Tracks strengths, weaknesses, recurring
habits, champion trends, focus history, and improvement over time. Every
imported match updates it. See 05_Player_Memory.

## Match Memory

Per-match record: champion, matchup, metrics, timeline events, deaths,
objectives, economy. Raw data is stored before any AI runs so coaching is
reproducible and explainable.

## Habit Detection

Scans across matches for recurring patterns (e.g. greedy recalls, overextending
after first tower, missing side waves). A behavior becomes a "habit" only after
it appears at a reliable rate across enough games — with a confidence score.

## Weakness Detection

Ranks recurring negative habits by LP impact. The single highest-impact leak
becomes the player's Biggest Leak and drives the coaching focus.

## Strength Detection

Identifies the strongest recurring positive habit (Biggest Strength) and
reinforces it so coaching is encouraging, not only corrective.

## Coaching Priorities

Fixed analysis order, decision-making before mechanics:
Positioning → Deaths → Wave Management → Recall Timing → Objectives →
Teamfights → Trading → Vision → Farming → Mechanics.
Only ONE primary focus is active at a time.

## Practice Plan Generation

Turns the active focus into measurable goals (e.g. "80 CS by 10 min",
"arrive at every dragon 30s early", "no deaths before second item"). Success
conditions rotate the focus when met.

## Matchup Coaching

Uses champion + enemy + support matchup knowledge to give lane-specific advice.
Draws from the matchup library (research/matchups).

## Draft Coaching (future)

Evaluates champion pick fit vs. team comp and enemy threats. Suggests safer or
higher-ceiling picks based on the player's mastery.

## Build Coaching (future)

Recommends items/runes based on matchup, game state, and the player's playstyle.

## Lane Coaching

Early-game plan: trading windows, wave states, recall timing, first-back power
spikes, and how to convert or survive the lane.

## Mid Game Coaching

Rotations, objective setup, positioning in skirmishes, and tempo after laning.

## Teamfight Coaching

Positioning relative to threats, target selection, and cooldown discipline in
fights, tied to the player's death patterns.

## Consistency Tracking

Measures variance across games. Rewards stable performance and flags tilt or
inconsistent decision-making as its own coachable pattern.

## Future OpenAI Integration Architecture

The system is already AI-ready:

- `MASTER_COACHING_PROMPT` — the single coaching persona.
- Context Builder — serializes player + match + memory into JSON.
- Question Router — classifies the question into an analysis mode.
- AI Provider layer — resolves a provider at call time; falls back to the
  deterministic engine when no key is present.

When `OPENAI_API_KEY` is added, live coaching turns on with no redesign. See
06_OpenAI_Architecture.