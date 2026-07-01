# BotDiff Player DNA System

Version: 1.0

Status: Core System

Priority: Critical

---

# Purpose

The Player DNA System is BotDiff's long-term player intelligence layer.

Rather than treating every match independently, BotDiff continuously learns how a player performs over hundreds of games.

Every completed analysis updates the player's identity, tendencies, strengths, weaknesses, improvement history, and coaching priorities.

The result is coaching that becomes more accurate over time.

---

# Vision

Most coaching tools answer:

"How did you play this game?"

BotDiff answers:

"Who are you as a player?"

---

# Objectives

The Player DNA system must:

• Learn long-term habits

• Detect recurring mistakes

• Track improvement trends

• Recognize champion preferences

• Adapt coaching over time

• Personalize every recommendation

• Build a continuously evolving player profile

---

# High-Level Flow

Match Imported

↓

Metrics Calculated

↓

AI Analysis Completed

↓

Compare Against Historical Data

↓

Update Player DNA

↓

Generate New Coaching Priorities

↓

Store Updated Profile

↓

Improve Future Coaching

---

# Player DNA Categories

## Mechanics

Measures

• CS consistency

• Last hitting

• Trading

• Skillshot accuracy

• Kiting

• Orb walking

• Damage optimization

Score

0–100

---

## Laning

Measures

• Gold at 10

• XP at 10

• CS at 10

• Wave management

• Plate pressure

• Early recalls

• Lane priority

---

## Vision

Measures

• Vision Score

• Wards placed

• Wards cleared

• Objective vision

• Vision timing

• Map awareness

---

## Positioning

Measures

• Death locations

• Teamfight spacing

• Threat awareness

• Escape routes

• Flanking

• Peel positioning

---

## Macro

Measures

• Rotations

• Objective setup

• Recall timing

• Side lane management

• Tempo

• Wave control

---

## Decision Making

Measures

• Fight selection

• Objective calls

• Risk assessment

• Overextensions

• Chase decisions

• Baron discipline

---

## Consistency

Measures

• Grade variance

• CS variance

• Death variance

• Vision variance

• Performance stability

---

## Mental

Estimated using gameplay behavior.

Indicators

• Tilt patterns

• Consecutive deaths

• Risk after mistakes

• Recovery ability

• Performance after losing lane

---

# Champion Identity

BotDiff tracks

Primary Champion

Secondary Champion

Pocket Picks

Champion Mastery

Champion Win Rate

Champion Trends

Champion Confidence

Champion Improvement Rate

---

# Role Identity

Tracks

Primary Role

Secondary Role

Autofill Frequency

Performance by Role

Preferred Playstyle

---

# Playstyle Classification

Possible Profiles

Lane Bully

Scaling Carry

Aggressive Trader

Teamfighter

Objective Focused

Split Pusher

Safe Farmer

Roaming ADC

Utility Carry

Hybrid

Multiple archetypes may exist simultaneously.

---

# Habit Detection

The system continuously detects repeated behaviors.

Examples

Dies before Dragon

Misses Cannon Minions under pressure

Recalls with excess gold

Overextends after winning lane

Late ward placement

Weak level two trading

Greedy plate attempts

Poor objective positioning

Excellent teamfight patience

Strong late-game farming

Habits are weighted by frequency and impact.

---

# Trend Analysis

Every category records

7 Games

20 Games

50 Games

Season

Lifetime

Trend Indicators

Improving

Stable

Declining

Rapid Improvement

Regression

---

# Coaching Adaptation

Player DNA directly influences AI coaching.

Example

If Vision remains weak for 30 games

↓

Reduce discussion of mechanics

↓

Prioritize vision improvement

↓

Assign vision practice drills

↓

Track improvement

The AI always prioritizes the highest-impact weakness.

---

# Player Confidence Model

Every category has a confidence score.

Example

Mechanics

94%

Vision

99%

Macro

72%

Positioning

84%

Confidence increases as more games are analyzed.

Low-confidence categories produce more cautious coaching.

---

# Player Growth Timeline

Track

First Analysis

Weekly Progress

Monthly Progress

Season Progress

Yearly Progress

Major Milestones

Promotion History

Champion Evolution

---

# Data Sources

Player DNA combines

Riot Match Data

Timeline Events

BotDiff Metrics

Champion Knowledge

Matchup Knowledge

Historical Analyses

Goal Progress

Practice Completion (Future)

---

# Database Integration

Tables Used

profiles

matches

match_participants

match_events

analyses

progress_snapshots

champion_pool

player_traits

goals

Future

practice_sessions

coach_memory

---

# Dashboard Usage

Player DNA powers

Player Identity Card

Improvement Timeline

Champion Pool

Current Focus

Weakest Skills

Strongest Skills

Growth Graphs

Consistency Meter

Playstyle Badge

Trend Indicators

---

# AI Usage

Every coaching prompt includes

Latest Match

+

Last 20 Analyses

+

Player DNA

+

Champion Knowledge

+

Current Goals

↓

Generate Personalized Coaching

The AI should never coach the current match in isolation.

Every recommendation should consider long-term behavior.

---

# Future Expansion

Planned Features

Player Archetypes

Machine Learning Predictions

Rank Projection

Promotion Probability

Burnout Detection

Tilt Detection

Session Analysis

Performance Heatmaps

Champion Recommendation

Live Adaptation

Team Synergy Profiles

Support Compatibility

Draft Recommendations

---

# Success Criteria

The Player DNA system succeeds when:

A player's coaching becomes more personalized after every match.

Recurring weaknesses are automatically identified.

Temporary mistakes are distinguished from long-term habits.

Improvement is measurable across weeks, months, and seasons.

The system feels like a coach that remembers the player rather than a tool that analyzes isolated games.

Player DNA is the long-term memory of BotDiff and serves as the foundation for every personalized coaching decision.
