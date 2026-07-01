# BotDiff API Specification

Version: 1.0

---

# Purpose

This document defines every API endpoint required for the BotDiff MVP.

The frontend, backend, and AI pipeline should all follow this contract.

---

# Authentication

## POST /auth/signup

Creates a new user.

Response

- User ID
- Email

---

## POST /auth/login

Signs a user in.

Response

- Session
- User

---

## POST /auth/logout

Ends the current session.

---

# Riot Account

## POST /riot/connect

Input

- Game Name
- Tag Line
- Region

Output

- PUUID
- Riot Account Saved

---

## GET /riot/matches

Returns recent ranked matches.

Output

- Match List

---

## GET /riot/match/{matchId}

Returns detailed match data.

---

# Analysis

## POST /analysis/start

Input

- Match ID

Output

- Analysis ID
- Status

---

## GET /analysis/{id}

Returns completed AI coaching report.

Response

- Grade
- Biggest Strength
- Biggest Leak
- Practice Goal
- Summary

---

# Player

## GET /player/profile

Returns

- Current Focus
- Average Grade
- Strengths
- Weaknesses
- Champion Stats

---

## GET /player/history

Returns previous coaching reports.

---

# Dashboard

## GET /dashboard

Returns

- Recent Matches
- Current Practice Goal
- Latest Report
- Average Grade

---

# Error Responses

400

Bad Request

401

Unauthorized

404

Not Found

500

Internal Server Error

---

# MVP Rule

Every endpoint must return consistent JSON.

The frontend should never need to guess the response format.
