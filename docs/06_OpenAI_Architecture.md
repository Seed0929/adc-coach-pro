# 06 — OpenAI Architecture (Future)

OpenAI is **not** implemented yet. This documents the target architecture so
that adding an API key later turns on live coaching with no redesign. The app
already ships the AI Provider abstraction and deterministic fallback.

## System Prompt

A single `MASTER_COACHING_PROMPT` defines the one BotDiff persona: a Challenger
ADC coach following this specific player over time. Prompts are never scattered
across the app.

## Player Context Builder

Serializes the Player Memory model (identity, skill grades, habits, focus,
trends, champion pool) into structured JSON for the request.

## Match Context Builder

Serializes the relevant match(es): metrics, timeline events, deaths,
objectives, economy. Only real data is included; nothing is invented.

## Memory Injection

Injects prior coaching history and the active focus so answers build on past
sessions instead of restarting each time.

## Question Router

Classifies the user's question into an analysis mode (lane, macro, teamfight,
champion mastery, consistency, decision-making) and gathers only the relevant
pillars and data for that mode.

## Coaching Generator

Assembles `MASTER_COACHING_PROMPT + context JSON + question` and calls the
active provider. Returns null on any failure so the deterministic engine can
answer instead.

## Practice Plan Generator

Produces measurable goals tied to the active focus, with success conditions.

## Match Report Generator

Produces the structured single-match report: overall grade, biggest strength,
biggest leak, evidence, one habit to fix, practice goals.

## Safety Rules

- Never invent statistics, events, or coaching history.
- Only use data present in the provided context.
- No generic advice unless evidence proves it's this player's biggest issue.
- Never blame teammates or matchmaking.
- Always explain what happened, why it matters, and what to do next.
- Always end with exactly one measurable next-game goal.

## Provider Layer

`resolveCoachProvider()` reads the key at call time. No key → `unavailableProvider`
(deterministic fallback). Key present → live provider. Swapping providers never
requires touching the rest of the app.

## Future MCP Support

Later, the coach can call tools via MCP (live Riot lookups, replay parsing,
patch data) through the same provider abstraction, keeping the persona and
context builders unchanged.