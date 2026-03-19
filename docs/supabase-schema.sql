-- ================================================================
-- suno-yt-dashboard — Supabase PostgreSQL 스키마
-- localStorage(AppData) → 관계형 DB 변환 설계
-- Project Ref: jnieczauqzumckyquugq
-- 실행 순서: 이 파일을 Supabase SQL Editor에 붙여넣기
-- ================================================================

-- ── Extensions ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. channels (ChannelInfo)
--    localStorage: data.channel
-- ================================================================
CREATE TABLE IF NOT EXISTS channels (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name          TEXT NOT NULL,
  genre         TEXT NOT NULL DEFAULT '',
  target_audience TEXT NOT NULL DEFAULT '',
  upload_frequency TEXT NOT NULL DEFAULT '',
  youtube_name  TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 사용자당 채널 하나 (MusePilot 구조)
CREATE UNIQUE INDEX IF NOT EXISTS channels_user_id_idx ON channels(user_id);

-- ================================================================
-- 2. scrap_sheets (ScrapSheet)
--    localStorage: data.sheets[]
-- ================================================================
CREATE TABLE IF NOT EXISTS scrap_sheets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name          TEXT NOT NULL,
  channel_name  TEXT,
  genre         TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scrap_sheets_user_id_idx ON scrap_sheets(user_id);

-- ================================================================
-- 3. scrap_items (ScrapItem)
--    localStorage: data.sheets[].items[]
-- ================================================================
CREATE TYPE scrap_status AS ENUM ('unused', 'ready', 'used');

CREATE TABLE IF NOT EXISTS scrap_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sheet_id      UUID NOT NULL REFERENCES scrap_sheets(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 기본 필드
  title         TEXT NOT NULL DEFAULT '',
  prompt        TEXT NOT NULL DEFAULT '',
  lyrics        TEXT NOT NULL DEFAULT '',
  genre         TEXT NOT NULL DEFAULT '',
  status        scrap_status NOT NULL DEFAULT 'unused',
  notes         TEXT,

  -- MusePilot 스타일 필드 (Phase 2A)
  instruments   TEXT,
  mood_tags     TEXT[],           -- 배열: ['chill', 'rainy', 'lofi']
  is_instrumental BOOLEAN DEFAULT FALSE,

  -- Suno 생성 결과 (Phase 2)
  suno_song_id  TEXT,            -- Suno에서 생성된 곡 ID
  suno_song_url TEXT,            -- 생성된 곡 URL

  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scrap_items_sheet_id_idx ON scrap_items(sheet_id);
CREATE INDEX IF NOT EXISTS scrap_items_user_id_idx  ON scrap_items(user_id);
CREATE INDEX IF NOT EXISTS scrap_items_status_idx   ON scrap_items(status);

-- ================================================================
-- 4. youtube_channels (YoutubeChannel)
--    localStorage: data.youtubeChannels[]
-- ================================================================
CREATE TABLE IF NOT EXISTS youtube_channels (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  channel_name    TEXT NOT NULL,
  channel_url     TEXT NOT NULL DEFAULT '',
  thumbnail_url   TEXT,
  youtube_channel_id TEXT,       -- YouTube API channel ID (Phase 2)

  -- 수동 입력 통계 (현재)
  subscriber_count  BIGINT DEFAULT 0,
  total_views       BIGINT DEFAULT 0,
  total_watch_hours BIGINT DEFAULT 0,
  total_likes       BIGINT DEFAULT 0,
  total_comments    BIGINT DEFAULT 0,
  total_shares      BIGINT DEFAULT 0,
  avg_engagement    DECIMAL(5,2) DEFAULT 0,   -- 평균 참여율 %

  -- API 마지막 동기화 (Phase 2)
  last_synced_at  TIMESTAMPTZ,

  connected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS youtube_channels_user_id_idx ON youtube_channels(user_id);

-- ================================================================
-- 5. schedules (ScheduleConfig)
--    localStorage: data.schedule
-- ================================================================
CREATE TYPE schedule_frequency AS ENUM ('daily', '3perweek', 'weekly');

CREATE TABLE IF NOT EXISTS schedules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  frequency       schedule_frequency NOT NULL DEFAULT 'daily',
  target_time     TEXT NOT NULL DEFAULT '18:00',   -- "HH:MM" 형식
  email_alert     BOOLEAN NOT NULL DEFAULT FALSE,
  email_address   TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 사용자당 스케줄 하나
CREATE UNIQUE INDEX IF NOT EXISTS schedules_user_id_idx ON schedules(user_id);

-- ================================================================
-- 6. user_settings (기타 설정)
--    localStorage: data.geminiApiKey, data.stats
-- ================================================================
CREATE TABLE IF NOT EXISTS user_settings (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- API 키 (암호화 권장 — Supabase Vault 사용)
  gemini_api_key  TEXT,

  -- 집계 통계 (캐시용)
  total_songs     INTEGER DEFAULT 0,
  used_songs      INTEGER DEFAULT 0,
  total_views     BIGINT DEFAULT 0,
  uploaded_count  INTEGER DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- RLS (Row Level Security) 정책
-- ================================================================

-- 활성화
ALTER TABLE channels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrap_sheets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrap_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings    ENABLE ROW LEVEL SECURITY;

-- channels 정책
CREATE POLICY "channels: 본인 데이터만" ON channels
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- scrap_sheets 정책
CREATE POLICY "scrap_sheets: 본인 데이터만" ON scrap_sheets
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- scrap_items 정책
CREATE POLICY "scrap_items: 본인 데이터만" ON scrap_items
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- youtube_channels 정책
CREATE POLICY "youtube_channels: 본인 데이터만" ON youtube_channels
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- schedules 정책
CREATE POLICY "schedules: 본인 데이터만" ON schedules
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_settings 정책
CREATE POLICY "user_settings: 본인 데이터만" ON user_settings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ================================================================
-- updated_at 자동 갱신 트리거
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_scrap_sheets_updated_at
  BEFORE UPDATE ON scrap_sheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_scrap_items_updated_at
  BEFORE UPDATE ON scrap_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_youtube_channels_updated_at
  BEFORE UPDATE ON youtube_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================================
-- localStorage → Supabase 마이그레이션 참고 순서
-- ================================================================
-- 1. user_settings INSERT (geminiApiKey)
-- 2. channels INSERT (channel 정보)
-- 3. schedules INSERT (schedule 설정)
-- 4. youtube_channels INSERT (YT 채널들)
-- 5. scrap_sheets INSERT (시트 목록)
-- 6. scrap_items INSERT (각 시트의 items — sheet_id FK 연결)
-- 마이그레이션 코드: src/lib/migrate.ts 참조 예정
