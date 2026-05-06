/**
 * Sentry Vite Plugin Configuration
 *
 * This plugin uploads source maps to Sentry after the build completes,
 * enabling accurate stack traces for production errors.
 *
 * To use:
 * 1. Install: npm install --save-dev @sentry/vite-plugin
 * 2. Set SENTRY_AUTH_TOKEN environment variable (create at sentry.io)
 * 3. Import and add to vite.config.js plugins array
 */

import { sentryVitePlugin } from '@sentry/vite-plugin';

export const sentryPlugin = sentryVitePlugin({
  // Sentry organization and project (from your Sentry dashboard)
  org: process.env.SENTRY_ORG || 'your-org',
  project: process.env.SENTRY_PROJECT || 'ride-radar',

  // Auth token from: Settings > Account > API > Auth Tokens
  // Create a token with "project:releases" and "org:read" scopes
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps only in production builds
  disable: process.env.NODE_ENV !== 'production',

  // Source maps settings
  sourcemaps: {
    assets: './dist/**',
    ignore: ['node_modules'],
    filesToDeleteAfterUpload: './dist/**/*.map', // Delete source maps after upload
  },

  // Release settings
  release: {
    name: process.env.VITE_APP_VERSION || '2.0.0',
    cleanArtifacts: true, // Clean old artifacts
    setCommits: {
      auto: true, // Automatically associate commits
    },
  },

  // Telemetry (opt-out if desired)
  telemetry: false,
});

export default sentryPlugin;
