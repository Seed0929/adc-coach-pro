# BotDiff Deployment Checklist

Version: 1.0

Status: Active

Priority: Critical

---

# Purpose

This checklist defines every required step before deploying BotDiff to staging or production.

A deployment is considered successful only when every required item has been verified.

---

# Deployment Types

Development

- Local testing
- Rapid iteration
- Debugging enabled

---

Staging

Purpose

Internal QA

Requirements

Production-like environment

Separate database

Separate API keys

Restricted access

---

Production

Purpose

Public release

Requirements

Production database

Production secrets

Monitoring enabled

Backups enabled

---

# Pre-Deployment Checklist

## Code Quality

✓ No merge conflicts

✓ All features merged

✓ No debug code

✓ No TODOs blocking release

✓ Code reviewed

✓ Documentation updated

---

## Testing

✓ Unit tests pass

✓ Integration tests pass

✓ End-to-end tests pass

✓ Manual smoke test completed

✓ No critical bugs

---

## Database

✓ Latest migrations applied

✓ Foreign keys verified

✓ Indexes verified

✓ Row Level Security enabled

✓ Backups completed

✓ Seed data validated

---

## Environment Variables

Verify

✓ SUPABASE_URL

✓ SUPABASE_ANON_KEY

✓ SUPABASE_SERVICE_ROLE_KEY

✓ RIOT_API_KEY

✓ OPENAI_API_KEY

✓ Environment variables match target environment

Never commit secrets to Git.

---

## Authentication

Verify

✓ Sign up

✓ Sign in

✓ Logout

✓ Password reset

✓ Protected routes

✓ Session persistence

---

## Riot Integration

Verify

✓ Riot authentication works

✓ Match import succeeds

✓ Timeline retrieval succeeds

✓ Duplicate protection works

✓ Rate limit handling verified

---

## AI System

Verify

✓ Prompt generation

✓ Coaching report generation

✓ Player DNA updates

✓ AI Memory updates

✓ Goal generation

✓ Practice drill assignment

✓ Report storage

---

## Dashboard

Verify

✓ Profile loads

✓ Match history loads

✓ Player DNA displays

✓ Goals display

✓ Practice drill displays

✓ Progress charts render

✓ Loading states

✓ Error states

---

## Performance

Target

Dashboard load

< 2 seconds

Match import

< 15 seconds

AI coaching

< 20 seconds

Database queries

< 500 ms

---

## Security

Verify

✓ HTTPS enabled

✓ Row Level Security active

✓ JWT validation

✓ Secrets protected

✓ No sensitive data exposed

✓ Security headers configured

---

## Monitoring

Verify

✓ Application logging

✓ Error tracking

✓ Database monitoring

✓ API monitoring

✓ AI request monitoring

✓ Deployment notifications

---

# Deployment Steps

1. Merge to main branch

2. Apply database migrations

3. Verify environment variables

4. Deploy frontend

5. Deploy backend functions

6. Run smoke tests

7. Verify Riot integration

8. Verify AI integration

9. Verify dashboard

10. Monitor logs

11. Confirm successful deployment

---

# Rollback Plan

If deployment fails

↓

Pause new deployments

↓

Review logs

↓

Restore previous release

↓

Restore database backup if necessary

↓

Validate application

↓

Investigate root cause

↓

Schedule corrected deployment

---

# Post-Deployment Validation

Verify

✓ Users can log in

✓ Riot accounts connect

✓ Matches import

✓ AI reports generate

✓ Dashboard updates

✓ No major errors in logs

✓ Performance remains acceptable

---

# Beta Launch Checklist

Before inviting testers

✓ Landing page complete

✓ Authentication complete

✓ Riot integration complete

✓ AI coaching complete

✓ Dashboard functional

✓ Goals functional

✓ Practice system functional

✓ Feedback form available

✓ Privacy policy published

✓ Terms of service published

---

# Production Launch Checklist

✓ All beta issues reviewed

✓ Critical bugs resolved

✓ Monitoring enabled

✓ Backups verified

✓ Documentation current

✓ Support contact available

✓ Analytics enabled

✓ Release notes published

---

# Success Criteria

A deployment succeeds when

The application is stable.

Core features work as expected.

User data is secure.

Performance targets are met.

No critical regressions are introduced.

Users can complete the full BotDiff coaching workflow without interruption.
