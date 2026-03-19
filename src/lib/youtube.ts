export interface YoutubeChannelInfo {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  subscriberCount: number;
  totalViews: number;
  videoCount: number;
}

export interface YoutubeVideoStat {
  videoId: string;
  title: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnailUrl: string | null;
}

export interface YoutubeAnalytics {
  channelId: string;
  recentVideos: YoutubeVideoStat[];
  // 최근 7일간 날짜별 조회수 (최신 영상들의 일자별 합산)
  weeklyViews: { date: string; views: number }[];
  fetchedAt: string;
}

// ─── Quota 캐시 ───────────────────────────────────────────────
// YouTube Data API v3: 10,000 units/day. channels.list = 1 unit, videos.list = 1 unit
// 캐시 TTL: 1시간 (3600_000 ms)
const CACHE_TTL_MS = 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_KEY_PREFIX = 'yt_cache_';

function readCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(CACHE_KEY_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry<T> = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage 용량 초과 시 조용히 무시
  }
}

// ─── API 호출 함수 ────────────────────────────────────────────

// 채널 URL 또는 핸들에서 채널 정보 조회 (1 unit, 1시간 캐시)
export async function fetchYoutubeChannel(urlOrHandle: string): Promise<YoutubeChannelInfo | null> {
  const handle = parseChannelHandle(urlOrHandle);
  if (!handle) return null;

  const cacheKey = `channel_${handle}`;
  const cached = readCache<YoutubeChannelInfo>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams(
    handle.startsWith('UC') ? { id: handle } : { handle }
  );

  const res = await fetch(`/api/youtube/channel?${params}`);
  if (!res.ok) return null;

  const data: YoutubeChannelInfo = await res.json();
  writeCache(cacheKey, data);
  return data;
}

// 채널 ID로 분석 데이터 조회 (최근 영상 + 주간 조회수, 1시간 캐시)
export async function fetchYoutubeAnalytics(channelId: string): Promise<YoutubeAnalytics | null> {
  if (!channelId) return null;

  const cacheKey = `analytics_${channelId}`;
  const cached = readCache<YoutubeAnalytics>(cacheKey);
  if (cached) return cached;

  const res = await fetch(`/api/youtube/analytics?channelId=${encodeURIComponent(channelId)}`);
  if (!res.ok) return null;

  const data: YoutubeAnalytics = await res.json();
  writeCache(cacheKey, data);
  return data;
}

// ─── URL/핸들 파싱 ────────────────────────────────────────────
// 지원 형식: @handle, UC..., https://youtube.com/@handle, https://youtube.com/channel/UC...
export function parseChannelHandle(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 이미 채널 ID 형식 (UC...)
  if (/^UC[\w-]{22}$/.test(trimmed)) return trimmed;

  // @handle 형식
  if (trimmed.startsWith('@')) return trimmed;

  try {
    const url = new URL(trimmed);
    const pathname = url.pathname;

    // /channel/UCxxxxxxx
    const channelMatch = pathname.match(/\/channel\/(UC[\w-]+)/);
    if (channelMatch) return channelMatch[1];

    // /@handle
    const handleMatch = pathname.match(/\/@([\w.]+)/);
    if (handleMatch) return `@${handleMatch[1]}`;

    // /c/name or /user/name
    const legacyMatch = pathname.match(/\/(?:c|user)\/([\w.]+)/);
    if (legacyMatch) return `@${legacyMatch[1]}`;
  } catch {
    // URL 파싱 실패 = @handle로 처리
    return `@${trimmed.replace(/^@/, '')}`;
  }

  return null;
}
