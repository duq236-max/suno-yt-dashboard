import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import type { ChannelStats, StatsSummary } from '@/types';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

// GET /api/youtube/stats?channelIds=UCaaa,UCbbb,UCccc
// 여러 채널 통계를 병렬로 조회해서 집계 반환
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const raw = searchParams.get('channelIds') ?? '';
  const channelIds = raw.split(',').map((s) => s.trim()).filter(Boolean);

  if (channelIds.length === 0) {
    return NextResponse.json({ error: 'channelIds 파라미터 필요 (쉼표 구분)' }, { status: 400 });
  }

  if (!process.env.YOUTUBE_API_KEY) {
    return NextResponse.json({ error: 'YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다' }, { status: 500 });
  }

  try {
    // 모든 채널 병렬 조회
    const results = await Promise.allSettled(channelIds.map(fetchChannelStats));

    const channels: ChannelStats[] = results
      .filter((r): r is PromiseFulfilledResult<ChannelStats> => r.status === 'fulfilled')
      .map((r) => r.value);

    const summary: StatsSummary = {
      totalSubscribers: channels.reduce((s, c) => s + c.subscriberCount, 0),
      totalViews: channels.reduce((s, c) => s + c.totalViews, 0),
      totalVideos: channels.reduce((s, c) => s + c.videoCount, 0),
      channelCount: channels.length,
      channels,
    };

    return NextResponse.json(summary);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── 채널 단건 조회 ────────────────────────────────────────────

async function fetchChannelStats(channelId: string): Promise<ChannelStats> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chanRes = await (youtube.channels.list as any)({
    part: ['snippet', 'statistics'],
    id: [channelId],
  });

  const ch = chanRes?.data?.items?.[0];
  if (!ch) throw new Error(`채널을 찾을 수 없음: ${channelId}`);

  const subscriberCount = Number(ch.statistics?.subscriberCount ?? 0);
  const totalViews = Number(ch.statistics?.viewCount ?? 0);
  const videoCount = Number(ch.statistics?.videoCount ?? 0);

  // 최근 영상으로 참여율 근사 계산
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchRes = await (youtube.search.list as any)({
    part: ['id'],
    channelId,
    order: 'date',
    type: ['video'],
    maxResults: 5,
  });

  const videoIds: string[] = (searchRes?.data?.items ?? [])
    .map((item: { id?: { videoId?: string } }) => item?.id?.videoId)
    .filter(Boolean);

  let engagementRate = 0;
  let weeklyViews: { date: string; views: number }[] = buildEmptyWeek();

  if (videoIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const videoRes = await (youtube.videos.list as any)({
      part: ['statistics', 'snippet'],
      id: videoIds,
    });

    const videos = (videoRes?.data?.items ?? []).map(
      (v: {
        id?: string;
        snippet?: { publishedAt?: string };
        statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
      }) => ({
        videoId: v.id ?? '',
        publishedAt: v.snippet?.publishedAt ?? '',
        viewCount: Number(v.statistics?.viewCount ?? 0),
        likeCount: Number(v.statistics?.likeCount ?? 0),
        commentCount: Number(v.statistics?.commentCount ?? 0),
      })
    );

    // 참여율 = (likes + comments) / views 평균
    const validVideos = videos.filter((v: { viewCount: number }) => v.viewCount > 0);
    if (validVideos.length > 0) {
      const totalEngagement = validVideos.reduce(
        (s: number, v: { viewCount: number; likeCount: number; commentCount: number }) =>
          s + ((v.likeCount + v.commentCount) / v.viewCount) * 100,
        0
      );
      engagementRate = Math.round((totalEngagement / validVideos.length) * 100) / 100;
    }

    weeklyViews = buildWeeklyViews(videos);
  }

  return {
    channelId,
    channelName: ch.snippet?.title ?? channelId,
    thumbnailUrl: ch.snippet?.thumbnails?.default?.url ?? undefined,
    subscriberCount,
    totalViews,
    videoCount,
    engagementRate,
    weeklyViews,
  };
}

// ─── 헬퍼 ──────────────────────────────────────────────────────

function buildEmptyWeek(): { date: string; views: number }[] {
  return last7Days().map((d) => ({ date: d.label, views: 0 }));
}

function last7Days(): { label: string; iso: string }[] {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: days[d.getDay()], iso: d.toISOString().slice(0, 10) };
  });
}

function buildWeeklyViews(
  videos: { publishedAt: string; viewCount: number }[]
): { date: string; views: number }[] {
  const week = last7Days();
  const viewsByDate: Record<string, number> = {};
  week.forEach(({ iso }) => { viewsByDate[iso] = 0; });
  const weekStart = week[0].iso;

  for (const v of videos) {
    const pub = v.publishedAt.slice(0, 10);
    if (pub >= weekStart && viewsByDate[pub] !== undefined) {
      viewsByDate[pub] += v.viewCount;
    } else {
      const dailyAvg = Math.floor(v.viewCount / 7);
      week.forEach(({ iso }) => { viewsByDate[iso] += dailyAvg; });
    }
  }

  return week.map(({ label, iso }) => ({ date: label, views: viewsByDate[iso] }));
}
