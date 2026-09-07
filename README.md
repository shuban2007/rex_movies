# REX.io

REX.io is a premium cinematic movie discovery and streaming web application built with React, Vite, TypeScript, and Supabase.

## Architecture

The application follows a clean separation of concerns:
- **Discovery & Metadata**: The Movie Database (TMDB) API
- **Playback**: VidSrc.sbs Embeds
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
        TMDB Movie ID      User Session     VidSrc.sbs
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

## Features

- **Cinematic UI**: Premium dark mode design with glassmorphism effects.
- **Search & Discovery**: Browse trending, popular, and top-rated movies directly from TMDB.
- **Instant Playback**: Watch movies instantly via VidSrc embed.
- **Authentication**: Secure Google OAuth powered by Supabase.
- **Watchlist & History**: Persistent, per-user data isolated securely using Row Level Security (RLS).

## Environment Setup

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

## Expanding the Oxlint configuration

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
