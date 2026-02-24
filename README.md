# Make It Happen Dashboard 🚀

A production-ready business dashboard for Herbalife distribution, built with Next.js 14, Supabase, and Tailwind CSS.

## Features

- **📊 Command Center** - Revenue, follow-ups, habits, goals overview
- **👥 CRM** - Client pipeline, interaction history, follow-up reminders  
- **💰 Sales Tracker** - Revenue charts, product breakdown, monthly tracking
- **📚 Knowledge Base** - Save URLs, YouTube videos, articles with auto-metadata
- **🎯 Goals & Habits** - Progress bars, streak tracking, daily habits
- **📅 Content Planner** - Weekly calendar, platform badges, status workflow

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS with Make It Happen brand
- **Charts:** Recharts
- **Icons:** Lucide React
- **Deployment:** Vercel

## Setup

### 1. Database Setup

Run the SQL in `src/lib/schema.sql` in your Supabase SQL Editor:
- Go to: https://supabase.com/dashboard/project/uldlxqyqmpjznmnokbjz/sql/new

Or visit `/setup` on the live site for a guided setup.

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key  
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run locally

```bash
npm install
npm run dev
```

## Brand Colors

- Burgundy: `#620E06`
- Green: `#425C59`
- Amber: `#D5CBBA`
- Platinum: `#E8E6E5`

## Live

- **Production:** https://dashboard-orpin-ten-16.vercel.app
- **GitHub:** https://github.com/arno-ockerman/dashboard
