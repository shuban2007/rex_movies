# REX.io — Complete Project Context & Architecture Guide

> **Single Source of Truth** for the REX.io codebase. This document outlines the application architecture, modules, security mechanisms, data flows, and configuration rules for developers and AI agents.

---

## 1. Project Overview & Vision

**REX.io** is a high-performance, cinematic movie and TV streaming web application. It combines metadata discovery powered by **The Movie Database (TMDB)** with instant video playback delivered via embed providers.

### Core Product Principles:
- **Premium OTT Aesthetics:** Dark mode theme (`#07070b`), subtle ambient lighting gradients, glassmorphism, responsive carousels, and mobile-optimized layouts inspired by Netflix and Apple TV+.
- **Zero-Barrier Guest Mode:** Users can browse, search, build a personal watchlist, and track their watch progress immediately without mandatory registration or login friction.
- **Provider Shield & Ad Resilience:** Third-party embed streams often inject popups or redirects. REX.io deploys a specialized `ProviderShield` sandbox and parent-page monitoring system alongside ad-blocker guidance to protect user experience.
- **PWA-First:** Built as an installable Progressive Web App with offline app shell caching, standalone display modes, and custom splash screens.

---

## 2. Technology Stack

| Layer | Technologies | Purpose / Notes |
| :--- | :--- | :--- |
| **Core Framework** | React 19 (`react`, `react-dom`) | Functional components, hooks, concurrent rendering |
| **Build Tool & Dev Server**| Vite 8 (`vite`, `@vitejs/plugin-react`) | Ultra-fast HMR, custom API middleware plugin |
| **Language** | TypeScript 6 (~6.0.2) | Strict type-safety across client and API proxy |
| **Routing** | React Router v7 (`react-router-dom`) | Client-side routing with deep-link support |
| **Styling** | Vanilla CSS (Variables, Flexbox/Grid) | Handcrafted design system, zero Tailwind dependency |
| **Search & Discovery** | Fuse.js (`fuse.js`) + Custom Intent NLP | Fuzzy matching, multi-parameter parsing, spelling correction |
| **Metadata Source** | TMDB (The Movie Database API v3/v4) | Movie/TV metadata, credits, genres, backdrops, posters |
| **Backend / Auth / DB** | Supabase (PostgreSQL + GoTrue Auth) | RLS-secured user persistence for Watchlist and History |
| **PWA & Caching** | `vite-plugin-pwa` (Workbox) | Service worker, runtime image caching, web app manifest |
| **Testing** | Vitest (`vitest`) | Unit and integration testing for engines and playback |
| **Linter** | Oxlint (`oxlint`) | Blazing fast Rust-based linter |

---

## 3. Repository Directory Structure

