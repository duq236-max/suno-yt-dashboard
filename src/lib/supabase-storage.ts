/**
 * supabase-storage.ts
 *
 * storage.ts와 동일한 함수 시그니처를 유지하는 Supabase 버전.
 * Phase 2 마이그레이션 완료 후 storage.ts를 이 파일로 교체.
 *
 * 사용법:
 *   import { loadData, saveData } from '@/lib/supabase-storage';
 *
 * 주의: 모든 함수는 async. 호출부에서 await 필요.
 */

import type {
    AppData,
    ScrapSheet,
    ScrapItem,
    ChannelInfo,
    ScheduleConfig,
    YoutubeChannel,
    BrandKit,
    LyricsHistoryItem,
    RevenueEntry,
    Song,
} from '@/types';
import type { MusicGenHistory } from '@/types/music-generator';
import type { CoverImageHistory } from '@/types/cover-image';
import {
    supabase,
    getCurrentUserId,
    type DbScrapItem,
    type DbScrapSheet,
    type DbChannelInfo,
    type DbUserSettings,
    type DbYoutubeChannel,
    type DbBrandKit,
    type DbLyricsHistory,
    type DbUserStats,
    type DbRevenueEntry,
    type DbSong,
} from './supabase';

// ──────────────────────────────────────────────────────────
// 기본값 (localStorage storage.ts와 동일)
// ──────────────────────────────────────────────────────────
const DEFAULT_DATA: AppData = {
    channel: null,
    sheets: [],
    schedule: {
        enabled: false,
        frequency: 'daily',
        targetTime: '18:00',
        emailAlert: false,
    },
    stats: {
        totalSongs: 0,
        usedSongs: 0,
        totalViews: 0,
        uploadedCount: 0,
    },
    youtubeChannels: [],
    geminiApiKey: '',
    brandKit: null,
};

// ──────────────────────────────────────────────────────────
// DB Row → TypeScript 타입 변환 헬퍼
// ──────────────────────────────────────────────────────────
function toChannelInfo(row: DbChannelInfo): ChannelInfo {
    return {
        id: row.id,
        name: row.name,
        genre: row.genre,
        targetAudience: row.target_audience,
        uploadFrequency: row.upload_frequency,
        youtubeName: row.youtube_name ?? undefined,
        createdAt: row.created_at,
    };
}

function toScrapItem(row: DbScrapItem): ScrapItem {
    return {
        id: row.id,
        prompt: row.prompt,
        lyrics: row.lyrics,
        title: row.title,
        genre: row.genre,
        status: row.status,
        createdAt: row.created_at,
        usedAt: row.used_at ?? undefined,
        notes: row.notes ?? undefined,
        instruments: row.instruments ?? undefined,
        mood_tags: row.mood_tags,
        is_instrumental: row.is_instrumental,
    };
}

function toScrapSheet(row: DbScrapSheet, items: ScrapItem[]): ScrapSheet {
    return {
        id: row.id,
        name: row.name,
        channelName: row.channel_name ?? undefined,
        genre: row.genre ?? undefined,
        items,
        createdAt: row.created_at,
    };
}

function toScheduleConfig(row: DbUserSettings): ScheduleConfig {
    return {
        enabled: row.schedule_enabled,
        frequency: row.schedule_frequency,
        targetTime: row.schedule_target_time,
        emailAlert: row.email_alert,
        emailAddress: row.email_address ?? undefined,
    };
}

function toYoutubeChannel(row: DbYoutubeChannel): YoutubeChannel {
    return {
        id: row.id,
        channelName: row.channel_name,
        channelUrl: row.channel_url,
        thumbnailUrl: row.thumbnail_url ?? undefined,
        totalViews: row.total_views ?? undefined,
        totalWatchHours: row.total_watch_hours ?? undefined,
        totalLikes: row.total_likes ?? undefined,
        totalComments: row.total_comments ?? undefined,
        avgEngagement: row.avg_engagement ?? undefined,
        totalShares: row.total_shares ?? undefined,
        subscriberCount: row.subscriber_count ?? undefined,
        connectedAt: row.connected_at,
    };
}

