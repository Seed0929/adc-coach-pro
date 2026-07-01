# Technical Decisions

## Authentication

Provider:
Supabase Auth

Reason:
Secure, scalable, and integrates directly with Row Level Security.

---

## Database

Provider:
Supabase PostgreSQL

Reason:
Managed PostgreSQL with built-in authentication and RLS.

---

## Frontend

React + TypeScript

Reason:
Strong typing, maintainability, and excellent Lovable support.

---

## Backend

Supabase Edge Functions

Reason:
Secure server-side execution for Riot API requests and OpenAI requests.

---

## AI

OpenAI API

Reason:
Generate natural-language coaching from structured metrics.

---

## Architecture

The backend determines WHAT the player needs to improve.

OpenAI determines HOW that coaching is explained.

This keeps coaching deterministic and reduces hallucinations.

---

## Scope

BotDiff supports:

League of Legends

ADC Role

Ranked Solo/Duo

Only.

No additional games or roles will be developed until the MVP is validated.
