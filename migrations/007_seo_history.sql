-- Phase: seo-package 이력 패널
-- user_settings 테이블에 seo_history jsonb 컬럼 추가

ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS seo_history JSONB DEFAULT '[]'::JSONB;
