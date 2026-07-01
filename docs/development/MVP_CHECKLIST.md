# BotDiff MVP Checklist

Version: 1.0

Status: Active

Priority: Critical

---

# Purpose

This document tracks the completion status of every feature required for the first public MVP of BotDiff.

A feature is only considered complete when it has been implemented, tested, documented, and verified in production (or staging for pre-launch).

---

# MVP Goal

A player should be able to:

1. Create an account
2. Link their Riot account
3. Import recent matches
4. Receive personalized AI coaching
5. Track long-term improvement
6. Complete coaching goals
7. Follow practice recommendations
8. Return after future games and see updated coaching

If all of these are possible, the MVP is considered complete.

---

# Authentication

## Account System

- [ ] User registration
- [ ] User login
- [ ] Logout
- [ ] Password reset
- [ ] Session persistence
- [ ] Protected routes

Status

Not Started

---

# Riot Integration

## Riot API

- [ ] Riot account lookup
- [ ] Riot ID linking
- [ ] Match history import
- [ ] Timeline import
- [ ] Champion mastery
- [ ] Ranked information
- [ ] Duplicate detection
- [ ] Manual refresh

Status

In Progress

---

# Database

## Core Tables

- [x] Users
- [x] Analyses
- [x] Player Traits
- [x] Goals
- [x] Progress Snapshots
- [x] Champion Pool

## Remaining

- [ ] Practice Sessions
- [ ] Coach Memory
- [ ] Goal History

Status

In Progress

---

# Match Analysis

- [ ] Match parser
- [ ] Timeline parser
- [ ] Metrics generation
- [ ] Event extraction
- [ ] Statistics storage

Status

Not Started

---

# Scoring Engine

- [ ] Mechanics scoring
- [ ] Laning scoring
- [ ] Vision scoring
- [ ] Macro scoring
- [ ] Positioning scoring
- [ ] Decision making scoring
- [ ] Overall grade
- [ ] Letter grades

Status

Not Started

---

# Player DNA

- [ ] Trait generation
- [ ] Habit detection
- [ ] Trend analysis
- [ ] Confidence scoring
- [ ] Champion tracking

Status

Not Started

---

# AI Memory

- [ ] Memory retrieval
- [ ] Memory updates
- [ ] Coaching history
- [ ] Goal history
- [ ] Repeated mistake detection

Status

Not Started

---

# Champion Knowledge

- [ ] Champion database
- [ ] Matchup knowledge
- [ ] Build recommendations
- [ ] Rune recommendations
- [ ] Coaching notes
- [ ] Patch versioning

Status

In Progress

---

# Coaching Pipeline

- [ ] Prompt assembly
- [ ] OpenAI integration
- [ ] Coaching report generation
- [ ] Report storage
- [ ] Dashboard updates

Status

Not Started

---

# Goal Engine

- [ ] Goal generation
- [ ] Goal tracking
- [ ] Goal replacement
- [ ] Progress calculation

Status

Not Started

---

# Practice System

- [ ] Drill assignment
- [ ] Difficulty scaling
- [ ] Champion drills
- [ ] Progress tracking

Status

Not Started

---

# Dashboard

- [ ] Player profile
- [ ] Match history
- [ ] AI reports
- [ ] Player DNA
- [ ] Goals
- [ ] Practice drill
- [ ] Progress charts
- [ ] Champion statistics

Status

In Progress

---

# Settings

- [ ] Riot account management
- [ ] Profile settings
- [ ] Theme
- [ ] Notification preferences

Status

Not Started

---

# Landing Page

- [ ] Final hero section
- [ ] Features
- [ ] Testimonials
- [ ] Pricing
- [ ] FAQ
- [ ] Footer

Status

In Progress

---

# Testing

- [ ] Unit tests
- [ ] Integration tests
- [ ] End-to-end tests
- [ ] Manual QA

Status

Not Started

---

# Beta Launch

Before inviting users

- [ ] Authentication complete
- [ ] Riot integration complete
- [ ] AI coaching functional
- [ ] Dashboard functional
- [ ] Goals working
- [ ] Practice system working
- [ ] Feedback collection enabled

Status

Not Started

---

# MVP Completion Criteria

The MVP is complete when:

- [ ] A new user can sign up
- [ ] Riot account links successfully
- [ ] Matches import automatically
- [ ] AI coaching is generated
- [ ] Reports are stored
- [ ] Dashboard updates correctly
- [ ] Player DNA evolves over time
- [ ] Goals update automatically
- [ ] Practice drills are assigned
- [ ] No critical bugs remain

---

# Future (Post-MVP)

These features are intentionally out of scope for the MVP:

- Live coaching
- Voice coaching
- Replay video analysis
- Team coaching
- Mobile app
- Desktop app
- Community features
- Coaching marketplace
- Tournament analysis
- Machine learning personalization

---

# Definition of MVP Complete

BotDiff reaches MVP when a player can continuously improve through an end-to-end coaching loop:

Play Match

↓

Import Match

↓

Analyze Gameplay

↓

Generate AI Coaching

↓

Update Player DNA

↓

Assign Goal

↓

Assign Practice

↓

Track Progress

↓

Repeat

This loop is the foundation of BotDiff and the minimum product required before expanding into advanced coaching features.
