# BotDiff Champion Knowledge System

Version: 1.0

Status: Core System

Priority: Critical

---

# Purpose

The Champion Knowledge System is BotDiff's structured knowledge base for every League of Legends champion.

It provides the AI with reliable, patch-aware, champion-specific information that complements gameplay analysis.

Rather than relying solely on an LLM's general knowledge, BotDiff retrieves structured champion data to generate accurate and consistent coaching.

---

# Philosophy

The AI should never guess how a champion works.

Every coaching recommendation should reference structured knowledge that has been reviewed and updated for the current patch.

Champion knowledge is treated as a first-class data source alongside Riot match data and Player DNA.

---

# Objectives

The Champion Knowledge System must

• Understand every champion

• Understand every role

• Understand champion identity

• Understand power spikes

• Understand lane strategy

• Understand teamfight responsibilities

• Understand champion-specific mistakes

• Remain current after every League patch

---

# Knowledge Pipeline

Patch Update

↓

Champion Review

↓

Knowledge Update

↓

Validation

↓

Store Champion Data

↓

AI Retrieval

↓

Coaching Report

---

# Champion Profile

Every champion contains

Champion Name

Primary Role

Secondary Roles

Difficulty

Identity

Class

Damage Profile

Scaling

Early Game

Mid Game

Late Game

Power Spikes

Core Builds

Rune Pages

Summoner Spells

Common Mistakes

Practice Recommendations

Coaching Notes

Patch Version

Knowledge Version

---

# Champion Identity

Examples

Caitlyn

Lane Bully

Range Advantage

Objective Pressure

Trap Control

---

Jinx

Hyper Carry

Scaling

Teamfight Cleanup

Objective DPS

---

Kai'Sa

Hybrid Carry

Assassin

Burst Damage

Flexible Build Paths

---

Ezreal

Safe Poke

Skillshot Reliant

Scaling

High Mobility

Every champion has an expected playstyle.

---

# Champion Strengths

Track

Lane Strength

Trading

Wave Clear

Objective Damage

Tower Pressure

Mobility

Safety

Scaling

Teamfighting

Self Peel

---

# Champion Weaknesses

Track

Weak Early Game

Mana Issues

Low Range

Weak Wave Clear

Limited Mobility

Poor Objective Damage

Weak Into Engage

Reliance on Items

---

# Power Spike Tracking

Every champion defines

Level Spikes

Item Spikes

Ultimate Spike

Late Game Spike

Example

Caitlyn

Level 1

Level 2

First Item

Rapid Fire Cannon

Three Items

The coaching engine references these spikes.

---

# Champion Goals

Every champion contains

Primary Win Condition

Secondary Win Condition

Ideal Game Length

Preferred Teamfight Style

Preferred Objective Timing

Preferred Wave State

---

# Matchup Relationships

Each champion references

Strong Matchups

Even Matchups

Difficult Matchups

Support Synergies

Support Counters

Lane Threats

Scaling Matchups

Roaming Threats

---

# Coaching Rules

Champion-specific coaching includes

Common Errors

Advanced Techniques

Power Spike Abuse

Wave Management

Positioning

Trading Patterns

Build Adaptation

Rune Choices

Objective Strategy

Teamfight Priorities

---

# Champion Metrics

Expected benchmarks

CS @10

Gold @10

Vision Score

Damage Share

Kill Participation

Deaths

Objective Participation

These expectations influence scoring.

---

# AI Retrieval

Before every coaching report retrieve

Champion Guide

↓

Current Patch

↓

Relevant Matchups

↓

Champion Metrics

↓

Common Mistakes

↓

Practice Library

↓

Coaching Notes

↓

Prompt Assembly

---

# Knowledge Versioning

Every champion file stores

Champion Version

Patch Version

Knowledge Revision

Last Updated

Reviewer

Historical versions are archived.

---

# Patch Updates

Review after every Riot patch

Abilities

Base Stats

Scaling

Items

Runes

Power Spikes

Matchups

Coaching Rules

Expected Metrics

---

# Database Integration

Current

research/champions/

Future

champion_knowledge

champion_versions

champion_statistics

matchup_relationships

---

# Future Expansion

Planned

Automatic Riot Data Import

Professional Match Analysis

Machine Learning Trend Detection

High Elo Benchmark Updates

Champion Tier Detection

Meta Shift Detection

Build Recommendation Engine

Replay Pattern Library

Champion Mastery Tracking

---

# Success Criteria

The Champion Knowledge System succeeds when

Every champion has structured coaching data.

Champion advice remains current across patches.

The AI retrieves structured information instead of relying on memory alone.

Champion-specific coaching is consistent across reports.

Champion knowledge combines seamlessly with Player DNA, Matchup Knowledge, and the Coaching Pipeline.

The Champion Knowledge System serves as BotDiff's authoritative source of champion expertise.