```text
REX.io/
├── api/                             # Serverless backend functions (Vercel / Production)
│   └── tmdb.ts                      # Secure TMDB API proxy (hides read token)
├── public/                          # Static assets (favicons, PWA icons, manifest)
├── supabase/                        # Database migrations and backend setup
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_update_media_schema.sql
│       ├── 003_fix_history_uniqueness.sql
│       └── 004_complete_backend_setup.sql
├── src/
│   ├── assets/                      # Static icons, logos (REX_Logo.png, TelegramLogo.png)
│   ├── components/
│   │   ├── AdBlockerNotice.tsx      # Ad-blocker guidance popup and banner
│   │   ├── ScrollToTop.tsx          # Resets window scroll on route change
│   │   ├── common/                  # Reusable widgets (e.g., TelegramButton)
│   │   ├── hero/                    # Hero spotlight movie component
│   │   ├── layout/                  # Header (navbar/search), Footer
│   │   ├── movies/                  # MovieCard, MovieRow, LazyMovieRow, WatchRandomModal
│   │   ├── player/                  # VideoPlayer (iframe wrapper, provider switcher)
│   │   ├── pwa/                     # InstallButton
│   │   ├── recommendations/         # RecommendationSection ("You might also like")
│   │   ├── search/                  # MovieSearch dropdown & search input
│   │   ├── tv/                      # EpisodeList, Season dropdown
│   │   └── ui/                      # ConfirmModal, CustomSelect, SplashScreen
│   ├── config/
│   │   ├── homeSections.ts          # 41 curated Home feed sections (Trending, Anime, Genres)
│   │   ├── watchRandomCompatibility.ts # Mood-to-genre translation matrices
│   │   └── watchRandomConfig.ts     # Eras, runtime, and rating presets for Watch Random
│   ├── context/
│   │   ├── GuestStoreContext.tsx    # Watchlist & History state manager (localStorage + custom events)
│   │   └── PWAContext.tsx           # Install prompt lifecycle manager
│   ├── hooks/
│   │   ├── useGuestStore.ts         # Hook to access watchlist & history state
│   │   ├── usePersistentState.ts    # localStorage synced React state hook
│   │   └── usePWA.ts                # Hook to interact with PWA installation
│   ├── pages/
│   │   ├── HistoryPage.tsx          # Watch history with progress bars & deletion
│   │   ├── HomePage.tsx             # Main discovery feed (Hero + LazyMovieRows)
│   │   ├── LegalPages.tsx           # Privacy, Cookies, Terms of Service
│   │   ├── NotFoundPage.tsx         # 404 page
│   │   ├── SearchResultsPage.tsx    # Dedicated search with filters & intent chips
│   │   ├── WatchPage.tsx            # Unified movie & TV series playback view
│   │   └── WatchlistPage.tsx        # Saved favorites management
│   ├── services/
│   │   ├── discoveryEngine.ts       # NLP search intent, fuzzy matching, Watch Random logic
│   │   ├── history.ts               # Local/remote history management & progress tracking
│   │   ├── providerShield.ts        # Iframe sandbox security matrix & popup mitigation
│   │   ├── tmdb.ts                  # Client TMDB API client with in-memory LRU caching
│   │   ├── watchlist.ts             # Local/remote watchlist storage operations
│   │   └── playback/
│   │       └── provider.ts          # Embed provider registry, priority ranking, URL builders
│   ├── types/
│   │   └── database.ts              # TypeScript schemas for Supabase tables
│   ├── utils/
│   │   └── imageUrl.ts              # TMDB poster and backdrop CDN URL formatter
│   ├── App.tsx                      # Root routes, mobile navigation, global banners
│   ├── config.ts                    # Application metadata constants and default provider URLs
│   ├── index.css                    # Design tokens, global resets, mobile safety
│   └── main.tsx                     # React DOM entrypoint with GuestStoreProvider
├── vite.config.ts                   # Vite config, dev API middleware, Workbox PWA caching
└── context.md                       # This file
```

---

## 4. Architectural Deep Dives & Core Modules

### 4.1. Video Playback & Streaming Architecture

Video playback is handled in `src/components/player/VideoPlayer.tsx` powered by provider configurations in `src/services/playback/provider.ts` and security policies in `src/services/providerShield.ts`.

#### Streaming Providers:
Streaming providers generate iframe URLs based on TMDB ID, Season, and Episode:
- **CineSrc** (`cinesrc-movie`, `cinesrc-tv`): Default primary provider (Priority 1). Supports playback events and sandboxing.
- **VidCore** (`vidcore-movie`, `vidcore-tv`): Ad-free secondary provider with custom theme support.
- **FilmU** (`filmu-movie`, `filmu-tv`): High-availability fallback.
- **VidRift** (`vidrift-movie`, `vidrift-tv`): Branded embed stream.
- **Vidy** (`vidy-movie`, `vidy-tv`): Supports timestamp resume (`?progress=...`).
- **Cinevids** (`cinevids-movie`): Disabled fallback provider.

#### Provider Shield & Security Sandboxing:
To prevent rogue embed iframes from redirecting the user or spamming popups:
- `getProviderShieldConfig(providerId)` specifies sandbox flags.
- **Strict Sandbox:** `allow-scripts allow-same-origin allow-presentation allow-forms` (Notice: `allow-popups` and `allow-top-navigation` are deliberately omitted).
- Providers that break under strict sandboxes (e.g., FilmU requiring specific cookies/popups) are flagged with `supportsSandbox: false` and render as unsandboxed iframes with window blur/focus event monitors.

---

### 4.2. TMDB Proxy & Metadata Service

