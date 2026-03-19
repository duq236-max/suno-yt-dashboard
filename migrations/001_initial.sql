-- ============================================================
-- 001_initial.sql
-- suno-yt-dashboard — Supabase PostgreSQL Initial Schema
-- ============================================================
-- 실행 순서: Supabase Dashboard > SQL Editor 에 붙여넣기
-- 또는: supabase db push (CLI 사용 시)
-- ============================================================

-- ──────────────────────────────────────────────
-- 0. Extensions
-- ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────
-- 1. channel_info
--    ChannelInfo 인터페이스 → 1:1 (user당 하나)
-- ──────────────────────────────────────────────
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

    -- user당 channel_info는 하나만 허용
    CONSTRAINT channel_info_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_info_user_id ON channel_info (user_id);

-- ──────────────────────────────────────────────
-- 2. scrap_sheets
--    ScrapSheet 인터페이스 (items 제외)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scrap_sheets (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name          TEXT        NOT NULL DEFAULT '',
    channel_name  TEXT,
    genre         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ             -- 소프트 딜리트
);

CREATE INDEX IF NOT EXISTS idx_scrap_sheets_user_id    ON scrap_sheets (user_id);
CREATE INDEX IF NOT EXISTS idx_scrap_sheets_deleted_at ON scrap_sheets (deleted_at)
    WHERE deleted_at IS NULL;

-- ──────────────────────────────────────────────
-- 3. scrap_items
--    ScrapItem 인터페이스
--    mood_tags → TEXT[] (PostgreSQL 네이티브 배열)
-- ──────────────────────────────────────────────
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
    deleted_at      TIMESTAMPTZ             -- 소프트 딜리트
);

CREATE INDEX IF NOT EXISTS idx_scrap_items_sheet_id   ON scrap_items (sheet_id);
CREATE INDEX IF NOT EXISTS idx_scrap_items_user_id    ON scrap_items (user_id);
CREATE INDEX IF NOT EXISTS idx_scrap_items_status     ON scrap_items (status);
CREATE INDEX IF NOT EXISTS idx_scrap_items_deleted_at ON scrap_items (deleted_at)
    WHERE deleted_at IS NULL;

-- ──────────────────────────────────────────────
-- 4. user_settings
--    ScheduleConfig + geminiApiKey 통합
--    stats는 계산 가능하므로 집계 뷰로 대체
-- ──────────────────────────────────────────────
CREATE TYPE schedule_frequency AS ENUM ('daily', '3perweek', 'weekly');

CREATE TABLE IF NOT EXISTS user_settings (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- ScheduleConfig
    schedule_enabled  BOOLEAN     NOT NULL DEFAULT FALSE,
    schedule_frequency schedule_frequency NOT NULL DEFAULT 'daily',
    schedule_target_time TEXT     NOT NULL DEFAULT '18:00',
    email_alert       BOOLEAN     NOT NULL DEFAULT FALSE,
    email_address     TEXT,
    -- API Keys (암호화 권장: Supabase Vault 사용 가능)
    gemini_api_key    TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT user_settings_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings (user_id);

-- ──────────────────────────────────────────────
-- 5. youtube_channels
--    YoutubeChannel 인터페이스
-- ──────────────────────────────────────────────
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
    avg_engagement   NUMERIC(6, 4),   -- 소수점 4자리 (예: 0.0312 = 3.12%)
    total_shares     BIGINT,
    subscriber_count BIGINT,
    connected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_youtube_channels_user_id    ON youtube_channels (user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_channels_deleted_at ON youtube_channels (deleted_at)
    WHERE deleted_at IS NULL;

-- ──────────────────────────────────────────────
-- 6. stats 집계 뷰 (AppData.stats 대체)
--    SELECT로 실시간 계산 — 별도 저장 불필요
-- ──────────────────────────────────────────────
CREATE OR REPLACE VIEW user_stats AS
SELECT
    u.id                                         AS user_id,
    COUNT(DISTINCT si.id) FILTER (
        WHERE si.deleted_at IS NULL
    )                                            AS total_songs,
    COUNT(DISTINCT si.id) FILTER (
        WHERE si.status = 'used'
        AND   si.deleted_at IS NULL
    )                                            AS used_songs,
    COALESCE(SUM(yc.total_views) FILTER (
        WHERE yc.deleted_at IS NULL
    ), 0)                                        AS total_views,
    COUNT(DISTINCT si.id) FILTER (
        WHERE si.status != 'unused'
        AND   si.deleted_at IS NULL
    )                                            AS uploaded_count
FROM auth.users u
LEFT JOIN scrap_sheets  ss ON ss.user_id = u.id AND ss.deleted_at IS NULL
LEFT JOIN scrap_items   si ON si.user_id = u.id
LEFT JOIN youtube_channels yc ON yc.user_id = u.id
GROUP BY u.id;

-- ──────────────────────────────────────────────
-- 7. updated_at 자동 갱신 트리거
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_channel_info
    BEFORE UPDATE ON channel_info
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_scrap_sheets
    BEFORE UPDATE ON scrap_sheets
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_scrap_items
    BEFORE UPDATE ON scrap_items
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_user_settings
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_youtube_channels
    BEFORE UPDATE ON youtube_channels
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ──────────────────────────────────────────────
-- 8. Row Level Security 활성화
-- ──────────────────────────────────────────────
ALTER TABLE channel_info      ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrap_sheets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrap_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_channels   ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────
-- 9. RLS 정책 — channel_info
-- ──────────────────────────────────────────────
CREATE POLICY "channel_info: select own"
    ON channel_info FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "channel_info: insert own"
    ON channel_info FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "channel_info: update own"
    ON channel_info FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "channel_info: delete own"
    ON channel_info FOR DELETE
    USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 10. RLS 정책 — scrap_sheets
-- ──────────────────────────────────────────────
CREATE POLICY "scrap_sheets: select own"
    ON scrap_sheets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "scrap_sheets: insert own"
    ON scrap_sheets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scrap_sheets: update own"
    ON scrap_sheets FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scrap_sheets: delete own"
    ON scrap_sheets FOR DELETE
    USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 11. RLS 정책 — scrap_items
-- ──────────────────────────────────────────────
CREATE POLICY "scrap_items: select own"
    ON scrap_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "scrap_items: insert own"
    ON scrap_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scrap_items: update own"
    ON scrap_items FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scrap_items: delete own"
    ON scrap_items FOR DELETE
    USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 12. RLS 정책 — user_settings
-- ──────────────────────────────────────────────
CREATE POLICY "user_settings: select own"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "user_settings: insert own"
    ON user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings: update own"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings: delete own"
    ON user_settings FOR DELETE
    USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 13. RLS 정책 — youtube_channels
-- ──────────────────────────────────────────────
CREATE POLICY "youtube_channels: select own"
    ON youtube_channels FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "youtube_channels: insert own"
    ON youtube_channels FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "youtube_channels: update own"
    ON youtube_channels FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "youtube_channels: delete own"
    ON youtube_channels FOR DELETE
    USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 14. user_stats 뷰 RLS (뷰는 기반 테이블 RLS 상속)
--     추가로 security invoker 설정
-- ──────────────────────────────────────────────
-- 뷰는 auth.users를 LEFT JOIN하므로 서비스 롤에서만 전체 접근 가능.
-- 클라이언트는 WHERE user_id = auth.uid() 필터를 명시적으로 사용 권장.

-- ============================================================
-- 완료. 테이블 목록:
--   channel_info, scrap_sheets, scrap_items,
--   user_settings, youtube_channels
-- 뷰:
--   user_stats
-- ============================================================
