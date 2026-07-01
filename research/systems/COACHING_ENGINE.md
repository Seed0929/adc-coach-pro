# BotDiff Coaching Engine

Version: MVP v1

Purpose:

Transform replay statistics into personalized, actionable coaching.

The Coaching Engine determines what BotDiff teaches, in what order, and why.

---

# Core Philosophy

BotDiff is not a replay summarizer.

BotDiff is a coach.

Every review should answer one question:

"What single improvement will help this player win more games?"

---

# Coaching Pipeline

Replay Data

↓

Extract Metrics

↓

Calculate Scores

↓

Adjust Scores by Champion

↓

Adjust Scores by Rank

↓

Find Primary Weakness

↓

Find Supporting Weaknesses

↓

Identify Strengths

↓

Generate Coaching

↓

Generate Practice Goal

↓

Save Progress

---

# Step 1 — Collect Metrics

Gather information including:

- Champion
- Role
- Rank
- Game Length
- Win/Loss
- CS per Minute
- Gold per Minute
- XP per Minute
- Kill Participation
- Deaths
- Damage Dealt
- Damage Taken
- Vision Score
- Objective Participation
- Tower Damage
- Wards Placed
- Wards Cleared

---

# Step 2 — Score Categories

Score each category independently.

Examples

Farming

Positioning

Trading

Macro

Vision

Objectives

Teamfighting

---

# Step 3 — Champion Adjustments

Different champions value different skills.

Example

Draven

Prioritize

- Early Gold
- Lane Pressure
- Passive Cash-ins

Ignore

- Weak Late Game

Example

Jinx

Prioritize

- Farming
- Positioning
- Teamfight DPS

Ignore

- Early Kill Pressure

---

# Step 4 — Rank Adjustments

Iron–Silver

Teach fundamentals.

Gold–Platinum

Teach consistency.

Emerald+

Teach efficiency.

Master+

Teach optimization.

---

# Step 5 — Detect Mistakes

Examples

Low CS

Late Recalls

Greedy Deaths

Bad Positioning

Missed Objectives

Poor Wave Control

Late Rotations

Unsafe Vision

---

# Step 6 — Prioritize

Only ONE weakness becomes the focus.

Priority Rules

Critical mistakes beat small mistakes.

Repeated mistakes beat isolated mistakes.

Habits beat one-time errors.

---

Example

Bad Farming

↓

Bad Positioning

↓

Late Objectives

↓

Poor Trading

Result

Coach Farming.

Mention Positioning.

Ignore Trading.

---

# Step 7 — Find Strengths

Always identify good habits.

Examples

Excellent Farming

Great Objective Control

Strong Teamfighting

Low Death Count

Good Vision

Good Positioning

---

# Step 8 — Generate Feedback

Feedback should include

What happened

Why it matters

How to improve

How to practice

Never insult.

Never overwhelm.

Never mention more than one primary focus.

---

Example

❌

"You made many mistakes."

✅

"You averaged 5.8 CS/min. Reaching 7.5 CS/min would likely give you an extra completed item before late-game teamfights."

---

# Step 9 — Generate Practice Goal

Every report ends with one measurable goal.

Examples

Reach 80 CS by 10 minutes.

Die fewer than 5 times.

Place one Control Ward before every Dragon.

Never miss the Level 2 power spike.

---

# Coaching Rules

Always explain why.

Always use evidence.

Always provide measurable goals.

Always reinforce good habits.

Never recommend more than one primary improvement.

---

# Personality

BotDiff should sound like a high-level coach.

Confident.

Encouraging.

Direct.

Specific.

Evidence-based.

Never sarcastic.

Never vague.

---

# Example Output

Overall Grade

B+

Primary Focus

Farming

Reason

You averaged 6.1 CS/min on Jinx.

Strong Jinx players consistently exceed 8 CS/min.

Improvement

Catch more side waves after 15 minutes.

Strength

Excellent teamfight positioning.

Practice Goal

Reach 80 CS by 10 minutes in your next three games.

---

# Long-Term Learning

BotDiff should compare games over time.

Examples

CS improving.

Deaths decreasing.

Vision improving.

Macro improving.

Champion mastery increasing.

Improvement should be measured over multiple games, not a single match.

---

# MVP Rule

The player should always leave knowing:

1. What they did well.

2. What they should improve.

3. Exactly what to practice next game.
