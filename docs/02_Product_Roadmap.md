# 02 — Product Roadmap

BotDiff grows in stages. Every stage keeps ADC as the flagship, most-polished
implementation. New roles reuse the same coaching engine, memory model, and UI.

## Private Alpha

Goal: prove the coaching loop feels personal.

- Email auth + protected dashboard.
- Riot account connection and ranked match import.
- Deterministic coaching engine (behavior engine + player memory).
- Single Master Coaching Prompt and AI Provider layer (fallback only).
- Coach page: proactive briefing, Quick Ask, follow-up questions.
- ADC only. Invite-gated. Manual sync.

## Version 1.0

Goal: reliable personal coach for ADC.

- Live OpenAI integration behind the AI Provider layer (key added, no redesign).
- Player Memory persisted across sessions.
- Match History with per-match evidence.
- Champion analysis for the ADC pool.
- Practice goals with completion tracking.
- Four UI themes, settings, profile.

## Version 1.5

Goal: depth and retention.

- Coaching timeline and progress history.
- Weekly reports and daily coaching briefings.
- Matchup library (ADC vs ADC).
- Goal engine with streak-based focus rotation.
- Premium tier launch (see 07_Monetization).

## Version 2.0

Goal: platform.

- Replay-driven coaching ("Replay This Match", Challenger Perspective).
- Draft and build coaching.
- Team composition analysis.
- MCP / tool-augmented AI coaching.
- Live Riot sync (near-real-time after games).

## Role Expansion

ADC remains the flagship reference implementation. Roles are added in order,
each reusing the shared engine:

1. ADC (flagship — deepest champion knowledge, matchup library).
2. Support.
3. Mid.
4. Jungle.
5. Top.

Each new role ships: role-specific pillars weighting, champion knowledge, and
matchup data — but never a separate coaching architecture.