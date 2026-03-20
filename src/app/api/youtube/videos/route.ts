import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

const MOCK_VIDEOS = [
  {
    videoId: 'mock_vid_001',
    title: '[Mock] AI Generated Music — Chill Lo-fi Beats',
    thumbnailUrl: 'https://picsum.photos/seed/vid1/320/180',
    publishedAt: '2025-03-01T10:00:00Z',
    viewCount: 12400,
    likeCount: 340,
    commentCount: 28,
  },
  {
    videoId: 'mock_vid_002',
    title: '[Mock] Suno AI — Epic Orchestral Theme',
    thumbnailUrl: 'https://picsum.photos/seed/vid2/320/180',
    publishedAt: '2025-02-20T14:30:00Z',
    viewCount: 8750,
    likeCount: 210,
    commentCount: 15,
  },
  {
    videoId: 'mock_vid_003',
    title: '[Mock] AI Music — Upbeat Pop Song 2025',
    thumbnailUrl: 'https://picsum.photos/seed/vid3/320/180',
    publishedAt: '2025-02-10T09:15:00Z',
    viewCount: 5300,
    likeCount: 130,
    commentCount: 9,
  },
];

// GET /api/youtube/videos?channelId=UCxxxxxx
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const channelId = searchParams.get('channelId');

  if (!channelId) {
    return NextResponse.json({ error: 'channelId 파라미터 필요' }, { status: 400 });
  }

  if (!process.env.YOUTUBE_API_KEY) {
    return NextResponse.json({ videos: MOCK_VIDEOS });
  }

  try {
    // Step 1: search.list — 최신 영상 20개의 기본 정보 가져오기
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchRes = await (youtube.search.list as any)({
      part: ['snippet'],
      channelId,
      order: 'date',
      maxResults: 20,
      type: ['video'],
    });

    const items: Array<{
      id: { videoId: string };
      snippet: {
        title: string;
        thumbnails: { medium?: { url: string }; default?: { url: string } };
        publishedAt: string;
      };
    }> = searchRes?.data?.items ?? [];

    if (items.length === 0) {
      return NextResponse.json({ videos: [] });
    }

    const videoIds = items.map((item) => item.id.videoId).filter(Boolean);

    // Step 2: videos.list — 통계(조회수·좋아요·댓글수) 배치 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statsRes = await (youtube.videos.list as any)({
      part: ['statistics'],
      id: videoIds,
    });

    const statsMap = new Map<
      string,
      { viewCount: number; likeCount: number; commentCount: number }
    >();

    for (const video of statsRes?.data?.items ?? []) {
      statsMap.set(video.id as string, {
        viewCount: Number(video.statistics?.viewCount ?? 0),
        likeCount: Number(video.statistics?.likeCount ?? 0),
        commentCount: Number(video.statistics?.commentCount ?? 0),
      });
    }

    const videos = items.map((item) => {
      const id = item.id.videoId;
      const stats = statsMap.get(id) ?? { viewCount: 0, likeCount: 0, commentCount: 0 };
      return {
        videoId: id,
        title: item.snippet.title,
        thumbnailUrl:
          item.snippet.thumbnails.medium?.url ??
          item.snippet.thumbnails.default?.url ??
          null,
        publishedAt: item.snippet.publishedAt,
        ...stats,
      };
    });

    return NextResponse.json({ videos });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
