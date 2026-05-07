-- =============================================================================
-- SECURE ACCOUNT DELETION FUNCTION
-- =============================================================================
-- This function runs with SECURITY DEFINER (elevated privileges) so it can
-- delete the auth.users row, which normally requires the service_role key.
--
-- Security model:
--   - Only the authenticated user can delete their OWN account (auth.uid() check)
--   - Runs as the function owner (postgres/superuser) to access auth.users
--   - Explicitly deletes user data before removing the auth record
--   - CASCADE constraints handle most related data, but we explicitly clean up
--     tables that reference the authenticated user id directly
-- =============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  requesting_user_id UUID;
  deleted_tables TEXT[] := '{}';
BEGIN
  -- Step 1: Identify the calling user via their JWT
  requesting_user_id := auth.uid();

  IF requesting_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated. Please sign in and try again.'
    );
  END IF;

  -- Step 2: Explicitly delete data from tables that may not cascade from auth.users
  -- These tables are keyed by the authenticated user id in the live app.

  -- Delete user blocks
  DELETE FROM public.user_blocks
  WHERE blocker_user_id = requesting_user_id
     OR blocked_user_id = requesting_user_id;
  deleted_tables := array_append(deleted_tables, 'user_blocks');

  -- Delete reports filed by or about this user
  DELETE FROM public.reports
  WHERE reporter_user_id = requesting_user_id
     OR target_user_id = requesting_user_id;
  deleted_tables := array_append(deleted_tables, 'reports');

  -- Delete notifications (references users.id, should cascade, but be explicit)
  DELETE FROM public.notifications
  WHERE user_id = requesting_user_id;
  deleted_tables := array_append(deleted_tables, 'notifications');

  -- Delete event RSVPs
  DELETE FROM public.event_rsvps
  WHERE user_id = requesting_user_id;
  deleted_tables := array_append(deleted_tables, 'event_rsvps');

  -- Delete connection requests (both sent and received)
  DELETE FROM public.connection_requests
  WHERE from_user_id = requesting_user_id
     OR to_user_id = requesting_user_id;
  deleted_tables := array_append(deleted_tables, 'connection_requests');

  -- Delete pending account deletion requests
  DELETE FROM public.account_deletion_requests
  WHERE user_id = requesting_user_id;
  deleted_tables := array_append(deleted_tables, 'account_deletion_requests');

  -- Delete messages sent by this user
  DELETE FROM public.messages
  WHERE from_user_id = requesting_user_id;
  deleted_tables := array_append(deleted_tables, 'messages');

  -- Remove user from conversations (or delete if they're the only participant)
  DELETE FROM public.conversations
  WHERE requesting_user_id = ANY(participant_ids)
    AND array_length(participant_ids, 1) <= 2;
  deleted_tables := array_append(deleted_tables, 'conversations');

  -- Delete broadcasts authored by this user
  DELETE FROM public.broadcasts
  WHERE author_id = requesting_user_id;
  deleted_tables := array_append(deleted_tables, 'broadcasts');

  -- Delete user settings (if table exists)
  BEGIN
    DELETE FROM public.user_settings
    WHERE user_id = requesting_user_id;
    deleted_tables := array_append(deleted_tables, 'user_settings');
  EXCEPTION WHEN undefined_table THEN
    -- user_settings table may not exist yet, that's fine
    NULL;
  END;

  -- Delete user profile
  DELETE FROM public.user_profiles
  WHERE user_id = requesting_user_id;
  deleted_tables := array_append(deleted_tables, 'user_profiles');

  -- Delete user record from public.users table
  DELETE FROM public.users
  WHERE id = requesting_user_id;
  deleted_tables := array_append(deleted_tables, 'users');

  -- Step 4: Delete the auth user (requires elevated privileges)
  -- This is the critical operation that requires SECURITY DEFINER
  DELETE FROM auth.users
  WHERE id = requesting_user_id;
  deleted_tables := array_append(deleted_tables, 'auth.users');

  -- Step 5: Return success response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account and all associated data have been permanently deleted.',
    'deleted_tables', to_jsonb(deleted_tables)
  );

EXCEPTION WHEN OTHERS THEN
  -- Catch any unexpected errors and return a structured response
  RETURN jsonb_build_object(
    'success', false,
    'error', format('Account deletion failed: %s', SQLERRM)
  );
END;
$$;

-- =============================================================================
-- PERMISSIONS
-- =============================================================================
-- Grant execute to authenticated users only (not anon)
-- The function itself verifies auth.uid() matches, so a user can only delete themselves

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- Add a comment for documentation
COMMENT ON FUNCTION public.delete_user_account() IS
  'Securely deletes the calling user''s account and all associated data. '
  'Uses SECURITY DEFINER to access auth.users. Only the authenticated user can delete their own account.';
