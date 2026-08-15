# Sprint 5.11A — Homepage Foundation

Scope: public/unauthenticated homepage only. No changes to coaching logic, security, or database schema.

## What shipped
- `src/components/landing-page.tsx` — production homepage built entirely from existing app components (`CoachingCard`, `CardField`, `Pill`, `ChampionBackdrop`, `AppShell` primitives). Sections: top bar, hero, headline Today's Focus card, product preview, value points, closing CTA.
- Messaging: "Stats tell you what happened. BotDiff tells you what to do differently."
- Example data comes from `SAMPLE_PLAYER` and is clearly labeled "Example profile".
- `src/lib/player-data.tsx` — champion artwork now uses official Riot Data Dragon loading art (`championLoading`), no generated placeholders.
- `src/routes/auth.tsx` — validated `mode` search param; `?mode=signup` opens the signup state.
- `src/routes/index.tsx` — `/` renders `LandingPage` for guests and `DashboardInner` for authenticated players; route `head()` carries homepage title/description/OG metadata.

## Verification (headless Chromium, localhost:8080)
| Check | Result |
| --- | --- |
| `/` renders logged-out homepage | PASS — title "BotDiff — Personal League of Legends Coaching" |
| Single H1 with new positioning | PASS |
| "Get Started — Create Account" navigation | PASS — lands on `/auth?mode=signup` |
| Console errors on load | PASS — none |
| Mobile 390px layout | PASS — `scrollWidth` 390, no horizontal overflow |
| Production build | PASS |

## Out of scope / unchanged
Coaching engines, Player Memory, Riot timeline path, MFA, feedback system, RLS policies.