To prevent exposing the `TMDB_API_READ_ACCESS_TOKEN` in the browser bundle, all TMDB communication goes through a server-side proxy.

- **Production:** `api/tmdb.ts` runs as a Vercel serverless function handling all `/api/*` routes.
- **Development:** `vite.config.ts` includes `apiPlugin()` middleware replicating the exact same serverless routes locally.

#### Proxy Endpoints:
1. `GET /api/section?path=/discover/movie&type=movie`: Fetches curated section contents.
2. `GET /api/search-movies?q={query}&page={page}`: Movie title search.
3. `GET /api/search-multi?q={query}&page={page}`: Multi-search (movies + TV series).
4. `GET /api/search-person?q={query}&page={page}`: Actor/Director search.
5. `GET /api/movie/{id}`: Detailed movie information with append-to-response keywords & recommendations.
6. `GET /api/tv/{id}`: Detailed TV series overview with seasons list.
7. `GET /api/tv/{id}/season/{seasonNumber}`: Full episode list for a season.

#### Client Caching & Deduplication (`src/services/tmdb.ts`):
- **LRUCache:** In-memory bounded cache holding up to 200 items with a 5-minute TTL.
- **In-flight Deduplication (`pendingRequests`):** If multiple components (e.g. Hero and Row 0) request the same key simultaneously, they share the same pending network promise.
- **Safe Abort Controllers:** Uses `withAbortSignal` to cancel component listener callbacks on unmount without killing the background cached fetch for other components.

---

### 4.3. Discovery Engine & Natural Language Search (`discoveryEngine.ts`)

A 45KB proprietary search and recommendation module featuring:
1. **Natural Language Intent Parsing:**
   - Detects genres (e.g., "action comedy" -> extracts genre IDs 28 & 35).
   - Detects release years and decades (e.g., "90s sci-fi" -> 1990–1999 + genre 878).
   - Detects content type flags (movies vs. TV series vs. anime).
   - Generates interactive **Intent Chips** allowing users to toggle filters on the search page.
2. **Fuzzy Search & Typo Correction ("Did You Mean"):**
   - Utilizes `Fuse.js` with weighted scoring across title, original title, and transliterations.
   - Proposes closest match suggestions for misspellings.
3. **Watch Random Matcher:**
   - Evaluates combinations of **Mood** (e.g., "Mind-bending", "Adrenaline Rush", "Cozy Evening"), **Era** (Classic, Modern, Golden Age), **Runtime**, and **Rating** against TMDB discover parameters.

---

### 4.4. Home Feed & Lazy Loading System

The Home page features **41 categorized sections** defined in `src/config/homeSections.ts`:
- Hero Spotlight + Trending Movies & TV
- Anime Showcase (Trending Anime, Top Rated Anime, Sci-Fi Anime)
- 17 Movie Genres (Action, Sci-Fi, Horror, Comedy, Drama, etc.)
- 9 TV Genres
- Highest Rated Classics & Timely Releases (Now Playing, Upcoming)

#### Lazy Loading Mechanics:
- `LazyMovieRow.tsx` defers fetching section data using an `IntersectionObserver`.
- While unloaded, 6 animated skeleton cards are displayed.
- Each `MovieCard.tsx` contains an `<img loading="lazy" decoding="async">` with responsive `srcSet` (`w185`, `w342`, `w500`).
- *Note:* Performance optimization is actively tuned by increasing `rootMargin` so sections pre-render before scrolling into view.

---

### 4.5. Guest Mode & Storage Architecture

REX.io supports both **Guest Users** and **Authenticated Users**:
1. **Guest Mode (Default):**
   - Stored in `localStorage` keys: `rexio_watchlist` and `rexio_watch_history`.
   - React state synchronized across tabs using the `storage` event.
   - Synchronized across the same tab using custom window events: `watchlist-updated` and `history-updated`.
2. **Supabase Cloud Sync (Authenticated):**
   - When a user logs in via Supabase Auth, client services (`src/services/watchlist.ts` and `src/services/history.ts`) can sync local guest data up to the PostgreSQL database.
   - Database operations are protected by Row Level Security (`auth.uid() = user_id`).

---

