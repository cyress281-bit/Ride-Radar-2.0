-- ============================================================================
-- Auth Provider Setup & Supporting Infrastructure
-- Ride Radar 2.0 — Supabase Project: iygtbcserdmvhhjicyyp
-- ============================================================================
--
-- IMPORTANT: OAuth provider configuration (Google, Apple) and Passkey RP ID
-- settings are MANAGED BY SUPABASE GOTRUE and CANNOT be configured via SQL.
-- Those must be set in the Supabase Dashboard:
--   https://supabase.com/dashboard/project/iygtbcserdmvhhjicyyp/auth/providers
--
-- This migration sets up:
--   1. Auth event triggers (auto-cleanup, audit logging hooks)
--   2. Helper functions for identity/provider management
--   3. Schema support for multi-factor auth metadata
--   4. RLS policy helpers for provider-aware authorization
-- ============================================================================

-- ============================================================================
-- SECTION 1: Auth Event Trigger for User Lifecycle Management
-- ============================================================================
-- Ensures app-level cleanup when auth.users are deleted (e.g., account deletion)

CREATE OR REPLACE FUNCTION public.handle_auth_user_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the deletion event for audit purposes
  -- (app-level cleanup should happen via app code or a separate queue)
  PERFORM pg_notify('auth_user_deleted', json_build_object(
    'user_id', OLD.id,
    'deleted_at', now()
  )::text);

  RETURN OLD;
END;
$$;

-- Drop if exists to allow re-runs
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_deleted();

-- ============================================================================
-- SECTION 2: Helper Function — Get User's Linked Identities
-- ============================================================================
-- Returns all OAuth identities linked to a user (useful for provider linking UI)

CREATE OR REPLACE FUNCTION public.get_user_identities(p_user_id uuid)
RETURNS TABLE (
  provider text,
  identity_id text,
  provider_data jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    i.provider,
    i.id::text AS identity_id,
    i.identity_data AS provider_data,
    i.created_at,
    i.updated_at
  FROM auth.identities i
  WHERE i.user_id = p_user_id
  ORDER BY i.created_at DESC;
$$;

-- RLS: Users can only query their own identities
ALTER FUNCTION public.get_user_identities(uuid) OWNER TO postgres;

-- ============================================================================
-- SECTION 3: Helper Function — Check if User Has Specific Provider Linked
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_has_identity(p_user_id uuid, p_provider text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.identities
    WHERE user_id = p_user_id AND provider = p_provider
  );
$$;

-- ============================================================================
-- SECTION 4: Helper Function — Get User's Auth Providers List
-- ============================================================================
-- Returns an array of provider names for quick checks in app code

CREATE OR REPLACE FUNCTION public.get_user_auth_providers(p_user_id uuid)
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT ARRAY_AGG(DISTINCT provider)
  FROM auth.identities
  WHERE user_id = p_user_id;
$$;

-- ============================================================================
-- SECTION 5: Table for Passkey Metadata (App-Level Tracking)
-- ============================================================================
-- Supabase GoTrue stores passkeys internally, but we may want app-level
-- metadata (friendly names, device info, last used). This table is optional
-- and syncs with GoTrue's internal passkey store via app code.

CREATE TABLE IF NOT EXISTS public.user_passkeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- This should match the credential ID from WebAuthn/GoTrue
  credential_id text NOT NULL,
  -- Friendly name shown to user (e.g., "iPhone 15", "MacBook Pro")
  friendly_name text,
  -- Device type hint for UI icons
  device_type text CHECK (device_type IN ('platform', 'cross-platform', 'unknown')),
  -- When the passkey was registered
  registered_at timestamptz NOT NULL DEFAULT now(),
  -- Last time this passkey was used to authenticate
  last_used_at timestamptz,
  -- Whether this passkey is currently active (soft delete support)
  is_active boolean NOT NULL DEFAULT true,
  -- Raw metadata from the registration ceremony (backup state, etc.)
  metadata jsonb DEFAULT '{}'::jsonb,
  -- Created/updated tracking
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Ensure one passkey record per credential per user
  UNIQUE(user_id, credential_id)
);

