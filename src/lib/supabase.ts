import { createClient } from '@supabase/supabase-js';
import type { ScrapStatus } from '@/types';

// ──────────────────────────────────────────────────────────
// 환경변수 검증
// ──────────────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder';

// ──────────────────────────────────────────────────────────
// Database 타입 정의 (Supabase 테이블 → TypeScript)
// ──────────────────────────────────────────────────────────

// NOTE: type aliases (not interface) required so these satisfy Record<string, unknown>
// for supabase-js v2 generic type inference (GenericSchema extends check)
export type DbChannelInfo = {
    id: string;
    user_id: string;
    name: string;
    genre: string;
    target_audience: string;
    upload_frequency: string;
    youtube_name: string | null;
    created_at: string;
    updated_at: string;
};

export type DbScrapSheet = {
    id: string;
    user_id: string;
    name: string;
    channel_name: string | null;
    genre: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
};

export type DbScrapItem = {
    id: string;
    sheet_id: string;
    user_id: string;
    prompt: string;
    lyrics: string;
    title: string;
    genre: string;
    status: ScrapStatus;
    instruments: string | null;
    mood_tags: string[];
    is_instrumental: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
    used_at: string | null;
    deleted_at: string | null;
};

export type DbUserSettings = {
    id: string;
    user_id: string;
    schedule_enabled: boolean;
    schedule_frequency: 'daily' | '3perweek' | 'weekly';
    schedule_target_time: string;
    email_alert: boolean;
    email_address: string | null;
    gemini_api_key: string | null;
    created_at: string;
    updated_at: string;
};

export type DbYoutubeChannel = {
    id: string;
    user_id: string;
    channel_name: string;
    channel_url: string;
    thumbnail_url: string | null;
    total_views: number | null;
    total_watch_hours: number | null;
    total_likes: number | null;
    total_comments: number | null;
    avg_engagement: number | null;
    total_shares: number | null;
    subscriber_count: number | null;
    connected_at: string;
    updated_at: string;
    deleted_at: string | null;
};

export type DbUserStats = {
    user_id: string;
    total_songs: number;
    used_songs: number;
    total_views: number;
    uploaded_count: number;
};

export type DbBrandKit = {
    id: string;
    user_id: string;
    channel_name: string;
    tagline: string;
    primary_genre: string;
    sub_genres: string[];
    target_audience: string;
    mood_keywords: string[];
    avoid_keywords: string[];
    prompt_template: string;
    created_at: string;
    updated_at: string;
};

export type DbLyricsHistory = {
    id: string;
    user_id: string;
    title: string;
    genre: string;
    mood: string;
    theme: string;
    language: 'ko' | 'en' | 'ja' | 'zh' | 'mixed';
    style: string;
    lyrics: string;
    model: 'flash' | 'pro';
    created_at: string;
};

// ──────────────────────────────────────────────────────────
// Insert 타입 — 각 테이블의 명시적 인터페이스
// (supabase-js v2 제네릭 타입 추론을 위해 구체적 타입 사용)
// ──────────────────────────────────────────────────────────
export type DbChannelInfoInsert = {
    id?: string;
    user_id: string;
    name: string;
    genre: string;
    target_audience: string;
    upload_frequency: string;
    youtube_name?: string | null;
}

export type DbScrapSheetInsert = {
    id?: string;
    user_id: string;
    name: string;
    channel_name?: string | null;
    genre?: string | null;
    deleted_at?: string | null;
}

export type DbScrapItemInsert = {
    id?: string;
    sheet_id: string;
    user_id: string;
    prompt: string;
    lyrics: string;
    title: string;
    genre: string;
    status: ScrapStatus;
    instruments?: string | null;
    mood_tags: string[];
    is_instrumental: boolean;
    notes?: string | null;
    used_at?: string | null;
    deleted_at?: string | null;
}

export type DbUserSettingsInsert = {
    id?: string;
    user_id: string;
    schedule_enabled: boolean;
    schedule_frequency: 'daily' | '3perweek' | 'weekly';
    schedule_target_time: string;
    email_alert: boolean;
    email_address?: string | null;
    gemini_api_key?: string | null;
}

