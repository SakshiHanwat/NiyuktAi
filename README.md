# NIYUKTAi — AI-Powered Recruitment CRM

> **Vercel Zero to Agent Hackathon 2026** | Track 1 + Track 2  
> Built with Next.js + Supabase + Groq AI + Gmail MCP

---

## 💡 Problem Statement

Modern recruitment is broken. HR teams spend 60–80% of their time manually screening resumes, leading to:
- Slow hiring (2–4 weeks time-to-hire)
- Subjective decisions and implicit bias
- Skilled candidates getting rejected due to keyword mismatch
- Hiring pipeline scattered across Excel sheets and emails

---

## ✅ Solution

**NIYUKTAi** is an AI-powered Recruitment CRM with a single **Autonomous Agent** that:

1. 📄 **Parses** PDF resumes automatically
2. 🎯 **Scores** candidates against job descriptions (0–100)
3. 🧠 **Decides** — Shortlist / Hold / Reject
4. 📧 **Drafts & Sends** personalized emails via Gmail MCP
5. 📊 **Updates** the hiring pipeline automatically

**Zero manual work. Just drop a PDF.**

---

## 🏗️ Architecture

```
Resume PDF Upload
       ↓
  Extract Text (pdfreader)
       ↓
  Parse with Groq AI (llama-3.3-70b-versatile)
       ↓
  Score against Job Description
  Skills Match (35%) + Experience (25%) + Projects (20%) + Education (10%) + Relevance (10%)
       ↓
  Decision: Shortlist (>70) / Hold (50-70) / Reject (<50)
       ↓
  Draft Email (Groq AI)
       ↓
  Send via Gmail MCP
       ↓
  Pipeline Auto-Update + Dashboard Refresh
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) |
| UI | shadcn/ui + Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth |
| File Storage | Supabase Storage |
| AI Model | Groq (llama-3.3-70b-versatile) — Free |
| PDF Parsing | pdfreader |
| Email | Gmail MCP (Vercel AI Gateway) |
| Deployment | Vercel |

---

## ✨ Features

### 🤖 Autonomous AI Agent
- Single pipeline: Upload → Parse → Score → Decide → Email
- No manual intervention required
- Every step logged in `agent_logs` table

### 📊 Dashboard
- Real-time recruitment metrics
- Pipeline funnel visualization
- Recent candidates with AI scores

### 💼 Jobs Management
- Create and manage job postings
- Candidates auto-matched to jobs
- Score breakdown per job

### 👥 Candidates
- AI-parsed profiles from PDF resumes
- Score breakdown (Skills, Experience, Projects, Education, Relevance)
- Skill gap analysis
- Stage tracking (Applied → Screened → Shortlisted → Interview → Offer)

### 📋 Pipeline (Kanban)
- Visual candidate pipeline
- Stage-wise candidate count
- Real-time updates

### 🔍 Compare
- Side-by-side candidate comparison
- AI recommendation on best fit

### 📧 Email Assistant
- AI-drafted emails (Shortlist, Interview, Rejection, Offer)
- Gmail MCP integration
- Email history tracking

### ⚖️ Bias Audit
- Flags potential bias in hiring decisions
- Complete audit trail with AI reasoning

---

## 🗄️ Database Schema

```sql
profiles          -- User profiles (auto-created on signup)
jobs              -- Job postings
candidates        -- Parsed candidate profiles
ai_analysis       -- AI scoring breakdown per candidate
email_logs        -- Email draft and send history
agent_logs        -- Autonomous agent activity log
mcp_connections   -- Gmail/Calendar MCP connection status
```

---

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- pnpm
- Supabase account
- Groq API key (free)

### Installation

```bash
# Clone the repository
git clone https://github.com/SakshiHanwat/NiyuktAi.git
cd NiyuktAi

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Groq AI (Free)
GROQ_API_KEY=your_groq_api_key

# Gmail MCP
GMAIL_MCP_SERVER_URL=https://mcp-gmail.vercel.app/connect
VERCEL_AI_GATEWAY_API_KEY=your_vercel_gateway_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Database Setup

Run this SQL in Supabase SQL Editor:

```sql
-- See /supabase/schema.sql for complete schema
```

### Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔌 MCP Integration

NIYUKTAi uses **Gmail MCP** via Vercel AI Gateway:

- **Gmail MCP** — Draft and send recruitment emails
- **Google Calendar MCP** — Schedule interview slots (coming soon)

MCP servers are connected through the Settings page at `/settings`.

---

## 📁 Project Structure

```
NiyuktAi/
├── app/
│   ├── (app)/              # Protected app routes
│   │   ├── dashboard/      # Overview & metrics
│   │   ├── jobs/           # Job management
│   │   ├── candidates/     # Candidate profiles
│   │   ├── pipeline/       # Kanban pipeline
│   │   ├── upload/         # Resume upload + AI agent
│   │   ├── compare/        # Candidate comparison
│   │   ├── emails/         # Email assistant
│   │   ├── bias/           # Bias audit
│   │   └── agents/         # Autonomous agent dashboard
│   ├── api/
│   │   ├── upload-resume/  # PDF upload + AI pipeline
│   │   ├── jobs/           # Jobs CRUD
│   │   ├── draft-email/    # AI email generation
│   │   ├── send-email/     # Gmail MCP send
│   │   └── autonomous-agent/ # Full agent pipeline
│   └── auth/               # Auth routes
├── components/
│   ├── app/                # App-specific components
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── ai/
│   │   ├── groq.ts         # Groq AI client
│   │   └── prompts.ts      # AI prompts & agent logic
│   ├── pdf/
│   │   └── parse.ts        # PDF text extraction
│   └── supabase/           # Supabase clients
└── proxy.ts                # Next.js middleware (auth guard)
```

---

## 🎯 AI Scoring Formula

```
Final Score = 
  Skills Match    × 0.35  (keyword matching against JD)
  Experience      × 0.25  (years vs required)
  Projects        × 0.20  (number of relevant projects)
  Education       × 0.10  (degree/qualification)
  Relevance       × 0.10  (job title match)

Score > 70  → Shortlist ✅
Score 50-70 → Hold ⏳  
Score < 50  → Reject ❌
```

---

## 👩‍💻 Built By

**Sakshi Hanwat** 

---

## 📄 License

MIT License — feel free to use and modify!
---
> *Reducing manual screening by 70%, removing bias, making the best candidate obvious.*
