# BotDiff Entity Relationship Diagram (ERD)

Version: 1.0

## Core Relationships

auth.users
│
▼
profiles
│
▼
riot_accounts
│
▼
matches
│
├───────────────┐
▼ ▼
match_participants match_events
│ │
└──────┬────────┘
▼
analyses
│
┌──────┴────────┐
▼ ▼
coach_memory player_champion_stats
│
▼
goals

profiles
│
▼
coaching_sessions
│
▼
coaching_messages