function toBrandKit(row: DbBrandKit): BrandKit {
    return {
        channelName: row.channel_name,
        tagline: row.tagline,
        primaryGenre: row.primary_genre,
        subGenres: row.sub_genres,
        targetAudience: row.target_audience,
        moodKeywords: row.mood_keywords,
        avoidKeywords: row.avoid_keywords,
        promptTemplate: row.prompt_template,
        updatedAt: row.updated_at,
    };
}

function toLyricsHistoryItem(row: DbLyricsHistory): LyricsHistoryItem {
    return {
        id: row.id,
        title: row.title,
        genre: row.genre,
        mood: row.mood,
        theme: row.theme,
        language: row.language,
        style: row.style,
        lyrics: row.lyrics,
        model: row.model,
        createdAt: row.created_at,
    };
}

// ──────────────────────────────────────────────────────────
// loadData
// storage.ts: loadData(): AppData
// Supabase: async loadData(): Promise<AppData>
// ──────────────────────────────────────────────────────────
export async function loadData(): Promise<AppData> {
    const userId = await getCurrentUserId();
    if (!userId) return { ...DEFAULT_DATA };

    await ensureUserSettings(userId);

    type MaybeSingle<T> = { data: T | null; error: { message: string } | null };
    type MaybeList<T>   = { data: T[] | null; error: { message: string } | null };

    const q = supabase as unknown as {
        from: (t: string) => {
            select: (s: string) => {
                eq: (col: string, val: string) => {
                    maybeSingle: () => Promise<MaybeSingle<never>>;
                    is: (col2: string, val2: null) => { order: (col3: string, opts: object) => Promise<MaybeList<never>> };
                    order: (col2: string, opts: object) => Promise<MaybeList<never>>;
                };
            };
        };
    };
    const [channelRes, sheetsRes, itemsRes, settingsRes, ytRes, brandKitRes, statsRes] =
        await Promise.all([
            q.from('channel_info').select('*').eq('user_id', userId).maybeSingle() as Promise<MaybeSingle<DbChannelInfo>>,
            q.from('scrap_sheets').select('*').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: true }) as Promise<MaybeList<DbScrapSheet>>,
            q.from('scrap_items').select('*').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: true }) as Promise<MaybeList<DbScrapItem>>,
            q.from('user_settings').select('*').eq('user_id', userId).maybeSingle() as Promise<MaybeSingle<DbUserSettings>>,
            q.from('youtube_channels').select('*').eq('user_id', userId).is('deleted_at', null).order('connected_at', { ascending: true }) as Promise<MaybeList<DbYoutubeChannel>>,
            q.from('brand_kit').select('*').eq('user_id', userId).maybeSingle() as Promise<MaybeSingle<DbBrandKit>>,
            q.from('user_stats').select('*').eq('user_id', userId).maybeSingle() as Promise<MaybeSingle<DbUserStats>>,
        ]);

    const channel = channelRes.data ? toChannelInfo(channelRes.data) : null;

    const allItems: DbScrapItem[] = itemsRes.data ?? [];
    const sheets: ScrapSheet[] = (sheetsRes.data ?? []).map((sheetRow) => {
        const sheetItems = allItems
            .filter((item) => item.sheet_id === sheetRow.id)
            .map(toScrapItem);
        return toScrapSheet(sheetRow, sheetItems);
    });

    const schedule: ScheduleConfig = settingsRes.data
        ? toScheduleConfig(settingsRes.data)
        : { ...DEFAULT_DATA.schedule };

    const geminiApiKey = settingsRes.data?.gemini_api_key ?? '';

    const statsRow = statsRes.data;
    const stats = statsRow
        ? {
              totalSongs: Number(statsRow.total_songs),
              usedSongs: Number(statsRow.used_songs),
              totalViews: Number(statsRow.total_views),
              uploadedCount: Number(statsRow.uploaded_count),
          }
        : { ...DEFAULT_DATA.stats };

    const youtubeChannels = (ytRes.data ?? []).map(toYoutubeChannel);
    const brandKit = brandKitRes.data ? toBrandKit(brandKitRes.data) : null;

    return {
        channel,
        sheets,
        schedule,
        stats,
        youtubeChannels,
        geminiApiKey,
        brandKit,
    };
}

