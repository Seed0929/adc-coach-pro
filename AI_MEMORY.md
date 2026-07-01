# BotDiff Database Schema

Version: 1.0

## Philosophy

The BotDiff database is designed around one core principle:

> Every piece of data should only exist once and should be reusable by every feature.

The database is normalized to support:

- Riot API integration
- AI coaching
- Progress tracking
- Long-term coaching memory
- Champion analytics
- Goal tracking
- Future replay analysis
- Future team coaching

---

# Core Architecture

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

---

# Tables

## auth.users

Managed by Supabase Authentication.

Stores:

- User ID
- Email
- Password
- Authentication

Do not modify.

---

# profiles

Purpose

Stores BotDiff-specific user information.

Columns

- id
- email
- display_name
- avatar_url
- favorite_role
- favorite_champion
- onboarding_completed
- created_at
- updated_at

One row per authenticated user.

---

# riot_accounts

Purpose

Stores Riot account information.

Columns

- id
- profile_id
- game_name
- tag_line
- region
- puuid
- summoner_id
- account_id
- profile_icon_id
- summoner_level
- last_sync
- created_at

One Riot account per profile.

---

# matches

Purpose

Stores information about the match itself.

One row per Riot match.

Columns

- id
- riot_match_id
- game_creation
- game_duration
- queue
- patch
- winning_team
- map
- game_mode
- imported_at

Does NOT store player statistics.

---

# match_participants

Purpose

Stores player-specific information.

One row for every participant.

Each League match creates 10 participant rows.

Columns

- id
- match_id
- profile_id (nullable)
- puuid
- riot_name
- team
- champion
- role
- lane
- kills
- deaths
- assists
- cs
- gold
- damage
- damage_taken
- healing
- vision_score
- wards_placed
- wards_killed
- first_blood
- first_tower
- first_dragon
- summoner_spell_1
- summoner_spell_2
- runes
- items
- created_at

This table powers:

- Match history
- Champion matchups
- Duo statistics
- Enemy statistics
- Team composition analysis

---

# match_events

Purpose

Stores important timeline events.

One row per event.

Columns

- id
- match_id
- timestamp
- event_type
- player_puuid
- x
- y
- metadata
- created_at

Examples

- Kill
- Death
- Assist
- Dragon
- Baron
- Tower
- Recall
- Ward
- Item Purchase

This replaces storing one massive timeline JSON blob.

---

# analyses

Purpose

Stores AI coaching reports.

One analysis per player per match.

Columns

- id
- profile_id
- match_id
- overall_grade
- overall_score
- summary
- strengths
- weaknesses
- category_scores
- improvement_plan
- practice_drill
- next_game_goal
- json_report
- analyzed_at

This table powers:

- Coaching reports
- Dashboard
- Progress page

---

# coach_memory

Purpose

Persistent AI memory.

Only ONE row per player.

Updated after every completed analysis.

Columns

- profile_id
- current_rank
- estimated_rank
- playstyle
- biggest_strength
- biggest_weakness
- recurring_patterns
- champion_pool
- current_focus
- confidence_score
- last_updated

The AI reads this before generating new coaching.

---

# player_champion_stats

Purpose

Stores aggregated statistics by champion.

One row per champion.

Columns

- id
- profile_id
- champion
- games
- wins
- losses
- win_rate
- avg_grade
- avg_score
- avg_cs
- avg_kda
- avg_damage
- updated_at

Used for:

- Champion dashboard
- Trends
- Favorite champions
- Best champions

---

# goals

Purpose

Tracks player improvement goals.

Columns

- id
- profile_id
- title
- description
- metric
- target_value
- current_value
- status
- created_at
- completed_at

Examples

- Reach Emerald
- Average 8 CS/min
- Buy 5 Control Wards
- Average under 5 deaths

---

# coaching_sessions

Purpose

Stores AI coaching conversations.

One row per conversation.

Columns

- id
- profile_id
- title
- created_at

---

# coaching_messages

Purpose

Stores every message inside a coaching session.

Columns

- id
- session_id
- role
- content
- created_at

Supports:

- AI chat history
- Follow-up coaching
- Personalized conversations

---

# Data Flow

User registers

↓

Profile created

↓

Connect Riot Account

↓

Fetch Riot Matches

↓

Create Match

↓

Create Match Participants

↓

Create Match Events

↓

Generate AI Analysis

↓

Update Coach Memory

↓

Update Champion Statistics

↓

Update Goals

↓

Refresh Dashboard

---

# MVP Features Supported

- Authentication
- Riot Account Linking
- Match Import
- Match History
- Match Details
- AI Coaching
- Saved Analyses
- Progress Tracking
- Goal Tracking
- Champion Statistics
- Long-Term AI Memory
- AI Coaching Chat

---

# Future Expansion

The schema is designed to support:

- Replay Uploads
- VOD Reviews
- Team Coaching
- Clash Teams
- Organizations
- Friends Lists
- Leaderboards
- Weekly Reports
- Notifications
- Subscription Plans
- Multiple Riot Games (VALORANT, TFT)

without requiring major database redesign.
