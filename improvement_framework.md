# BotDiff Development Setup

Version: 0.1

Status: Active

---

# Purpose

This document explains how to set up a local development environment for BotDiff.

By following these instructions, a new developer should be able to clone the repository and run the project with minimal configuration.

---

# Prerequisites

Install the following software before beginning.

Required

- Git
- Node.js (LTS Version)
- npm
- Visual Studio Code

Accounts Required

- GitHub
- Supabase
- Riot Developer Portal
- OpenAI Platform
- Lovable

Recommended VS Code Extensions

- ESLint
- Prettier
- GitLens
- Tailwind CSS IntelliSense
- Markdown All in One

---

# Clone Repository

```bash
git clone https://github.com/<your-username>/botdiff.git

cd botdiff
```

---

# Install Dependencies

```bash
npm install
```

---

# Environment Variables

Create a file named:

```
.env.local
```

Copy the following template.

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Riot API
RIOT_API_KEY=

# OpenAI
OPENAI_API_KEY=

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

NODE_ENV=development
```

Never commit your real environment variables.

`.env.local` should remain in `.gitignore`.

---

# Configure Supabase

Create a Supabase project.

Run

```
docs/database/SUPABASE_SQL.sql
```

This creates

- profiles
- riot_accounts
- matches
- match_participants
- analyses
- goals
- player_traits
- progress_snapshots

Enable Row Level Security.

Verify authentication is enabled.

---

# Configure Riot API

Create a Riot Developer account.

Generate a Development API Key.

Copy the key into

```
RIOT_API_KEY
```

Verify access using a known Riot account.

---

# Configure OpenAI

Create an API key.

Copy it into

```
OPENAI_API_KEY
```

Verify the application can successfully generate a test completion.

---

# Run the Development Server

```bash
npm run dev
```

Expected result

```
http://localhost:3000
```

The application should load the landing page.

---

# Verify Setup

The following checks should pass.

Authentication

✓ User registration

✓ User login

Database

✓ Tables created

✓ Row Level Security enabled

Riot

✓ Riot account lookup

✓ Match history retrieval

AI

✓ OpenAI request succeeds

Frontend

✓ Dashboard loads

✓ No console errors

---

# Recommended Development Workflow

1. Pull latest changes

```bash
git pull
```

2. Create a feature branch

```bash
git checkout -b feature/new-feature
```

3. Make changes

4. Test locally

5. Commit

```bash
git commit -m "Add feature"
```

6. Push

```bash
git push
```

7. Open Pull Request

---

# Project Structure

```
docs/
prompts/
research/
src/
supabase/
```

Each directory has a single responsibility.

---

# Common Issues

## Riot API returns 403

Cause

Expired Development API Key.

Solution

Generate a new key.

---

## OpenAI Authentication Failed

Cause

Incorrect API Key.

Solution

Verify `.env.local`.

---

## Supabase Connection Failed

Cause

Incorrect project URL or anonymous key.

Solution

Check Supabase project settings.

---

## Tables Missing

Cause

SQL schema not executed.

Solution

Run

```
docs/database/SUPABASE_SQL.sql
```

---

# Development Philosophy

Every feature should:

- Follow the architecture documents.
- Use the documented database schema.
- Respect Row Level Security.
- Be modular and testable.
- Avoid hardcoded values.
- Prefer reusable components.

---

# MVP Goal

A developer should be able to:

1. Clone the repository.
2. Configure environment variables.
3. Start the application.
4. Link a Riot account.
5. Import matches.
6. Generate an AI coaching report.
7. View the dashboard.

without requiring undocumented setup steps.
