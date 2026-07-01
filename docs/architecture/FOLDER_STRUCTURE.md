# BotDiff Folder Structure

Version: 1.0

Status: Active

---

# Purpose

This document defines the official repository structure for BotDiff.

Every directory has a single responsibility. New files should always be placed in the appropriate location to keep the project organized, maintainable, and scalable.

---

# Repository Structure

```
botdiff/

├── docs/
│
├── prompts/
│
├── research/
│
├── src/
│
├── supabase/
│
├── public/
│
├── scripts/
│
├── tests/
│
├── .github/
│
├── README.md
├── LICENSE
├── CHANGELOG.md
├── CONTRIBUTING.md
├── .env.example
└── package.json
```

---

# docs/

Purpose

Project documentation.

Contains

- Architecture
- Database
- Development
- Product specifications
- Roadmaps
- API documentation

Subfolders

```
docs/

architecture/

database/

development/
```

---

# prompts/

Purpose

Prompt templates sent to the AI.

Examples

- system_prompt.md
- adc_coach.md
- grading.md
- report_template.md
- improvement_framework.md

---

# research/

Purpose

Knowledge used by BotDiff.

Contains

Champion knowledge

Matchups

Coaching systems

Practice research

Scoring systems

Subfolders

```
research/

champions/

matchups/

systems/
```

---

# src/

Purpose

Application source code.

Suggested Structure

```
src/

components/

pages/

hooks/

services/

utils/

types/

constants/

styles/

assets/
```

---

# components/

Reusable UI components.

Examples

Dashboard

PlayerCard

MatchCard

GoalCard

CoachPanel

Charts

Navigation

---

# pages/

Application routes.

Examples

Dashboard

Profile

Settings

History

Reports

Practice

Pricing

Landing

---

# hooks/

Custom React hooks.

Examples

useAuth()

useMatches()

usePlayerDNA()

useAnalysis()

useGoals()

---

# services/

Business logic.

Examples

RiotService

OpenAIService

AnalysisService

GoalService

PlayerDNAService

---

# utils/

Pure helper functions.

Examples

calculateGrade()

normalizeScore()

formatDuration()

sortMatches()

---

# types/

TypeScript interfaces.

Examples

Player

Match

Analysis

Champion

Goal

TimelineEvent

---

# constants/

Static values.

Examples

Champion IDs

Queue IDs

Skill Weights

Grade Thresholds

Patch Constants

---

# public/

Static assets.

Examples

Images

Icons

Fonts

Logos

Manifest

---

# supabase/

Supabase configuration.

Contains

Edge Functions

Migrations

SQL

Policies

Seeds

---

# scripts/

Developer scripts.

Examples

Database seeding

Champion importer

Patch updater

Testing utilities

---

# tests/

Automated tests.

Structure

```
tests/

unit/

integration/

end-to-end/
```

---

# .github/

GitHub automation.

Contains

GitHub Actions

Issue templates

Pull request templates

CI/CD workflows

---

# Design Rules

Every directory has one responsibility.

Avoid duplicate files.

Keep business logic out of UI components.

Store reusable logic in services or utilities.

Documentation belongs in docs/.

Research belongs in research/.

Prompt engineering belongs in prompts/.

---

# Naming Conventions

Directories

lowercase

Files

PascalCase for React components

camelCase for utilities

UPPER_SNAKE_CASE only for environment variables

Markdown

UPPER_CASE or Title_Case where appropriate.

---

# Scalability

Future folders

```
mobile/

desktop/

packages/

workers/

analytics/

ml/
```

These should be added only when the project requires them.

---

# Success Criteria

The folder structure succeeds when:

Every file has an obvious home.

Developers can quickly locate functionality.

Business logic, documentation, prompts, and research remain clearly separated.

The repository can grow without becoming disorganized.
