# BotDiff Authentication Flow

Version: 0.1

Status: MVP

---

# Purpose

This document defines how authentication, authorization, Riot account linking, and user security work throughout BotDiff.

Every protected feature depends on this flow.

---

# Authentication Goals

The authentication system must:

- Secure every user account
- Protect player data
- Support future premium subscriptions
- Allow multiple Riot accounts in the future
- Integrate cleanly with Supabase Row Level Security

---

# Authentication Provider

Current Provider

Supabase Auth

Authentication Methods

- Email + Password
- Magic Link (Future)
- Google OAuth (Future)
- Discord OAuth (Future)

Future

- Riot OAuth (if Riot officially supports it)

---

# Account Creation

User selects:

Create Account

↓

Enter

Email

Password

Display Name

↓

Supabase Auth

↓

Create authenticated user

↓

Create profile record

↓

Redirect to onboarding

Tables Updated

auth.users

profiles

---

# Login Flow

User enters

Email

Password

↓

Supabase validates credentials

↓

Create session

↓

Load profile

↓

Redirect to dashboard

---

# Session Management

Supabase stores

Access Token

Refresh Token

↓

Session automatically refreshes

↓

User remains logged in

If refresh fails

↓

Return to login

---

# Protected Routes

Authentication Required

- Dashboard
- Match History
- Coaching Reports
- Goals
- Settings
- Champion Progress
- Practice Plans

Public Routes

- Landing Page
- Pricing
- Login
- Register
- Privacy Policy
- Terms of Service

---

# Riot Account Linking

After onboarding

↓

User enters

Game Name

Tag Line

↓

BotDiff requests Riot Account API

↓

Retrieve

PUUID

Summoner ID

Region

↓

Store

riot_accounts

↓

Verify ownership

↓

Begin match synchronization

---

# Authorization

Every database query must verify ownership.

Example

User A

cannot access

User B's

matches

analyses

goals

player model

reports

This is enforced through Row Level Security.

---

# Row Level Security

Every table references

profile_id

Policies

SELECT

Only owner

INSERT

Only authenticated owner

UPDATE

Only owner

DELETE

Only owner

No cross-account access.

---

# API Authorization

Frontend

↓

JWT Token

↓

Supabase

↓

Edge Function

↓

Verify Token

↓

Execute Request

↓

Return Data

Unauthorized requests are rejected.

---

# Logout Flow

User selects

Logout

↓

Invalidate session

↓

Clear local storage

↓

Return to landing page

---

# Password Reset

User selects

Forgot Password

↓

Supabase sends email

↓

User creates new password

↓

Session restored

---

# Security Principles

Passwords are never stored by BotDiff.

Authentication handled by Supabase.

JWT tokens expire automatically.

API keys remain server-side.

Sensitive operations require authenticated sessions.

---

# Future Features

Planned

- Two-Factor Authentication
- Riot OAuth
- Device Management
- Login History
- Suspicious Login Detection
- Premium Subscription Authentication
- Team Accounts
- Organization Accounts

---

# Authentication Summary

Create Account

↓

Authenticate

↓

Create Session

↓

Load Profile

↓

Link Riot Account

↓

Verify Ownership

↓

Enable Match Sync

↓

Protect All Requests

↓

Maintain Secure Session

The authentication system ensures every player only has access to their own coaching data while providing a secure foundation for future platform growth.
