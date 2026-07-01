# BotDiff Deployment Architecture

Version: 1.0

Status: Production Ready

---

# Purpose

This document defines how BotDiff is deployed across its infrastructure.

It describes every production service, how they communicate, deployment environments, scaling strategy, monitoring, backups, and future expansion.

---

# Deployment Philosophy

BotDiff follows a cloud-first architecture.

Goals

• Secure

• Highly Available

• Modular

• Easy to Scale

• Low Maintenance

Each service should perform one responsibility and communicate through well-defined APIs.

---

# High-Level Infrastructure

```
User
│
▼
Frontend (Lovable)
│
▼
Supabase Authentication
│
┌───────────────┼────────────────┐
▼ ▼ ▼
Supabase DB Edge Functions Storage
│ │
└───────────────┼────────────────┐
▼
BotDiff Backend
│
┌───────────────┼────────────────┐
▼ ▼ ▼
Riot API OpenAI API Future Workers
```

---

# Core Services

## Frontend

Responsibilities

- Landing Page
- Dashboard
- Reports
- Authentication
- Settings
- Match History

Technology

- Lovable
- React
- TypeScript
- Tailwind CSS

Deployment

Production frontend.

---

## Supabase

Responsibilities

Authentication

Database

Storage

Realtime

Edge Functions

Primary Database

PostgreSQL

---

## Riot API

Responsibilities

Retrieve

Player Information

Match History

Timeline Data

Rank

Champion Mastery

Patch Information (future)

---

## OpenAI

Responsibilities

Generate

Coaching Reports

Player Feedback

Goal Recommendations

Practice Suggestions

Conversation Responses

The AI never modifies database records directly.

---

## Background Workers (Future)

Responsibilities

Automatic Match Sync

Patch Updates

Champion Database Refresh

Goal Evaluation

Daily Progress Snapshots

Notification Processing

---

# Production Data Flow

Player

↓

Frontend

↓

Supabase Auth

↓

Edge Function

↓

Riot API

↓

Database

↓

Metrics Engine

↓

Player DNA

↓

AI Memory

↓

OpenAI

↓

Analysis Saved

↓

Dashboard Updated

---

# Deployment Environments

## Local

Purpose

Development

Database

Development Supabase Project

OpenAI

Development Key

Riot

Development API Key

---

## Staging

Purpose

Internal Testing

Separate Database

Separate Environment Variables

Restricted Access

---

## Production

Purpose

Public Release

Production Database

Production Environment Variables

Production Monitoring

Backups Enabled

---

# Environment Variables

Frontend

```
NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Backend

```
SUPABASE_SERVICE_ROLE_KEY

RIOT_API_KEY

OPENAI_API_KEY
```

Secrets are never exposed to the client.

---

# Security Model

Authentication

Supabase Auth

Authorization

Row Level Security

Encryption

HTTPS

Secrets

Server Side Only

Database

Private

API Keys

Never stored in source control.

---

# Monitoring

Monitor

Frontend uptime

API latency

Database performance

Edge Function failures

OpenAI latency

Riot API latency

Import failures

AI failures

---

# Logging

Log

Authentication

Database writes

Database failures

AI generation

Match imports

API failures

Deployment events

Never log

Passwords

API Keys

JWT Tokens

Personal Information

---

# Scaling Strategy

Stage 1

Single Region

↓

Stage 2

CDN

↓

Stage 3

Background Workers

↓

Stage 4

Regional Workers

↓

Stage 5

Global Scaling

---

# Database Scaling

Indexes

Caching

Read optimization

Partitioning (future)

Archive old timeline data

Optimize analytical queries

---

# AI Scaling

Future

Request Queue

Caching

Prompt Optimization

Batch Processing

Model Selection

Cost Monitoring

Fallback Models

---

# Riot API Scaling

Request Queue

Rate Limiting

Retry Strategy

Regional Distribution

Caching Static Data

Exponential Backoff

---

# Backup Strategy

Daily Database Backup

Weekly Snapshot

Monthly Archive

Versioned SQL Migrations

GitHub Repository Backups

---

# Disaster Recovery

Failure

↓

Detect

↓

Alert

↓

Rollback

↓

Restore Database

↓

Restart Services

↓

Verify Integrity

---

# Future Infrastructure

Planned

Desktop Client

Mobile App

Replay Processing Workers

Machine Learning Pipeline

Analytics Cluster

Voice Coaching Services

Community Features

Team Coaching Infrastructure

---

# Success Criteria

Deployment architecture succeeds when:

A user can sign in securely.

Riot data synchronizes automatically.

AI coaching generates reliably.

Infrastructure scales with user growth.

Failures are recoverable without data loss.

Every service remains modular and independently maintainable.
