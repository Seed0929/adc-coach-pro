# BotDiff Table Specification

Version: 1.0

This document defines every database column, data type, constraints, and purpose.

---

# TABLE: profiles

Purpose

Stores BotDiff-specific user information.

| Column | Type | Required | Default | Description | Example |
|---------|------|----------|---------|-------------|---------|
| id | UUID | Yes | auth.users.id | Primary Key | UUID |
| email | TEXT | Yes | - | User email | user@email.com |
| display_name | TEXT | Yes | - | Display name | Akeno |
| avatar_url | TEXT | No | NULL | Profile image | https://... |
| favorite_role | TEXT | No | NULL | Preferred role | ADC |
| favorite_champion | TEXT | No | NULL | Main champion | Caitlyn |
| onboarding_completed | BOOLEAN | Yes | FALSE | Finished onboarding | TRUE |
| created_at | TIMESTAMP | Yes | NOW() | Created timestamp | 2026-06-30 |
| updated_at | TIMESTAMP | Yes | NOW() | Last updated | 2026-06-30 |

---

# TABLE: riot_accounts

Purpose

Stores Riot account information.

One Riot account per BotDiff profile.

| Column | Type | Required | Default | Description | Example |
|---------|------|----------|---------|-------------|---------|
| id | UUID | Yes | Generated | Primary Key | UUID |
| profile_id | UUID | Yes | - | References profiles.id | UUID |
| game_name | TEXT | Yes | - | Riot Game Name | Doublelift |
| tag_line | TEXT | Yes | - | Riot Tag | NA1 |
| region | TEXT | Yes | - | Riot Region | NA |
| puuid | TEXT | Yes | - | Riot PUUID | Long String |
| summoner_id | TEXT | Yes | - | Riot Summoner ID | String |
| account_id | TEXT | Yes | - | Riot Account ID | String |
| profile_icon_id | INTEGER | No | NULL | Current icon | 1234 |
| summoner_level | INTEGER | No | 1 | Level | 563 |
| last_sync | TIMESTAMP | No | NULL | Last Riot sync | Date |
| created_at | TIMESTAMP | Yes | NOW() | Created | Date |

---

# TABLE: matches

Purpose

Stores one row per Riot match.

Contains only match-level information.

| Column | Type | Required | Default | Description | Example |
|---------|------|----------|---------|-------------|---------|
| id | UUID | Yes | Generated | Primary Key | UUID |
| riot_match_id | TEXT | Yes | - | Riot Match ID | NA1_123456 |
| game_creation | TIMESTAMP | Yes | - | Match start | Date |
| game_duration | INTEGER | Yes | - | Seconds | 1985 |
| queue | TEXT | Yes | - | Ranked Solo | Ranked Solo |
| patch | TEXT | Yes | - | Game patch | 15.12 |
| map | TEXT | Yes | - | Summoner's Rift | SR |
| game_mode | TEXT | Yes | - | Classic | Classic |
| winning_team | INTEGER | Yes | - | 100 or 200 | 100 |
| imported_at | TIMESTAMP | Yes | NOW() | Imported | Date |

---

# TABLE: match_participants

Purpose

Stores one row for every player in a match.

Every League match creates exactly 10 rows.

| Column | Type | Required | Default | Description |
|---------|------|----------|---------|-------------|
| id | UUID | Yes | Generated | Primary Key |
| match_id | UUID | Yes | - | References matches |
| profile_id | UUID | No | NULL | BotDiff user if applicable |
| puuid | TEXT | Yes | - | Riot PUUID |
| riot_name | TEXT | Yes | - | Riot ID |
| team | INTEGER | Yes | - | 100 or 200 |
| champion | TEXT | Yes | - | Champion played |
| role | TEXT | Yes | - | TOP/JUNGLE/MID/ADC/SUPPORT |
| lane | TEXT | Yes | - | Riot lane |
| kills | INTEGER | Yes | 0 | Kills |
| deaths | INTEGER | Yes | 0 | Deaths |
| assists | INTEGER | Yes | 0 | Assists |
| cs | INTEGER | Yes | 0 | Creep Score |
| gold | INTEGER | Yes | 0 | Gold Earned |
| damage | INTEGER | Yes | 0 | Damage Dealt |
| damage_taken | INTEGER | Yes | 0 | Damage Taken |
| healing | INTEGER | Yes | 0 | Healing Done |
| vision_score | INTEGER | Yes | 0 | Vision Score |
| wards_placed | INTEGER | Yes | 0 | Wards Placed |
| wards_killed | INTEGER | Yes | 0 | Wards Cleared |
| first_blood | BOOLEAN | Yes | FALSE | First Blood Participation |
| first_tower | BOOLEAN | Yes | FALSE | First Tower Participation |
| first_dragon | BOOLEAN | Yes | FALSE | First Dragon Participation |
| summoner_spell_1 | TEXT | Yes | - | Flash |
| summoner_spell_2 | TEXT | Yes | - | Heal |
| runes | JSONB | Yes | {} | Rune Setup |
| items | JSONB | Yes | [] | Purchased Items |
| created_at | TIMESTAMP | Yes | NOW() | Created |

---

# TABLE: match_events

Purpose

Stores timeline events from a match.

One row per event.

| Column | Type | Required | Default | Description |
|---------|------|----------|---------|-------------|
| id | UUID | Yes | Generated | Primary Key |
| match_id | UUID | Yes | - | References matches.id |
| timestamp | INTEGER | Yes | 0 | Seconds into game |
| event_type | TEXT | Yes | - | Event type |
| player_puuid | TEXT | No | NULL | Player responsible |
| x | INTEGER | No | NULL | Map X Coordinate |
| y | INTEGER | No | NULL | Map Y Coordinate |
| metadata | JSONB | Yes | {} | Additional Riot event data |
| created_at | TIMESTAMP | Yes | NOW() | Created timestamp |

