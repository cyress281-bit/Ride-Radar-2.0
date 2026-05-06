@echo off
REM Quick install script for Ride Radar 2.0 Analytics & Monitoring

echo.
echo Installing analytics and monitoring dependencies...
echo.

REM Install production dependencies
echo Installing @sentry/react...
call npm install @sentry/react

echo Installing plausible-tracker...
call npm install plausible-tracker

echo Installing web-vitals...
call npm install web-vitals

REM Install dev dependencies
echo Installing @sentry/vite-plugin (dev)...
call npm install --save-dev @sentry/vite-plugin

echo.
echo Dependencies installed!
echo.
echo Next steps:
echo 1. Configure environment variables in .env (see .env.example)
echo 2. Run database migration: supabase migration up 20260507_add_analytics_enabled
echo 3. Create Sentry project at https://sentry.io
echo 4. Create Plausible account at https://plausible.io
echo 5. See ANALYTICS_SETUP.md for detailed instructions
echo.
echo Documentation:
echo - ANALYTICS.md - Full event tracking documentation
echo - ANALYTICS_SETUP.md - Step-by-step setup guide
echo - ANALYTICS_IMPLEMENTATION_SUMMARY.md - Implementation overview
echo.
echo Ready to track!
echo.
pause
