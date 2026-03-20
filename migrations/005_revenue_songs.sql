-- Phase 6 B6: revenue_entries + songs 테이블

CREATE TABLE IF NOT EXISTS revenue_entries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL,
    platform    TEXT NOT NULL CHECK (platform IN ('youtube','distrokid','spotify','apple_music','other')),
    amount      INTEGER NOT NULL CHECK (amount > 0),
    views       INTEGER,
    streams     INTEGER,
    period      TEXT NOT NULL,    -- 'YYYY-MM'
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
