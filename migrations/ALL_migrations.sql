-- ============================================================
-- ALL_migrations.sql
-- 001 ~ 005 통합 — Supabase SQL Editor에 한 번에 붙여넣기
-- ============================================================

-- ============================================================
-- [001] 초기 스키마
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS channel_info (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name          TEXT        NOT NULL DEFAULT '',
    genre         TEXT        NOT NULL DEFAULT '',
    target_audience TEXT      NOT NULL DEFAULT '',
    upload_frequency TEXT     NOT NULL DEFAULT '',
    youtube_name  TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT channel_info_user_unique UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_channel_info_user_id ON channel_info (user_id);

CREATE TABLE IF NOT EXISTS scrap_sheets (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name          TEXT        NOT NULL DEFAULT '',
    channel_name  TEXT,
    genre         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_scrap_sheets_user_id    ON scrap_sheets (user_id);
CREATE INDEX IF NOT EXISTS idx_scrap_sheets_deleted_at ON scrap_sheets (deleted_at) WHERE deleted_at IS NULL;

CREATE TYPE scrap_status AS ENUM ('unused', 'ready', 'used');

CREATE TABLE IF NOT EXISTS scrap_items (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    sheet_id        UUID        NOT NULL REFERENCES scrap_sheets(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt          TEXT        NOT NULL DEFAULT '',
    lyrics          TEXT        NOT NULL DEFAULT '',
    title           TEXT        NOT NULL DEFAULT '',
    genre           TEXT        NOT NULL DEFAULT '',
    status          scrap_status NOT NULL DEFAULT 'unused',
    instruments     TEXT,
    mood_tags       TEXT[]      NOT NULL DEFAULT '{}',
    is_instrumental BOOLEAN     NOT NULL DEFAULT FALSE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at         TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_scrap_items_sheet_id   ON scrap_items (sheet_id);
CREATE INDEX IF NOT EXISTS idx_scrap_items_user_id    ON scrap_items (user_id);
CREATE INDEX IF NOT EXISTS idx_scrap_items_status     ON scrap_items (status);
CREATE INDEX IF NOT EXISTS idx_scrap_items_deleted_at ON scrap_items (deleted_at) WHERE deleted_at IS NULL;

CREATE TYPE schedule_frequency AS ENUM ('daily', '3perweek', 'weekly');

CREATE TABLE IF NOT EXISTS user_settings (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    schedule_enabled  BOOLEAN     NOT NULL DEFAULT FALSE,
    schedule_frequency schedule_frequency NOT NULL DEFAULT 'daily',
    schedule_target_time TEXT     NOT NULL DEFAULT '18:00',
    email_alert       BOOLEAN     NOT NULL DEFAULT FALSE,
    email_address     TEXT,
    gemini_api_key    TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_settings_user_unique UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings (user_id);

CREATE TABLE IF NOT EXISTS youtube_channels (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_name     TEXT        NOT NULL DEFAULT '',
    channel_url      TEXT        NOT NULL DEFAULT '',
    thumbnail_url    TEXT,
    total_views      BIGINT,
    total_watch_hours NUMERIC(12, 2),
    total_likes      BIGINT,
    total_comments   BIGINT,
    avg_engagement   NUMERIC(6, 4),
    total_shares     BIGINT,
    subscriber_count BIGINT,
    connected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_youtube_channels_user_id    ON youtube_channels (user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_channels_deleted_at ON youtube_channels (deleted_at) WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW user_stats AS
SELECT
    u.id AS user_id,
    COUNT(DISTINCT si.id) FILTER (WHERE si.deleted_at IS NULL) AS total_songs,
    COUNT(DISTINCT si.id) FILTER (WHERE si.status = 'used' AND si.deleted_at IS NULL) AS used_songs,
    COALESCE(SUM(yc.total_views) FILTER (WHERE yc.deleted_at IS NULL), 0) AS total_views,
    COUNT(DISTINCT si.id) FILTER (WHERE si.status != 'unused' AND si.deleted_at IS NULL) AS uploaded_count
FROM auth.users u
LEFT JOIN scrap_sheets  ss ON ss.user_id = u.id AND ss.deleted_at IS NULL
LEFT JOIN scrap_items   si ON si.user_id = u.id
LEFT JOIN youtube_channels yc ON yc.user_id = u.id
GROUP BY u.id;

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_channel_info    BEFORE UPDATE ON channel_info    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_scrap_sheets    BEFORE UPDATE ON scrap_sheets    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_scrap_items     BEFORE UPDATE ON scrap_items     FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_user_settings   BEFORE UPDATE ON user_settings   FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_youtube_channels BEFORE UPDATE ON youtube_channels FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE channel_info      ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrap_sheets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrap_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_channels   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channel_info: select own" ON channel_info FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "channel_info: insert own" ON channel_info FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "channel_info: update own" ON channel_info FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "channel_info: delete own" ON channel_info FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "scrap_sheets: select own" ON scrap_sheets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scrap_sheets: insert own" ON scrap_sheets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scrap_sheets: update own" ON scrap_sheets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scrap_sheets: delete own" ON scrap_sheets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "scrap_items: select own" ON scrap_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scrap_items: insert own" ON scrap_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scrap_items: update own" ON scrap_items FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scrap_items: delete own" ON scrap_items FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "user_settings: select own" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_settings: insert own" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_settings: update own" ON user_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_settings: delete own" ON user_settings FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "youtube_channels: select own" ON youtube_channels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "youtube_channels: insert own" ON youtube_channels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "youtube_channels: update own" ON youtube_channels FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "youtube_channels: delete own" ON youtube_channels FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- [002] brand_kit + lyrics_history
-- ============================================================

CREATE TABLE IF NOT EXISTS brand_kit (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_name     TEXT        NOT NULL DEFAULT '',
    tagline          TEXT        NOT NULL DEFAULT '',
    primary_genre    TEXT        NOT NULL DEFAULT '',
    sub_genres       TEXT[]      NOT NULL DEFAULT '{}',
    target_audience  TEXT        NOT NULL DEFAULT '',
    mood_keywords    TEXT[]      NOT NULL DEFAULT '{}',
    avoid_keywords   TEXT[]      NOT NULL DEFAULT '{}',
    prompt_template  TEXT        NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT brand_kit_user_unique UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_brand_kit_user_id ON brand_kit (user_id);
CREATE TRIGGER set_updated_at_brand_kit BEFORE UPDATE ON brand_kit FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS lyrics_history (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title      TEXT        NOT NULL DEFAULT '',
    genre      TEXT        NOT NULL DEFAULT '',
    mood       TEXT        NOT NULL DEFAULT '',
    theme      TEXT        NOT NULL DEFAULT '',
    language   TEXT        NOT NULL DEFAULT 'ko' CHECK (language IN ('ko', 'en', 'mixed')),
    style      TEXT        NOT NULL DEFAULT '',
    lyrics     TEXT        NOT NULL DEFAULT '',
    model      TEXT        NOT NULL DEFAULT 'flash' CHECK (model IN ('flash', 'pro')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lyrics_history_user_id    ON lyrics_history (user_id);
CREATE INDEX IF NOT EXISTS idx_lyrics_history_created_at ON lyrics_history (created_at DESC);

ALTER TABLE brand_kit      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lyrics_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_kit: select own" ON brand_kit FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "brand_kit: insert own" ON brand_kit FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brand_kit: update own" ON brand_kit FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brand_kit: delete own" ON brand_kit FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "lyrics_history: select own" ON lyrics_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lyrics_history: insert own" ON lyrics_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lyrics_history: delete own" ON lyrics_history FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- [003] RLS 비활성화 (NextAuth 호환)
-- ============================================================

DROP POLICY IF EXISTS "channel_info: select own"  ON channel_info;
DROP POLICY IF EXISTS "channel_info: insert own"  ON channel_info;
DROP POLICY IF EXISTS "channel_info: update own"  ON channel_info;
DROP POLICY IF EXISTS "channel_info: delete own"  ON channel_info;
ALTER TABLE channel_info DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scrap_sheets: select own"  ON scrap_sheets;
DROP POLICY IF EXISTS "scrap_sheets: insert own"  ON scrap_sheets;
DROP POLICY IF EXISTS "scrap_sheets: update own"  ON scrap_sheets;
DROP POLICY IF EXISTS "scrap_sheets: delete own"  ON scrap_sheets;
ALTER TABLE scrap_sheets DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scrap_items: select own"   ON scrap_items;
DROP POLICY IF EXISTS "scrap_items: insert own"   ON scrap_items;
DROP POLICY IF EXISTS "scrap_items: update own"   ON scrap_items;
DROP POLICY IF EXISTS "scrap_items: delete own"   ON scrap_items;
ALTER TABLE scrap_items DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_settings: select own" ON user_settings;
DROP POLICY IF EXISTS "user_settings: insert own" ON user_settings;
DROP POLICY IF EXISTS "user_settings: update own" ON user_settings;
DROP POLICY IF EXISTS "user_settings: delete own" ON user_settings;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "youtube_channels: select own" ON youtube_channels;
DROP POLICY IF EXISTS "youtube_channels: insert own" ON youtube_channels;
DROP POLICY IF EXISTS "youtube_channels: update own" ON youtube_channels;
DROP POLICY IF EXISTS "youtube_channels: delete own" ON youtube_channels;
ALTER TABLE youtube_channels DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_kit: select own"     ON brand_kit;
DROP POLICY IF EXISTS "brand_kit: insert own"     ON brand_kit;
DROP POLICY IF EXISTS "brand_kit: update own"     ON brand_kit;
DROP POLICY IF EXISTS "brand_kit: delete own"     ON brand_kit;
ALTER TABLE brand_kit DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lyrics_history: select own" ON lyrics_history;
DROP POLICY IF EXISTS "lyrics_history: insert own" ON lyrics_history;
DROP POLICY IF EXISTS "lyrics_history: delete own" ON lyrics_history;
ALTER TABLE lyrics_history DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- [004] user_id UUID → TEXT (NextAuth 호환)
-- ============================================================

DROP VIEW IF EXISTS user_stats;

ALTER TABLE channel_info    DROP CONSTRAINT IF EXISTS channel_info_user_id_fkey;
ALTER TABLE channel_info    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE scrap_sheets    DROP CONSTRAINT IF EXISTS scrap_sheets_user_id_fkey;
ALTER TABLE scrap_sheets    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE scrap_items     DROP CONSTRAINT IF EXISTS scrap_items_user_id_fkey;
ALTER TABLE scrap_items     ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE user_settings   DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;
ALTER TABLE user_settings   ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE youtube_channels DROP CONSTRAINT IF EXISTS youtube_channels_user_id_fkey;
ALTER TABLE youtube_channels ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE brand_kit       DROP CONSTRAINT IF EXISTS brand_kit_user_id_fkey;
ALTER TABLE brand_kit       ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE lyrics_history  DROP CONSTRAINT IF EXISTS lyrics_history_user_id_fkey;
ALTER TABLE lyrics_history  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

CREATE OR REPLACE VIEW user_stats AS
SELECT
    si_agg.user_id AS user_id,
    COUNT(DISTINCT si_agg.id) FILTER (WHERE si_agg.deleted_at IS NULL) AS total_songs,
    COUNT(DISTINCT si_agg.id) FILTER (WHERE si_agg.status = 'used' AND si_agg.deleted_at IS NULL) AS used_songs,
    COALESCE(SUM(yc.total_views) FILTER (WHERE yc.deleted_at IS NULL), 0) AS total_views,
    COUNT(DISTINCT si_agg.id) FILTER (WHERE si_agg.status != 'unused' AND si_agg.deleted_at IS NULL) AS uploaded_count
FROM scrap_items si_agg
LEFT JOIN youtube_channels yc ON yc.user_id = si_agg.user_id
GROUP BY si_agg.user_id;

-- ============================================================
-- [005] revenue_entries + songs
-- ============================================================

CREATE TABLE IF NOT EXISTS revenue_entries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL,
    platform    TEXT NOT NULL CHECK (platform IN ('youtube','distrokid','spotify','apple_music','other')),
    amount      INTEGER NOT NULL CHECK (amount > 0),
    views       INTEGER,
    streams     INTEGER,
    period      TEXT NOT NULL,
    genre       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "revenue_entries_user_policy" ON revenue_entries
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE TABLE IF NOT EXISTS songs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT NOT NULL,
    title           TEXT NOT NULL,
    genre           TEXT NOT NULL,
    distributed_at  DATE NOT NULL,
    platforms       TEXT[] NOT NULL DEFAULT '{}',
    isrc            TEXT,
    status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','distributed','earning')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "songs_user_policy" ON songs
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================
-- 006: cover_image_history 컬럼 추가
-- ============================================================

ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS cover_image_history JSONB DEFAULT '[]'::JSONB;

-- ============================================================
-- 완료! 테이블: channel_info, scrap_sheets, scrap_items,
--   user_settings, youtube_channels, brand_kit,
--   lyrics_history, revenue_entries, songs
-- 컬럼 추가: user_settings.cover_image_history (JSONB)
-- ============================================================
