# BotDiff Component Guidelines

Version: 0.1

Status: Active

---

# Purpose

This document defines the standards for building React components throughout BotDiff.

Every UI element should follow these guidelines to ensure consistency, maintainability, accessibility, and reusability.

---

# Philosophy

Components should be:

- Small
- Reusable
- Predictable
- Accessible
- Easy to test

A component should have one clear responsibility.

---

# Component Hierarchy

Pages

↓

Layouts

↓

Sections

↓

Components

↓

UI Elements

---

# Folder Structure

```
src/

components/

ui/

dashboard/

matches/

reports/

goals/

profile/

settings/

common/
```

Each folder groups components by feature.

---

# Component Naming

Use PascalCase.

Good

```
PlayerCard.tsx

MatchHistory.tsx

AnalysisReport.tsx

GoalTracker.tsx
```

Avoid

```
playercard.tsx

Card1.tsx

temp.tsx
```

---

# Component Size

Recommended

Under 200 lines

Maximum

300 lines

If a component exceeds this size, split it into smaller components.

---

# Props

Always define explicit interfaces.

Example

```tsx
interface PlayerCardProps {
playerName: string;
rank: string;
score: number;
}
```

Avoid using `any`.

---

# State Management

Keep state local whenever possible.

Use global state only for:

- Authentication
- User Profile
- Theme
- Active Riot Account

Avoid unnecessary prop drilling.

---

# Hooks

Custom hooks belong in

```
src/hooks/
```

Examples

```
usePlayerProfile()

useMatchHistory()

useChampionStats()

useGoals()

useAnalysis()
```

Hooks should only manage logic, never UI.

---

# Styling

Use Tailwind CSS.

Prefer utility classes.

Avoid inline styles unless absolutely necessary.

Reuse design tokens for:

- Colors
- Spacing
- Typography
- Border radius

---

# Loading States

Every async component must support loading.

Example

```
Loading Match History...

Loading Analysis...

Generating Coaching Report...
```

Use skeleton loaders when appropriate.

---

# Error States

Every async component must gracefully handle errors.

Example

```
Unable to load recent matches.

Retry
```

Avoid blank screens.

---

# Empty States

Every list should define an empty state.

Example

```
No matches analyzed yet.

Import your first match to begin coaching.
```

---

# Accessibility

All interactive elements must support:

Keyboard navigation

Focus states

ARIA labels where appropriate

Screen reader compatibility

Color should never be the only indicator.

---

# Dashboard Components

Examples

```
PerformanceCard

RecentMatches

ChampionPool

GoalProgress

RankCard

PerformanceTrend

ImprovementFocus

WeeklySummary
```

Each widget should function independently.

---

# Match Components

Examples

```
MatchHeader

BuildPanel

RunePanel

Timeline

VisionMap

ObjectiveBreakdown

TeamfightSummary

MistakeList
```

---

# Report Components

Examples

```
OverallGrade

CategoryScores

StrengthList

WeaknessList

PracticeDrill

NextGameGoal

CoachSummary
```

---

# AI Components

Examples

```
CoachChat

ReplayNotes

PracticeRecommendations

LearningProgress

ImprovementHistory
```

---

# Modal Guidelines

Modals should be used only for:

Settings

Confirmations

Account Linking

Goal Creation

Avoid nesting modals.

---

# Forms

Every form should include:

Validation

Helpful error messages

Loading state

Success feedback

Never rely solely on browser validation.

---

# Performance

Avoid unnecessary re-renders.

Use memoization when appropriate.

Lazy load heavy components.

Paginate large datasets.

Virtualize long lists.

---

# Responsive Design

Support:

Desktop

Tablet

Mobile

Design mobile-first.

---

# Reusability

Before creating a component, ask:

Can this be reused elsewhere?

If yes, place it inside:

```
components/common/
```

or

```
components/ui/
```

---

# Documentation

Every complex component should include:

Purpose

Props

Dependencies

Usage example

Future improvements

---

# Testing

Components should be tested for:

Rendering

Loading

Error state

Empty state

User interaction

Accessibility

---

# Definition of Done

A component is complete when:

✓ Typed

✓ Responsive

✓ Accessible

✓ Error handled

✓ Loading handled

✓ Empty state handled

✓ Reusable

✓ Documented

✓ Matches the design system

The UI should feel cohesive across every page in BotDiff.
