export type ScrapStatus = 'unused' | 'ready' | 'used';

export interface ScrapItem {
    id: string;
    prompt: string;
    lyrics: string;
    title: string;
    genre: string;
    status: ScrapStatus;
    createdAt: string;
    usedAt?: string;
    notes?: string;
    // Phase 2A — MusePilot 스타일 필드
    instruments?: string;
    mood_tags?: string[];
    is_instrumental?: boolean;
}

export interface ScrapSheet {
    id: string;
    name: string;
    channelName?: string;
    genre?: string;
    items: ScrapItem[];
    createdAt: string;
}

export interface ScheduleConfig {
    enabled: boolean;
    frequency: 'daily' | '3perweek' | 'weekly';
    targetTime: string;
    emailAlert: boolean;
    emailAddress?: string;
}

export interface ChannelInfo {
    id: string;
    name: string;
    genre: string;
    targetAudience: string;
    uploadFrequency: string;
    youtubeName?: string;
    createdAt: string;
}

// Phase 2B — YouTube 채널 연결 (수동 입력 방식)
export interface YoutubeChannel {
    id: string;
    channelId?: string; // YouTube 실제 채널 ID (UC...) — 자동 조회 시 저장
    channelName: string;
    channelUrl: string;
    thumbnailUrl?: string;
    // 수동 입력 통계
    totalViews?: number;
    totalWatchHours?: number;
    totalLikes?: number;
    totalComments?: number;
    avgEngagement?: number;   // 평균 참여율 (%)
    totalShares?: number;
    subscriberCount?: number;
    videoCount?: number;    // 총 업로드 영상수
    connectedAt: string;
}

export interface BrandKit {
    channelName: string;
    tagline: string;
    primaryGenre: string;
    subGenres: string[];
    targetAudience: string;
    moodKeywords: string[];
    avoidKeywords: string[];
    promptTemplate: string;
    updatedAt: string;
}

// Phase 2E — AI 가사 생성 히스토리
export interface LyricsHistoryItem {
    id: string;
    title: string;
    genre: string;
    mood: string;
    theme: string;
    language: 'ko' | 'en' | 'ja' | 'zh' | 'mixed';
    style: string;
    lyrics: string;
    model: 'flash' | 'pro';
    createdAt: string;
}

// Cover Generator — Gemini 썸네일/커버 프롬프트 결과
export interface CoverResult {
    title_suggestion: string;      // 썸네일 텍스트 제안 (한국어)
    sd_prompt: string;             // Stable Diffusion positive prompt (영어)
    negative_prompt: string;       // SD negative prompt (영어)
    composition: string;           // 구도/레이아웃 설명 (한국어)
    color_palette: string[];       // 헥스 컬러 3-5개
    design_tips: string[];         // 디자인 팁 3개
    style_tags: string[];          // 스타일 태그 (Canva/SD 검색용)
}

// T4 — 통합 통계
export interface ChannelStats {
  channelId: string;
  channelName: string;
  thumbnailUrl?: string;
  subscriberCount: number;
  totalViews: number;
  videoCount: number;
  engagementRate: number; // (%)
  weeklyViews: { date: string; views: number }[];
}

export interface StatsSummary {
  totalSubscribers: number;
  totalViews: number;
  totalVideos: number;
  channelCount: number;
  channels: ChannelStats[];
}

// Phase 5 — 수익 관리
export interface RevenueEntry {
    id: string;
    title: string;
    platform: 'youtube' | 'distrokid' | 'spotify' | 'apple_music' | 'other';
    amount: number;
    views?: number;
    streams?: number;
    period: string;   // 'YYYY-MM' 형식
    genre?: string;
    createdAt: string;
}

export interface AppData {
    channel: ChannelInfo | null;
    sheets: ScrapSheet[];
    schedule: ScheduleConfig;
    stats: {
        totalSongs: number;
        usedSongs: number;
        totalViews: number;
        uploadedCount: number;
    };
    // Phase 2B
    youtubeChannels: YoutubeChannel[];
    // Phase 2C
    geminiApiKey?: string;
    // Phase 2D — BrandKit
    brandKit: BrandKit | null;
    // Phase 5 — 수익 관리
    revenue?: RevenueEntry[];
}
