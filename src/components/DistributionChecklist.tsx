'use client';

import { useState } from 'react';

interface CheckItem {
    id: string;
    label: string;
    description: string;
}

const CHECKLIST_ITEMS: CheckItem[] = [
    {
        id: 'copyright_keyword',
        label: '저작권 방어 키워드 포함',
        description: '가사 또는 설명에 "AI-generated", "Suno AI", "royalty-free" 등 포함 여부 확인',
    },
    {
        id: 'isrc',
        label: 'ISRC 코드 발급',
        description: 'DistroKid·TuneCore 등 유통사를 통해 International Standard Recording Code 발급 완료',
    },
    {
        id: 'cover_art',
        label: '커버아트 3000×3000px',
        description: 'JPG/PNG, 최소 3000×3000px, 72dpi 이상, 텍스트 가독성 확인',
    },
    {
        id: 'explicit_tag',
        label: 'Explicit 태그 설정',
        description: '가사에 비속어·성인 표현 포함 시 Explicit 태그 반드시 지정',
    },
    {
        id: 'artist_name',
        label: '아티스트명 일관성',
        description: '모든 플랫폼(Spotify, Apple Music, YouTube)에서 아티스트명 철자·대소문자 통일',
    },
    {
        id: 'title_dup',
        label: '타이틀 중복 확인',
        description: '동일 제목 곡이 이미 유통 중인지 Spotify·Apple Music 검색으로 확인',
    },
];

type ItemStatus = 'done' | 'warn' | 'pending';

export default function DistributionChecklist() {
    const [statuses, setStatuses] = useState<Record<string, ItemStatus>>(() =>
        Object.fromEntries(CHECKLIST_ITEMS.map(item => [item.id, 'pending']))
    );
    const [collapsed, setCollapsed] = useState(false);

    function cycle(id: string) {
        setStatuses(prev => {
            const next: ItemStatus =
                prev[id] === 'pending' ? 'done' :
                prev[id] === 'done'    ? 'warn' : 'pending';
            return { ...prev, [id]: next };
        });
    }

    const doneCount = Object.values(statuses).filter(s => s === 'done').length;
    const warnCount = Object.values(statuses).filter(s => s === 'warn').length;
    const totalCount = CHECKLIST_ITEMS.length;

    const statusConfig: Record<ItemStatus, { label: string; color: string; icon: string }> = {
        done:    { label: '통과', color: '#22c55e', icon: '✓' },
        warn:    { label: '주의', color: '#f59e0b', icon: '!' },
        pending: { label: '미완', color: 'var(--text-muted)', icon: '○' },
    };

    return (
        <div className="card" style={{ marginBottom: '20px' }}>
            <div
                className="card-header"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setCollapsed(v => !v)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h2 className="card-title">📋 유통 전 체크리스트</h2>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {doneCount}/{totalCount} 통과
                        {warnCount > 0 && <span style={{ color: '#f59e0b', marginLeft: '6px' }}>⚠ {warnCount} 주의</span>}
                    </span>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{collapsed ? '▼ 펼치기' : '▲ 접기'}</span>
            </div>

            {!collapsed && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {CHECKLIST_ITEMS.map(item => {
                        const st = statuses[item.id];
                        const cfg = statusConfig[st];
                        return (
                            <div
                                key={item.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px',
                                    padding: '12px 14px',
                                    borderRadius: '8px',
                                    background: 'var(--bg-secondary)',
                                    border: `1px solid ${st === 'done' ? 'rgba(34,197,94,0.25)' : st === 'warn' ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`,
                                    cursor: 'pointer',
                                    transition: 'var(--transition)',
                                }}
                                onClick={() => cycle(item.id)}
                                title="클릭하여 상태 변경: 미완 → 통과 → 주의"
                            >
                                <div
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        border: `2px solid ${cfg.color}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        color: cfg.color,
                                        fontWeight: 700,
                                        fontSize: '12px',
                                        background: st !== 'pending' ? `${cfg.color}20` : 'transparent',
                                    }}
                                >
                                    {cfg.icon}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.label}</span>
                                        <span
                                            style={{
                                                fontSize: '11px',
                                                padding: '1px 6px',
                                                borderRadius: '10px',
                                                background: `${cfg.color}20`,
                                                color: cfg.color,
                                                fontWeight: 600,
                                            }}
                                        >
                                            {cfg.label}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                        {item.description}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '4px' }}>
                        클릭 시 상태 순환: 미완 → 통과 → 주의
                    </div>
                </div>
            )}
        </div>
    );
}