// ──────────────────────────────────────────────────────────
// saveData
// 전체 AppData를 한번에 동기화할 때 사용.
// 세부 업데이트는 아래 update* 함수 사용 권장.
// ──────────────────────────────────────────────────────────
export async function saveData(data: AppData): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) {
        console.error('saveData: 인증된 사용자가 없습니다.');
        return;
    }

    await Promise.all([
        data.channel ? updateChannel(data.channel) : Promise.resolve(),
        updateSheets(data.sheets),
        updateSchedule(data.schedule),
        updateYoutubeChannels(data.youtubeChannels),
        data.geminiApiKey !== undefined
            ? updateGeminiApiKey(data.geminiApiKey)
            : Promise.resolve(),
        data.brandKit ? updateBrandKit(data.brandKit) : Promise.resolve(),
    ]);
}

// ──────────────────────────────────────────────────────────
// updateChannel
// ──────────────────────────────────────────────────────────
export async function updateChannel(channel: ChannelInfo): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase.from('channel_info').upsert(
        {
            id: channel.id,
            user_id: userId,
            name: channel.name,
            genre: channel.genre,
            target_audience: channel.targetAudience,
            upload_frequency: channel.uploadFrequency,
            youtube_name: channel.youtubeName ?? null,
        },
        { onConflict: 'user_id' }
    );

    if (error) {
        console.error('updateChannel error:', error.message);
        throw new Error(`채널 정보 저장 실패: ${error.message}`);
    }
}

// ──────────────────────────────────────────────────────────
// updateBrandKit
// ──────────────────────────────────────────────────────────
export async function updateBrandKit(brandKit: BrandKit): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase.from('brand_kit').upsert(
        {
            user_id: userId,
            channel_name: brandKit.channelName,
            tagline: brandKit.tagline,
            primary_genre: brandKit.primaryGenre,
            sub_genres: brandKit.subGenres,
            target_audience: brandKit.targetAudience,
            mood_keywords: brandKit.moodKeywords,
            avoid_keywords: brandKit.avoidKeywords,
            prompt_template: brandKit.promptTemplate,
        },
        { onConflict: 'user_id' }
    );

    if (error) {
        console.error('updateBrandKit error:', error.message);
        throw new Error(`BrandKit 저장 실패: ${error.message}`);
    }
}

// ──────────────────────────────────────────────────────────
// updateSheets
// 전략: 현재 DB 시트 목록과 비교 후 삽입/갱신/소프트딜리트
// ──────────────────────────────────────────────────────────
export async function updateSheets(sheets: ScrapSheet[]): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { data: existing, error: fetchError } = await supabase
        .from('scrap_sheets')
        .select('id')
        .eq('user_id', userId)
        .is('deleted_at', null);

    if (fetchError) {
        console.error('updateSheets fetch error:', fetchError.message);
        throw new Error(`시트 조회 실패: ${fetchError.message}`);
    }

    const existingIds = new Set((existing ?? []).map((r) => r.id));
    const incomingIds = new Set(sheets.map((s) => s.id));

    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
    if (toDelete.length > 0) {
        const { error } = await supabase
            .from('scrap_sheets')
            .update({ deleted_at: new Date().toISOString() })
            .in('id', toDelete)
            .eq('user_id', userId);
        if (error) {
            console.error('updateSheets delete error:', error.message);
            throw new Error(`시트 삭제 실패: ${error.message}`);
        }
    }

    await Promise.all(
        sheets.map(async (sheet) => {
            const { error: sheetError } = await supabase
                .from('scrap_sheets')
                .upsert(
                    {
                        id: sheet.id,
                        user_id: userId,
                        name: sheet.name,
                        channel_name: sheet.channelName ?? null,
                        genre: sheet.genre ?? null,
                        deleted_at: null,
                    },
                    { onConflict: 'id' }
                );

            if (sheetError) {
                console.error('updateSheets upsert error:', sheetError.message);
                throw new Error(`시트 저장 실패: ${sheetError.message}`);
            }

            await updateSheetItems(sheet.id, userId, sheet.items);
        })
    );
}

