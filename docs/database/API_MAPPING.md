# BotDiff API Mapping

Version: 1.0

---

# Purpose

This document defines every external API integration used by BotDiff.

It explains:

- Where data comes from
- Where it is stored
- Which tables are updated
- Which AI systems consume the data

---

# Riot Account Flow

User signs in

↓

User opens Settings

↓

User enters Riot ID

Example

```
BotDiff#NA1
```

↓

BotDiff requests Riot Account API

↓

Receive

- Riot PUUID
- Riot Game Name
- Riot Tagline

↓

Store inside

riot_accounts

---

# Match Sync Flow

Trigger

Manual Sync

or

Automatic Daily Sync

↓

Request

GET Match IDs

↓

Receive list

```
20 newest matches
```

↓

For every Match ID

Request Match Details

↓

Store match

matches

↓

Store every participant

match_participants

↓

Update last_synced_at

riot_accounts

---

# AI Analysis Flow

Trigger

New Match Imported

↓

Collect

Player statistics

Champion

Role

Timeline

Vision

Objectives

Items

Runes

Damage

Gold

CS

↓

Generate Coaching Report

↓

Store

analyses

↓

Update

player_traits

↓

Update

progress_snapshots

---

# Goal Tracking

User creates goal

↓

Store

goals

↓

Every new analysis

↓

Compare

Current Performance

Target

↓

Update

Current Progress

↓

If goal completed

completed = TRUE

---

# Dashboard

Dashboard requests

profiles

↓

riot_accounts

↓

latest analyses

↓

latest goals

↓

progress_snapshots

↓

Display

Player Rating

Current Rank

Recent Matches

Improvement Trend

Focus Areas

Champion Pool

---

# Match Details Page

Load

matches

↓

match_participants

↓

analysis

↓

Display

Champion

Items

Build

Runes

Timeline

Mistakes

Strengths

Weaknesses

Coaching Report

Replay Notes

---

# Coach AI

Input

Latest match

+

Previous analyses

+

Player traits

+

Goals

↓

Generate

Personalized coaching

↓

Return

Summary

Strengths

Weaknesses

Practice Drill

Next Game Goal

Replay Notes

↓

Save

analyses

---

# Champion Pool

Every imported match

↓

Update

champion_pool

↓

Track

Games

Wins

Average KDA

Average CS

Average Vision

Average Damage

Overall Grade

Trend

---

# Long-Term Learning

Every completed analysis

↓

Update

player_traits

↓

Examples

Aggressive

Passive

Poor Vision

Excellent Teamfighting

Weak Laning

Poor Recall Timings

Strong Objective Control

↓

Future coaching uses these traits

instead of treating every match independently.

---

# Data Ownership

User owns

profiles

riot_accounts

matches

match_participants

analyses

goals

progress_snapshots

champion_pool

player_traits

Every table references

profile_id

for Row Level Security.

---

# Future Integrations

Planned

Discord

OBS

Twitch

YouTube

Mobalytics

OP.GG

U.GG

League Client

Replay Files

Voice Coaching

Streaming Overlay
