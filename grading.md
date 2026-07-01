# BotDiff Scoring Engine V2

Version: 2.0

Status: Core System

Priority: Critical

---

# Purpose

The Scoring Engine converts raw Riot match data into consistent, objective performance scores.

These scores power:

- Player Grades
- AI Coaching
- Player DNA
- Progress Tracking
- Champion Statistics
- Long-Term Improvement

The engine should remain deterministic, explainable, and patch-aware.

---

# Design Principles

Every score must be:

- Repeatable
- Explainable
- Role-aware
- Champion-aware
- Patch-aware
- Independent of player rank

The engine should reward correct decisions rather than simply rewarding wins.

---

# Overall Score Formula

Final Score

=

Weighted Category Scores

↓

Normalize

↓

Apply Context Adjustments

↓

Generate Final Score (0–100)

↓

Convert to Letter Grade

---

# Core Categories

## Mechanics

Weight

25%

Measures

- CS Efficiency
- Last Hitting
- Trading
- Damage Output
- Damage Efficiency
- Kiting
- Orb Walking

---

## Laning

Weight

20%

Measures

- Gold @10
- XP @10
- CS @10
- Plate Pressure
- Wave Management
- Lane Priority
- Recall Timing

---

## Vision

Weight

15%

Measures

- Vision Score
- Vision Per Minute
- Wards Placed
- Wards Cleared
- Objective Vision

---

## Macro

Weight

15%

Measures

- Rotations
- Objective Setup
- Tower Pressure
- Tempo
- Side Lane Management

---

## Positioning

Weight

15%

Measures

- Death Locations
- Teamfight Spacing
- Threat Awareness
- Peel Position
- Escape Routes

---

## Decision Making

Weight

10%

Measures

- Fight Selection
- Objective Calls
- Risk Management
- Overextensions
- Baron Discipline

---

# Champion Modifiers

Every champion has expected performance ranges.

Example

Caitlyn

Expected

- Strong early lane
- Plate pressure
- High CS
- Lane dominance

Jinx

Expected

- Scaling
- Teamfight damage
- Low early pressure

BotDiff compares performance against champion expectations.

---

# Matchup Adjustments

Performance is evaluated against lane difficulty.

Example

Winning lane against a hard counter receives a larger reward.

Losing lane into a hard counter receives a smaller penalty.

Winning lane into an easy matchup gives a smaller bonus.

---

# Rank Normalization

Every metric is compared against players of similar rank.

Examples

Iron

Gold

Emerald

Diamond

Master

Grandmaster

Challenger

The engine measures improvement relative to peers.

---

# Patch Awareness

Every score is tied to the current League patch.

Champion expectations

Item builds

Runes

Objectives

Meta priorities

should update automatically with new patches.

---

# Trend Adjustments

The engine compares:

Current Match

↓

Last 10 Matches

↓

Last 20 Matches

↓

Season Average

↓

Lifetime Average

Temporary slumps should not permanently reduce scores.

---

# Penalty System

Common penalties

Late recalls

Missed objectives

Poor vision timing

Unnecessary deaths

Greedy positioning

Missed farm

Overchasing

Repeated mistakes

Penalties stack based on frequency.

---

# Bonus System

Examples

Excellent objective setup

Perfect recall timing

Vision before objectives

Strong lane control

Exceptional farming

Teamfight consistency

Carry performances

Bonuses reward repeatable good habits.

---

# Confidence Rating

Every score includes a confidence value.

Example

Mechanics

96%

Vision

91%

Macro

72%

Low-confidence scores receive lower coaching priority.

---

# Letter Grades

98–100

S+

95–97

S

90–94

A+

85–89

A

80–84

B+

75–79

B

70–74

C+

65–69

C

60–64

D

Below 60

F

---

# Score Outputs

The engine returns

Overall Score

Letter Grade

Category Scores

Confidence Ratings

Strength Ranking

Weakness Ranking

Primary Improvement Area

Trend Direction

Player DNA Updates

---

# Integration

Outputs are consumed by

Player DNA

AI Memory

Dashboard

Champion Pool

Goals

Progress Tracking

Coaching Engine

OpenAI Prompt

---

# Future Improvements

Expected additions

Machine Learning Weight Optimization

Replay Vision Analysis

Mouse Movement Analysis

Camera Movement

APM Analysis

Skillshot Accuracy Detection

Reaction Time Estimation

Voice Coaching Integration

Live Coaching Scores

---

# Success Criteria

The Scoring Engine succeeds when:

Scores remain consistent across repeated analyses.

Players understand why they received each score.

Champion-specific expectations are respected.

Scores evolve appropriately across patches.

Every AI coaching recommendation can be traced back to measurable scoring data.

The scoring engine is the objective foundation of BotDiff's coaching platform.