// ──────────────────────────────────────────────────────────
// updateSheetItems (내부 헬퍼)
// ──────────────────────────────────────────────────────────
async function updateSheetItems(
    sheetId: string,
    userId: string,
    items: ScrapItem[]
): Promise<void> {
    const { data: existing, error: fetchError } = await supabase
        .from('scrap_items')
        .select('id')
        .eq('sheet_id', sheetId)
        .eq('user_id', userId)
        .is('deleted_at', null);

    if (fetchError) {
        throw new Error(`아이템 조회 실패: ${fetchError.message}`);
    }

    const existingIds = new Set((existing ?? []).map((r) => r.id));
    const incomingIds = new Set(items.map((i) => i.id));

    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
    if (toDelete.length > 0) {
        const { error } = await supabase
            .from('scrap_items')
            .update({ deleted_at: new Date().toISOString() })
            .in('id', toDelete)
            .eq('user_id', userId);
        if (error) {
            throw new Error(`아이템 삭제 실패: ${error.message}`);
        }
    }

    if (items.length === 0) return;

    const rows = items.map((item) => ({
        id: item.id,
        sheet_id: sheetId,
        user_id: userId,
        prompt: item.prompt,
        lyrics: item.lyrics,
        title: item.title,
        genre: item.genre,
        status: item.status,
        instruments: item.instruments ?? null,
        mood_tags: item.mood_tags ?? [],
        is_instrumental: item.is_instrumental ?? false,
        notes: item.notes ?? null,
        used_at: item.usedAt ?? null,
        deleted_at: null,
    }));

    const { error } = await supabase
        .from('scrap_items')
        .upsert(rows, { onConflict: 'id' });

    if (error) {
        throw new Error(`아이템 저장 실패: ${error.message}`);
    }
}

// ──────────────────────────────────────────────────────────
// upsertSheet — 단일 시트 저장 (다른 시트에 영향 없음)
// ──────────────────────────────────────────────────────────
export async function upsertSheet(sheet: ScrapSheet): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error: sheetError } = await supabase
        .from('scrap_sheets')
        .upsert(
            {
                id: sheet.id,
                user_id: userId,
                name: sheet.name,
                channel_name: sheet.channelName ?? null,
                genre: sheet.genre ?? null,
                deleted_at: null,
            },
            { onConflict: 'id' }
        );

    if (sheetError) throw new Error(`시트 저장 실패: ${sheetError.message}`);

    await updateSheetItems(sheet.id, userId, sheet.items);
}

// ──────────────────────────────────────────────────────────
// updateSchedule
// ──────────────────────────────────────────────────────────
export async function updateSchedule(schedule: ScheduleConfig): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase.from('user_settings').upsert(
        {
            user_id: userId,
            schedule_enabled: schedule.enabled,
            schedule_frequency: schedule.frequency,
            schedule_target_time: schedule.targetTime,
            email_alert: schedule.emailAlert,
            email_address: schedule.emailAddress ?? null,
        },
        { onConflict: 'user_id' }
    );

    if (error) {
        console.error('updateSchedule error:', error.message);
        throw new Error(`스케줄 저장 실패: ${error.message}`);
    }
}

// ──────────────────────────────────────────────────────────
// updateYoutubeChannels
// ──────────────────────────────────────────────────────────
export async function updateYoutubeChannels(
    channels: YoutubeChannel[]
): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { data: existing, error: fetchError } = await supabase
        .from('youtube_channels')
        .select('id')
        .eq('user_id', userId)
        .is('deleted_at', null);

    if (fetchError) {
        console.error('updateYoutubeChannels fetch error:', fetchError.message);
        throw new Error(`YouTube 채널 조회 실패: ${fetchError.message}`);
    }

    const existingIds = new Set((existing ?? []).map((r) => r.id));
    const incomingIds = new Set(channels.map((c) => c.id));

    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
    if (toDelete.length > 0) {
        const { error } = await supabase
            .from('youtube_channels')
            .update({ deleted_at: new Date().toISOString() })
            .in('id', toDelete)
            .eq('user_id', userId);
        if (error) {
            throw new Error(`YouTube 채널 삭제 실패: ${error.message}`);
        }
    }

    if (channels.length === 0) return;

    const rows = channels.map((ch) => ({
        id: ch.id,
        user_id: userId,
        channel_name: ch.channelName,
        channel_url: ch.channelUrl,
        thumbnail_url: ch.thumbnailUrl ?? null,
        total_views: ch.totalViews ?? null,
        total_watch_hours: ch.totalWatchHours ?? null,
        total_likes: ch.totalLikes ?? null,
        total_comments: ch.totalComments ?? null,
        avg_engagement: ch.avgEngagement ?? null,
        total_shares: ch.totalShares ?? null,
        subscriber_count: ch.subscriberCount ?? null,
        connected_at: ch.connectedAt,
        deleted_at: null,
    }));

    const { error } = await supabase
        .from('youtube_channels')
        .upsert(rows, { onConflict: 'id' });

    if (error) {
        console.error('updateYoutubeChannels upsert error:', error.message);
        throw new Error(`YouTube 채널 저장 실패: ${error.message}`);
    }
}

