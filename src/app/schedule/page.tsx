'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { loadData, updateSchedule } from '@/lib/storage';
import { ScheduleConfig } from '@/types';

const FREQ_OPTIONS = [
    { value: 'daily', label: '매일', desc: '매일 업로드 목표' },
    { value: '3perweek', label: '주 3회', desc: '월, 수, 금 업로드' },
    { value: 'weekly', label: '주 1회', desc: '주 1회 안정적 운영' },
];

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** frequency 설정에 따라 해당 요일(0=일…6=토)이 업로드 예정일인지 반환 */
function isUploadDay(dayOfWeek: number, frequency: ScheduleConfig['frequency']): boolean {
    if (frequency === 'daily') return true;
    if (frequency === '3perweek') return [1, 3, 5].includes(dayOfWeek); // 월·수·금
    if (frequency === 'weekly') return dayOfWeek === 1; // 매주 월요일
    return false;
}

interface MiniCalendarProps {
    frequency: ScheduleConfig['frequency'];
    enabled: boolean;
}

function MiniCalendar({ frequency, enabled }: MiniCalendarProps) {
    const today = new Date();
    const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=일
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 앞 빈칸 + 날짜 배열
    const cells: (number | null)[] = [
        ...Array(firstDayOfWeek).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    function prevMonth() {
        setViewDate(new Date(year, month - 1, 1));
    }
    function nextMonth() {
        setViewDate(new Date(year, month + 1, 1));
    }

    const isToday = (day: number) =>
        day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

    return (
        <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div className="card-title">📅 업로드 예정 캘린더</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={prevMonth}
                        style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '12px' }}
                    >‹</button>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '90px', textAlign: 'center' }}>
                        {year}년 {month + 1}월
                    </span>
                    <button
                        onClick={nextMonth}
                        style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '12px' }}
                    >›</button>
                </div>
            </div>

            {/* 요일 헤더 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '6px' }}>
                {DAY_LABELS.map((d, i) => (
                    <div key={d} style={{
                        textAlign: 'center', fontSize: '11px', fontWeight: 600,
                        color: i === 0 ? '#ef4444' : i === 6 ? '#60a5fa' : 'var(--text-muted)',
                        padding: '4px 0',
                    }}>
                        {d}
                    </div>
                ))}
            </div>

            {/* 날짜 그리드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {cells.map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} />;
                    const dow = (firstDayOfWeek + (day - 1)) % 7;
                    const scheduled = enabled && isUploadDay(dow, frequency);
                    const todayMark = isToday(day);
                    return (
                        <div key={day} style={{
                            position: 'relative',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            padding: '6px 2px',
                            borderRadius: '6px',
                            background: todayMark ? 'var(--accent-dim)' : 'transparent',
                        }}>
                            <span style={{
                                fontSize: '12px',
                                fontWeight: todayMark ? 700 : 400,
                                color: todayMark
                                    ? 'var(--accent)'
                                    : dow === 0 ? '#ef4444'
                                    : dow === 6 ? '#60a5fa'
                                    : 'var(--text-primary)',
                            }}>
                                {day}
                            </span>
                            {/* 업로드 예정 빨간 점 */}
                            {scheduled && (
                                <div style={{
                                    width: '4px', height: '4px', borderRadius: '50%',
                                    background: 'var(--accent)', marginTop: '2px',
                                }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 범례 */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)' }} />
                    업로드 예정일
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'var(--accent-dim)', border: '1px solid var(--accent)' }} />
                    오늘
                </div>
                {!enabled && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        (알림 비활성 — 점 표시 없음)
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SchedulePage() {
    const [config, setConfig] = useState<ScheduleConfig>({
        enabled: false,
        frequency: 'daily',
        targetTime: '18:00',
        emailAlert: false,
        emailAddress: '',
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setConfig(loadData().schedule);
    }, []);

    function handleSave() {
        updateSchedule(config);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);

        // 브라우저 알림 권한 요청
        if (config.enabled && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    return (
        <>
            <Header title="스케쥴 알림" subtitle="업로드 일정을 관리하고 알림을 받아보세요" />
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <div className="page-title">🗓️ 스케쥴 알림</div>
                        <div className="page-subtitle">발행 스케쥴이 설정된 날짜에 예약된 영상이 없으면 알림을 보내드립니다</div>
                    </div>
                </div>

                <div style={{ maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* 캘린더 */}
                    <MiniCalendar frequency={config.frequency} enabled={config.enabled} />

                    {/* 활성화 카드 */}
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                    🔔 스케쥴 알림 활성화
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    업로드 예정일에 영상이 없으면 알림을 받습니다
                                </div>
                            </div>
                            {/* Toggle */}
                            <div
                                onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
                                style={{
                                    width: '48px', height: '26px', borderRadius: '13px',
                                    background: config.enabled ? 'var(--accent)' : 'var(--border)',
                                    cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease',
                                    flexShrink: 0,
                                }}
                            >
                                <div style={{
                                    position: 'absolute', top: '3px',
                                    left: config.enabled ? '25px' : '3px',
                                    width: '20px', height: '20px', borderRadius: '50%',
                                    background: 'white', transition: 'left 0.2s ease',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                }} />
                            </div>
                        </div>
                    </div>

                    {/* 업로드 빈도 */}
                    <div className="card" style={{ opacity: config.enabled ? 1 : 0.5, pointerEvents: config.enabled ? 'auto' : 'none' }}>
                        <div className="card-title" style={{ marginBottom: '14px' }}>📅 업로드 빈도</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {FREQ_OPTIONS.map((opt) => (
                                <div
                                    key={opt.value}
                                    onClick={() => setConfig((c) => ({ ...c, frequency: opt.value as ScheduleConfig['frequency'] }))}
                                    style={{
                                        padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                                        border: `2px solid ${config.frequency === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                                        background: config.frequency === opt.value ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: config.frequency === opt.value ? 'var(--accent)' : 'var(--text-primary)' }}>
                                            {opt.label}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            {opt.desc}
                                        </div>
                                    </div>
                                    {config.frequency === opt.value && (
                                        <span style={{ color: 'var(--accent)', fontSize: '18px' }}>✓</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 목표 시간 */}
                    <div className="card" style={{ opacity: config.enabled ? 1 : 0.5, pointerEvents: config.enabled ? 'auto' : 'none' }}>
                        <div className="card-title" style={{ marginBottom: '14px' }}>⏰ 업로드 목표 시간</div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <input
                                type="time"
                                className="form-input"
                                value={config.targetTime}
                                onChange={(e) => setConfig((c) => ({ ...c, targetTime: e.target.value }))}
                                style={{ maxWidth: '200px' }}
                            />
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                                설정 시간이 지나도 콘텐츠 준비가 안 되면 브라우저 알림이 발송됩니다
                            </div>
                        </div>
                    </div>

                    {/* 이메일 알림 */}
                    <div className="card" style={{ opacity: config.enabled ? 1 : 0.5, pointerEvents: config.enabled ? 'auto' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: config.emailAlert ? '14px' : 0 }}>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                                    📧 이메일 알림 (선택)
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    매일 알림을 발송합니다
                                </div>
                            </div>
                            <div
                                onClick={() => setConfig((c) => ({ ...c, emailAlert: !c.emailAlert }))}
                                style={{
                                    width: '48px', height: '26px', borderRadius: '13px',
                                    background: config.emailAlert ? 'var(--accent)' : 'var(--border)',
                                    cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease',
                                    flexShrink: 0,
                                }}
                            >
                                <div style={{
                                    position: 'absolute', top: '3px',
                                    left: config.emailAlert ? '25px' : '3px',
                                    width: '20px', height: '20px', borderRadius: '50%',
                                    background: 'white', transition: 'left 0.2s ease',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                }} />
                            </div>
                        </div>
                        {config.emailAlert && (
                            <input
                                className="form-input"
                                type="email"
                                placeholder="your@email.com"
                                value={config.emailAddress || ''}
                                onChange={(e) => setConfig((c) => ({ ...c, emailAddress: e.target.value }))}
                            />
                        )}
                    </div>

                    {/* 저장 버튼 */}
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        style={{
                            background: saved ? '#22c55e' : 'var(--accent)',
                            transition: 'background 0.3s ease',
                        }}
                    >
                        {saved ? '✅ 저장되었습니다!' : '💾 설정 저장'}
                    </button>
                </div>
            </div>
        </>
    );
}
