-- ==========================================
-- BotDiff Database
-- Version: 1.0
-- Database: PostgreSQL (Supabase)
-- ==========================================

-- Enable UUID support
create extension if not exists "pgcrypto";

-- ==========================================
-- PROFILES
-- ==========================================

create table if not exists profiles (
id uuid primary key references auth.users(id) on delete cascade,

email text unique,
display_name text,

created_at timestamptz default now(),
updated_at timestamptz default now()
);

-- ==========================================
-- RIOT ACCOUNTS
-- ==========================================

create table if not exists riot_accounts (

id uuid primary key default gen_random_uuid(),

profile_id uuid
references profiles(id)
on delete cascade,

game_name text not null,
tag_line text not null,

puuid text unique not null,

region text not null,

synced_at timestamptz,

created_at timestamptz default now()
);

create index if not exists idx_riot_profile
on riot_accounts(profile_id);

-- ==========================================
-- MATCHES
-- ==========================================

create table if not exists matches (

id uuid primary key default gen_random_uuid(),

profile_id uuid
references profiles(id)
on delete cascade,

riot_match_id text unique,

champion text,

role text,

queue text,

result text,

kills integer,
deaths integer,
assists integer,

cs integer,

vision integer,

duration integer,

played_at timestamptz,

imported_at timestamptz default now()
);

create index if not exists idx_matches_profile
on matches(profile_id);

create index if not exists idx_matches_played
on matches(played_at desc);
