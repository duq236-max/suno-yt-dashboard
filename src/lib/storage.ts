import { AppData, ScrapSheet, ChannelInfo, ScheduleConfig, YoutubeChannel, BrandKit, LyricsHistoryItem, RevenueEntry, CustomVocal, Song, ThumbnailHistoryItem } from '@/types';
export type { BrandKit };

const STORAGE_KEY = 'suno-yt-data';
const LYRICS_HISTORY_KEY = 'suno-yt-lyrics-history';

const defaultData: AppData = {
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

export function loadData(): AppData {
    if (typeof window === 'undefined') return defaultData;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultData;
        const parsed = JSON.parse(raw);
        return {
            ...defaultData,
            ...parsed,
            youtubeChannels: parsed.youtubeChannels ?? [],
        };
    } catch {
        return defaultData;
    }
}

export function saveData(data: AppData): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function updateSheets(sheets: ScrapSheet[]): void {
    const data = loadData();
    data.sheets = sheets;
    saveData(data);
}

export function updateChannel(channel: ChannelInfo): void {
    const data = loadData();
    data.channel = channel;
    saveData(data);
}

export function updateSchedule(schedule: ScheduleConfig): void {
    const data = loadData();
    data.schedule = schedule;
    saveData(data);
}

export function updateYoutubeChannels(channels: YoutubeChannel[]): void {
    const data = loadData();
    data.youtubeChannels = channels;
    saveData(data);
}

export function updateGeminiApiKey(key: string): void {
    const data = loadData();
    data.geminiApiKey = key;
    saveData(data);
}

export function getBrandKit(): BrandKit | null {
    return loadData().brandKit;
}

export function saveBrandKit(kit: BrandKit): void {
    const data = loadData();
    saveData({ ...data, brandKit: kit });
}

// ─── Lyrics History ──────────────────────────────────────────
export function loadLyricsHistory(): LyricsHistoryItem[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(LYRICS_HISTORY_KEY) ?? '[]') as LyricsHistoryItem[];
    } catch {
        return [];
    }
}

export function saveLyricsHistory(items: LyricsHistoryItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LYRICS_HISTORY_KEY, JSON.stringify(items.slice(0, 50)));
}

export function addLyricsHistory(item: LyricsHistoryItem): LyricsHistoryItem[] {
    const existing = loadLyricsHistory();
    const updated = [item, ...existing].slice(0, 50);
    saveLyricsHistory(updated);
    return updated;
}

export function deleteLyricsHistory(id: string): LyricsHistoryItem[] {
    const updated = loadLyricsHistory().filter(i => i.id !== id);
    saveLyricsHistory(updated);
    return updated;
}

// ─── Revenue ─────────────────────────────────────────────────
export function loadRevenue(): RevenueEntry[] {
    return loadData().revenue ?? [];
}

export function saveRevenue(entries: RevenueEntry[]): RevenueEntry[] {
    const data = loadData();
    saveData({ ...data, revenue: entries });
    return entries;
}

export function addRevenueEntry(entry: RevenueEntry): RevenueEntry[] {
    return saveRevenue([entry, ...loadRevenue()]);
}

export function deleteRevenueEntry(id: string): RevenueEntry[] {
    return saveRevenue(loadRevenue().filter(e => e.id !== id));
}

// ─── Songs (F5) ──────────────────────────────────────────────
const SONGS_KEY = 'suno-yt-songs';

export function loadSongs(): Song[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(SONGS_KEY) ?? '[]') as Song[];
    } catch {
        return [];
    }
}

export function saveSongs(songs: Song[]): Song[] {
    if (typeof window === 'undefined') return songs;
    localStorage.setItem(SONGS_KEY, JSON.stringify(songs));
    return songs;
}

export function addSong(song: Song): Song[] {
    return saveSongs([song, ...loadSongs()]);
}

export function deleteSong(id: string): Song[] {
    return saveSongs(loadSongs().filter(s => s.id !== id));
}

// ─── Custom Vocals (H3) ──────────────────────────────────────
const CUSTOM_VOCALS_KEY = 'custom_vocals';
const MAX_CUSTOM_VOCALS = 5;

export function getCustomVocals(): CustomVocal[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(CUSTOM_VOCALS_KEY) ?? '[]') as CustomVocal[];
    } catch {
        return [];
    }
}

export function saveCustomVocal(vocal: CustomVocal): CustomVocal[] {
    const existing = getCustomVocals();
    const updated = [vocal, ...existing].slice(0, MAX_CUSTOM_VOCALS);
    localStorage.setItem(CUSTOM_VOCALS_KEY, JSON.stringify(updated));
    return updated;
}

export function deleteCustomVocal(id: string): CustomVocal[] {
    const updated = getCustomVocals().filter(v => v.id !== id);
    localStorage.setItem(CUSTOM_VOCALS_KEY, JSON.stringify(updated));
    return updated;
}

// ─── Thumbnail History (I5) ──────────────────────────────────
const THUMBNAIL_HISTORY_KEY = 'thumbnail_history';

export function loadThumbnailHistory(): ThumbnailHistoryItem[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(THUMBNAIL_HISTORY_KEY) ?? '[]') as ThumbnailHistoryItem[];
    } catch {
        return [];
    }
}

export function saveThumbnailHistory(items: ThumbnailHistoryItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(THUMBNAIL_HISTORY_KEY, JSON.stringify(items.slice(0, 10)));
}

export function addThumbnailHistory(item: ThumbnailHistoryItem): ThumbnailHistoryItem[] {
    const updated = [item, ...loadThumbnailHistory()].slice(0, 10);
    saveThumbnailHistory(updated);
    return updated;
}

export function toggleThumbnailFavorite(id: string): ThumbnailHistoryItem[] {
    const updated = loadThumbnailHistory().map(i =>
        i.id === id ? { ...i, isFavorite: !i.isFavorite } : i
    );
    saveThumbnailHistory(updated);
    return updated;
}

// ─── Utilities ───────────────────────────────────────────────
export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}

export function formatDatetime(iso: string): string {
    return new Date(iso).toLocaleDateString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

export function formatNumber(n: number): string {
    if (n >= 10000) return (n / 10000).toFixed(1) + '만';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
}
