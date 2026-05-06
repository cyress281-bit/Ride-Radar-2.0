# Supabase Migration Guide - Ride Radar 2.0

## 🎯 Goal
Migrate from Base44 to Supabase in 2-3 weeks to eliminate integration credit limits, add real-time features, and reduce costs.

---

## 📋 Prerequisites

1. **Create Supabase Account**: https://supabase.com (free)
2. **Create New Project**: Name it "Ride Radar"
3. **Save these values from Project Settings → API**:
   - `SUPABASE_URL` (looks like: https://xxxxx.supabase.co)
   - `SUPABASE_ANON_KEY` (public key, safe for client)
   - `SUPABASE_SERVICE_ROLE_KEY` (private key, server only)

---

## 🗄️ Step 1: Database Setup (30 minutes)

### 1.1 Enable PostGIS Extension

Go to Supabase Dashboard → SQL Editor → New Query

```sql
-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 1.2 Create Core Schema

Run this in SQL Editor:

```sql
-- ======================
-- USERS & PROFILES
-- ======================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  username TEXT UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  bike_make TEXT,
  bike_model TEXT,
  bike_year INTEGER,
  bike_photo_url TEXT,
  is_public BOOLEAN DEFAULT true,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ======================
-- BROADCASTS
-- ======================

CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('solo_ride', 'iso', 'event', 'alert')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  title TEXT NOT NULL,
  body TEXT,
  
  -- Geospatial data
  frozen_lat DOUBLE PRECISION,
  frozen_lng DOUBLE PRECISION,
  location GEOGRAPHY(POINT, 4326),
  location_name TEXT,
  
  -- Event-specific fields
  event_date TIMESTAMPTZ,
  event_image_url TEXT,
  
  -- Alert-specific fields
  alert_type TEXT,
  alert_photos JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Automatically set location from lat/lng
  CONSTRAINT location_check CHECK (
    (frozen_lat IS NULL AND frozen_lng IS NULL AND location IS NULL) OR
    (frozen_lat IS NOT NULL AND frozen_lng IS NOT NULL)
  )
);

-- Trigger to auto-populate geography from lat/lng
CREATE OR REPLACE FUNCTION update_broadcast_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.frozen_lat IS NOT NULL AND NEW.frozen_lng IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.frozen_lng, NEW.frozen_lat), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_broadcast_location
  BEFORE INSERT OR UPDATE ON broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION update_broadcast_location();

-- ======================
-- MESSAGES & CONVERSATIONS
-- ======================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_ids UUID[] NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ======================
-- SOCIAL FEATURES
-- ======================

CREATE TABLE user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  blocked_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_profile_id, blocked_profile_id),
  CHECK (blocker_profile_id != blocked_profile_id)
);

CREATE TABLE connection_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  CHECK (from_user_id != to_user_id)
);

CREATE TABLE event_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(broadcast_id, user_id)
);

-- ======================
-- NOTIFICATIONS
-- ======================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ======================
-- REPORTS & MODERATION
-- ======================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  target_profile_id UUID,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'closed')),
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ======================
-- INDEXES
-- ======================

-- Geospatial index (critical for performance!)
CREATE INDEX idx_broadcasts_location ON broadcasts USING GIST (location);

-- Common query patterns
CREATE INDEX idx_broadcasts_status_created ON broadcasts (status, created_date DESC);
CREATE INDEX idx_broadcasts_author ON broadcasts (author_id);
CREATE INDEX idx_broadcasts_type ON broadcasts (type);
CREATE INDEX idx_broadcasts_expires ON broadcasts (expires_at);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_date DESC);
CREATE INDEX idx_messages_sender ON messages (sender_id);

CREATE INDEX idx_conversations_participants ON conversations USING GIN (participant_ids);
CREATE INDEX idx_conversations_last_message ON conversations (last_message_at DESC);

CREATE INDEX idx_user_blocks_blocker ON user_blocks (blocker_profile_id);
CREATE INDEX idx_user_blocks_blocked ON user_blocks (blocked_profile_id);

CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_date DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id, read) WHERE read = false;
```

### 1.3 Create Helper Functions

```sql
-- ======================
-- HELPER FUNCTIONS
-- ======================