// ──────────────────────────────────────────────────────────
// updateGeminiApiKey
// ──────────────────────────────────────────────────────────
export async function updateGeminiApiKey(key: string): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
        .from('user_settings')
        .upsert(
            {
                user_id: userId,
                gemini_api_key: key || null,
                schedule_enabled: false,
                schedule_frequency: 'daily' as const,
                schedule_target_time: '18:00',
                email_alert: false,
            },
            { onConflict: 'user_id' },
        );

    if (error) {
        console.error('updateGeminiApiKey error:', error.message);
        throw new Error(`Gemini API 키 저장 실패: ${error.message}`);
    }
}

// ──────────────────────────────────────────────────────────
// ensureUserSettings
// 로그인 직후 user_settings row가 없으면 기본값으로 생성
// ──────────────────────────────────────────────────────────
export async function ensureUserSettings(userId: string): Promise<void> {
    await supabase
        .from('user_settings')
        .upsert(
            {
                user_id: userId,
                schedule_enabled: false,
                schedule_frequency: 'daily' as const,
                schedule_target_time: '18:00',
                email_alert: false,
            },
            { onConflict: 'user_id', ignoreDuplicates: true },
        );
}

// ──────────────────────────────────────────────────────────
// clearAllUserData
// settings의 "데이터 초기화" 기능 — Supabase soft/hard delete
// ──────────────────────────────────────────────────────────
export async function clearAllUserData(): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    await Promise.all([
        supabase.from('scrap_sheets').update({ deleted_at: new Date().toISOString() }).eq('user_id', userId),
        supabase.from('scrap_items').update({ deleted_at: new Date().toISOString() }).eq('user_id', userId),
        supabase.from('channel_info').delete().eq('user_id', userId),
        supabase.from('youtube_channels').update({ deleted_at: new Date().toISOString() }).eq('user_id', userId),
        supabase.from('brand_kit').delete().eq('user_id', userId),
        supabase.from('user_settings').update({ gemini_api_key: null }).eq('user_id', userId),
    ]);
}

// ──────────────────────────────────────────────────────────
// loadLyricsHistory
// localStorage: loadLyricsHistory(): LyricsHistoryItem[]
// Supabase: async — 최신순 50개 반환
// ──────────────────────────────────────────────────────────
export async function loadLyricsHistory(): Promise<LyricsHistoryItem[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
        .from('lyrics_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('loadLyricsHistory error:', error.message);
        return [];
    }

    return (data ?? []).map(toLyricsHistoryItem);
}

// ──────────────────────────────────────────────────────────
// addLyricsHistory
// localStorage: addLyricsHistory(item): void
// Supabase: async — 삽입 후 50개 초과 시 오래된 것 자동 삭제
// ──────────────────────────────────────────────────────────
export async function addLyricsHistory(item: LyricsHistoryItem): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase.from('lyrics_history').insert({
        id: item.id,
        user_id: userId,
        title: item.title,
        genre: item.genre,
        mood: item.mood,
        theme: item.theme,
        language: item.language,
        style: item.style,
        lyrics: item.lyrics,
        model: item.model,
    });

    if (error) {
        console.error('addLyricsHistory error:', error.message);
        throw new Error(`가사 히스토리 저장 실패: ${error.message}`);
    }

    // 50개 초과 시 오래된 항목 삭제
    const { data: oldItems } = await supabase
        .from('lyrics_history')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (oldItems && oldItems.length > 50) {
        const toDelete = oldItems.slice(0, oldItems.length - 50).map((r) => r.id);
        await supabase.from('lyrics_history').delete().in('id', toDelete);
    }
}

