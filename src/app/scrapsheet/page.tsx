'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import { loadData, saveData, generateId } from '@/lib/storage';
import { ScrapSheet } from '@/types';
import Link from 'next/link';

const GENRES = ['Lo-fi', 'Jazz', 'Classical', 'Ambient', 'EDM', 'Chillhop', 'Piano', 'Nature Sounds', '기타'];

export default function ScrapsheetPage() {
    const [sheets, setSheets] = useState<ScrapSheet[]>(() => loadData().sheets);
    const [showNewSheet, setShowNewSheet] = useState(false);
    const [newSheetName, setNewSheetName] = useState('');
    const [newSheetGenre, setNewSheetGenre] = useState('Lo-fi');

    function persist(updated: ScrapSheet[]) {
        const data = loadData();
        data.sheets = updated;
        saveData(data);
        setSheets(updated);
    }

    function createSheet() {
        if (!newSheetName.trim()) return;
        const sheet: ScrapSheet = {
            id: generateId(),
            name: newSheetName.trim(),
            genre: newSheetGenre,
            items: [],
            createdAt: new Date().toISOString(),
        };
        persist([...sheets, sheet]);
        setNewSheetName('');
        setShowNewSheet(false);
    }

    function deleteSheet(id: string) {
        if (!confirm('이 시트를 삭제하시겠습니까?')) return;
        persist(sheets.filter((s) => s.id !== id));
    }

    return (
        <>
            <Header title="스크랩시트" subtitle="Suno AI 음악 생성용 프롬프트와 가사를 관리하세요" />
            <div className="page-content">

                {/* 페이지 헤더 */}
                <div className="page-header">
                    <div>
                        <div className="page-title">✂️ 스크랩시트</div>
                        <div className="page-subtitle">시트별로 프롬프트/가사를 정리하고 Suno AI에 빠르게 주입하세요</div>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowNewSheet(true)}>
                        + 새 시트
                    </button>
                </div>

                {/* 사용 가이드 */}
                <div className="info-banner" style={{ marginBottom: '20px' }}>
                    <span style={{ fontSize: '18px' }}>🔥</span>
                    <div className="info-banner-text">
                        <strong style={{ color: 'var(--text-primary)' }}>사용법</strong>: 시트 안에서 프롬프트/가사를 추가하고 상태를 관리하세요.
                        ⚡ <strong style={{ color: 'var(--text-primary)' }}>Inject 버튼</strong>을 클릭하면 프롬프트가 클립보드에 복사되고 suno.com이 자동으로 열립니다.
                    </div>
                </div>

                {/* 시트 목록 */}
                {sheets.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <div className="empty-state-icon">✂️</div>
                            <div className="empty-state-title">아직 시트가 없습니다</div>
                            <div className="empty-state-desc">새 시트를 만들어 창작 영감을 수집하고 정리해보세요</div>
                            <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={() => setShowNewSheet(true)}>
                                + 첫 번째 시트 만들기
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                        {sheets.map((sheet) => {
                            const used = sheet.items.filter((i) => i.status === 'used').length;
                            const ready = sheet.items.filter((i) => i.status === 'ready').length;
                            const total = sheet.items.length;
                            const pct = total > 0 ? Math.round((used / total) * 100) : 0;

                            return (
                                <div key={sheet.id} className="card" style={{ position: 'relative' }}>
                                    {/* Badge */}
                                    <div style={{
                                        position: 'absolute', top: '14px', right: '14px',
                                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                        borderRadius: '6px', padding: '3px 8px',
                                        fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500,
                                    }}>
                                        {sheet.genre || '장르 없음'}
                                    </div>

                                    {/* 시트 정보 */}
                                    <div style={{ marginBottom: '14px' }}>
                                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', paddingRight: '70px' }}>
                                            {sheet.name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            총 {total}개 · 준비 {ready}개 · 사용됨 {used}개
                                        </div>
                                    </div>

                                    {/* 진행률 바 */}
                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>사용 진행률</span>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{pct}%</span>
                                        </div>
                                        <div style={{ height: '5px', background: 'var(--border)', borderRadius: '5px', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', width: `${pct}%`, background: 'var(--accent)',
                                                borderRadius: '5px', transition: 'width 0.4s ease',
                                            }} />
                                        </div>
                                    </div>

                                    {/* 버튼 */}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <Link href={`/scrapsheet/${sheet.id}`} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                                            ✏️ 편집하기
                                        </Link>
                                        <button className="btn btn-danger btn-sm" onClick={() => deleteSheet(sheet.id)}>
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 새 시트 모달 */}
                {showNewSheet && (
                    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowNewSheet(false); }}>
                        <div className="modal">
                            <div className="modal-header">
                                <div className="modal-title">새 스크랩시트 만들기</div>
                                <button className="modal-close" onClick={() => setShowNewSheet(false)}>✕</button>
                            </div>

                            <div className="form-group">
                                <label className="form-label">시트 이름</label>
                                <input
                                    className="form-input"
                                    placeholder="예: Lo-fi 힐링 채널 Vol.1"
                                    value={newSheetName}
                                    onChange={(e) => setNewSheetName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') createSheet(); }}
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">음악 장르</label>
                                <select
                                    className="form-select"
                                    value={newSheetGenre}
                                    onChange={(e) => setNewSheetGenre(e.target.value)}
                                >
                                    {GENRES.map((g) => <option key={g}>{g}</option>)}
                                </select>
                            </div>

                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={() => setShowNewSheet(false)}>취소</button>
                                <button className="btn btn-primary" onClick={createSheet} disabled={!newSheetName.trim()}>
                                    + 만들기
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