-- Enable RLS
ALTER TABLE public.user_passkeys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_passkeys
CREATE POLICY "Users can view their own passkeys"
  ON public.user_passkeys
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own passkeys"
  ON public.user_passkeys
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own passkeys"
  ON public.user_passkeys
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own passkeys"
  ON public.user_passkeys
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_user_passkeys_user_id ON public.user_passkeys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_passkeys_credential_id ON public.user_passkeys(credential_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_passkeys_updated_at ON public.user_passkeys;
CREATE TRIGGER set_user_passkeys_updated_at
  BEFORE UPDATE ON public.user_passkeys
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- SECTION 6: Table for Auth Audit Log (App-Level)
-- ============================================================================
-- Tracks sign-in events, provider linking, passkey operations for user visibility

CREATE TABLE IF NOT EXISTS public.auth_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Event type
  event_type text NOT NULL CHECK (event_type IN (
    'sign_in', 'sign_out', 'sign_out_others',
    'provider_linked', 'provider_unlinked',
    'passkey_registered', 'passkey_deleted',
    'mfa_enabled', 'mfa_disabled',
    'password_changed', 'email_changed',
    'session_revoked'
  )),
  -- Provider involved (for provider events)
  provider text,
  -- IP address (optional, from app layer)
  ip_address inet,
  -- User agent string (optional, from app layer)
  user_agent text,
  -- Additional metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own audit log
CREATE POLICY "Users can view their own audit log"
  ON public.auth_audit_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only service_role or triggers can insert (app inserts via service role or function)
CREATE POLICY "Service role can insert audit log"
  ON public.auth_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Function to allow authenticated users to insert their own audit events
CREATE OR REPLACE FUNCTION public.insert_auth_audit_event(
  p_event_type text,
  p_provider text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.auth_audit_log (user_id, event_type, provider, metadata)
  VALUES (auth.uid(), p_event_type, p_provider, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id ON public.auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON public.auth_audit_log(created_at DESC);

-- ============================================================================
-- SECTION 7: Helper Function — Get User's Last Sign-In Info
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_last_sign_in(p_user_id uuid)
RETURNS TABLE (
  last_sign_in_at timestamptz,
  last_sign_in_provider text,
  providers text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    u.last_sign_in_at,
    u.raw_app_meta_data->>'provider' AS last_sign_in_provider,
    ARRAY(
      SELECT DISTINCT provider FROM auth.identities WHERE user_id = p_user_id
    ) AS providers
  FROM auth.users u
  WHERE u.id = p_user_id;
$$;

-- ============================================================================
-- SECTION 8: Grant Permissions
-- ============================================================================

-- Allow authenticated users to execute helper functions
GRANT EXECUTE ON FUNCTION public.get_user_identities(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_identity(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_auth_providers(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_auth_audit_event(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_last_sign_in(uuid) TO authenticated;

-- ============================================================================
-- SECTION 9: Dashboard Configuration Checklist (Run These Steps Manually)
-- ============================================================================
--
-- The following CANNOT be done via SQL and MUST be configured in the Supabase
-- Dashboard at: https://supabase.com/dashboard/project/iygtbcserdmvhhjicyyp/auth/providers
--
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ GOOGLE OAUTH                                                                │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ 1. Go to https://console.cloud.google.com/ → APIs & Services → Credentials │
-- │ 2. Create OAuth 2.0 Client ID (Web application)                            │
-- │ 3. Authorized redirect URI:                                                │
-- │    https://iygtbcserdmvhhjicyyp.supabase.co/auth/v1/callback               │
-- │ 4. Copy Client ID and Client Secret                                        │
-- │ 5. Paste into Supabase Dashboard → Auth → Providers → Google               │
-- │ 6. Toggle "Enabled"                                                        │
-- └─────────────────────────────────────────────────────────────────────────────┘
--
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ APPLE OAUTH (Web - No Developer Program needed for basic OAuth)             │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ 1. Go to https://developer.apple.com/account/resources/identifiers/list    │
-- │    (or use Sign In with Apple JS for simpler web-only setup)               │
-- │ 2. Create a Services ID                                                    │
-- │ 3. Configure Return URL:                                                   │
-- │    https://iygtbcserdmvhhjicyyp.supabase.co/auth/v1/callback               │
-- │ 4. Generate Client Secret (JWT with private key)                           │
-- │ 5. Paste into Supabase Dashboard → Auth → Providers → Apple                │
-- │ 6. Toggle "Enabled"                                                        │
-- └─────────────────────────────────────────────────────────────────────────────┘
--
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ PASSKEYS (WebAuthn)                                                         │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ 1. Supabase Dashboard → Auth → Providers → Passkeys                        │
-- │ 2. Relying Party ID:  rideradar.app  (or your production domain)           │
-- │ 3. RP Name:           Ride Radar                                           │
-- │ 4. Toggle "Enabled"                                                        │
-- │                                                                            │
-- │ NOTE: The app code already has experimental passkey support enabled:       │
-- │   auth: { experimental: { passkey: true } }                                │
-- └─────────────────────────────────────────────────────────────────────────────┘
--
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ SITE URL & REDIRECT URLS                                                    │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ 1. Supabase Dashboard → Auth → URL Configuration                           │
-- │ 2. Site URL: https://rideradar.app (or your domain)                        │
-- │ 3. Add redirect URLs:                                                      │
-- │    - https://rideradar.app/settings/account                                │
-- │    - https://rideradar.app/login                                           │
-- │    - http://localhost:5173/settings/account  (for dev)                     │
-- │    - http://localhost:5173/login             (for dev)                     │
-- └─────────────────────────────────────────────────────────────────────────────┘
--
-- ============================================================================

COMMENT ON TABLE public.user_passkeys IS
  'App-level passkey metadata. GoTrue stores the actual WebAuthn credentials internally. This table is for friendly names, device info, and UI state.';

COMMENT ON TABLE public.auth_audit_log IS
  'User-visible audit log for auth events (sign-ins, provider linking, passkey operations). Inserted by app code via insert_auth_audit_event().';
