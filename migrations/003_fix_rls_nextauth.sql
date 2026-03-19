-- ============================================================
-- 003_fix_rls_nextauth.sql
-- NextAuth 사용 시 Supabase RLS 정책 수정
--
-- 문제: 기존 RLS가 auth.uid()를 사용하지만 NextAuth는
--       Supabase Auth를 사용하지 않으므로 auth.uid() = NULL
-- 해결: 기존 정책 제거 후 재설정 — Supabase에서 실행하세요
-- ============================================================

-- ── channel_info ──────────────────────────────────────────
DROP POLICY IF EXISTS "channel_info: select own"  ON channel_info;
DROP POLICY IF EXISTS "channel_info: insert own"  ON channel_info;
DROP POLICY IF EXISTS "channel_info: update own"  ON channel_info;
DROP POLICY IF EXISTS "channel_info: delete own"  ON channel_info;
ALTER TABLE channel_info DISABLE ROW LEVEL SECURITY;

-- ── scrap_sheets ──────────────────────────────────────────
DROP POLICY IF EXISTS "scrap_sheets: select own"  ON scrap_sheets;
DROP POLICY IF EXISTS "scrap_sheets: insert own"  ON scrap_sheets;
DROP POLICY IF EXISTS "scrap_sheets: update own"  ON scrap_sheets;
DROP POLICY IF EXISTS "scrap_sheets: delete own"  ON scrap_sheets;
ALTER TABLE scrap_sheets DISABLE ROW LEVEL SECURITY;

-- ── scrap_items ───────────────────────────────────────────
DROP POLICY IF EXISTS "scrap_items: select own"   ON scrap_items;
DROP POLICY IF EXISTS "scrap_items: insert own"   ON scrap_items;
DROP POLICY IF EXISTS "scrap_items: update own"   ON scrap_items;
DROP POLICY IF EXISTS "scrap_items: delete own"   ON scrap_items;
ALTER TABLE scrap_items DISABLE ROW LEVEL SECURITY;

-- ── user_settings ─────────────────────────────────────────
DROP POLICY IF EXISTS "user_settings: select own" ON user_settings;
DROP POLICY IF EXISTS "user_settings: insert own" ON user_settings;
DROP POLICY IF EXISTS "user_settings: update own" ON user_settings;
DROP POLICY IF EXISTS "user_settings: delete own" ON user_settings;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;

-- ── youtube_channels ──────────────────────────────────────
DROP POLICY IF EXISTS "youtube_channels: select own" ON youtube_channels;
DROP POLICY IF EXISTS "youtube_channels: insert own" ON youtube_channels;
DROP POLICY IF EXISTS "youtube_channels: update own" ON youtube_channels;
DROP POLICY IF EXISTS "youtube_channels: delete own" ON youtube_channels;
ALTER TABLE youtube_channels DISABLE ROW LEVEL SECURITY;

-- ── brand_kit ─────────────────────────────────────────────
DROP POLICY IF EXISTS "brand_kit: select own"     ON brand_kit;
DROP POLICY IF EXISTS "brand_kit: insert own"     ON brand_kit;
DROP POLICY IF EXISTS "brand_kit: update own"     ON brand_kit;
DROP POLICY IF EXISTS "brand_kit: delete own"     ON brand_kit;
ALTER TABLE brand_kit DISABLE ROW LEVEL SECURITY;

-- ── lyrics_history ────────────────────────────────────────
DROP POLICY IF EXISTS "lyrics_history: select own" ON lyrics_history;
DROP POLICY IF EXISTS "lyrics_history: insert own" ON lyrics_history;
DROP POLICY IF EXISTS "lyrics_history: update own" ON lyrics_history;
DROP POLICY IF EXISTS "lyrics_history: delete own" ON lyrics_history;
ALTER TABLE lyrics_history DISABLE ROW LEVEL SECURITY;
