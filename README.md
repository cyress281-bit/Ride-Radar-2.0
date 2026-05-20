# Ride Radar 2.0

A social network for motorcyclists — find rides, connect with riders, share safety alerts, and discover events near you.

**Live:** [rideradarapp.com](https://www.rideradarapp.com)

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, shadcn/ui
- **State & Data:** TanStack Query v5, Supabase (Postgres + Auth + Realtime + Storage)
- **Maps:** Leaflet + react-leaflet
- **Monitoring:** Sentry (errors), Plausible (analytics), Web Vitals (performance)
- **PWA:** vite-plugin-pwa, Workbox runtime caching
- **Testing:** Vitest, React Testing Library, jsdom

## Quick Start

```bash
# 1. Clone
git clone <repo-url>
cd Ride-Radar-2.0

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Start dev server
npm run dev

# 5. Run tests
npm run test

# 6. Build for production
npm run build
```

## Environment Variables

All variables must be prefixed with `VITE_` to be exposed to the client.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `VITE_SENTRY_DSN` | No | Sentry error tracking DSN |
| `VITE_APP_ENV` | No | App/Sentry environment tag; falls back to Vite mode |
| `VITE_PLAUSIBLE_DOMAIN` | No | Plausible analytics domain |
| `VITE_ENABLE_ANALYTICS` | No | Toggle analytics (`true`/`false`) |
| `VITE_APP_VERSION` | No | App version for release tracking |
| `VITE_SUPPORT_EMAIL` | No | Support email shown in error UIs |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript check (no-op for JS) |
| `npm run test` | Run Vitest suite |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run preview` | Preview production build locally |
| `npm run analyze` | Analyze bundle size |

## Project Structure

```
src/
  components/       # Shared UI components (shadcn, primitives)
  features/         # Domain-specific modules
    auth/           # Authentication, onboarding, session
    broadcast/      # Radar feed, broadcast creation, details
    chat/           # Messaging, conversations
    connections/    # Friendships, connection requests
    map/            # Live map, presence
    notifications/  # Notification feed, unread count
    profile/        # Profile pages, editing
    settings/       # App settings, privacy, account deletion
    admin/          # Admin dashboard (lazy-loaded)
  hooks/            # Cross-cutting React hooks
  lib/              # Utilities, Supabase client, logger, sentry
  test/             # Test setup and utilities
```

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System design, data flow, key assumptions
- [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md) — Pre-launch and post-launch steps
- [`TESTING.md`](./TESTING.md) — How to write and run tests
- [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md) — Known constraints and future work
- [`CLAUDE.md`](./CLAUDE.md) — Agent context and coding conventions

## License

Proprietary — Ride Radar LLC
