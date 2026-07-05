# 05 — Player Memory

Player Memory is BotDiff's long-term brain. It lets the coach remember a
player's habits across hundreds of games so coaching feels personal and
cumulative, not game-by-game.

## Principles

- Every imported match updates memory.
- Conclusions carry a confidence score based on sample size.
- The coach avoids strong claims with low confidence.
- Memory is descriptive and evolving, never permanent labels.

## What Is Remembered

### Recurring Mistakes
Habits that repeat across games (greedy recalls, overextending after first
tower, dying before objectives, chasing kills, missing side waves). Stored with
frequency and confidence.

### Champion Tendencies
Per-champion behavior: how the player farms, trades, and positions on each ADC.
Tracks games, win rate, average grade, best and weakest skill, current trend.

### Objective Habits
Attendance and timing around dragon, herald, and baron. Flags late rotations or
dying before objectives spawn.

### Teamfight Habits
Positioning relative to threats, target selection, cooldown usage, and death
patterns in fights.

### Farming Trends
CS at 10/15, missed side waves, and farm efficiency relative to rank.

### Positioning Trends
Where and how the player dies; whether they stand inside enemy engage range.

### Improvement Trends
Rolling windows (last 5/10/25/50 games) classified as improving, stable, or
declining per skill.

### Goal Progression
Active focus, its success condition, streaks toward completion, and history of
completed focuses.

### Playstyle Evolution
Evolving identity (Farmer, Fighter, Lane Bully, Teamfighter, Playmaker, Scaler,
Risk Taker, Consistent Climber). Multiple identities may apply and change over
time.

## Coaching Memory

Each session references prior coaching ("Last week we focused on recall timing —
you're improving") only when that history actually exists. The player should
feel remembered, never fed fabricated history.

## Success Test

Player Memory works when BotDiff can answer: Who is this player? What habits
define them? What has improved? What still prevents them from climbing? What
should they work on next?