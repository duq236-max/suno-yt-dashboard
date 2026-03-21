'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { loadData, upsertSheet, generateId, formatDatetime } from '@/lib/supabase-storage';
import { ScrapSheet, ScrapItem, ScrapStatus } from '@/types';

const GENRES = ['Lo-fi', 'Jazz', 'Classical', 'Ambient', 'EDM', 'Chillhop', 'Piano', 'Nature Sounds',
    'Synthwave', 'Chill Lofi', 'Jazzy Lofi', 'Lofi Hip-hop', 'Sleep Music', '기타'];

const STATUS_COLORS: Record<ScrapStatus, string> = {
    unused: '#6b7280',
    ready: '#3b82f6',
    used: '#e53e3e',
};
const STATUS_LABELS: Record<ScrapStatus, string> = {
    unused: '미사용',
    ready: '준비됨',
    used: '사용됨',
};

type FilterSort = 'date' | 'status' | 'instruments';

const EMPTY_ITEM: Omit<ScrapItem, 'id' | 'createdAt'> = {
    title: '',
    genre: 'Lo-fi',
    prompt: '',
    lyrics: '',
    status: 'unused',
    instruments: '',
    mood_tags: [],
    is_instrumental: false,
};

export default function ScrapsheetDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [sheet, setSheet] = useState<ScrapSheet | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_ITEM);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [moodInput, setMoodInput] = useState('');
    const [filterSort, setFilterSort] = useState<FilterSort>('date');
    const [filterStatus, setFilterStatus] = useState<'all' | ScrapStatus>('all');
    const [injectedId, setInjectedId] = useState<string | null>(null);
    const [showAiModal, setShowAiModal] = useState<'flash' | 'pro' | null>(null);
    const [aiForm, setAiForm] = useState({ genre: 'Lo-fi', mood: '힐링', instruments: '', hasLyrics: true });
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    useEffect(() => {
        loadData()
            .then(data => {
                const found = data.sheets.find(s => s.id === id);
                if (!found) { router.push('/scrapsheet'); return; }
                setSheet(found);
            })
            .catch(() => setLoadError(true));
    }, [id, router]);

    // ✅ Hook 규칙: useMemo는 early return 전에 선언 (sheet가 null이면 빈 배열 반환)
    const filteredItems = useMemo(() => {
        if (!sheet) return [];
        let items = [...sheet.items];
        if (filterStatus !== 'all') items = items.filter(i => i.status === filterStatus);
        if (filterSort === 'date') items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        if (filterSort === 'status') items.sort((a, b) => a.status.localeCompare(b.status));
        if (filterSort === 'instruments') items = items.filter(i => i.instruments);
        return items;
    }, [sheet, filterSort, filterStatus]);

    if (loadError) {
        return (
            <>
                <Header title="스크랩시트" />
                <div className="page-content" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                    데이터를 불러오지 못했습니다. 새로고침 해주세요.
                </div>
            </>
        );
    }

    if (!sheet) {
        return (
            <>
                <Header title="스크랩시트" />
                <div className="page-content" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>불러오는 중...</div>
            </>
        );
    }

    async function persistSheet(updated: ScrapSheet) {
        setSheet(updated);
        try {
            await upsertSheet(updated);
        } catch (err) {
            console.error('시트 저장 실패:', err);
            alert('저장에 실패했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.');
        }
    }

    function openAdd() {
        setForm(EMPTY_ITEM);
        setMoodInput('');
        setEditingId(null);
        setShowForm(true);
    }

    function openEdit(item: ScrapItem) {
        setForm({
            title: item.title,
            genre: item.genre,
            prompt: item.prompt,
            lyrics: item.lyrics,
            status: item.status,
            instruments: item.instruments ?? '',
            mood_tags: item.mood_tags ?? [],
            is_instrumental: item.is_instrumental ?? false,
        });
        setMoodInput((item.mood_tags ?? []).join(', '));
        setEditingId(item.id);
        setShowForm(true);
    }

    function saveItem() {
        if (!form.title.trim()) return;
        const moodArr = moodInput.split(',').map(t => t.trim()).filter(Boolean);
        const finalForm = { ...form, mood_tags: moodArr };

        let updated: ScrapSheet;
        if (editingId) {
            updated = { ...sheet!, items: sheet!.items.map(i => i.id === editingId ? { ...i, ...finalForm } : i) } as ScrapSheet;
        } else {
            const newItem: ScrapItem = { id: generateId(), createdAt: new Date().toISOString(), ...finalForm };
            updated = { ...sheet!, items: [...sheet!.items, newItem] } as ScrapSheet;
        }
        persistSheet(updated);
        setShowForm(false);
    }

    function deleteItem(itemId: string) {
        if (!confirm('이 항목을 삭제하시겠습니까?')) return;
        persistSheet({ ...sheet!, items: sheet!.items.filter(i => i.id !== itemId) } as ScrapSheet);
    }

    function changeStatus(itemId: string, status: ScrapStatus) {
        persistSheet({
            ...sheet!,
            items: sheet!.items.map(i => i.id === itemId
                ? { ...i, status, usedAt: status === 'used' ? new Date().toISOString() : i.usedAt }
                : i),
        } as ScrapSheet);
    }

    function inject(item: ScrapItem) {
        // 1. 클립보드 백업
        const text = [
            item.prompt,
            item.instruments ? `Instruments: ${item.instruments}` : '',
            item.lyrics ? `\n[Lyrics]\n${item.lyrics}` : '',
        ].filter(Boolean).join('\n');
        navigator.clipboard.writeText(text).catch(() => { });

        // 2. 확장 프로그램 통신을 위한 localStorage 최적화
        const injectPayload = {
            id: item.id,
            title: item.title,
            prompt: item.prompt,
            style: [item.genre, item.instruments].filter(Boolean).join(', '),
            lyrics: item.lyrics || '',
            useAdvanced: true,
            autoCreate: false, // 팝업에서만 제어
            timestamp: Date.now(),
        };

        try {
            // "suno-yt-command" 라는 키로 특수 명령 전송
            localStorage.setItem('suno-yt-command', JSON.stringify(injectPayload));

            // 기존 히스토리 저장
            const existing = JSON.parse(localStorage.getItem('suno-yt-inject') || '[]');
            const updated = [injectPayload, ...existing].slice(0, 10);
            localStorage.setItem('suno-yt-inject', JSON.stringify(updated));
        } catch { }

        // 3. 커스텀 이벤트 발생 (dash-content.js가 더 쉽게 감지하도록)
        window.dispatchEvent(new CustomEvent('SUNO_YT_INJECT_EVENT', {
            detail: injectPayload
        }));

        // 4. 상태 업데이트
        setInjectedId(item.id);
        changeStatus(item.id, 'used');
        setTimeout(() => setInjectedId(null), 2500);

        // 5. suno.com/create 열기 (가장 중요한 부분!)
        window.open('https://suno.com/create', '_blank');
    }

    async function handleAiGenerate() {
        const apiKey = (await loadData()).geminiApiKey;
        if (!apiKey) {
            alert('먼저 설정 페이지에서 Gemini API 키를 입력해주세요.');
            setShowAiModal(null);
            return;
        }

        const modelLabel = showAiModal === 'flash' ? '🆓 2.5 Flash' : '🔥 2.5 Pro';

        setAiLoading(true);
        setAiError(null);

        try {
            const res = await fetch('/api/gemini/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey,
                    model: showAiModal,   // 'flash' | 'pro' — route에서 모델 ID로 변환
                    genre: aiForm.genre,
                    mood: aiForm.mood,
                    instruments: aiForm.instruments,
                    hasLyrics: aiForm.hasLyrics,
                }),
            });

            const json = await res.json() as { error?: string; title?: string; prompt?: string; lyrics?: string; mood_tags?: string[] };

            if (!res.ok) {
                throw new Error(json.error ?? `API 오류 (${res.status})`);
            }

            const newItem: ScrapItem = {
                id: generateId(),
                createdAt: new Date().toISOString(),
                title: json.title || `${aiForm.genre} — ${modelLabel} 생성`,
                genre: aiForm.genre,
                prompt: json.prompt ?? '',
                lyrics: aiForm.hasLyrics ? (json.lyrics ?? '') : '',
                status: 'unused',
                instruments: aiForm.instruments,
                mood_tags: json.mood_tags ?? [aiForm.mood],
                is_instrumental: !aiForm.hasLyrics,
            };

            persistSheet({ ...sheet!, items: [...sheet!.items, newItem] } as ScrapSheet);
            setShowAiModal(null);
        } catch (err) {
            const msg = err instanceof Error ? err.message : '알 수 없는 오류';
            setAiError(`AI 생성 실패: ${msg}`);
        } finally {
            setAiLoading(false);
        }
    }

    const filterBtn = (sort: FilterSort, label: string) => (
        <button
            key={sort}
            onClick={() => setFilterSort(sort)}
            style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', border: `1.5px solid ${filterSort === sort ? 'var(--accent)' : 'var(--border)'}`,
                background: filterSort === sort ? 'var(--accent-dim)' : 'transparent',
                color: filterSort === sort ? 'var(--accent)' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
            }}
        >{label}</button>
    );

    const statusFilterBtn = (s: 'all' | ScrapStatus, label: string) => (
        <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
                padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                cursor: 'pointer', border: `1.5px solid ${filterStatus === s ? 'var(--accent)' : 'var(--border)'}`,
                background: filterStatus === s ? 'var(--accent-dim)' : 'transparent',
                color: filterStatus === s ? 'var(--accent)' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
            }}
        >{label}</button>
    );

    return (
        <>
            <Header title={sheet.name} subtitle={sheet.genre ? `장르: ${sheet.genre}` : '스크랩시트 편집'} />
            <div className="page-content">

                {/* 상단 헤더 + 버튼 */}
                <div className="page-header" style={{ marginBottom: '16px' }}>
                    <div>
                        <div className="page-title">✂️ {sheet.name}</div>
                        <div className="page-subtitle">총 {sheet.items.length}개 · 준비 {sheet.items.filter(i => i.status === 'ready').length}개 · 사용됨 {sheet.items.filter(i => i.status === 'used').length}개</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <Link href="/lyrics">
                            <button className="btn btn-ghost btn-sm" style={{ borderColor: '#0ea5e9', color: '#38bdf8' }}>
                                ✍️ AI 가사 생성
                            </button>
                        </Link>
                        <button className="btn btn-ghost btn-sm" onClick={openAdd}>✏️ 직접 작성</button>
                        <button className="btn btn-ghost btn-sm" style={{ borderColor: '#6366f1', color: '#818cf8' }} onClick={() => setShowAiModal('flash')}>
                            🆓 Flash 생성
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowAiModal('pro')}>
                            🔥 Pro 생성
                        </button>
                    </div>
                </div>

                {/* 필터바 */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '6px 0', alignSelf: 'center' }}>정렬:</span>
                    {filterBtn('date', '📅 날짜순')}
                    {filterBtn('status', '🔵 상태순')}
                    {filterBtn('instruments', '🎸 Instruments 있음')}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '5px 0', alignSelf: 'center' }}>상태:</span>
                    {statusFilterBtn('all', '전체')}
                    {statusFilterBtn('unused', '미사용')}
                    {statusFilterBtn('ready', '준비됨')}
                    {statusFilterBtn('used', '사용됨')}
                </div>

                {/* ─── 카드 그리드 ─── */}
                {filteredItems.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <div className="empty-state-icon">🎵</div>
                            <div className="empty-state-title">아이템이 없습니다</div>
                            <div className="empty-state-desc">직접 작성하거나 AI로 생성해보세요</div>
                            <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={openAdd}>✏️ 직접 작성</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                        {filteredItems.map((item) => (
                            <div key={item.id} className="card" style={{ position: 'relative', padding: '18px' }}>

                                {/* 상태 뱃지 */}
                                <div style={{
                                    position: 'absolute', top: '14px', right: '14px',
                                    background: STATUS_COLORS[item.status] + '22',
                                    border: `1px solid ${STATUS_COLORS[item.status]}55`,
                                    color: STATUS_COLORS[item.status],
                                    borderRadius: '6px', padding: '3px 9px',
                                    fontSize: '11px', fontWeight: 700,
                                }}>
                                    {STATUS_LABELS[item.status]}
                                </div>

                                {/* 제목 + 날짜 */}
                                <div style={{ paddingRight: '72px', marginBottom: '10px' }}>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>
                                        {item.is_instrumental && <span style={{ fontSize: '10px', color: '#a78bfa', marginRight: '6px', border: '1px solid #a78bfa44', padding: '1px 5px', borderRadius: '4px' }}>Instrumental</span>}
                                        {item.title}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDatetime(item.createdAt)}</div>
                                </div>

                                {/* Genre */}
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                    <span style={{ color: '#94a3b8' }}>Genre: </span>{item.genre}
                                </div>

                                {/* Instruments */}
                                {item.instruments && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                        <span style={{ color: '#94a3b8' }}>Instruments: </span>
                                        {item.instruments.length > 60 ? item.instruments.slice(0, 60) + '…' : item.instruments}
                                    </div>
                                )}

                                {/* Lyrics preview */}
                                {item.lyrics && (
                                    <div style={{
                                        fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px',
                                        background: 'var(--bg-secondary)', borderRadius: '6px',
                                        padding: '8px 10px', lineHeight: 1.6,
                                        maxHeight: '70px', overflow: 'hidden',
                                    }}>
                                        <div style={{ color: '#64748b', fontSize: '10px', marginBottom: '3px' }}>[Intro]</div>
                                        {item.lyrics.slice(0, 100)}{item.lyrics.length > 100 ? '…' : ''}
                                    </div>
                                )}

                                {/* 무드 태그 */}
                                {(item.mood_tags ?? []).length > 0 && (
                                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                        {(item.mood_tags ?? []).map((tag) => (
                                            <span key={tag} style={{
                                                fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
                                                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                                color: 'var(--text-secondary)',
                                            }}>{tag}</span>
                                        ))}
                                    </div>
                                )}

                                {/* 상태 변경 셀렉트 */}
                                <select
                                    className="form-select"
                                    style={{ fontSize: '12px', padding: '5px 8px', marginBottom: '10px' }}
                                    value={item.status}
                                    onChange={e => changeStatus(item.id, e.target.value as ScrapStatus)}
                                >
                                    <option value="unused">미사용</option>
                                    <option value="ready">준비됨</option>
                                    <option value="used">사용됨</option>
                                </select>

                                {/* 액션 버튼 */}
                                <div style={{ display: 'flex', gap: '7px' }}>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        style={{
                                            flex: 1, justifyContent: 'center',
                                            background: injectedId === item.id ? '#22c55e' : 'var(--accent)',
                                            transition: 'background 0.3s',
                                        }}
                                        onClick={() => inject(item)}
                                    >
                                        {injectedId === item.id ? '✅ 복사됨!' : '⚡ 사용 표로'}
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>✏️</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => deleteItem(item.id)}>🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── 직접 작성 / 편집 모달 ─── */}
            {showForm && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
                    <div className="modal" style={{ maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <div className="modal-title">{editingId ? '✏️ 편집' : '✏️ 직접 작성'}</div>
                            <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
                        </div>

                        <div className="form-group">
                            <label className="form-label">제목 *</label>
                            <input className="form-input" placeholder="예: 모니터 너머로 흐르는 보라색 밤" value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="form-group">
                                <label className="form-label">장르</label>
                                <select className="form-select" value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}>
                                    {GENRES.map(g => <option key={g}>{g}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">악기 (Instruments)</label>
                                <input className="form-input" placeholder="예: Piano, Guitar, Drums" value={form.instruments}
                                    onChange={e => setForm(f => ({ ...f, instruments: e.target.value }))} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">무드 태그 (쉼표로 구분)</label>
                            <input className="form-input" placeholder="예: 몽환적인, 힐링, 집중" value={moodInput}
                                onChange={e => setMoodInput(e.target.value)} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">프롬프트</label>
                            <textarea className="form-textarea" placeholder="Suno AI에 입력할 프롬프트" value={form.prompt}
                                onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))} style={{ minHeight: '72px' }} />
                        </div>

                        <div className="form-group">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <label className="form-label" style={{ margin: 0 }}>가사 (Lyrics)</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={form.is_instrumental ?? false}
                                        onChange={e => setForm(f => ({ ...f, is_instrumental: e.target.checked }))} />
                                    Instrumental (가사 없음)
                                </label>
                            </div>
                            {!form.is_instrumental && (
                                <textarea className="form-textarea" placeholder="[Verse]\n...\n[Chorus]\n..." value={form.lyrics}
                                    onChange={e => setForm(f => ({ ...f, lyrics: e.target.value }))} style={{ minHeight: '100px' }} />
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>취소</button>
                            <button className="btn btn-primary" onClick={saveItem} disabled={!form.title.trim()}>
                                {editingId ? '✅ 수정 완료' : '+ 추가'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── AI 생성 모달 ─── */}
            {showAiModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !aiLoading) setShowAiModal(null); }}>
                    <div className="modal" style={{ maxWidth: '460px' }}>
                        <div className="modal-header">
                            <div className="modal-title">
                                {showAiModal === 'flash' ? '🆓 Flash 생성 (Gemini 2.5 Flash)' : '🔥 Pro 생성 (Gemini 2.5 Pro)'}
                            </div>
                            <button className="modal-close" onClick={() => { if (!aiLoading) { setShowAiModal(null); setAiError(null); } }}>✕</button>
                        </div>

                        <div style={{ marginBottom: '14px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            {showAiModal === 'flash'
                                ? '🆓 무료 · 빠른 생성 · 분당 15회 / 일 1,500회 한도'
                                : '🔥 유료 · 더 정교하고 창의적 · 결제 등록 필요'}
                        </div>

                        {/* 에러 메시지 */}
                        {aiError && (
                            <div style={{
                                marginBottom: '12px', padding: '10px 14px',
                                background: 'rgba(229,62,62,0.1)', border: '1px solid rgba(229,62,62,0.3)',
                                borderRadius: '8px', fontSize: '12px', color: '#f87171', lineHeight: 1.5,
                            }}>
                                ⚠️ {aiError}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">음악 장르</label>
                            <select className="form-select" value={aiForm.genre} onChange={e => setAiForm(f => ({ ...f, genre: e.target.value }))} disabled={aiLoading}>
                                {GENRES.map(g => <option key={g}>{g}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">분위기 (Mood)</label>
                            <input className="form-input" placeholder="예: 힐링, 집중, 수면, 에너지" value={aiForm.mood}
                                onChange={e => setAiForm(f => ({ ...f, mood: e.target.value }))} disabled={aiLoading} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">악기 스타일 (선택)</label>
                            <input className="form-input" placeholder="예: Piano, Guitar, Soft Drums" value={aiForm.instruments}
                                onChange={e => setAiForm(f => ({ ...f, instruments: e.target.value }))} disabled={aiLoading} />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: aiLoading ? 'not-allowed' : 'pointer' }}>
                                <input type="checkbox" checked={aiForm.hasLyrics} onChange={e => setAiForm(f => ({ ...f, hasLyrics: e.target.checked }))} disabled={aiLoading} />
                                가사 포함 (Custom Lyrics)
                            </label>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => { if (!aiLoading) { setShowAiModal(null); setAiError(null); } }} disabled={aiLoading}>취소</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleAiGenerate}
                                disabled={aiLoading}
                                style={{ opacity: aiLoading ? 0.7 : 1, minWidth: '130px', justifyContent: 'center' }}
                            >
                                {aiLoading
                                    ? <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>⏳ 생성 중...</span>
                                    : (showAiModal === 'flash' ? '🆓 Flash로 생성' : '🔥 Pro로 생성')
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