// ──────────────────────────────────────────────────────────
// deleteLyricsHistory
// localStorage: deleteLyricsHistory(id): void
// ──────────────────────────────────────────────────────────
export async function deleteLyricsHistory(id: string): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
        .from('lyrics_history')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

    if (error) {
        console.error('deleteLyricsHistory error:', error.message);
        throw new Error(`가사 히스토리 삭제 실패: ${error.message}`);
    }
}

// ──────────────────────────────────────────────────────────
// saveMusicGenHistory
// user_settings의 music_gen_history jsonb 배열에 push 후 upsert.
// 최신 30개만 유지.
// ──────────────────────────────────────────────────────────
export async function saveMusicGenHistory(history: MusicGenHistory): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const existing = await loadMusicGenHistory();
    const updated = [history, ...existing].slice(0, 30);

    const { error } = await supabase
        .from('user_settings')
        .upsert(
            { user_id: userId, music_gen_history: updated },
            { onConflict: 'user_id' }
        );

    if (error) {
        console.error('saveMusicGenHistory error:', error.message);
        throw new Error(`음악 생성 히스토리 저장 실패: ${error.message}`);
    }
}

// ──────────────────────────────────────────────────────────
// loadMusicGenHistory
// user_settings의 music_gen_history jsonb 배열 반환.
// ──────────────────────────────────────────────────────────
export async function loadMusicGenHistory(): Promise<MusicGenHistory[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
        .from('user_settings')
        .select('music_gen_history')
        .eq('user_id', userId)
        .single();

    if (error) {
        // PGRST116 = 행 없음 (첫 저장 전 정상)
        if (error.code !== 'PGRST116') {
            console.error('loadMusicGenHistory error:', error.message);
        }
        return [];
    }

    return (data?.music_gen_history as MusicGenHistory[] | null) ?? [];
}

// ──────────────────────────────────────────────────────────
// generateId (동기 — 변경 없음)
// ──────────────────────────────────────────────────────────
export function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ──────────────────────────────────────────────────────────
// 유틸 함수 (storage.ts와 동일)
// ──────────────────────────────────────────────────────────
export function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function formatDatetime(iso: string): string {
    return new Date(iso).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatNumber(n: number): string {
    if (n >= 10000) return (n / 10000).toFixed(1) + '만';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
}

// ──────────────────────────────────────────────────────────
// migrateFromLocalStorage
// localStorage 데이터를 Supabase로 1회 이전하는 헬퍼.
// 로그인 직후 호출. 성공 시 localStorage 키를 제거.
// ──────────────────────────────────────────────────────────
const LEGACY_STORAGE_KEY = 'suno-yt-data';
const LEGACY_LYRICS_KEY = 'suno-yt-lyrics-history';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureUUID(id: string): string {
    return UUID_REGEX.test(id) ? id : crypto.randomUUID();
}

export async function migrateFromLocalStorage(): Promise<{
    migrated: boolean;
    error?: string;
}> {
    if (typeof window === 'undefined') {
        return { migrated: false, error: 'server-side 실행 불가' };
    }

    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
        return { migrated: false };
    }

    let parsed: Partial<AppData>;
    try {
        parsed = JSON.parse(raw) as Partial<AppData>;
    } catch {
        return { migrated: false, error: 'localStorage JSON 파싱 실패' };
    }

    const userId = await getCurrentUserId();
    if (!userId) {
        return { migrated: false, error: '로그인 후 마이그레이션 가능합니다.' };
    }

    try {
        // localStorage의 nanoid 형식 ID를 UUID로 변환
        const sheets = (parsed.sheets ?? []).map((sheet) => {
            const sheetId = ensureUUID(sheet.id);
            const items = sheet.items.map((item) => ({
                ...item,
                id: ensureUUID(item.id),
            }));
            return { ...sheet, id: sheetId, items };
        });

        const youtubeChannels = (parsed.youtubeChannels ?? []).map((ch) => ({
            ...ch,
            id: ensureUUID(ch.id),
        }));

        const data: AppData = {
            channel: parsed.channel ?? null,
            sheets,
            schedule: parsed.schedule ?? { ...DEFAULT_DATA.schedule },
            stats: parsed.stats ?? { ...DEFAULT_DATA.stats },
            youtubeChannels,
            geminiApiKey: parsed.geminiApiKey ?? '',
            brandKit: parsed.brandKit ?? null,
        };

        await saveData(data);

        // lyrics_history 별도 마이그레이션
        const lyricsRaw = localStorage.getItem(LEGACY_LYRICS_KEY);
        if (lyricsRaw) {
            const lyricsItems = JSON.parse(lyricsRaw) as LyricsHistoryItem[];
            for (const item of lyricsItems.slice(0, 50)) {
                await addLyricsHistory({ ...item, id: ensureUUID(item.id) });
            }
            localStorage.removeItem(LEGACY_LYRICS_KEY);
        }

        localStorage.removeItem(LEGACY_STORAGE_KEY);

        return { migrated: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        console.error('migrateFromLocalStorage error:', message);
        return { migrated: false, error: message };
    }
}

// ──────────────────────────────────────────────────────────
// toggleLyricsHistoryStarred
// starred는 DB에 컬럼이 없어 localStorage로 관리 (starred IDs 목록)
// ──────────────────────────────────────────────────────────
const STARRED_KEY = 'lyrics-starred-ids';

function getStarredIds(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = localStorage.getItem(STARRED_KEY);
        return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
        return new Set();
    }
}

