-- Phase: cover-image-generator 이력 패널
-- user_settings 테이블에 cover_image_history jsonb 컬럼 추가

ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS cover_image_history JSONB DEFAULT '[]'::JSONB;
