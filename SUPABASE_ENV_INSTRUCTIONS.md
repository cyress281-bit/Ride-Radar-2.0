# Supabase Environment Setup Instructions

## Overview

This project requires Supabase environment variables to connect to the backend API. The following variables must be configured:

- **VITE_SUPABASE_URL**: The Supabase project URL
- **VITE_SUPABASE_ANON_KEY**: The anonymous key for public access (used by the client)

## Getting Your Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the following:
   - **Project URL** → Use as `VITE_SUPABASE_URL`
   - **Anon Public Key** → Use as `VITE_SUPABASE_ANON_KEY` (or new publishable key format: `sb_publishable_*`)

## Local Development Setup (Codespaces / Local Machine)

### Option 1: Using .env file (Recommended for Local Dev)

1. Copy `.env.example` to `.env` (already done in this repo)
2. Open `.env` and update:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
   ```
3. Replace placeholders with actual credentials from Supabase Dashboard
4. Save the file
5. Run `npm run dev` to start the development server

### Option 2: Using Environment Variables in Codespaces

If using GitHub Codespaces:

1. **Set secrets in your repository** (Private - not visible in logs):
   - Go to your GitHub repo → Settings → Secrets and variables → Codespaces
   - Add these secrets:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

2. **In Codespaces terminal**, set environment variables:
   ```bash
   export VITE_SUPABASE_URL=https://your-project-id.supabase.co
   export VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
   ```

3. Run the dev server:
   ```bash
   npm run dev
   ```

## Vercel Deployment Setup

### For Production Deployment

1. **Add environment variables to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Select your project
   - Go to **Settings** → **Environment Variables**
   - Add these variables:
     - `VITE_SUPABASE_URL`: `https://your-project-id.supabase.co`
     - `VITE_SUPABASE_ANON_KEY`: Your anon key

2. **Set for all environments** (Production, Preview, Development):
   - Check: Production ✓, Preview ✓, Development ✓

3. **Deploy**:
   - Push to main branch, or manually trigger a deployment
   - Vercel will use these environment variables during the build process

## Validation

The app validates these variables on startup:

- ✓ `VITE_SUPABASE_URL` must be a valid URL ending in `.supabase.co`
- ✓ `VITE_SUPABASE_ANON_KEY` must be either:
  - A valid JWT token with `"role": "anon"` payload, OR
  - A new publishable key starting with `sb_publishable_`
- ✓ Project ref in URL must match project ref in the anon key

If validation fails, the app will throw an error with a clear message.

## File Locations Reference

| File | Purpose | Notes |
|------|---------|-------|
| `.env` | Local dev variables | ✓ In `.gitignore` (secrets safe) |
| `.env.example` | Template with placeholders | ✓ Committed to repo for reference |
| `vercel.json` | Vercel config | Rewrite rules only (no env vars here) |
| `src/lib/supabase.js` | Supabase client setup | Validates environment on startup |

## Troubleshooting

### Error: "VITE_SUPABASE_URL is missing"
- **Cause**: The `.env` file doesn't have `VITE_SUPABASE_URL`
- **Solution**: Add it to `.env` or set as environment variable

### Error: "VITE_SUPABASE_ANON_KEY still contains the example placeholder"
- **Cause**: You haven't replaced the placeholder in `.env`
- **Solution**: Update `.env` with your actual anon key from Supabase Dashboard

### Error: "VITE_SUPABASE_URL project ref does not match VITE_SUPABASE_ANON_KEY"
- **Cause**: URL and key are from different Supabase projects
- **Solution**: Make sure both come from the same Supabase project

### App works locally but fails after Vercel deploy
- **Cause**: Environment variables not set in Vercel
- **Solution**: Check Vercel dashboard → Project Settings → Environment Variables

## Additional Resources

- [Supabase Docs - Getting Started](https://supabase.com/docs)
- [Supabase Auth Reference](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
