# BotDiff Coding Standards

Version: 0.1

Status: Active

---

# Purpose

This document defines the coding standards used throughout the BotDiff project.

The goal is to ensure every component, API endpoint, database interaction, and AI workflow follows a consistent style regardless of who writes the code.

---

# Core Principles

Every piece of code should be:

- Readable
- Modular
- Reusable
- Testable
- Secure
- Well documented

Code is written for humans first and computers second.

---

# Technology Stack

Frontend

- React
- TypeScript
- Tailwind CSS

Backend

- Supabase
- Edge Functions
- PostgreSQL

AI

- OpenAI

Version Control

- Git
- GitHub

---

# General Rules

Prefer descriptive names.

Good

```ts
calculateVisionScore()
```

Bad

```ts
calcVS()
```

---

Avoid magic numbers.

Bad

```ts
score += 17
```

Good

```ts
score += VISION_SCORE_WEIGHT
```

---

Never duplicate business logic.

If multiple components need the same functionality, move it into a shared utility.

---

Keep functions focused.

Each function should perform one responsibility.

---

# File Naming

Components

```
PlayerCard.tsx
```

Hooks

```
useMatchHistory.ts
```

Utilities

```
calculateGrade.ts
```

Constants

```
skillWeights.ts
```

Types

```
analysis.ts
```

---

# Folder Organization

```
src/

components/

pages/

hooks/

services/

utils/

types/

constants/
```

Files belong in the smallest appropriate folder.

---

# React Guidelines

Prefer functional components.

Use hooks.

Avoid deeply nested state.

Prefer composition over inheritance.

Keep components small.

---

Maximum component size

Approximately 250 lines.

Split larger components.

---

# TypeScript

Avoid `any`.

Always define interfaces.

Example

```ts
interface MatchAnalysis {
overallScore: number;
strengths: string[];
weaknesses: string[];
}
```

---

# API Standards

Every endpoint should

Validate input

Return consistent responses

Handle errors

Log failures

Never expose secrets

---

Example Response

```json
{
"success": true,
"data": {}
}
```

Example Error

```json
{
"success": false,
"error": "Match not found"
}
```

---

# Database Standards

Every table

Uses UUID primary keys

Uses timestamps

Uses foreign keys

Uses Row Level Security

Never stores secrets.

---

# AI Standards

AI never invents gameplay data.

Every recommendation must originate from:

- Riot data
- Calculated metrics
- Champion knowledge
- Matchup knowledge
- Player history

If data is unavailable, the AI should acknowledge the limitation rather than fabricate details.

---

# Error Handling

Always

Log errors

Return meaningful messages

Fail gracefully

Retry when appropriate

Never expose internal stack traces.

---

# Logging

Log

Authentication failures

API failures

Database failures

AI failures

Match imports

Never log

Passwords

API keys

Tokens

Personal information

---

# Git Standards

Commit messages should be concise and descriptive.

Examples

```
Add Riot match importer

Fix dashboard loading issue

Improve ADC coaching prompt

Refactor vision scoring
```

Avoid generic messages such as

```
Update

Fix

Changes
```

---

# Branch Naming

Feature

```
feature/player-dashboard
```

Bug

```
bugfix/match-sync
```

Documentation

```
docs/system-architecture
```

Hotfix

```
hotfix/login-issue
```

---

# Pull Requests

Every pull request should

Describe the change

Explain why it exists

Reference related issues

Pass all tests

Avoid unrelated changes

---

# Performance

Minimize unnecessary API requests.

Cache static data.

Avoid repeated database queries.

Prefer asynchronous operations where appropriate.

---

# Security

Never expose

OpenAI keys

Riot API keys

Supabase service keys

Always validate user input.

Use parameterized database queries.

Respect Row Level Security.

---

# Documentation

Every major module should include

Purpose

Inputs

Outputs

Dependencies

Future improvements

Complex business logic should include explanatory comments.

---

# Testing Expectations

Before merging, verify

Authentication

Database writes

Database reads

Riot API integration

AI report generation

Dashboard rendering

No TypeScript errors

No console errors

---

# Definition of Done

A feature is complete only when

✓ Code is readable

✓ Types are defined

✓ Errors are handled

✓ Documentation updated

✓ Tested successfully

✓ Fits the documented architecture

✓ Does not introduce duplicate logic

Quality is measured by maintainability as much as functionality.
