# Coaching Rules

Version: 1.0

---

# Purpose

Coaching Rules define how BotDiff converts match data into coaching decisions.

These rules are evaluated before the AI generates a report.

The AI should explain the conclusions—not invent them.

---

# Coaching Philosophy

Rules should prioritize:

1. Repeatable habits
2. High LP impact mistakes
3. Evidence from the match
4. Simple, actionable coaching

Never overload the player.

One major habit is better than ten minor mistakes.

---

# Rule Priority

When multiple mistakes occur, prioritize them in this order:

1. Positioning
2. Deaths before objectives
3. Recall timing
4. Wave management
5. Farming
6. Teamfighting
7. Objective setup
8. Trading
9. Vision
10. Tempo

---

# Positioning Rules

## Rule P-001

IF

ADC dies before dealing meaningful damage in a teamfight

THEN

Increase Positioning Severity

Increase LP Impact

Recommend safer spacing.

---

## Rule P-002

IF

ADC dies first in multiple fights

THEN

Mark Positioning as Biggest Leak.

---

## Rule P-003

IF

ADC consistently survives late-game fights

THEN

Increase Positioning Grade.

---

# Farming Rules

## Rule F-001

IF

CS/min < 6.5

THEN

Reduce Farming Grade.

Recommend farming over unnecessary skirmishes.

---

## Rule F-002

IF

CS/min > 8.0

THEN

Increase Farming Grade.

Highlight farming as a strength.

---

# Recall Rules

## Rule R-001

IF

Player recalls before a major objective without spending gold efficiently

THEN

Reduce Recall Timing Grade.

---

## Rule R-002

IF

Player remains on the map with a large amount of unspent gold

THEN

Flag inefficient recall timing.

---

# Wave Management Rules

## Rule W-001

IF

Player loses multiple waves due to poor recalls

THEN

Increase Wave Management Severity.

---

## Rule W-002

IF

Player consistently crashes waves before recalling

THEN

Increase Wave Management Grade.

---

# Objective Rules

## Rule O-001

IF

ADC dies within 60 seconds before Dragon or Baron

THEN

Increase LP Impact.

Flag Objective Discipline.

---

## Rule O-002

IF

ADC is present for most major objectives

THEN

Increase Objective Grade.

---

# Teamfight Rules

## Rule T-001

IF

Player chases kills instead of attacking the nearest safe target

THEN

Reduce Teamfight Grade.

---

## Rule T-002

IF

Player consistently survives while dealing damage

THEN

Increase Teamfight Grade.

---

# Vision Rules

## Rule V-001

IF

Player repeatedly dies in unwarded areas

THEN

Reduce Vision Grade.

---

## Rule V-002

IF

Player places useful wards before objectives

THEN

Increase Vision Grade.

---

# Biggest Leak Rules

Only one Biggest Leak may exist.

Requirements:

- Highest LP Impact
- Repeatable
- Supported by evidence
- Actionable

Never select more than one.

---

# Biggest Strength Rules

Always identify one strength.

Strengths should reinforce good habits.

---

# Win Condition Rules

Generate one personalized win condition.

Examples:

Reach 8 CS/min before 15 minutes.

Avoid deaths before second Dragon.

Fight only after first item.

Never create multiple win conditions.

---

# Practice Goal Rules

Generate exactly one measurable goal.

Good:

"Stay above 7.5 CS/min until 15 minutes."

Bad:

"Play better."

Goals must be:

- Measurable
- Achievable
- Specific

---

# Report Validation

Before a report is complete, verify:

✓ Evidence supports every conclusion.

✓ Only one Biggest Leak exists.

✓ Only one active Practice Goal exists.

✓ Coaching is personalized.

✓ Recommendations are actionable.

✓ Report follows the BotDiff coaching philosophy.

---

# Success

Every coaching report should answer five questions:

1. What happened?
2. Why did it happen?
3. What mattered most?
4. What should the player change?
5. What should they focus on next game?
