# AI Pipeline

Version: 1.0

---

# Goal

Transform Riot match data into personalized ADC coaching.

The pipeline should be deterministic, explainable, and repeatable.

---

# Step 1 — User Authentication

User signs into BotDiff.

↓

BotDiff identifies the user.

---

# Step 2 — Riot Account

User connects Riot ID.

Game Name

Tag Line

Region

↓

Retrieve PUUID.

---

# Step 3 — Match Import

Download recent ranked games.

Store raw Riot data.

No AI yet.

---

# Step 4 — Metric Extraction

Calculate coaching metrics.

Examples:

CS at 10

CS at 15

Gold Difference

Deaths Before Objectives

Kill Participation

Vision Score

Damage Share

First Death Time

---

# Step 5 — Pattern Detection

Look for recurring habits.

Examples

Late recalls

Overextending

Poor positioning

Weak farming

Late objective rotations

---

# Step 6 — Player Model Update

Update long-term player profile.

Track:

Strengths

Weaknesses

Recurring habits

Champion trends

Rank progress

---

# Step 7 — AI Analysis

Generate coaching report.

Inputs:

Match metrics

Player model

ADC framework

Coach philosophy

Outputs:

Overall Grade

Skill Breakdown

Biggest Win

Biggest Leak

LP Impact

Win Condition

Next Game Goal

---

# Step 8 — Dashboard

Save report.

Update graphs.

Update practice goals.

Display improvements.

---

# Success

Every analyzed match should make the Player Model smarter.

BotDiff should become a better coach after every game.
