'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import { loadData } from '@/lib/supabase-storage';
import type { CommentThread } from '@/app/api/youtube/comments/route';
import type { ReplyResult } from '@/app/api/gemini/reply/route';

type FetchState = 'idle' | 'loading' | 'done' | 'error';

interface ReplyState {
  state: 'idle' | 'generating' | 'done' | 'error';
  reply: string;
  error: string;
  copied: boolean;
}

const defaultReplyState = (): ReplyState => ({
  state: 'idle',
  reply: '',
  error: '',
  copied: false,
});

function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

function AuthorAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const [imgError, setImgError] = useState(false);
  const initial = name?.[0]?.toUpperCase() ?? '?';

  if (!photoUrl || imgError) {
    return (
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
        background: 'var(--accent)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff',
      }}>
        {initial}
      </div>
    );
  }

  return (
    <Image
      src={photoUrl}
      alt={name}
      width={36}
      height={36}
      style={{ borderRadius: '50%', flexShrink: 0 }}
      onError={() => setImgError(true)}
    />
  );
}

export default function CommentsPage() {
  const [apiKey, setApiKey] = useState('');
  const [channelId, setChannelId] = useState('');
  const [channelName, setChannelName] = useState('');
  const [genre, setGenre] = useState('');
  const [moodKeywords, setMoodKeywords] = useState<string[]>([]);

  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [comments, setComments] = useState<CommentThread[]>([]);
  const [fetchError, setFetchError] = useState('');
  const [fetchedAt, setFetchedAt] = useState('');

  const [replyStates, setReplyStates] = useState<Record<string, ReplyState>>({});

  useEffect(() => {
    loadData().then((data) => {
    setApiKey(data.geminiApiKey ?? '');

    const bk = data.brandKit;
    const ch = data.channel;
    const yt = data.youtubeChannels?.[0];

    setChannelName(bk?.channelName || ch?.name || yt?.channelName || '내 채널');
    setGenre(bk?.primaryGenre || ch?.genre || '음악');
    setMoodKeywords(bk?.moodKeywords || []);

    const firstChannelId = yt?.channelId ?? '';
    setChannelId(firstChannelId);
    });
  }, []);

  const handleFetch = useCallback(async () => {
    if (!channelId) {
      setFetchError('대시보드에서 YouTube 채널을 먼저 등록하세요.');
      setFetchState('error');
      return;
    }

    setFetchState('loading');
    setFetchError('');
    setComments([]);
    setReplyStates({});

    try {
      const res = await fetch(`/api/youtube/comments?channelId=${channelId}&maxResults=20`);
      const json = await res.json() as { comments?: CommentThread[]; fetchedAt?: string; error?: string };

      if (!res.ok || json.error) throw new Error(json.error ?? '댓글을 불러오지 못했습니다.');

      setComments(json.comments ?? []);
      setFetchedAt(json.fetchedAt ?? '');
      setFetchState('done');
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setFetchState('error');
    }
  }, [channelId]);

  async function handleGenerateReply(comment: CommentThread) {
    if (!apiKey) {
      setReplyStates((prev) => ({
        ...prev,
        [comment.threadId]: { state: 'error', reply: '', error: 'Gemini API 키가 없습니다. 설정 페이지에서 입력하세요.', copied: false },
      }));
      return;
    }

    setReplyStates((prev) => ({
      ...prev,
      [comment.threadId]: { state: 'generating', reply: '', error: '', copied: false },
    }));

    try {
      const res = await fetch('/api/gemini/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          comment: comment.text,
          authorName: comment.authorName,
          channelName,
          genre,
          moodKeywords,
        }),
      });
      const json = await res.json() as ReplyResult & { error?: string };

      if (!res.ok || json.error) throw new Error(json.error ?? '답글 생성에 실패했습니다.');

      setReplyStates((prev) => ({
        ...prev,
        [comment.threadId]: { state: 'done', reply: json.reply, error: '', copied: false },
      }));
    } catch (err) {
      setReplyStates((prev) => ({
        ...prev,
        [comment.threadId]: {
          state: 'error',
          reply: '',
          error: err instanceof Error ? err.message : '오류가 발생했습니다.',
          copied: false,
        },
      }));
    }
  }

  function handleCopy(threadId: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setReplyStates((prev) => ({
        ...prev,
        [threadId]: { ...prev[threadId], copied: true },
      }));
      setTimeout(() => {
        setReplyStates((prev) => ({
          ...prev,
          [threadId]: { ...prev[threadId], copied: false },
        }));
      }, 2000);
    });
  }

  const isLoading = fetchState === 'loading';

  return (
    <div className="page-content">
      <Header
        title="댓글 관리"
        subtitle="채널 댓글 목록을 불러오고 AI 답글을 자동으로 생성합니다"
      />

      {/* 상단 컨트롤 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '24px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          채널:{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {channelName || '미등록'}
          </strong>
          {fetchedAt && (
            <span style={{ marginLeft: '12px', fontSize: '11px' }}>
              마지막 갱신: {new Date(fetchedAt).toLocaleString('ko-KR')}
            </span>
          )}
        </div>
        <button
          className="btn btn-primary"
          onClick={handleFetch}
          disabled={isLoading}
          style={{ minWidth: '140px' }}
        >
          {isLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="loading-pulse" style={{ width: '14px', height: '14px', borderRadius: '50%', display: 'inline-block' }} />
              불러오는 중...
            </span>
          ) : comments.length > 0 ? '댓글 새로고침' : '댓글 불러오기'}
        </button>
      </div>

      {/* 오류 */}
      {fetchState === 'error' && (
        <div className="info-banner" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', marginBottom: '24px' }}>
          {fetchError}
        </div>
      )}

      {/* 댓글 목록 */}
      {comments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {comments.map((comment) => {
            const rs = replyStates[comment.threadId] ?? defaultReplyState();
            return (
              <div key={comment.threadId} className="card" style={{ padding: '16px' }}>
                {/* 댓글 헤더 */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <AuthorAvatar name={comment.authorName} photoUrl={comment.authorPhotoUrl} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {comment.authorName}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {timeAgo(comment.publishedAt)}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '13.5px', color: 'var(--text-secondary)',
                      lineHeight: 1.6, margin: 0,
                      wordBreak: 'break-word',
                    }}>
                      {comment.text}
                    </p>
                  </div>
                </div>

                {/* 댓글 통계 + 버튼 */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: '8px',
                }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {comment.likeCount > 0 && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        👍 {comment.likeCount.toLocaleString()}
                      </span>
                    )}
                    {comment.replyCount > 0 && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        💬 답글 {comment.replyCount}개
                      </span>
                    )}
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleGenerateReply(comment)}
                    disabled={rs.state === 'generating'}
                  >
                    {rs.state === 'generating' ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="loading-pulse" style={{ width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block' }} />
                        생성 중...
                      </span>
                    ) : rs.state === 'done' ? '🔄 재생성' : '🤖 AI 답글 생성'}
                  </button>
                </div>

                {/* 생성된 답글 */}
                {rs.state === 'done' && rs.reply && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px 14px',
                    background: 'rgba(229,62,62,0.06)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(229,62,62,0.2)',
                  }}>
                    <div style={{
                      fontSize: '11px', color: 'var(--accent)', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px',
                    }}>
                      AI 생성 답글
                    </div>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.7, margin: 0 }}>
                      {rs.reply}
                    </p>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleCopy(comment.threadId, rs.reply)}
                      style={{ marginTop: '10px' }}
                    >
                      {rs.copied ? '✅ 복사됨' : '📋 클립보드 복사'}
                    </button>
                  </div>
                )}

                {/* 답글 오류 */}
                {rs.state === 'error' && (
                  <div style={{
                    marginTop: '10px', fontSize: '12px', color: 'var(--accent)',
                    padding: '8px 12px', background: 'rgba(229,62,62,0.08)',
                    borderRadius: 'var(--radius-md)', border: '1px solid rgba(229,62,62,0.2)',
                  }}>
                    {rs.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 초기 안내 */}
      {fetchState === 'idle' && comments.length === 0 && (
        <div className="empty-state">
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
          <p>댓글 불러오기 버튼을 눌러 시작하세요.</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
            채널의 최근 공개 댓글을 가져오고<br />
            Gemini AI가 맞춤형 답글 초안을 생성합니다.
          </p>
        </div>
      )}

      {/* 댓글 없음 */}
      {fetchState === 'done' && comments.length === 0 && (
        <div className="empty-state">
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔇</div>
          <p>불러온 댓글이 없습니다.</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
            채널에 공개 댓글이 없거나 댓글이 비활성화되어 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
