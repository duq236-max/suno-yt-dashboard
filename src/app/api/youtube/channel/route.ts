import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

// GET /api/youtube/channel?id=UCxxxxxx or ?handle=@channelHandle
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const channelId = searchParams.get('id');
  const handle = searchParams.get('handle');

  if (!channelId && !handle) {
    return NextResponse.json({ error: 'id 또는 handle 파라미터 필요' }, { status: 400 });
  }

  if (!process.env.YOUTUBE_API_KEY) {
    return NextResponse.json({ error: 'YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다' }, { status: 500 });
  }

  try {
    const cleanHandle = handle?.startsWith('@') ? handle.slice(1) : (handle ?? undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (youtube.channels.list as any)({
      part: ['snippet', 'statistics'],
      maxResults: 1,
      ...(channelId ? { id: [channelId] } : { forHandle: cleanHandle }),
    });

    const channel = response?.data?.items?.[0];

    if (!channel) {
      return NextResponse.json({ error: '채널을 찾을 수 없습니다' }, { status: 404 });
    }

    const stats = channel.statistics;
    return NextResponse.json({
      id: channel.id,
      name: channel.snippet?.title ?? '',
      thumbnailUrl: channel.snippet?.thumbnails?.default?.url ?? null,
      subscriberCount: Number(stats?.subscriberCount ?? 0),
      totalViews: Number(stats?.viewCount ?? 0),
      videoCount: Number(stats?.videoCount ?? 0),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
