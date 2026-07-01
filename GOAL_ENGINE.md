# BotDiff AI Memory System

Version: 1.0

Status: Core System

Priority: Critical

---

# Purpose

The AI Memory System enables BotDiff to remember previous coaching sessions, player progress, recurring habits, and completed goals.

Unlike traditional AI chat systems that treat every interaction independently, BotDiff maintains persistent coaching context across matches, days, and seasons.

The objective is to make every coaching session feel like continuing a conversation with the same coach.

---

# Philosophy

A great coach never starts over.

They remember:

• what you've already improved

• what you've struggled with

• previous advice

• your champion pool

• your habits

• your goals

• your learning style

BotDiff should behave the same way.

---

# Memory Layers

BotDiff stores memory in multiple layers.

## Layer 1

Match Memory

Lifetime

Single Match

Purpose

Remember everything about one game.

Expires after

Never

---

## Layer 2

Short-Term Memory

Scope

Last 10 matches

Purpose

Detect recent improvements and regressions.

Examples

Winning lane more often

Recent losing streak

Improved farming

Temporary slump

---

## Layer 3

Long-Term Memory

Scope

Entire account history

Purpose

Recognize permanent habits.

Examples

Weak vision

Strong mechanics

Excellent teamfighting

Aggressive positioning

---

## Layer 4

Coaching Memory

Stores

Previous coaching advice

Assigned drills

Goals

Completed goals

Repeated advice

Purpose

Avoid repeating identical coaching every match.

---

# Memory Categories

BotDiff remembers

Champion Pool

Preferred Role

Common Mistakes

Strengths

Weaknesses

Playstyle

Improvement History

Mental Trends

Learning Speed

Favorite Coaching Style

---

# Recurring Mistakes

Examples

Dies before objectives

Misses early recalls

Overextends after winning lane

Late vision

Greedy farming

Weak level 2

Poor dragon setup

Bad positioning versus engage

The system records

Frequency

Severity

Last occurrence

Improvement trend

---

# Coaching Memory

Every completed report stores

Primary lesson

Secondary lesson

Assigned drill

Next game goal

Completed

Ignored

Repeated

This prevents repetitive coaching.

---

# Goal Memory

Tracks

Current goals

Completed goals

Abandoned goals

Average completion time

Success rate

If a goal has been completed consistently, BotDiff replaces it with a new objective.

---

# Champion Memory

Tracks

Games Played

Win Rate

Average Grade

Strong Matchups

Weak Matchups

Common Mistakes

Recent Progress

Champion Confidence

The AI adjusts coaching based on champion experience.

---

# Improvement Tracking

Every category records

Current Rating

Previous Rating

Best Rating

Worst Rating

Rolling Average

Improvement Velocity

Confidence Score

---

# Memory Confidence

Every memory has confidence.

Example

Mechanics

98%

Vision

95%

Macro

81%

Mental

54%

Low confidence memories produce softer coaching recommendations.

---

# Memory Expiration

Some memories expire.

Examples

Current losing streak

Temporary champion pick

Patch-specific build

Recent experiment

Permanent memories never expire.

Examples

Champion mastery

Playstyle

Decision tendencies

Mechanical strengths

---

# AI Prompt Context

Every coaching request includes

Current Match

+

Player DNA

+

Memory Summary

+

Last Coaching Session

+

Active Goals

+

Champion Knowledge

+

Matchup Knowledge

↓

Generate Coaching

---

# Memory Updates

After every completed analysis

Update

Player DNA

↓

Update

Coaching Memory

↓

Update

Goals

↓

Update

Trend Analysis

↓

Store

New Memory Snapshot

---

# Future Features

Planned

Session Memory

Voice Conversation Memory

Practice Completion Tracking

Replay Bookmark Memory

Favorite Coaching Style

Adaptive Drill Selection

Learning Pace Detection

Mental Recovery Tracking

Season Comparison

Cross-Champion Learning

---

# Database Integration

Primary Tables

player_traits

analyses

goals

progress_snapshots

champion_pool

Future Tables

coach_memory

practice_sessions

learning_history

conversation_history

---

# Success Criteria

The AI Memory System succeeds when:

The coach remembers previous conversations.

Advice evolves instead of repeating.

Long-term habits are recognized automatically.

Completed goals influence future coaching.

Players feel like they are working with one continuous coach rather than restarting every session.

BotDiff's memory system is the foundation of personalized coaching and one of the platform's primary competitive advantages.
