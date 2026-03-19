import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

interface VideoStat {
  videoId: string;
  title: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnailUrl: string | null;
}

// GET /api/youtube/analytics?channelId=UCxxxxxx
// 최근 10개 영상 통계 + 주간 조회수 시뮬레이션
// 소비 quota: search.list(100) + videos.list(1) = 101 units
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const channelId = searchParams.get('channelId');

  if (!channelId) {
    return NextResponse.json({ error: 'channelId 파라미터 필요' }, { status: 400 });
  }

  if (!process.env.YOUTUBE_API_KEY) {
    return NextResponse.json({ error: 'YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다' }, { status: 500 });
  }

  try {
    // 1) 최근 업로드 영상 ID 목록 (search.list = 100 units)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchRes = await (youtube.search.list as any)({
      part: ['id', 'snippet'],
      channelId,
      order: 'date',
      type: ['video'],
      maxResults: 10,
    });

    const items = searchRes?.data?.items ?? [];
    if (items.length === 0) {
      return NextResponse.json({
        channelId,
        recentVideos: [],
        weeklyViews: buildEmptyWeek(),
        fetchedAt: new Date().toISOString(),
      });
    }

    const videoIds: string[] = items
      .map((item: { id?: { videoId?: string } }) => item?.id?.videoId)
      .filter(Boolean);

    // 2) 각 영상의 statistics (videos.list = 1 unit)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const videoRes = await (youtube.videos.list as any)({
      part: ['statistics', 'snippet'],
      id: videoIds,
    });

    const videos: VideoStat[] = (videoRes?.data?.items ?? []).map(
      (v: {
        id?: string;
        snippet?: {
          title?: string;
          publishedAt?: string;
          thumbnails?: { default?: { url?: string } };
        };
        statistics?: {
          viewCount?: string;
          likeCount?: string;
          commentCount?: string;
        };
      }) => ({
        videoId: v.id ?? '',
        title: v.snippet?.title ?? '',
        publishedAt: v.snippet?.publishedAt ?? '',
        viewCount: Number(v.statistics?.viewCount ?? 0),
        likeCount: Number(v.statistics?.likeCount ?? 0),
        commentCount: Number(v.statistics?.commentCount ?? 0),
        thumbnailUrl: v.snippet?.thumbnails?.default?.url ?? null,
      })
    );

    // 3) 주간 조회수 시뮬레이션
    // 최근 7일 내 업로드된 영상의 조회수를 업로드 날짜에 매핑
    // 7일 이전 영상은 전체 조회수를 7일로 균등 분배
    const weeklyViews = buildWeeklyViews(videos);

    return NextResponse.json({
      channelId,
      recentVideos: videos,
      weeklyViews,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
    return {
      label: days[d.getDay()],
      iso: d.toISOString().slice(0, 10), // YYYY-MM-DD
    };
  });
}

function buildWeeklyViews(videos: VideoStat[]): { date: string; views: number }[] {
  const week = last7Days();
  const viewsByDate: Record<string, number> = {};
  week.forEach(({ iso }) => { viewsByDate[iso] = 0; });

  const weekStart = week[0].iso;

  for (const v of videos) {
    const pub = v.publishedAt.slice(0, 10);
    if (pub >= weekStart && viewsByDate[pub] !== undefined) {
      // 이번 주 업로드 영상 → 업로드 날짜에 조회수 집계
      viewsByDate[pub] += v.viewCount;
    } else {
      // 이번 주 이전 영상 → 조회수를 7일로 균등 분배
      const dailyAvg = Math.floor(v.viewCount / 7);
      week.forEach(({ iso }) => { viewsByDate[iso] += dailyAvg; });
    }
  }

  return week.map(({ label, iso }) => ({ date: label, views: viewsByDate[iso] }));
}