-- Function: Get nearby broadcasts with author info
CREATE OR REPLACE FUNCTION get_nearby_broadcasts(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION DEFAULT 50,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  type TEXT,
  status TEXT,
  title TEXT,
  body TEXT,
  frozen_lat DOUBLE PRECISION,
  frozen_lng DOUBLE PRECISION,
  location_name TEXT,
  event_date TIMESTAMPTZ,
  event_image_url TEXT,
  alert_type TEXT,
  alert_photos JSONB,
  created_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  distance_miles DOUBLE PRECISION,
  author_display_name TEXT,
  author_username TEXT,
  author_avatar_url TEXT
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.author_id,
    b.type,
    b.status,
    b.title,
    b.body,
    b.frozen_lat,
    b.frozen_lng,
    b.location_name,
    b.event_date,
    b.event_image_url,
    b.alert_type,
    b.alert_photos,
    b.created_date,
    b.expires_at,
    ROUND(
      CAST(
        ST_Distance(
          b.location,
          ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) / 1609.34 AS NUMERIC
      ), 
      1
    ) AS distance_miles,
    p.display_name AS author_display_name,
    p.username AS author_username,
    p.avatar_url AS author_avatar_url
  FROM broadcasts b
  LEFT JOIN user_profiles p ON p.user_id = b.author_id
  WHERE 
    b.status = 'active'
    AND (b.expires_at IS NULL OR b.expires_at > NOW())
    AND ST_DWithin(
      b.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_miles * 1609.34 -- Convert miles to meters
    )
  ORDER BY distance_miles ASC
  LIMIT limit_count;
END;
$$;

-- Function: Get user's conversations with last message
CREATE OR REPLACE FUNCTION get_user_conversations(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  participant_ids UUID[],
  status TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_body TEXT,
  last_message_sender_id UUID,
  other_user_id UUID,
  other_display_name TEXT,
  other_avatar_url TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.participant_ids,
    c.status,
    c.last_message_at,
    m.body AS last_message_body,
    m.sender_id AS last_message_sender_id,
    (
      SELECT unnest(c.participant_ids) 
      WHERE unnest != user_uuid 
      LIMIT 1
    ) AS other_user_id,
    p.display_name AS other_display_name,
    p.avatar_url AS other_avatar_url
  FROM conversations c
  LEFT JOIN LATERAL (
    SELECT body, sender_id
    FROM messages
    WHERE conversation_id = c.id
    ORDER BY created_date DESC
    LIMIT 1
  ) m ON true
  LEFT JOIN user_profiles p ON p.user_id = (
    SELECT unnest(c.participant_ids) 
    WHERE unnest != user_uuid 
    LIMIT 1
  )
  WHERE user_uuid = ANY(c.participant_ids)
  ORDER BY c.last_message_at DESC;
END;
$$;
```

---

## 🔒 Step 2: Row Level Security (15 minutes)

```sql
-- ======================
-- ENABLE RLS ON ALL TABLES
-- ======================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ======================
-- USERS & PROFILES POLICIES
-- ======================

-- Users can read all users (for lookups)
CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT
  USING (true);

-- Users can update their own record
CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Public profiles viewable by everyone
CREATE POLICY "Public profiles viewable by everyone"
  ON user_profiles FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users can create own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- ======================
-- BROADCASTS POLICIES
-- ======================

-- Active broadcasts viewable by everyone
CREATE POLICY "Active broadcasts viewable by everyone"
  ON broadcasts FOR SELECT
  USING (status = 'active' AND (expires_at IS NULL OR expires_at > NOW()));

-- Users can create broadcasts
CREATE POLICY "Users can create broadcasts"
  ON broadcasts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Users can update their own broadcasts
CREATE POLICY "Users can update own broadcasts"
  ON broadcasts FOR UPDATE
  USING (auth.uid() = author_id);

-- Users can delete their own broadcasts
CREATE POLICY "Users can delete own broadcasts"
  ON broadcasts FOR DELETE
  USING (auth.uid() = author_id);

-- ======================
-- MESSAGES POLICIES
-- ======================

-- Users can view messages in their conversations
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND auth.uid() = ANY(conversations.participant_ids)
    )
  );

-- Users can send messages in their conversations
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND auth.uid() = ANY(conversations.participant_ids)
    )
  );

-- ======================
-- CONVERSATIONS POLICIES
-- ======================

-- Users can view their conversations
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

-- Users can create conversations they're part of
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = ANY(participant_ids));

-- Users can update their conversations
CREATE POLICY "Users can update their conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = ANY(participant_ids));

-- ======================
-- OTHER TABLES POLICIES
-- ======================

-- User blocks: users can manage their own blocks
CREATE POLICY "Users can view blocks they created"
  ON user_blocks FOR SELECT
  USING (
    blocker_profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create blocks"
  ON user_blocks FOR INSERT
  WITH CHECK (
    blocker_profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their blocks"
  ON user_blocks FOR DELETE
  USING (
    blocker_profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Notifications: users can only see their own
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Event RSVPs: viewable by everyone, manageable by owner
CREATE POLICY "RSVPs viewable by everyone"
  ON event_rsvps FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own RSVPs"
  ON event_rsvps FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

## ✅ Verification

Run this to verify everything is set up:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Check PostGIS is enabled
SELECT PostGIS_version();

-- Test geospatial function (should return empty array, not error)
SELECT * FROM get_nearby_broadcasts(40.7128, -74.0060, 50, 10);
```

---

## 📝 Notes

- All timestamps use `TIMESTAMPTZ` (timezone-aware)
- UUIDs used for all IDs (compatible with Supabase auth)
- PostGIS handles all geospatial calculations
- RLS enforces security at database level
- Indexes optimize common query patterns

---

## 🔄 Next Steps

After running this schema:

1. ✅ Go to Authentication → Settings in Supabase dashboard
2. ✅ Enable Email auth provider
3. ✅ Configure email templates (optional)
4. ✅ Note your project URL and anon key
5. ✅ Ready to start frontend migration!

---

**Schema Version:** 1.0  
**Last Updated:** 2026-05-05  
**Status:** Ready for migration ✅