### 4.6. Progressive Web App (PWA) & Offline Strategy

Configured in `vite.config.ts` using `vite-plugin-pwa` (Workbox):
- **App Shell:** HTML, JS, CSS, and local icons are pre-cached for instant offline launching.
- **Google Fonts Cache:** `CacheFirst` strategy with 1-year expiration.
- **TMDB Image Cache:** `StaleWhileRevalidate` strategy for `https://image.tmdb.org/*` caching up to 200 poster/backdrop images for 30 days.
- **API Exclusions:** All `/api/*` endpoints strictly bypass the service worker to prevent serving stale metadata or streaming links.

---

## 5. Database Schema & Supabase Setup

Located in `supabase/migrations/`:
- **`watchlist` Table:**
  - `id` (UUID, primary key)
  - `user_id` (UUID, references `auth.users`)
  - `tmdb_id` (INTEGER)
  - `media_type` (TEXT: `'movie'` | `'tv'`)
  - `created_at` (TIMESTAMPTZ)
  - *Unique Constraint:* `(user_id, tmdb_id, media_type)`
- **`watch_history` Table:**
  - `id` (UUID, primary key)
  - `user_id` (UUID, references `auth.users`)
  - `tmdb_id` (INTEGER)
  - `media_type` (TEXT: `'movie'` | `'tv'`)
  - `season` (INTEGER, nullable)
  - `episode` (INTEGER, nullable)
  - `progress` (DOUBLE PRECISION, seconds watched)
  - `duration` (DOUBLE PRECISION, total runtime seconds)
  - `last_provider` (TEXT, e.g. `'cinesrc-movie'`)
  - `updated_at` (TIMESTAMPTZ)
  - *Unique Constraint:* `(user_id, tmdb_id, media_type, season, episode)`

All tables have RLS enabled with SELECT, INSERT, UPDATE, and DELETE policies bound to `auth.uid() = user_id`.

---

## 6. Styling & Design Tokens

Defined in `src/index.css` and scoped component CSS files:
```css
:root {
  --bg-primary: #07070b;                     /* Deep cinematic black */
  --bg-secondary: #0f0f15;                   /* Elevated card background */
  --text-primary: #ffffff;                   /* High contrast text */
  --text-secondary: rgba(240, 240, 245, 0.7);/* Muted secondary copy */
  --accent: #e50914;                         /* Streaming crimson red */
  --glass-bg: rgba(7, 7, 11, 0.7);          /* Glassmorphism panels */
}
```

- Typography uses `Inter, system-ui, sans-serif`.
- Cards maintain a 2:3 aspect ratio (`aspect-ratio: 2 / 3`).
- Mobile styles utilize horizontal scroll carousels with `-webkit-overflow-scrolling: touch`.

---

## 7. Environment Variables Reference

Create a `.env` or `.env.local` file in the root directory:

```env
# ── TMDB API Read Token (Bearer) ──────────────────────────
# Required for serverless proxy in /api/tmdb.ts and dev server plugin in vite.config.ts
TMDB_API_READ_ACCESS_TOKEN=your_tmdb_v4_read_access_token_here

# ── Supabase Configuration (Optional for Guest Mode) ─────
# Required for remote database authentication and cloud syncing
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

---

## 8. Development & Build Scripts

```bash
# Start local development server with Vite API proxy middleware
npm run dev

# Run Vitest test suite
npm test

# Run Oxlint for code quality and static checks
npm run lint

# Compile TypeScript and build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 9. Important Conventions & Rules for AI Agents

1. **Preserve Vanilla CSS:** Do not introduce Tailwind utility classes into components; REX.io uses Vanilla CSS modules and design system tokens.
2. **Never expose TMDB Tokens:** TMDB tokens must **never** be injected into client-side `import.meta.env` with `VITE_` prefix. Client code must always fetch from `/api/*`.
3. **Maintain Embed Sandbox Security:** Always pass iframe embeds through `providerShield.ts`. Never remove the sandbox attribute without checking compatibility notes.
4. **Test Integrity:** Always ensure all tests pass (`npm test`) when altering core engines (`discoveryEngine.ts`, `provider.ts`, `tmdb.ts`).
