-- Migration: Baseline schema for Ride Radar 2.0
-- Purpose: CREATE TABLE IF NOT EXISTS statements for all core tables.
-- Notes: Tables may already exist in the live database; this file adds them to version control.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Core user table (managed by Supabase Auth; mirrored/extended here)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE users IS 'Extended user information synchronized with Supabase Auth.';

-- Public rider profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name text,
  username text UNIQUE,
  bio text,
  avatar_url text,
  bike_make text,
  bike_model text,
  bike_year int,
  bike_photo_url text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE user_profiles IS 'Public-facing rider profile with bike details and privacy toggle.';

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Broadcasts (events, alerts, and general posts)
CREATE TABLE IF NOT EXISTS broadcasts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('event','alert','general')),
  status text DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  title text,
  body text,
  frozen_lat double precision,
  frozen_lng double precision,
  location geography(POINT,4326),
  location_name text,
  event_date timestamptz,
  event_image_url text,
  alert_type text,
  alert_photos jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz
);
COMMENT ON TABLE broadcasts IS 'Rider-generated content: events, alerts, and general posts.';

CREATE INDEX IF NOT EXISTS idx_broadcasts_author_id ON broadcasts(author_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_type ON broadcasts(type);
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_expires_at ON broadcasts(expires_at);
CREATE INDEX IF NOT EXISTS idx_broadcasts_location ON broadcasts USING GIST(location);

-- Conversations (direct messages between riders)
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_ids uuid[] NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active','archived','blocked')),
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE conversations IS 'One-to-one or group DM threads.';

CREATE INDEX IF NOT EXISTS idx_conversations_participant_ids ON conversations USING GIN(participant_ids);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE messages IS 'Individual chat messages inside a conversation.';

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- User reports (moderation)
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('user','broadcast','message')),
  target_id uuid NOT NULL,
  target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'open' CHECK (status IN ('open','reviewed','resolved','dismissed')),
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE reports IS 'Moderation reports submitted by users.';

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- User blocks
CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (blocker_user_id, blocked_user_id)
);
COMMENT ON TABLE user_blocks IS 'Prevents interaction between two users.';

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_user_id);

-- Push/in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text,
  body text,
  data jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE notifications IS 'User-facing notifications (push + in-app).';

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Connection requests (friend requests)
CREATE TABLE IF NOT EXISTS connection_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (from_user_id, to_user_id)
);
COMMENT ON TABLE connection_requests IS 'Friend / connection requests between riders.';

CREATE INDEX IF NOT EXISTS idx_connection_requests_from ON connection_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_to ON connection_requests(to_user_id);

-- Friendships (bidirectional)
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'active' CHECK (status IN ('active','blocked','removed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_a_id, user_b_id)
);
COMMENT ON TABLE friendships IS 'Established connections between two riders.';

CREATE INDEX IF NOT EXISTS idx_friendships_user_a ON friendships(user_a_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_b ON friendships(user_b_id);

-- Event RSVPs
CREATE TABLE IF NOT EXISTS event_rsvps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_id uuid NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'going' CHECK (status IN ('going','maybe','not_going')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (broadcast_id, user_id)
);
COMMENT ON TABLE event_rsvps IS 'RSVP records for event-type broadcasts.';

CREATE INDEX IF NOT EXISTS idx_event_rsvps_broadcast ON event_rsvps(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON event_rsvps(user_id);

-- User settings / preferences
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notifications_enabled boolean DEFAULT true,
  live_map_visible boolean DEFAULT true,
  live_map_location_precision text DEFAULT 'approximate',
  analytics_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);
COMMENT ON TABLE user_settings IS 'Per-user app preferences and privacy toggles.';

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Account deletion queue
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email text,
  profile_id uuid,
  status text DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  note text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
COMMENT ON TABLE account_deletion_requests IS 'Queued GDPR-style account deletion requests.';

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user ON account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status ON account_deletion_requests(status);

-- Live map presence (real-time rider locations)
CREATE TABLE IF NOT EXISTS live_map_presence (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  vehicle_label text,
  is_visible boolean DEFAULT true,
  location_precision text DEFAULT 'approximate',
  lat double precision,
  lng double precision,
  accuracy_meters int,
  approximate_radius_miles numeric,
  source text,
  last_seen_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);
COMMENT ON TABLE live_map_presence IS 'Ephemeral real-time location data for the live map feature.';

CREATE INDEX IF NOT EXISTS idx_live_map_presence_user_id ON live_map_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_live_map_presence_expires ON live_map_presence(expires_at);
CREATE INDEX IF NOT EXISTS idx_live_map_presence_location ON live_map_presence USING GIST(ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography);