export type DbYoutubeChannelInsert = {
    id?: string;
    user_id: string;
    channel_name: string;
    channel_url: string;
    thumbnail_url?: string | null;
    total_views?: number | null;
    total_watch_hours?: number | null;
    total_likes?: number | null;
    total_comments?: number | null;
    avg_engagement?: number | null;
    total_shares?: number | null;
    subscriber_count?: number | null;
    connected_at?: string;
    deleted_at?: string | null;
}

export type DbBrandKitInsert = {
    id?: string;
    user_id: string;
    channel_name: string;
    tagline: string;
    primary_genre: string;
    sub_genres: string[];
    target_audience: string;
    mood_keywords: string[];
    avoid_keywords: string[];
    prompt_template: string;
}

export type DbLyricsHistoryInsert = {
    id?: string;
    user_id: string;
    title: string;
    genre: string;
    mood: string;
    theme: string;
    language: 'ko' | 'en' | 'ja' | 'zh' | 'mixed';
    style: string;
    lyrics: string;
    model: 'flash' | 'pro';
}

type Rel = {
    foreignKeyName: string;
    columns: string[];
    isOneToOne?: boolean;
    referencedRelation: string;
    referencedColumns: string[];
};

// ──────────────────────────────────────────────────────────
// Database 인터페이스 (supabase-js 제네릭용)
// ──────────────────────────────────────────────────────────
export type Database = {
    public: {
        Tables: {
            channel_info: {
                Row: DbChannelInfo;
                Insert: DbChannelInfoInsert;
                Update: Partial<DbChannelInfoInsert>;
                Relationships: Rel[];
            };
            scrap_sheets: {
                Row: DbScrapSheet;
                Insert: DbScrapSheetInsert;
                Update: Partial<DbScrapSheetInsert>;
                Relationships: Rel[];
            };
            scrap_items: {
                Row: DbScrapItem;
                Insert: DbScrapItemInsert;
                Update: Partial<DbScrapItemInsert>;
                Relationships: Rel[];
            };
            user_settings: {
                Row: DbUserSettings;
                Insert: DbUserSettingsInsert;
                Update: Partial<DbUserSettingsInsert>;
                Relationships: Rel[];
            };
            youtube_channels: {
                Row: DbYoutubeChannel;
                Insert: DbYoutubeChannelInsert;
                Update: Partial<DbYoutubeChannelInsert>;
                Relationships: Rel[];
            };
            brand_kit: {
                Row: DbBrandKit;
                Insert: DbBrandKitInsert;
                Update: Partial<DbBrandKitInsert>;
                Relationships: Rel[];
            };
            lyrics_history: {
                Row: DbLyricsHistory;
                Insert: DbLyricsHistoryInsert;
                Update: Partial<DbLyricsHistoryInsert>;
                Relationships: Rel[];
            };
        };
        Views: {
            user_stats: {
                Row: DbUserStats;
                Relationships: Rel[];
            };
        };
        Functions: Record<never, never>;
        Enums: {
            scrap_status: ScrapStatus;
            schedule_frequency: 'daily' | '3perweek' | 'weekly';
        };
    };
}

// ──────────────────────────────────────────────────────────
// Supabase 클라이언트 싱글턴
// ──────────────────────────────────────────────────────────
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
});

// ──────────────────────────────────────────────────────────
// 현재 인증된 사용자 uid 조회 헬퍼 (NextAuth 기반)
// - 서버 컨텍스트(API 라우트·서버 컴포넌트): auth() 직접 호출
// - 클라이언트 컨텍스트: /api/user/me 라우트 fetch
// 미인증 상태라면 null 반환 (호출부에서 처리)
// ──────────────────────────────────────────────────────────
export async function getCurrentUserId(): Promise<string | null> {
    if (typeof window === 'undefined') {
        // 서버 컨텍스트 — NextAuth auth() 직접 호출
        const { auth } = await import('@/auth');
        const session = await auth();
        return session?.user?.id ?? null;
    }

    // 클라이언트 컨텍스트 — 경량 API 라우트로 세션 조회
    try {
        const res = await fetch('/api/user/me');
        if (!res.ok) return null;
        const { userId } = (await res.json()) as { userId: string | null };
        return userId;
    } catch {
        return null;
    }
}
