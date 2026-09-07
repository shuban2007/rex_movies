# REX.io — Production Deployment Guide

Follow these steps to deploy REX.io to production via Vercel and connect it to Supabase safely.

## 1. Push to GitHub
1. Initialize a Git repository if you haven't already:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for production"
   ```
2. Create a new repository on GitHub.
3. Push your code to the GitHub repository.

## 2. Import into Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import the GitHub repository you just created.
4. Leave the Framework Preset as **Vite**.

## 3. Configure Environment Variables
In the Vercel deployment configuration, add the following three environment variables exactly as they appear in your `.env` file. **Do not include any other variables.**

- `VITE_SUPABASE_URL` (Your Supabase project URL)
- `VITE_SUPABASE_PUBLISHABLE_KEY` (Your public `sb_publishable_...` key)
- `TMDB_API_READ_ACCESS_TOKEN` (Your TMDB API read access token)

*Note: The TMDB token is securely kept server-side by our Vercel Serverless Function and is never exposed to the browser.*

## 4. Deploy
1. Click **Deploy**.
2. Wait for the build and deployment process to complete.
3. Once finished, click **Continue to Dashboard** and copy the **Domains** URL provided by Vercel (e.g., `https://rex-io.vercel.app`).

## 5. Configure Supabase Redirects
To ensure Google OAuth and email logins successfully redirect back to your production site:
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Authentication** -> **URL Configuration**.
3. Under **Site URL**, paste your new Vercel production URL.
4. Under **Redirect URLs**, add your Vercel production URL (you may also keep `http://localhost:5173/**` here for continued local development).

## 6. Production Testing Checklist
Visit your new Vercel URL and verify the following:
- [ ] The homepage and REX logo load properly.
- [ ] Trending, popular, and top-rated movies load properly.
- [ ] Searching for a movie returns results.
- [ ] Clicking a movie successfully opens the `/watch/:tmdbId` page.
- [ ] The video player and server selector function normally.
- [ ] Movie recommendations appear below the player.
- [ ] Watchlist and History work seamlessly for a guest (logged out).
- [ ] Refreshing the Watch page or Watchlist page does not result in a 404 error (thanks to our SPA routing in `vercel.json`).
- [ ] Guest data survives page refresh.
- [ ] (Optional) Logging into Supabase successfully retrieves your cloud-synced Watchlist and History.
