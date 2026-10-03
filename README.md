# REX.io

REX.io is a premium cinematic movie discovery and streaming web application built with React, Vite, TypeScript, and Supabase.

## 🚀 Features

- **Cinematic UI**: Premium dark mode design with glassmorphism effects.
- **Search & Discovery**: Browse trending, popular, and top-rated movies directly from TMDB.
- **Instant Playback**: Watch movies and TV shows instantly via embedded streaming providers.
- **Authentication**: Secure Google OAuth powered by Supabase.
- **Watchlist & History**: Persistent, per-user data isolated securely using Row Level Security (RLS).
- **PWA Support**: Progressive Web App capabilities for mobile and desktop installability.

## 🛠 Tech Stack

- **Frontend Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: Vanilla CSS with modern features (variables, flexbox/grid)
- **Backend & Auth**: Supabase (PostgreSQL, GoTrue for Auth)
- **Data Providers**: The Movie Database (TMDB) API for metadata, various embed providers for playback

## 📁 Project Structure

A brief overview of the core codebase structure:

```text
REX.io/
├── public/                 # Static assets (icons, manifest, etc.)
├── supabase/               # Supabase configuration and migrations
└── src/
    ├── assets/             # Images and local static files
    ├── components/         # Reusable UI components organized by domain
    │   ├── layout/         # Header, Footer, Navbar
    │   ├── movies/         # Movie-related components (carousels, cards)
    │   ├── player/         # Video player components
    │   ├── search/         # Search bars and results
    │   ├── tv/             # TV show specific components
    │   └── ui/             # Generic UI elements (buttons, modals, spinners)
    ├── config/             # Application configurations
    ├── context/            # React Context providers (Auth, Theme)
    ├── hooks/              # Custom React hooks
    ├── pages/              # Route-level page components (Home, Watch, History)
    ├── services/           # External API integrations and core business logic
    │   ├── tmdb.ts         # TMDB API client
    │   ├── playback/       # Video playback providers logic
    │   └── history.ts / watchlist.ts / discoveryEngine.ts
    ├── styles/             # Global CSS and design system variables
    ├── types/              # Global TypeScript type definitions
    └── utils/              # Helper functions and utilities
```

## 🏗 Architecture

The application follows a clean separation of concerns:
- **Discovery & Metadata**: The Movie Database (TMDB) API
- **Playback**: Embedded streaming providers
- **Backend & Authentication**: Supabase (PostgreSQL + Auth)
- **Frontend**: React + Vite + TypeScript

```text
                    ┌──────────────────────┐
                    │       REX.io         │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
        TMDB Search       Supabase Auth     Movie Player
             │                 │                 │
             ▼                 ▼                 ▼
        TMDB Movie ID      User Session   Embed Providers
             │                 │
             │          ┌──────┴───────┐
             │          │              │
             │          ▼              ▼
             │      Watchlist       History
             │          │              │
             │          └──────┬───────┘
             │                 │
             └─────────────────▼
                         Supabase DB
                               │
                             RLS
```

## ⚙️ Environment Setup

1. Copy `.env.example` to `.env.local`
2. Add your **public** Supabase keys.

**Public Variables (Safe for Frontend):**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

**Server Secrets (NEVER expose to frontend):**
_Any Supabase Service Role or Secret Keys are strictly prohibited in the frontend codebase._

Please read [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for full backend configuration instructions.

## 🧹 Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
