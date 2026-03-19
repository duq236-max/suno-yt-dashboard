import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

export interface CommentThread {
  threadId: string;
  videoId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  text: string;
  likeCount: number;
  replyCount: number;
  publishedAt: string;
}

// GET /api/youtube/comments?channelId=UCxxxxxx&maxResults=20
// 채널의 최근 공개 댓글 목록 조회
// Quota: commentThreads.list = 1 unit
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const channelId = searchParams.get('channelId');
  const maxResults = Math.min(Number(searchParams.get('maxResults') ?? '20'), 50);

  if (!channelId) {
    return NextResponse.json({ error: 'channelId 파라미터 필요' }, { status: 400 });
  }

  if (!process.env.YOUTUBE_API_KEY) {
    return NextResponse.json({ error: 'YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다' }, { status: 500 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (youtube.commentThreads.list as any)({
      part: ['snippet'],
      allThreadsRelatedToChannelId: channelId,
      maxResults,
      order: 'time',
    });

    const items: CommentThread[] = (res?.data?.items ?? []).map(
      (item: {
        id?: string;
        snippet?: {
          videoId?: string;
          totalReplyCount?: number;
          topLevelComment?: {
            snippet?: {
              textDisplay?: string;
              authorDisplayName?: string;
              authorProfileImageUrl?: string;
              likeCount?: number;
              publishedAt?: string;
            };
          };
        };
      }) => ({
        threadId: item.id ?? '',
        videoId: item.snippet?.videoId ?? '',
        authorName: item.snippet?.topLevelComment?.snippet?.authorDisplayName ?? '알 수 없음',
        authorPhotoUrl: item.snippet?.topLevelComment?.snippet?.authorProfileImageUrl ?? null,
        text: item.snippet?.topLevelComment?.snippet?.textDisplay ?? '',
        likeCount: item.snippet?.topLevelComment?.snippet?.likeCount ?? 0,
        replyCount: item.snippet?.totalReplyCount ?? 0,
        publishedAt: item.snippet?.topLevelComment?.snippet?.publishedAt ?? '',
      })
    );

    return NextResponse.json({ channelId, comments: items, fetchedAt: new Date().toISOString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
