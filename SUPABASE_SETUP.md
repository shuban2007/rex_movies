# Supabase Setup Guide for REX.io

This document explains how to set up the Supabase backend for REX.io.

## Step 1: Create a Supabase Project
1. Go to [Supabase](https://supabase.com/) and sign in.
2. Click **New Project** and select your organization.
3. Enter a project name and strong database password.
4. Wait for the project to provision.

## Step 2: Get API Keys
1. In the Supabase dashboard, go to **Project Settings** > **API**.
2. Copy the **Project URL**.
3. Copy the **Project API keys** -> **anon / public** key.

## Step 3: Configure Environment Variables
1. In the root of the REX.io project, copy `.env.example` to `.env.local` if you haven't already:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and add your keys:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_PUBLIC_KEY
   ```

## Step 4: Run the Database Migration
1. In the Supabase dashboard, go to **SQL Editor**.
2. Open the file `supabase/migrations/001_initial_schema.sql` from this repository.
3. Copy the entire contents of the file.
4. Paste it into the Supabase SQL Editor and click **Run**.
5. This creates the `profiles`, `watchlist`, and `watch_history` tables, along with all security policies (RLS).

## Step 5: Configure Google Authentication
1. Go to **Authentication** > **Providers** in the Supabase dashboard.
2. Select **Google** and enable it.
3. You will need a Google Client ID and Secret from the [Google Cloud Console](https://console.cloud.google.com/).
4. Enter them into the Supabase dashboard and hit **Save**.

## Step 6: Configure Redirect URLs
1. Go to **Authentication** > **URL Configuration**.
2. Set your **Site URL** to your production URL (or `http://localhost:5173` for local development).
3. Under **Redirect URLs**, add `http://localhost:5173/**` to ensure local development logins work correctly.

## Verification
- Start the development server (`npm run dev`).
- Click "Account" -> "Sign in with Google".
- Verify that your Google account logs you in.
- Test adding a movie to your Watchlist and verify it appears in the `watchlist` table in the Supabase dashboard.
