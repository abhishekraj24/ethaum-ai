# ⬡ EthAum.ai — Enterprise AI SaaS Marketplace Intelligence

> **The only AI-powered marketplace combining Product Hunt + G2 + Gartner + AppSumo — purpose-built for Series A–D startups.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)](https://postgresql.org)
[![Groq](https://img.shields.io/badge/AI-Groq%20Llama%203.3-orange)](https://console.groq.com)

---

## 🎯 What is EthAum.ai?

EthAum.ai is an AI-driven SaaS intelligence platform targeting enterprise buyers, VCs, and Series A–D startups ($1M–$50M ARR). It unifies four major platforms into one intelligence layer:

| Platform | Capability | EthAum.ai |
|---|---|---|
| 🚀 Product Hunt | Launch + Upvotes + Trending | ✅ Trending algorithm + upvote system |
| ⭐ G2 | Enterprise Reviews + Scoring | ✅ Multi-factor ECI scoring engine |
| 📊 Gartner | Market Quadrant + Intelligence | ✅ Visual quadrant map + AI reports |
| ⚡ AppSumo | Deals + Early Access | ✅ Deal badges + early access system |

---

## 🧠 Enterprise Confidence Index (ECI)

EthAum's proprietary scoring model — not a simple average:

```
ECI = BaseScore + AdoptionBoost + ReviewConfidence

BaseScore        = Weighted avg of ROI, Scalability, Security, Integration (0–75)
AdoptionBoost    = min(upvotes × 1.5, 15)    → max 15 pts
ReviewConfidence = min(reviewCount × 2, 10)  → max 10 pts
Final ECI        = capped at 100
```

### Market Quadrant Logic
| Position | Criteria |
|---|---|
| 🏆 Leader | ECI ≥ 70 AND Upvotes ≥ 5 |
| 🔭 Visionary | ECI ≥ 70 AND Upvotes < 5 |
| ⚡ Challenger | ECI < 70 AND Upvotes ≥ 5 |
| 🌱 Emerging | ECI < 70 AND Upvotes < 5 |

---

## ✨ Features

### Core Platform
- **ECI Scoring Engine** — multi-signal AI credibility index
- **Market Quadrant Map** — visual 2×2 Gartner-style scatter plot
- **Trending Algorithm** — `TrendingScore = (upvotes × 2) + (reviews × 5)`
- **VC Dashboard** — portfolio-grade table with all intelligence metrics
- **ECI History Timeline** — sparkline tracking ECI changes over time
- **Early Access / Deals** — AppSumo-style deal system with badges
- **PDF Export** — one-click professional due diligence PDF

### AI Features (Powered by Groq Llama 3.3 70B)
- **🤖 AI Review Summarizer** — executive paragraph from all enterprise reviews
- **📋 AI Due Diligence Report** — full investor-grade report generated in seconds
- **⚔️ AI Competitor Auto-Compare** — auto-finds nearest competitor and compares
- **⚡ AI Intelligence Feed** — Bloomberg-style daily market briefing
- **💬 AI Chat Assistant** — conversational analyst for any SaaS query

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| AI Engine | Groq — Llama 3.3 70B |
| Styling | Premium dark theme (inline React styles) |
| Config | dotenv + CORS |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ → https://nodejs.org
- PostgreSQL running locally (port 5432)
- Free Groq API key → https://console.groq.com

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:
```
DB_USER=postgres
DB_HOST=localhost
DB_NAME=ethaum_ai
DB_PASSWORD=your_postgres_password
DB_PORT=5432
GROQ_API_KEY=your_groq_key_here
```

```bash
node server.js
```

### 2. Initialize Database

Open in browser:
```
http://localhost:5000/init      ← Creates all tables
http://localhost:5000/migrate   ← Adds new columns + eci_history table
```

### 3. Seed Sample Data

```bash
node seed.js
```

Loads 10 realistic Series A–D startups with reviews, upvotes, and deals.

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — EthAum.ai is live.

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/startups` | All startups with review counts |
| GET | `/startups/trending` | Top 5 by trending score |
| POST | `/startups` | Create new startup listing |
| POST | `/startups/:id/upvote` | Upvote a startup |
| GET | `/startups/:id/score` | ECI + quadrant + all metrics |
| GET | `/startups/:id/eci-history` | ECI timeline for sparkline |
| GET | `/startups/:id/ai-summary` | AI review summary (Groq) |
| GET | `/startups/:id/due-diligence` | Full AI investor report (Groq) |
| GET | `/startups/:id/auto-compare` | AI competitor analysis (Groq) |
| POST | `/reviews` | Submit enterprise review |
| POST | `/ai/compare` | Manual head-to-head comparison |
| POST | `/ai/chat` | Conversational AI assistant |
| GET | `/ai/intelligence-feed` | AI market briefing (Groq) |
| GET | `/migrate` | Run DB migration |
| GET | `/init` | Initialize tables |

---

## 📁 Project Structure

```
Ethaum/
├── backend/
│   ├── server.js      ← Express API + ECI engine + all AI routes
│   ├── db.js          ← PostgreSQL connection pool
│   ├── seed.js        ← Sample data loader (10 startups)
│   ├── .env           ← DB credentials + Groq API key
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx    ← Full UI: marketplace, dashboard, quadrant, AI tabs
    │   └── main.jsx
    └── package.json
```

---

## 🔮 Future Roadmap

### Q1 2026 — Authentication & Profiles
- Founder authentication — claim and manage startup profiles
- VC firm accounts with private portfolio dashboards
- Startup verified badge after identity verification
- Email alerts for ECI score changes and new reviews

### Q2 2026 — Advanced Intelligence
- Web-search-grounded due diligence (GPT-4o + live data)
- Crunchbase + PitchBook API integration for funding history
- Automated weekly ECI briefings emailed to founders
- AI deal-matching engine — connects buyers with best-fit startups

### Q3 2026 — Enterprise & VC Tools
- CRM integrations — push deals to Salesforce, HubSpot, Affinity
- Custom private marketplaces for individual VC funds
- White-label offering for accelerators and corporate VC arms
- Investor match score — AI ranks best-fit VCs for each startup

### Q4 2026 — Scale & Monetization
- Freemium model: $499/mo for VC firms, $199/mo for enterprise buyers
- EthAum Intelligence API — sell ECI data to third-party platforms
- Mobile app (iOS + Android)
- 10+ language internationalization for global markets

---

## 💡 Why EthAum.ai Wins

Most marketplaces show you **what** a product does.
EthAum.ai tells you **whether to trust it** — with quantified confidence,
market positioning, adoption trajectory, AI due diligence, and deal access
in one unified intelligence surface.

**This is the infrastructure layer that Series A–D SaaS has been missing.**

---

## 📧 Submission

**Hackathon:** Building AI SaaS Marketplace — EthAum Venture Partners
**Team:** [Your Name]
**Email:** [Your Email]
**GitHub:** [Your Repository URL]
**Demo Video:** [Your Loom Link]
**Date:** February 28, 2026