function saveStarredIds(ids: Set<string>): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(STARRED_KEY, JSON.stringify([...ids]));
    }
}

export function applyStarred(items: LyricsHistoryItem[]): LyricsHistoryItem[] {
    const starred = getStarredIds();
    return items.map((item) => ({ ...item, starred: starred.has(item.id) }));
}

export function toggleLyricsHistoryStarred(
    id: string,
    currentItems: LyricsHistoryItem[]
): LyricsHistoryItem[] {
    const ids = getStarredIds();
    if (ids.has(id)) {
        ids.delete(id);
    } else {
        ids.add(id);
    }
    saveStarredIds(ids);
    return currentItems.map((item) =>
        item.id === id ? { ...item, starred: ids.has(id) } : item
    );
}

// ──────────────────────────────────────────────────────────
// Revenue (수익 관리) — revenue_entries 테이블
// ──────────────────────────────────────────────────────────
function toRevenueEntry(row: DbRevenueEntry): RevenueEntry {
    return {
        id: row.id,
        title: row.title,
        platform: row.platform,
        amount: row.amount,
        views: row.views ?? undefined,
        streams: row.streams ?? undefined,
        period: row.period,
        genre: row.genre ?? undefined,
        createdAt: row.created_at,
    };
}

export async function loadRevenue(): Promise<RevenueEntry[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
        .from('revenue_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('loadRevenue error:', error.message);
        return [];
    }
    return (data ?? []).map((row) => toRevenueEntry(row as unknown as DbRevenueEntry));
}

export async function addRevenueEntry(entry: RevenueEntry): Promise<RevenueEntry[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { error } = await supabase.from('revenue_entries').insert({
        id: entry.id,
        user_id: userId,
        title: entry.title,
        platform: entry.platform,
        amount: entry.amount,
        views: entry.views ?? null,
        streams: entry.streams ?? null,
        period: entry.period,
        genre: entry.genre ?? null,
    });

    if (error) {
        console.error('addRevenueEntry error:', error.message);
        throw new Error(`수익 저장 실패: ${error.message}`);
    }
    return loadRevenue();
}

export async function deleteRevenueEntry(id: string): Promise<RevenueEntry[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { error } = await supabase
        .from('revenue_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

    if (error) {
        console.error('deleteRevenueEntry error:', error.message);
        throw new Error(`수익 삭제 실패: ${error.message}`);
    }
    return loadRevenue();
}

// ──────────────────────────────────────────────────────────
// Songs (음원 등록 현황) — songs 테이블
// ──────────────────────────────────────────────────────────
function toSong(row: DbSong): Song {
    return {
        id: row.id,
        title: row.title,
        genre: row.genre,
        distributedAt: row.distributed_at,
        platforms: row.platforms,
        isrc: row.isrc ?? undefined,
        status: row.status,
    };
}

export async function loadSongs(): Promise<Song[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('loadSongs error:', error.message);
        return [];
    }
    return (data ?? []).map((row) => toSong(row as unknown as DbSong));
}