Supported Event Types

- Kill
- Death
- Assist
- Recall
- Ward Placed
- Ward Killed
- Tower Destroyed
- Dragon Kill
- Baron Kill
- Rift Herald
- Void Grubs
- Item Purchase
- Item Sold
- Level Up

---

# TABLE: analyses

Purpose

Stores AI-generated coaching reports.

One analysis per player per match.

| Column | Type | Required | Default | Description |
|---------|------|----------|---------|-------------|
| id | UUID | Yes | Generated | Primary Key |
| profile_id | UUID | Yes | - | References profiles.id |
| match_id | UUID | Yes | - | References matches.id |
| overall_grade | TEXT | Yes | - | Letter grade (S+, S, A, etc.) |
| overall_score | INTEGER | Yes | 0 | Score out of 100 |
| summary | TEXT | Yes | - | High-level AI summary |
| strengths | JSONB | Yes | [] | List of strengths |
| weaknesses | JSONB | Yes | [] | List of weaknesses |
| category_scores | JSONB | Yes | {} | Scores for laning, vision, mechanics, objectives, positioning, etc. |
| improvement_plan | TEXT | Yes | - | Personalized improvement plan |
| practice_drill | TEXT | Yes | - | Suggested practice drill |
| next_game_goal | TEXT | Yes | - | Primary focus for next match |
| json_report | JSONB | Yes | {} | Complete structured AI output |
| ai_model | TEXT | Yes | - | AI model used |
| analysis_version | TEXT | Yes | 1.0 | Prompt version |
| analyzed_at | TIMESTAMP | Yes | NOW() | Analysis timestamp |

# TABLE: goals

Purpose

Stores long-term improvement goals.

One user can have multiple goals.

| Column | Type | Required | Default | Description |
|---------|------|----------|---------|-------------|
| id | UUID | Yes | Generated | Primary Key |
| profile_id | UUID | Yes | - | References profiles.id |
| title | TEXT | Yes | - | Goal title |
| description | TEXT | No | NULL | Goal details |
| category | TEXT | Yes | mechanics | Mechanics / Macro / Vision / Farming |
| target_value | INTEGER | No | NULL | Numeric target |
| current_value | INTEGER | Yes | 0 | Current progress |
| completed | BOOLEAN | Yes | FALSE | Finished goal |
| created_at | TIMESTAMP | Yes | NOW() | Created |
| completed_at | TIMESTAMP | No | NULL | Completion date |

# TABLE: progress_snapshots

Purpose

Stores historical performance snapshots.

| Column | Type | Required | Default | Description |
|---------|------|----------|---------|-------------|
| id | UUID | Yes | Generated | Primary Key |
| profile_id | UUID | Yes | - | References profiles.id |
| date | DATE | Yes | TODAY | Snapshot date |
| rank | TEXT | No | NULL | Current rank |
| lp | INTEGER | No | NULL | LP |
| winrate | DECIMAL | Yes | 0 | Win rate |
| cs_per_min | DECIMAL | Yes | 0 | CS/min |
| vision_score | DECIMAL | Yes | 0 | Vision |
| deaths | DECIMAL | Yes | 0 | Average deaths |
| kp | DECIMAL | Yes | 0 | Kill participation |
| objective_score | DECIMAL | Yes | 0 | Objective rating |
| overall_score | INTEGER | Yes | 0 | Coaching score |

# TABLE: coaching_sessions

Purpose

Stores coaching sessions generated by BotDiff.

| Column | Type | Required | Default | Description |
|---------|------|----------|---------|-------------|
| id | UUID | Yes | Generated | Primary Key |
| profile_id | UUID | Yes | - | References profiles.id |
| analysis_id | UUID | Yes | - | References analyses.id |
| session_type | TEXT | Yes | match_review | Match Review / Weekly Review |
| notes | TEXT | Yes | - | AI notes |
| created_at | TIMESTAMP | Yes | NOW() | Session date |

# TABLE: champion_pool

Purpose

Tracks preferred champions.

| Column | Type | Required | Default | Description |
|---------|------|----------|---------|-------------|
| id | UUID | Yes | Generated | Primary Key |
| profile_id | UUID | Yes | - | References profiles.id |
| champion | TEXT | Yes | - | Champion name |
| games | INTEGER | Yes | 0 | Games played |
| wins | INTEGER | Yes | 0 | Wins |
| losses | INTEGER | Yes | 0 | Losses |
| winrate | DECIMAL | Yes | 0 | Win rate |
| average_grade | TEXT | Yes | C | AI average grade |
| mastery | INTEGER | No | NULL | Riot mastery |

# TABLE: player_traits

Purpose

Persistent AI player model.

| Column | Type | Required | Default | Description |
|---------|------|----------|---------|-------------|
| id | UUID | Yes | Generated | Primary Key |
| profile_id | UUID | Yes | - | References profiles.id |
| aggression | INTEGER | Yes | 50 | 0-100 |
| positioning | INTEGER | Yes | 50 | 0-100 |
| mechanics | INTEGER | Yes | 50 | 0-100 |
| vision | INTEGER | Yes | 50 | 0-100 |
| objective_focus | INTEGER | Yes | 50 | 0-100 |
| consistency | INTEGER | Yes | 50 | 0-100 |
| notes | TEXT | No | NULL | AI observations |
| updated_at | TIMESTAMP | Yes | NOW() | Last updated |

