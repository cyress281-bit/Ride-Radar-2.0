@echo off
REM Apply user_profiles optimization migration
REM Run this script from the project root directory

echo ========================================
echo Applying User Profiles Optimization
echo ========================================
echo.

echo Checking Supabase CLI...
supabase --version
if %errorlevel% neq 0 (
    echo ERROR: Supabase CLI not found!
    echo Please install: https://supabase.com/docs/guides/cli
    pause
    exit /b 1
)
echo.

echo Applying migration: 20260507_optimize_user_profiles.sql
echo.
supabase migration up

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Migration failed!
    echo Check the error message above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Optimization Applied
echo ========================================
echo.
echo Verifying indexes and functions...
echo.

REM Note: You can verify in Supabase dashboard or run:
REM supabase db inspect --schema public user_profiles

echo Next steps:
echo 1. Check Supabase dashboard for new indexes
echo 2. Monitor query performance (should be faster)
echo 3. Update code to use new functions (optional)
echo.
echo See USER_PROFILES_OPTIMIZATION.md for code updates.
echo.

pause
