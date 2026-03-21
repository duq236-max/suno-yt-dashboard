'use client';

import Image from 'next/image';
import { useEffect, useState, useMemo } from 'react';
import Header from '@/components/Header';
import { loadData } from '@/lib/supabase-storage';

interface VideoStat {
  videoId: string;
  title: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnailUrl: string | null;
}

type SortKey = 'date' | 'views' | 'likes' | 'comments';

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function VideosPage() {
  const [channelId, setChannelId] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoStat[]>([]);
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [searchQuery, setSearchQuery] = useState('');

  // Supabase에서 channelId 가져오기
  useEffect(() => {
    loadData().then((data) => {
      const ch = data.youtubeChannels?.[0];
      if (ch?.channelId) {
        setChannelId(ch.channelId);
      }
    });
  }, []);

  // channelId가 생기면 자동으로 불러오기
  useEffect(() => {
    if (!channelId) return;
    fetchVideos(channelId);
  }, [channelId]);

  async function fetchVideos(id: string) {
    setFetchState('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/youtube/analytics?channelId=${encodeURIComponent(id)}`);
      const json = await res.json() as { recentVideos?: VideoStat[]; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? '불러오기 실패');
      setVideos(json.recentVideos ?? []);
      setFetchState('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setFetchState('error');
    }
  }

  // 검색 + 정렬 (클라이언트 사이드)
  const filteredVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q ? videos.filter((v) => v.title.toLowerCase().includes(q)) : videos;

    return [...list].sort((a, b) => {
      if (sortKey === 'date') return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      if (sortKey === 'views') return b.viewCount - a.viewCount;
      if (sortKey === 'likes') return b.likeCount - a.likeCount;
      return b.commentCount - a.commentCount;
    });
  }, [videos, sortKey, searchQuery]);

  const isLoading = fetchState === 'loading';

  return (
    <div className="page-content">
      <Header
        title="영상 목록"
        subtitle="최근 업로드된 영상의 조회수, 좋아요, 댓글수를 한눈에 확인하세요"
      />

      {/* 컨트롤 바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {/* 검색 */}
        <input
          type="text"
          className="form-input"
          placeholder="영상 제목 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: '1', minWidth: '200px', maxWidth: '320px' }}
        />

        {/* 정렬 */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['date', 'views', 'likes', 'comments'] as SortKey[]).map((key) => {
            const labels: Record<SortKey, string> = {
              date: '📅 최신순',
              views: '👁 조회수',
              likes: '👍 좋아요',
              comments: '💬 댓글수',
            };
            return (
              <button
                key={key}
                className={`btn btn-sm ${sortKey === key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSortKey(key)}
              >
                {labels[key]}
              </button>
            );
          })}
        </div>

        {/* 새로고침 */}
        {channelId && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => fetchVideos(channelId)}
            disabled={isLoading}
          >
            {isLoading ? '로딩 중...' : '🔄 새로고침'}
          </button>
        )}
      </div>

      {/* 에러 */}
      {fetchState === 'error' && (
        <div
          className="info-banner"
          style={{ borderColor: 'var(--accent)', color: 'var(--accent)', marginBottom: '20px' }}
        >
          {errorMsg}
        </div>
      )}

      {/* 로딩 스켈레톤 */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="card loading-pulse"
              style={{ height: '80px', borderRadius: 'var(--radius-md)' }}
            />
          ))}
        </div>
      )}

      {/* 영상 목록 */}
      {!isLoading && fetchState === 'done' && (
        <>
          {filteredVideos.length === 0 ? (
            <div className="empty-state">
              {searchQuery ? (
                <p>&quot;{searchQuery}&quot; 에 일치하는 영상이 없습니다.</p>
              ) : (
                <p>영상 데이터가 없습니다.</p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* 헤더 행 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '56px 1fr 90px 80px 80px 96px',
                  gap: '12px',
                  padding: '8px 16px',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: '600',
                  letterSpacing: '0.04em',
                }}
              >
                <div />
                <div>제목</div>
                <div style={{ textAlign: 'right' }}>조회수</div>
                <div style={{ textAlign: 'right' }}>좋아요</div>
                <div style={{ textAlign: 'right' }}>댓글</div>
                <div style={{ textAlign: 'right' }}>업로드일</div>
              </div>

              {filteredVideos.map((v) => (
                <a
                  key={v.videoId}
                  href={`https://www.youtube.com/watch?v=${v.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="card"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '56px 1fr 90px 80px 80px 96px',
                      gap: '12px',
                      alignItems: 'center',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      transition: 'border-color var(--transition)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    {/* 썸네일 */}
                    <div
                      style={{
                        width: '56px',
                        height: '40px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: 'var(--bg-secondary)',
                        flexShrink: 0,
                        position: 'relative',
                      }}
                    >
                      {v.thumbnailUrl ? (
                        <Image
                          src={v.thumbnailUrl}
                          alt={v.title}
                          fill
                          sizes="56px"
                          style={{ objectFit: 'cover' }}
                          unoptimized
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                          }}
                        >
                          🎬
                        </div>
                      )}
                    </div>

                    {/* 제목 */}
                    <div
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: '500',
                      }}
                      title={v.title}
                    >
                      {v.title}
                    </div>

                    {/* 조회수 */}
                    <div style={{ textAlign: 'right', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>
                      👁 {formatCount(v.viewCount)}
                    </div>

                    {/* 좋아요 */}
                    <div style={{ textAlign: 'right', color: '#68d391', fontSize: '13px' }}>
                      👍 {formatCount(v.likeCount)}
                    </div>

                    {/* 댓글 */}
                    <div style={{ textAlign: 'right', color: '#63b3ed', fontSize: '13px' }}>
                      💬 {formatCount(v.commentCount)}
                    </div>

                    {/* 업로드일 */}
                    <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {formatDate(v.publishedAt)}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* 결과 수 */}
          <div style={{ marginTop: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>
            총 {filteredVideos.length}개 영상
            {searchQuery && ` (검색: "${searchQuery}")`}
          </div>
        </>
      )}

      {/* channelId 없을 때 안내 */}
      {fetchState === 'idle' && !channelId && (
        <div className="empty-state">
          <p>YouTube 채널 정보가 없습니다.</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
            대시보드에서 YouTube 채널 ID를 먼저 추가해주세요.
          </p>
        </div>
      )}
    </div>
  );
}
