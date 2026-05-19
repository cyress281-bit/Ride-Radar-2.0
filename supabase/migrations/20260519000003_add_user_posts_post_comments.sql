-- Add missing table definitions for user_posts, user_post_photos, and post_comments.
-- These tables are referenced by posts-api.js, comments-api.js, and the
-- post_comment notification trigger (20260517000002) but were never added to migrations.
-- All CREATE TABLE statements are idempotent (IF NOT EXISTS).
-- Policies use DROP IF EXISTS + CREATE to be re-runnable.

CREATE TABLE IF NOT EXISTS user_posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caption text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_posts_user_id ON user_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_posts_created_at ON user_posts(created_at);

CREATE TABLE IF NOT EXISTS user_post_photos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  image_path text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_post_photos_post_id ON user_post_photos(post_id);

CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 500),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_author_id ON post_comments(author_id);

ALTER TABLE user_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_post_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_posts_select ON user_posts;
CREATE POLICY user_posts_select ON user_posts
  FOR SELECT USING (
    is_admin() OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = user_posts.user_id AND user_profiles.is_public = true)
  );

DROP POLICY IF EXISTS user_posts_insert ON user_posts;
CREATE POLICY user_posts_insert ON user_posts
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_posts_delete ON user_posts;
CREATE POLICY user_posts_delete ON user_posts
  FOR DELETE USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS user_post_photos_select ON user_post_photos;
CREATE POLICY user_post_photos_select ON user_post_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_posts
      WHERE user_posts.id = user_post_photos.post_id
        AND (is_admin() OR user_posts.user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = user_posts.user_id AND user_profiles.is_public = true))
    )
  );

DROP POLICY IF EXISTS user_post_photos_insert ON user_post_photos;
CREATE POLICY user_post_photos_insert ON user_post_photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_posts WHERE user_posts.id = user_post_photos.post_id AND user_posts.user_id = auth.uid())
  );

DROP POLICY IF EXISTS user_post_photos_delete ON user_post_photos;
CREATE POLICY user_post_photos_delete ON user_post_photos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_posts WHERE user_posts.id = user_post_photos.post_id AND (user_posts.user_id = auth.uid() OR is_admin()))
  );

DROP POLICY IF EXISTS post_comments_select ON post_comments;
CREATE POLICY post_comments_select ON post_comments
  FOR SELECT USING (auth.uid() IS NOT NULL OR is_admin());

DROP POLICY IF EXISTS post_comments_insert ON post_comments;
CREATE POLICY post_comments_insert ON post_comments
  FOR INSERT WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS post_comments_delete ON post_comments;
CREATE POLICY post_comments_delete ON post_comments
  FOR DELETE USING (
    author_id = auth.uid() OR is_admin()
    OR EXISTS (SELECT 1 FROM user_posts WHERE user_posts.id = post_comments.post_id AND user_posts.user_id = auth.uid())
  );