export async function addSong(song: Song): Promise<Song[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { error } = await supabase.from('songs').insert({
        id: song.id,
        user_id: userId,
        title: song.title,
        genre: song.genre,
        distributed_at: song.distributedAt,
        platforms: song.platforms,
        isrc: song.isrc ?? null,
        status: song.status,
    });

    if (error) {
        console.error('addSong error:', error.message);
        throw new Error(`음원 저장 실패: ${error.message}`);
    }
    return loadSongs();
}

export async function deleteSong(id: string): Promise<Song[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

    if (error) {
        console.error('deleteSong error:', error.message);
        throw new Error(`음원 삭제 실패: ${error.message}`);
    }
    return loadSongs();
}

// ──────────────────────────────────────────────────────────
// SEO 이력 (Supabase user_settings.seo_history jsonb)
// ──────────────────────────────────────────────────────────
const SEO_HISTORY_MAX = 20;

export interface SeoHistoryEntry {
    id: string;
    createdAt: string;
    titleInput: string;
    seoScore: number;
    titles: string[];
    mainKeywords: string[];
    tags: string[];
    longTailKeywords?: string[];
    description?: string;
    chapters?: string[];
    uploadTimes?: { day: string; time: string }[];
    claudeInstruction?: string;
}

export async function saveSeoHistory(entry: Omit<SeoHistoryEntry, 'id' | 'createdAt'>): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const existing = await loadSeoHistory();
    const updated: SeoHistoryEntry[] = [
        { ...entry, id: `seo_${Date.now()}`, createdAt: new Date().toISOString() },
        ...existing,
    ].slice(0, SEO_HISTORY_MAX);

    const { error } = await supabase
        .from('user_settings')
        .upsert(
            { user_id: userId, seo_history: updated },
            { onConflict: 'user_id' }
        );

    if (error) {
        console.error('saveSeoHistory error:', error.message);
        throw new Error(`SEO 히스토리 저장 실패: ${error.message}`);
    }
}

export async function loadSeoHistory(): Promise<SeoHistoryEntry[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
        .from('user_settings')
        .select('seo_history')
        .eq('user_id', userId)
        .single();

    if (error) {
        if (error.code !== 'PGRST116') {
            console.error('loadSeoHistory error:', error.message);
        }
        return [];
    }

    return (data?.seo_history as SeoHistoryEntry[] | null) ?? [];
}

export async function deleteSeoHistory(id: string): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const existing = await loadSeoHistory();
    const updated = existing.filter((entry) => entry.id !== id);

    const { error } = await supabase
        .from('user_settings')
        .upsert(
            { user_id: userId, seo_history: updated },
            { onConflict: 'user_id' }
        );

    if (error) {
        console.error('deleteSeoHistory error:', error.message);
        throw new Error(`SEO 히스토리 삭제 실패: ${error.message}`);
    }
}

// ──────────────────────────────────────────────────────────
// 커버 이미지 이력 (Supabase user_settings.cover_image_history jsonb)
// ──────────────────────────────────────────────────────────
const COVER_IMAGE_HISTORY_MAX = 20;

export async function saveCoverImageHistory(entry: CoverImageHistory): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const existing = await loadCoverImageHistory();
    const updated: CoverImageHistory[] = [entry, ...existing].slice(0, COVER_IMAGE_HISTORY_MAX);

    const { error } = await supabase
        .from('user_settings')
        .upsert(
            { user_id: userId, cover_image_history: updated },
            { onConflict: 'user_id' }
        );

    if (error) {
        console.error('saveCoverImageHistory error:', error.message);
        throw new Error(`커버 이미지 이력 저장 실패: ${error.message}`);
    }
}

export async function loadCoverImageHistory(): Promise<CoverImageHistory[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
        .from('user_settings')
        .select('cover_image_history')
        .eq('user_id', userId)
        .single();

    if (error) {
        if (error.code !== 'PGRST116') {
            console.error('loadCoverImageHistory error:', error.message);
        }
        return [];
    }

    return (data?.cover_image_history as CoverImageHistory[] | null) ?? [];
}
