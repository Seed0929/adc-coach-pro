# BotDiff Data Flow

Version: 0.1

Status: MVP

---

# Purpose

This document describes how data moves through BotDiff from the moment a user creates an account until personalized coaching appears on the dashboard.

Every major API call, database write, AI process, and frontend update is documented here.

---

# End-to-End System Flow

User

↓

Authentication

↓

Riot Account Linking

↓

Match Import

↓

Timeline Processing

↓

Metric Calculation

↓

Player Model Update

↓

AI Coaching

↓

Database Storage

↓

Dashboard Rendering

---

# Stage 1 — User Authentication

Input

User signs up or logs in.

↓

Supabase Auth validates credentials.

↓

Creates or loads profile.

Tables

profiles

Result

Authenticated session.

---

# Stage 2 — Riot Account Linking

Input

Game Name

Tag Line

↓

Riot Account API

↓

Retrieve

PUUID

Summoner ID

Region

↓

Store

riot_accounts

Result

BotDiff now knows which player belongs to the account.

---

# Stage 3 — Match Retrieval

Trigger

Manual Sync

Automatic Sync

↓

Riot Match API

↓

Retrieve

Recent Match IDs

↓

For each Match ID

↓

Retrieve Match Details

↓

Store

matches

↓

Store

match_participants

Result

Database now contains raw gameplay data.

---

# Stage 4 — Timeline Processing

Retrieve

Timeline API

↓

Extract

Champion

Items

Runes

Kills

Deaths

Assists

Objectives

Vision

Recall timings

Gold

Experience

↓

Store

match_events

Purpose

Transforms Riot timeline into structured events.

---

# Stage 5 — Metrics Engine

Input

Raw match events

↓

Calculate

CS per minute

Vision per minute

Damage share

Gold efficiency

Kill participation

Objective participation

Recall efficiency

Lane performance

Trading

Positioning

Macro score

↓

Store

analysis metrics

Purpose

Convert raw gameplay into measurable performance.

---

# Stage 6 — Player Model Update

Input

Latest metrics

+

Historical metrics

↓

Update

Champion pool

Preferred role

Aggression

Consistency

Mechanical rating

Vision rating

Macro rating

Positioning rating

Risk profile

Improvement trend

↓

Store

player model

Purpose

BotDiff learns the player over time.

---

# Stage 7 — AI Coaching

Inputs

Latest match

Historical performance

Champion knowledge

Matchup knowledge

Practice drills

Coaching engine

Player model

↓

OpenAI

↓

Generate

Summary

Strengths

Weaknesses

Category scores

Practice drill

Replay notes

Next game goal

↓

Store

analyses

Purpose

Produce a personalized coaching report.

---

# Stage 8 — Dashboard

Frontend loads

Profile

↓

Latest analysis

↓

Progress graphs

↓

Champion statistics

↓

Goals

↓

Recent matches

↓

Render dashboard

Purpose

Display personalized coaching.

---

# Database Flow

profiles

↓

riot_accounts

↓

matches

↓

match_participants

↓

match_events

↓

analyses

↓

player_traits

↓

progress_snapshots

↓

goals

---

# AI Context Flow

Current Match

+

Last 20 Matches

+

Champion Guide

+

Matchup Guide

+

Player Model

+

Coaching Engine

↓

OpenAI

↓

Coaching Report

---

# Error Handling

If Riot API fails

↓

Retry

↓

Notify user

---

If AI generation fails

↓

Save raw metrics

↓

Retry analysis

↓

Display pending status

---

If database write fails

↓

Rollback transaction

↓

Retry

↓

Log error

---

# Future Expansion

Future stages

Replay Upload

↓

Vision Heatmaps

↓

Objective Timeline

↓

Draft Analysis

↓

Build Optimization

↓

Voice Coaching

↓

Live Assistant

↓

Team Analysis

---

# Performance Targets

Authentication

< 1 second

Riot Sync

< 5 seconds

Match Import

< 10 seconds

Timeline Processing

< 5 seconds

AI Analysis

< 20 seconds

Dashboard Load

< 2 seconds

---

# Summary

Every BotDiff coaching report follows the same pipeline:

Authenticate

↓

Retrieve Riot data

↓

Store match

↓

Extract events

↓

Calculate metrics

↓

Update player model

↓

Generate AI coaching

↓

Save report

↓

Render dashboard

Every layer performs one responsibility, making the platform scalable, testable, and easy to maintain.
