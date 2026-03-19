-- ============================================================
-- 002_phase1.sql
-- Phase 1 추가 테이블: brand_kit, lyrics_history
-- 실행 전제: 001_initial.sql 이 먼저 실행되어야 합니다
--   (trigger_set_updated_at 함수 의존)
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. brand_kit
--    BrandKit 인터페이스 → 1:1 (user당 하나)
-- ──────────────────────────────────────────────
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

CREATE TRIGGER set_updated_at_brand_kit
    BEFORE UPDATE ON brand_kit
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ──────────────────────────────────────────────
-- 2. lyrics_history
--    LyricsHistoryItem 인터페이스 (최대 50개 유지)
--    ENUM 대신 TEXT + CHECK 사용 (롤백 유연성 확보)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lyrics_history (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title      TEXT        NOT NULL DEFAULT '',
    genre      TEXT        NOT NULL DEFAULT '',
    mood       TEXT        NOT NULL DEFAULT '',
    theme      TEXT        NOT NULL DEFAULT '',
    language   TEXT        NOT NULL DEFAULT 'ko'
                           CHECK (language IN ('ko', 'en', 'mixed')),
    style      TEXT        NOT NULL DEFAULT '',
    lyrics     TEXT        NOT NULL DEFAULT '',
    model      TEXT        NOT NULL DEFAULT 'flash'
                           CHECK (model IN ('flash', 'pro')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lyrics_history_user_id    ON lyrics_history (user_id);
CREATE INDEX IF NOT EXISTS idx_lyrics_history_created_at ON lyrics_history (created_at DESC);

-- ──────────────────────────────────────────────
-- 3. RLS 활성화
-- ──────────────────────────────────────────────
ALTER TABLE brand_kit      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lyrics_history ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────
-- 4. RLS 정책 — brand_kit
-- ──────────────────────────────────────────────
CREATE POLICY "brand_kit: select own"
    ON brand_kit FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "brand_kit: insert own"
    ON brand_kit FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "brand_kit: update own"
    ON brand_kit FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "brand_kit: delete own"
    ON brand_kit FOR DELETE
    USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- 5. RLS 정책 — lyrics_history
--    INSERT와 SELECT, DELETE만 허용 (수정 불가 — 히스토리는 불변)
-- ──────────────────────────────────────────────
CREATE POLICY "lyrics_history: select own"
    ON lyrics_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "lyrics_history: insert own"
    ON lyrics_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lyrics_history: delete own"
    ON lyrics_history FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 완료. 추가 테이블:
--   brand_kit, lyrics_history
-- ============================================================
