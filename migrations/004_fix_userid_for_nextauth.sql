-- ============================================================
-- 004_fix_userid_for_nextauth.sql
-- NextAuth 호환을 위해 user_id 컬럼 수정
--
-- 문제: user_id가 auth.users(id)를 참조하지만
--       NextAuth는 Supabase Auth를 사용하지 않음
-- 해결: 뷰 삭제 → FK 제약 제거 → UUID→TEXT 변경 → 뷰 재생성
-- ============================================================

-- ── user_stats 뷰 먼저 삭제 (user_id 컬럼에 의존함) ────────
DROP VIEW IF EXISTS user_stats;

-- ── channel_info ──────────────────────────────────────────
ALTER TABLE channel_info
    DROP CONSTRAINT IF EXISTS channel_info_user_id_fkey;
ALTER TABLE channel_info
    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- ── scrap_sheets ──────────────────────────────────────────
ALTER TABLE scrap_sheets
    DROP CONSTRAINT IF EXISTS scrap_sheets_user_id_fkey;
ALTER TABLE scrap_sheets
    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- ── scrap_items ───────────────────────────────────────────
ALTER TABLE scrap_items
    DROP CONSTRAINT IF EXISTS scrap_items_user_id_fkey;
ALTER TABLE scrap_items
    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- ── user_settings ─────────────────────────────────────────
ALTER TABLE user_settings
    DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;
ALTER TABLE user_settings
    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- ── youtube_channels ──────────────────────────────────────
ALTER TABLE youtube_channels
    DROP CONSTRAINT IF EXISTS youtube_channels_user_id_fkey;
ALTER TABLE youtube_channels
    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- ── brand_kit ─────────────────────────────────────────────
ALTER TABLE brand_kit
    DROP CONSTRAINT IF EXISTS brand_kit_user_id_fkey;
ALTER TABLE brand_kit
    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- ── lyrics_history ────────────────────────────────────────
ALTER TABLE lyrics_history
    DROP CONSTRAINT IF EXISTS lyrics_history_user_id_fkey;
ALTER TABLE lyrics_history
    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- ── user_stats 뷰 재생성 (auth.users 대신 scrap_items 기준) ─
CREATE OR REPLACE VIEW user_stats AS
SELECT
    si_agg.user_id                               AS user_id,
    COUNT(DISTINCT si_agg.id) FILTER (
        WHERE si_agg.deleted_at IS NULL
    )                                            AS total_songs,
    COUNT(DISTINCT si_agg.id) FILTER (
        WHERE si_agg.status = 'used'
        AND   si_agg.deleted_at IS NULL
    )                                            AS used_songs,
    COALESCE(SUM(yc.total_views) FILTER (
        WHERE yc.deleted_at IS NULL
    ), 0)                                        AS total_views,
    COUNT(DISTINCT si_agg.id) FILTER (
        WHERE si_agg.status != 'unused'
        AND   si_agg.deleted_at IS NULL
    )                                            AS uploaded_count
FROM scrap_items si_agg
LEFT JOIN youtube_channels yc ON yc.user_id = si_agg.user_id
GROUP BY si_agg.user_id;
