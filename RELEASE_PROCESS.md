# BotDiff Match Importer

Version: 1.0

Status: MVP

---

# Purpose

The Match Importer is responsible for retrieving gameplay data from Riot Games, validating the response, storing it in the BotDiff database, and triggering the AI coaching pipeline.

It is the primary entry point for all coaching analyses.

Without a successful import, no coaching report can be generated.

---

# Objectives

The importer must:

- Connect to Riot APIs securely
- Prevent duplicate imports
- Import complete match information
- Import timeline events
- Store normalized database records
- Trigger AI analysis automatically
- Handle failures gracefully
- Respect Riot API rate limits

---

# System Overview

Player

↓

Link Riot Account

↓

Retrieve PUUID

↓

Retrieve Match IDs

↓

Retrieve Match Details

↓

Retrieve Timeline

↓

Validate Data

↓

Store Database Records

↓

Queue AI Analysis

↓

Update Dashboard

---

# Data Sources

## Riot Account API

Purpose

Retrieve the player's unique PUUID.

Stored In

riot_accounts

---

## Match API

Purpose

Retrieve full match information.

Stored In

matches

match_participants

---

## Timeline API

Purpose

Retrieve every event throughout the match.

Stored In

match_events

---

## Ranked API

Purpose

Retrieve current rank information.

Stored In

profiles

progress_snapshots

---

# Import Trigger

Imports can begin from:

Manual Sync

Automatic Daily Sync

Initial Account Linking

Future Background Worker

Future Scheduled Sync

---

# Import Pipeline

## Step 1

Retrieve Riot Account

Input

Game Name

Tag Line

Output

PUUID

Validation

Player exists.

---

## Step 2

Retrieve Match List

Request

Last 20 matches

Ignore

Unsupported game modes

Custom games

Tutorials

---

## Step 3

Duplicate Detection

Before importing

Check

matches.match_id

If match already exists

Skip import.

---

## Step 4

Retrieve Match Details

Collect

Champion

Role

Queue

Items

Runes

Summoner Spells

Kills

Deaths

Assists

CS

Damage

Gold

Vision

Objectives

Duration

Patch

Store

matches

match_participants

---

## Step 5

Retrieve Timeline

Collect

Every event

Examples

Kills

Deaths

Assists

Objectives

Recalls

Item purchases

Level ups

Ward placement

Ward destruction

Tower destruction

Epic monsters

Store

match_events

---

## Step 6

Metric Extraction

Calculate

CS per minute

Gold per minute

Vision per minute

Kill participation

Damage share

Objective participation

Lane score

Recall efficiency

Positioning score

Macro score

Store

analysis metrics

---

## Step 7

Queue AI Analysis

Trigger

AI Pipeline

Inputs

Latest match

Timeline

Metrics

Champion Knowledge

Player History

Player DNA

Outputs

Coaching report

---

## Step 8

Update Dashboard

Refresh

Recent matches

Latest grade

Champion pool

Progress graphs

Goals

Player DNA

---

# Validation Rules

Reject imports when:

Missing PUUID

Incomplete timeline

Invalid queue

Corrupted Riot response

Missing participant data

Duplicate Match ID

---

# Supported Queue Types

Ranked Solo

Ranked Flex

Normal Draft

Normal Blind

ARAM (future)

Arena (future)

Other queues ignored unless explicitly enabled.

---

# Retry Strategy

Network Failure

Retry

3 times

↓

Still failing

Log error

↓

Notify user

---

# Rate Limiting

Respect Riot Developer limits.

Implement

Request queue

Exponential backoff

Retry delay

Request batching

Future production

Regional workers

---

# Database Writes

Tables Updated

profiles

riot_accounts

matches

match_participants

match_events

analyses

progress_snapshots

champion_pool

player_traits

---

# Import Success

A successful import completes when:

✓ Match stored

✓ Participants stored

✓ Timeline stored

✓ Metrics calculated

✓ AI queued

✓ Dashboard updated

---

# Failure Recovery

If import fails

Database transaction rolls back.

No partial match should remain.

Retry allowed.

---

# Performance Targets

Account Lookup

< 500 ms

Match List

< 2 seconds

Timeline Download

< 5 seconds

Database Storage

< 2 seconds

AI Queue

< 1 second

Complete Import

< 15 seconds

---

# Future Improvements

Background workers

Incremental sync

Live match detection

Replay upload support

Multi-region imports

Tournament support

Bulk imports

Import prioritization

Patch-aware processing

---

# Success Criteria

The Match Importer succeeds when:

A linked Riot account can synchronize recent matches automatically.

Every imported match contains complete gameplay data.

Duplicate imports are prevented.

AI coaching begins automatically after every successful import.

Dashboard updates require no manual refresh.

The importer remains reliable, scalable, and resilient under increasing usage.
