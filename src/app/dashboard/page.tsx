'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import { loadData, updateYoutubeChannels, generateId, formatNumber } from '@/lib/supabase-storage';
import { loadLyricsHistory } from '@/lib/storage';
import { fetchYoutubeChannel, fetchYoutubeAnalytics, YoutubeAnalytics, YoutubeChannelInfo } from '@/lib/youtube';
import { AppData, YoutubeChannel } from '@/types';
import Link from 'next/link';
import Image from 'next/image';

const ViewsChart = dynamic(() => import('@/components/ViewsChart'), { ssr: false });
const GenreChart = dynamic(() => import('@/components/GenreChart'), { ssr: false });

const EMPTY_YT: Omit<YoutubeChannel, 'id' | 'connectedAt'> = {
    channelId: undefined,
    channelName: '',
    channelUrl: '',
    thumbnailUrl: undefined,
    totalViews: 0,
    totalWatchHours: 0,
    totalLikes: 0,
    totalComments: 0,
    avgEngagement: 0,
    totalShares: 0,
    subscriberCount: 0,
};

export default function DashboardPage() {
    const [data, setData] = useState<AppData | null>(null);

    useEffect(() => {
        loadData().then(setData);
    }, []);
    const [lyricsCount] = useState(() => loadLyricsHistory().length);
    const [showYtModal, setShowYtModal] = useState(false);
    const [ytForm, setYtForm] = useState(EMPTY_YT);
    const [editingYtId, setEditingYtId] = useState<string | null>(null);
    const [ytLookupLoading, setYtLookupLoading] = useState(false);
    const [pendingChannelId, setPendingChannelId] = useState<string | null>(null);
    const [analyticsMap, setAnalyticsMap] = useState<Record<string, YoutubeAnalytics>>({});
    const [liveChannelInfo, setLiveChannelInfo] = useState<Record<string, YoutubeChannelInfo>>({});
    const [recentGenres] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem('recentGenres');
            if (stored) {
                const parsed: unknown = JSON.parse(stored);
                if (Array.isArray(parsed)) return (parsed as string[]).slice(0, 3);
            }
        } catch { /* ignore */ }
        return [];
    });

    // 채널 목록이 생기면 analytics 병렬 fetch (quota 캐시 1시간)
    useEffect(() => {
        const channels = data?.youtubeChannels ?? [];
        if (channels.length === 0) return;

        // channelId가 있는 채널만 (자동 조회로 연결된 채널)
        const channelsWithId = channels.filter(c => c.channelId);
        if (channelsWithId.length === 0) return;

        let cancelled = false;
        Promise.all(
            channelsWithId.map(async (c) => {
                const result = await fetchYoutubeAnalytics(c.channelId!);
                return { id: c.channelId!, result };
            })
        ).then((entries) => {
            if (cancelled) return;
            const map: Record<string, YoutubeAnalytics> = {};
            entries.forEach(({ id, result }) => {
                if (result) map[id] = result;
            });
            if (Object.keys(map).length > 0) setAnalyticsMap(map);
        });

        return () => { cancelled = true; };
    }, [data?.youtubeChannels]);

    // 실시간 채널 기본 통계 fetch (구독자수, 총조회수, 영상수)
    useEffect(() => {
        const channelsWithId = (data?.youtubeChannels ?? []).filter(c => c.channelId);
        if (channelsWithId.length === 0) return;

        let cancelled = false;
        Promise.all(
            channelsWithId.map(async (c) => {
                const info = await fetchYoutubeChannel(c.channelId!); // 1시간 캐시 재사용
                return { id: c.channelId!, info };
            })
        ).then((entries) => {
            if (cancelled) return;
            const map: Record<string, YoutubeChannelInfo> = {};
            entries.forEach(({ id, info }) => { if (info) map[id] = info; });
            if (Object.keys(map).length > 0) setLiveChannelInfo(map);
        });

        return () => { cancelled = true; };
    }, [data?.youtubeChannels]);

    // ★ 훅은 조건부 return 전에 모두 선언해야 함 (Rules of Hooks)
    const ytChannels = data?.youtubeChannels ?? [];
    const ytTotalViews = ytChannels.reduce((s, c) => s + (c.totalViews ?? 0), 0);

    const viewsChartData = useMemo(() => {
        if (ytChannels.length === 0) return [];

        // 실데이터 우선: analyticsMap에서 주간 조회수 합산
        const analyticsEntries = Object.values(analyticsMap);
        if (analyticsEntries.length > 0) {
            // 여러 채널의 날짜별 조회수를 합산
            const merged: Record<string, number> = {};
            analyticsEntries.forEach((a) => {
                a.weeklyViews.forEach(({ date, views }) => {
                    merged[date] = (merged[date] ?? 0) + views;
                });
            });
            // weeklyViews의 날짜 순서 유지
            return analyticsEntries[0].weeklyViews.map(({ date }) => ({
                date,
                views: merged[date] ?? 0,
            }));
        }

        // fallback: 총조회수 기반 더미 분포 (analytics 로드 전)
        const days = ['월', '화', '수', '목', '금', '토', '일'];
        const weights = [0.78, 0.82, 0.88, 0.92, 1.05, 1.28, 1.15];
        const base = ytTotalViews > 0 ? ytTotalViews / 7 : 1000;
        const seed = (ytTotalViews % 1000) / 1000;
        return days.map((d, i) => ({
            date: d,
            views: Math.floor(base * weights[i] * (0.85 + seed * 0.3 * ((i % 3) / 3))),
        }));
    }, [ytChannels.length, ytTotalViews, analyticsMap]);

    const genreChartData = useMemo(() => {
        if (!data) return [];
        const map: Record<string, number> = {};
        data.sheets.forEach((s) => {
            const g = s.genre || '기타';
            map[g] = (map[g] ?? 0) + s.items.length;
        });
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([genre, count]) => ({ genre, count }));
    }, [data]);

    if (!data) {
        return (
            <>
                <Header title="대시보드" />
                <div className="page-content">
                    <div className="loading-pulse" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                        불러오는 중...
                    </div>
                </div>
            </>
        );
    }

    const totalPrompts = data.sheets.reduce((sum, s) => sum + s.items.length, 0);
    const usedPrompts = data.sheets.reduce(
        (sum, s) => sum + s.items.filter((i) => i.status === 'used').length, 0
    );
    const readyPrompts = data.sheets.reduce(
        (sum, s) => sum + s.items.filter((i) => i.status === 'ready').length, 0
    );
    const unusedPrompts = data.sheets.reduce(
        (sum, s) => sum + s.items.filter((i) => i.status === 'unused').length, 0
    );

    const statCards = [
        { label: '전체 시트', value: data.sheets.length, icon: '📋', change: '스크랩시트' },
        { label: '총 프롬프트', value: totalPrompts, icon: '🎵', change: '전체 보유량' },
        { label: '생성 준비됨', value: readyPrompts, icon: '✅', change: '즉시 사용 가능', positive: true },
        { label: '이미 사용됨', value: usedPrompts, icon: '🔴', change: `미사용 ${unusedPrompts}개 남음` },
    ];

    // ─── 실시간 API 집계 (liveChannelInfo 우선, 없으면 localStorage fallback) ───
    const liveEntries = Object.values(liveChannelInfo);
    const hasLive = liveEntries.length > 0;
    const ytLiveSubscribers = hasLive ? liveEntries.reduce((s, c) => s + c.subscriberCount, 0) : 0;
    const ytLiveViews = hasLive ? liveEntries.reduce((s, c) => s + c.totalViews, 0) : ytTotalViews;
    const ytLiveVideoCount = hasLive ? liveEntries.reduce((s, c) => s + c.videoCount, 0) : 0;

    // recentVideos 기반 집계 (analytics에서 이미 fetch된 데이터 재활용, quota 0)
    const analyticsValues = Object.values(analyticsMap);
    const ytRecentLikes = analyticsValues.reduce(
        (s, a) => s + a.recentVideos.reduce((vs, v) => vs + v.likeCount, 0), 0
    );
    const ytRecentComments = analyticsValues.reduce(
        (s, a) => s + a.recentVideos.reduce((vs, v) => vs + v.commentCount, 0), 0
    );

    // localStorage에서만 오는 수동 입력 통계
    const ytTotalWatchHours = ytChannels.reduce((s, c) => s + (c.totalWatchHours ?? 0), 0);

    const ytStatCards = [
        { label: '전체 채널', value: ytChannels.length > 0 ? ytChannels.length : '-', icon: '📺' },
        { label: '구독자수', value: ytLiveSubscribers > 0 ? formatNumber(ytLiveSubscribers) : (ytChannels.some(c => c.subscriberCount) ? formatNumber(ytChannels.reduce((s, c) => s + (c.subscriberCount ?? 0), 0)) : '-'), icon: '👥', live: hasLive },
        { label: '총 조회수', value: ytLiveViews > 0 ? formatNumber(ytLiveViews) : '-', icon: '👁', live: hasLive },
        { label: '총 영상수', value: ytLiveVideoCount > 0 ? formatNumber(ytLiveVideoCount) : '-', icon: '🎬', live: hasLive },
        { label: '최근영상 좋아요', value: ytRecentLikes > 0 ? formatNumber(ytRecentLikes) : '-', icon: '👍', live: analyticsValues.length > 0 },
        { label: '최근영상 댓글', value: ytRecentComments > 0 ? formatNumber(ytRecentComments) : '-', icon: '💬', live: analyticsValues.length > 0 },
        { label: '총 시청시간', value: ytTotalWatchHours > 0 ? formatNumber(ytTotalWatchHours) + 'h' : '-', icon: '⏱' },
    ];

    function openAddYt() {
        setYtForm(EMPTY_YT);
        setEditingYtId(null);
        setPendingChannelId(null);
        setShowYtModal(true);
    }

    function openEditYt(ch: YoutubeChannel) {
        setPendingChannelId(ch.channelId ?? null);
        setYtForm({
            channelName: ch.channelName,
            channelUrl: ch.channelUrl,
            totalViews: ch.totalViews ?? 0,
            totalWatchHours: ch.totalWatchHours ?? 0,
            totalLikes: ch.totalLikes ?? 0,
            totalComments: ch.totalComments ?? 0,
            avgEngagement: ch.avgEngagement ?? 0,
            totalShares: ch.totalShares ?? 0,
            subscriberCount: ch.subscriberCount ?? 0,
        });
        setEditingYtId(ch.id);
        setShowYtModal(true);
    }

    async function saveYtChannel() {
        if (!ytForm.channelName.trim()) return;
        const updated = [...(data!.youtubeChannels ?? [])];
        if (editingYtId) {
            const idx = updated.findIndex(c => c.id === editingYtId);
            if (idx >= 0) updated[idx] = { ...updated[idx], ...ytForm, channelId: pendingChannelId ?? updated[idx].channelId };
        } else {
            updated.push({ id: generateId(), ...ytForm, channelId: pendingChannelId ?? undefined, connectedAt: new Date().toISOString() });
        }
        const newData = { ...data!, youtubeChannels: updated };
        setData(newData);
        setShowYtModal(false);
        await updateYoutubeChannels(updated);
    }

    async function deleteYtChannel(id: string) {
        if (!confirm('채널을 삭제하시겠습니까?')) return;
        const updated = (data!.youtubeChannels ?? []).filter(c => c.id !== id);
        const newData = { ...data!, youtubeChannels: updated };
        setData(newData);
        await updateYoutubeChannels(updated);
    }

    const numField = (key: keyof typeof ytForm, label: string) => (
        <div className="form-group" key={key}>
            <label className="form-label">{label}</label>
            <input
                type="number"
                className="form-input"
                min={0}
                value={(ytForm[key] as number) || 0}
                onChange={(e) => setYtForm(f => ({ ...f, [key]: Number(e.target.value) }))}
            />
        </div>
    );

    return (
        <>
            <Header title="대시보드" subtitle={`환영합니다! ${data.channel ? data.channel.name + ' 채널 운영 중' : '채널을 기획해 시작해보세요'}`} />
            <div className="page-content">

                {/* 채널 미설정 배너 */}
                {!data.channel && (
                    <div className="info-banner warning" style={{ marginBottom: '24px' }}>
                        <span style={{ fontSize: '20px' }}>💡</span>
                        <div className="info-banner-text">
                            <strong style={{ color: 'var(--text-primary)' }}>채널 기획이 아직 없어요!</strong><br />
                            채널 기획 설문을 완료하면 더 체계적으로 관리할 수 있습니다.{' '}
                            <Link href="/planner" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                                지금 시작하기 →
                            </Link>
                        </div>
                    </div>
                )}

                {/* 채널 정보 카드 */}
                {data.channel && (
                    <div className="card" style={{ marginBottom: '24px', borderColor: 'rgba(229, 62, 62, 0.2)', background: 'linear-gradient(135deg, #1a0f0f 0%, #1a1a1a 100%)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '52px', height: '52px', borderRadius: '12px',
                                background: 'var(--accent)', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: '24px', flexShrink: 0,
                            }}>🎵</div>
                            <div>
                                <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>{data.channel.name}</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    {data.channel.genre} · {data.channel.targetAudience} · {data.channel.uploadFrequency}
                                </div>
                            </div>
                            <Link href="/planner" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>✏️ 수정</Link>
                        </div>
                    </div>
                )}

                {/* 오늘 뭐 만들까? 퀵 액션 위젯 */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>🎵 오늘 뭐 만들까?</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: recentGenres.length > 0 ? '14px' : '0' }}>
                        <Link href="/lyrics" className="btn btn-primary btn-sm">✨ 가사 만들기</Link>
                        <Link href="/cover" className="btn btn-secondary btn-sm">🎨 커버 아트</Link>
                        <Link href="/ideation" className="btn btn-ghost btn-sm">💡 영상 아이디어</Link>
                        {lyricsCount > 0 && (
                            <Link href="/lyrics" className="btn btn-ghost btn-sm" style={{ borderColor: 'rgba(99,102,241,0.4)', color: '#818cf8' }}>
                                ↩️ 계속 이어서
                            </Link>
                        )}
                    </div>
                    {recentGenres.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {recentGenres.map((g) => (
                                <span key={g} style={{
                                    fontSize: '12px', padding: '3px 10px', borderRadius: '20px',
                                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                    color: 'var(--text-muted)',
                                }}>{g}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* 프롬프트 통계 카드 */}
                <div className="stats-grid">
                    {statCards.map((card) => (
                        <StatCard key={card.label} {...card} />
                    ))}
                </div>

                {/* ─── 크리에이티브 현황 ─── */}
                <div style={{ marginTop: '24px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>
                        🎨 크리에이티브 현황
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                        <Link href="/lyrics" style={{ textDecoration: 'none' }}>
                            <div className="card" style={{ padding: '16px', cursor: 'pointer' }}>
                                <div style={{ fontSize: '22px', marginBottom: '8px' }}>🎤</div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{lyricsCount}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>생성된 가사</div>
                            </div>
                        </Link>
                        <Link href="/brand-kit" style={{ textDecoration: 'none' }}>
                            <div className="card" style={{ padding: '16px', cursor: 'pointer', borderColor: data.brandKit ? 'rgba(229,62,62,0.3)' : 'var(--border)' }}>
                                <div style={{ fontSize: '22px', marginBottom: '8px' }}>🎨</div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: data.brandKit ? 'var(--accent)' : 'var(--text-muted)' }}>
                                    {data.brandKit ? '설정 완료' : '미설정'}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>브랜드 키트</div>
                                {data.brandKit && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {data.brandKit.channelName || data.brandKit.primaryGenre || ''}
                                    </div>
                                )}
                            </div>
                        </Link>
                        <Link href="/ideation" style={{ textDecoration: 'none' }}>
                            <div className="card" style={{ padding: '16px', cursor: 'pointer' }}>
                                <div style={{ fontSize: '22px', marginBottom: '8px' }}>💡</div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>아이디어 생성</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Video Ideation →</div>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* ─── YouTube 통계 섹션 ─── */}
                <div style={{ marginTop: '28px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>
                        📺 YouTube 채널 통계
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                        {ytStatCards.map((c) => (
                            <StatCard
                                key={c.label}
                                label={c.label}
                                value={c.value}
                                icon={c.icon}
                                small
                                change={c.live ? '● 실시간' : undefined}
                            />
                        ))}
                    </div>

                    {/* 차트 섹션 */}
                    {ytChannels.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                            <div className="card">
                                <div className="card-header">
                                    <div className="card-title">📈 주간 조회수 추이</div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>최근 7일</span>
                                </div>
                                <ViewsChart data={viewsChartData} />
                            </div>
                            <div className="card">
                                <div className="card-header">
                                    <div className="card-title">🎵 장르별 프롬프트</div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>상위 5개</span>
                                </div>
                                <GenreChart data={genreChartData} />
                            </div>
                        </div>
                    )}

                    {/* 최근 업로드 영상 목록 (recentVideos 실데이터) */}
                    {analyticsValues.length > 0 && analyticsValues.some(a => a.recentVideos.length > 0) && (
                        <div className="card" style={{ marginBottom: '14px' }}>
                            <div className="card-header">
                                <div className="card-title">🎬 최근 업로드 영상</div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>최근 10개</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {analyticsValues.flatMap(a => a.recentVideos)
                                    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
                                    .slice(0, 10)
                                    .map((v) => (
                                        <a
                                            key={v.videoId}
                                            href={`https://www.youtube.com/watch?v=${v.videoId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ textDecoration: 'none' }}
                                        >
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                padding: '10px 12px', borderRadius: '8px',
                                                border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                                transition: 'border-color var(--transition)',
                                            }}
                                                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
                                                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                                            >
                                                {v.thumbnailUrl && (
                                                    <Image src={v.thumbnailUrl} alt="" width={60} height={34} style={{ objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                                                )}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {v.title}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                        {new Date(v.publishedAt).toLocaleDateString('ko-KR')}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
                                                    <span>👁 {formatNumber(v.viewCount)}</span>
                                                    <span>👍 {formatNumber(v.likeCount)}</span>
                                                    <span>💬 {formatNumber(v.commentCount)}</span>
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                            </div>
                        </div>
                    )}

                    {ytChannels.length === 0 && genreChartData.length > 0 && (
                        <div className="card" style={{ marginBottom: '24px' }}>
                            <div className="card-header">
                                <div className="card-title">🎵 장르별 프롬프트</div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>상위 5개</span>
                            </div>
                            <GenreChart data={genreChartData} />
                        </div>
                    )}
                </div>

                {/* ─── 내 채널 섹션 ─── */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <div className="card-title">📺 내 채널</div>
                        <button className="btn btn-primary btn-sm" onClick={openAddYt}>+ 채널 연결</button>
                    </div>

                    {ytChannels.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📺</div>
                            <div className="empty-state-title">아직 등록된 채널이 없습니다</div>
                            <div className="empty-state-desc">첫 번째 YouTube 채널을 연결하여 시작하세요</div>
                            <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={openAddYt}>
                                + 채널 연결
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {ytChannels.map((ch) => (
                                <div key={ch.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '14px',
                                    padding: '14px 16px', borderRadius: '10px',
                                    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #ff0000, #cc0000)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '18px', flexShrink: 0,
                                    }}>▶</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{ch.channelName}</div>
                                        <a href={ch.channelUrl} target="_blank" rel="noopener noreferrer"
                                            style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}>
                                            {ch.channelUrl} ↗
                                        </a>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {ch.subscriberCount ? <span>구독 {formatNumber(ch.subscriberCount)}</span> : null}
                                        {ch.totalViews ? <span>조회 {formatNumber(ch.totalViews)}</span> : null}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEditYt(ch)}>✏️</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => deleteYtChannel(ch.id)}>🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 빠른 액션 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                    <div className="card" style={{ cursor: 'pointer' }} onClick={() => window.open('https://suno.com', '_blank')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '10px',
                                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                            }}>🎼</div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Suno AI 열기</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>suno.com 에서 음악 생성</div>
                            </div>
                            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '18px' }}>↗</span>
                        </div>
                    </div>
                    <Link href="/scrapsheet" className="card" style={{ textDecoration: 'none', display: 'block' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '10px',
                                background: 'linear-gradient(135deg, #e53e3e, #c53030)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                            }}>✂️</div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>스크랩시트</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>프롬프트 · 가사 관리</div>
                            </div>
                            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '18px' }}>→</span>
                        </div>
                    </Link>
                </div>

                {/* 최근 스크랩시트 */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">📋 최근 스크랩시트</div>
                        <Link href="/scrapsheet" className="btn btn-ghost btn-sm">전체 보기</Link>
                    </div>
                    {data.sheets.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">✂️</div>
                            <div className="empty-state-title">스크랩시트가 없습니다</div>
                            <div className="empty-state-desc">Suno AI에 넣을 프롬프트와 가사를 스크랩시트에 정리해보세요</div>
                            <Link href="/scrapsheet" className="btn btn-primary" style={{ marginTop: '8px' }}>+ 첫 번째 시트 만들기</Link>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {data.sheets.slice(0, 5).map((sheet) => {
                                const used = sheet.items.filter((i) => i.status === 'used').length;
                                const total = sheet.items.length;
                                const pct = total > 0 ? Math.round((used / total) * 100) : 0;
                                return (
                                    <Link key={sheet.id} href={`/scrapsheet/${sheet.id}`} style={{ textDecoration: 'none' }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '14px',
                                            padding: '12px 14px', borderRadius: '8px',
                                            border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                                            transition: 'all 0.15s ease', cursor: 'pointer',
                                        }}
                                            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
                                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{sheet.name}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    {sheet.genre || '장르 미설정'} · {total}개 프롬프트
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{used}/{total} 사용</div>
                                                <div style={{ width: '80px', height: '4px', background: 'var(--border)', borderRadius: '4px', marginTop: '6px', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                                                </div>
                                            </div>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '16px' }}>→</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── YouTube 채널 연결 모달 ─── */}
            {showYtModal && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowYtModal(false); }}>
                    <div className="modal" style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <div className="modal-title">📺 {editingYtId ? '채널 수정' : '채널 연결'}</div>
                            <button className="modal-close" onClick={() => setShowYtModal(false)}>✕</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div className="form-group">
                                <label className="form-label">채널 이름 *</label>
                                <input className="form-input" placeholder="예: 새벽 Lo-fi" value={ytForm.channelName}
                                    onChange={e => setYtForm(f => ({ ...f, channelName: e.target.value }))} autoFocus />
                            </div>
                            <div className="form-group">
                                <label className="form-label">채널 URL</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input className="form-input" placeholder="https://youtube.com/@..." value={ytForm.channelUrl}
                                        onChange={e => setYtForm(f => ({ ...f, channelUrl: e.target.value }))} />
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                                        disabled={!ytForm.channelUrl.trim() || ytLookupLoading}
                                        onClick={async () => {
                                            setYtLookupLoading(true);
                                            const info = await fetchYoutubeChannel(ytForm.channelUrl);
                                            if (info) {
                                                setYtForm(f => ({
                                                    ...f,
                                                    channelName: f.channelName || info.name,
                                                    subscriberCount: info.subscriberCount,
                                                    totalViews: info.totalViews,
                                                    thumbnailUrl: info.thumbnailUrl ?? undefined,
                                                }));
                                                setPendingChannelId(info.id);
                                            } else {
                                                alert('채널 정보를 가져오지 못했습니다. API 키를 확인해주세요.');
                                            }
                                            setYtLookupLoading(false);
                                        }}
                                    >
                                        {ytLookupLoading ? '조회 중...' : '🔍 자동 조회'}
                                    </button>
                                </div>
                            </div>

                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 0 4px', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
                                📊 통계 수동 입력 (선택사항 — 자동 조회 후 추가 입력)
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                                {numField('subscriberCount', '구독자 수')}
                                {numField('totalViews', '총 조회수')}
                                {numField('totalWatchHours', '총 시청시간 (시간)')}
                                {numField('totalLikes', '총 좋아요')}
                                {numField('totalComments', '총 댓글수')}
                                {numField('totalShares', '총 공유수')}
                                {numField('avgEngagement', '평균 참여율 (%)')}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowYtModal(false)}>취소</button>
                            <button className="btn btn-primary" onClick={saveYtChannel} disabled={!ytForm.channelName.trim()}>
                                {editingYtId ? '✅ 수정 완료' : '✅ 채널 연결'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
