'use client';

import { useState, useEffect, useRef } from 'react';
import { loadData, saveData, generateId } from '@/lib/supabase-storage';
import { ScrapSheet } from '@/types';
import { useRouter } from 'next/navigation';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    /** onConfirm 호출 시 저장 대상 sheetId와 부가 옵션 전달 */
    onConfirm: (sheetId: string, openSuno: boolean) => void;
}

const PING_TYPE = 'SUNO_BATCH_PING';
const PONG_TYPE = 'SUNO_BATCH_PONG';
const EXT_DETECT_TIMEOUT_MS = 1000;

type ExtStatus = 'detecting' | 'installed' | 'not_installed';

export default function SaveToSheetModal({ isOpen, onClose, onConfirm }: Props) {
    const router = useRouter();

    // ── 시트 목록
    const [sheets, setSheets] = useState<ScrapSheet[]>([]);
    const [selectedSheetId, setSelectedSheetId] = useState<string>('');

    // ── 새 시트 인라인 생성
    const [newSheetName, setNewSheetName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // ── 옵션 체크박스
    const [openSuno, setOpenSuno] = useState(false);
    const [goToSheet, setGoToSheet] = useState(false);

    // ── Extension 감지
    const [extStatus, setExtStatus] = useState<ExtStatus>('detecting');

    // ── 로딩 / 에러
    const [saving, setSaving] = useState(false);

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── 시트 목록 로드 (isOpen 변경 시마다)
    useEffect(() => {
        if (!isOpen) return;
        loadData()
            .then((data) => {
                setSheets(data.sheets);
                if (data.sheets.length > 0 && !selectedSheetId) {
                    setSelectedSheetId(data.sheets[0].id);
                }
            })
            .catch((err) => console.error('시트 로드 실패:', err));
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Extension PING/PONG 감지
    useEffect(() => {
        if (!isOpen) return;

        setExtStatus('detecting');
        let resolved = false;

        function handlePong(event: MessageEvent) {
            if (event.data?.type === PONG_TYPE) {
                resolved = true;
                setExtStatus('installed');
                cleanup();
            }
        }

        window.addEventListener('message', handlePong);
        window.postMessage({ type: PING_TYPE }, '*');

        timerRef.current = setTimeout(() => {
            if (!resolved) setExtStatus('not_installed');
            cleanup();
        }, EXT_DETECT_TIMEOUT_MS);

        function cleanup() {
            window.removeEventListener('message', handlePong);
            if (timerRef.current) clearTimeout(timerRef.current);
        }

        return cleanup;
    }, [isOpen]);

    // ── 새 시트 생성
    async function handleCreateSheet() {
        const trimmed = newSheetName.trim();
        if (!trimmed) return;
        setIsCreating(true);
        try {
            const data = await loadData();
            const newSheet: ScrapSheet = {
                id: generateId(),
                name: trimmed,
                items: [],
                createdAt: new Date().toISOString(),
            };
            const updated = [...data.sheets, newSheet];
            await saveData({ ...data, sheets: updated });
            setSheets(updated);
            setSelectedSheetId(newSheet.id);
            setNewSheetName('');
        } catch (err) {
            console.error('시트 생성 실패:', err);
            alert('시트 생성에 실패했습니다.');
        } finally {
            setIsCreating(false);
        }
    }

    // ── 저장 확인
    async function handleSave() {
        if (!selectedSheetId) return;
        setSaving(true);
        try {
            onConfirm(selectedSheetId, openSuno);
            if (goToSheet) {
                router.push(`/scrapsheet/${selectedSheetId}`);
            }
            onClose();
        } finally {
            setSaving(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div
            className="modal-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>

                {/* ── 헤더 */}
                <div className="modal-header">
                    <h3 className="modal-title">💾 스크랩시트에 저장</h3>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>

                {/* ── Extension 경고 배너 */}
                {extStatus === 'not_installed' && (
                    <div style={{
                        background: 'rgba(202, 138, 4, 0.12)',
                        border: '1px solid rgba(202, 138, 4, 0.35)',
                        borderRadius: 8,
                        padding: '10px 14px',
                        marginBottom: 16,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 13,
                        color: '#fbbf24',
                    }}>
                        <span style={{ fontSize: 16 }}>⚠️</span>
                        <span style={{ flex: 1 }}>
                            Extension이 감지되지 않았습니다. &quot;Suno.com 바로 열기&quot; 기능은 Extension 설치 후 사용 가능합니다.
                        </span>
                        <button
                            className="btn btn-sm"
                            style={{
                                background: 'rgba(202,138,4,0.2)',
                                border: '1px solid rgba(202,138,4,0.5)',
                                color: '#fbbf24',
                                whiteSpace: 'nowrap',
                            }}
                            onClick={() => window.open('https://developer.chrome.com/docs/extensions/get-started', '_blank', 'noopener')}
                        >
                            Extension 설치하기
                        </button>
                    </div>
                )}

                {/* ── 시트 선택 라디오 목록 */}
                <div className="form-group">
                    <label className="form-label">저장할 시트 선택</label>
                    {sheets.length === 0 ? (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                            아직 시트가 없습니다. 아래에서 새 시트를 만들어주세요.
                        </p>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            maxHeight: 200,
                            overflowY: 'auto',
                            paddingRight: 4,
                        }}>
                            {sheets.map((sheet) => (
                                <label
                                    key={sheet.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '10px 12px',
                                        borderRadius: 8,
                                        border: `1px solid ${selectedSheetId === sheet.id ? 'var(--accent)' : 'var(--border)'}`,
                                        background: selectedSheetId === sheet.id ? 'rgba(229,62,62,0.08)' : 'var(--bg-secondary)',
                                        cursor: 'pointer',
                                        transition: 'var(--transition)',
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="sheet-select"
                                        value={sheet.id}
                                        checked={selectedSheetId === sheet.id}
                                        onChange={() => setSelectedSheetId(sheet.id)}
                                        style={{ accentColor: 'var(--accent)' }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {sheet.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            {sheet.items.length}개 항목
                                            {sheet.genre ? ` · ${sheet.genre}` : ''}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── 새 시트 인라인 생성 */}
                <div className="form-group">
                    <label className="form-label">+ 새 시트 만들기</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            className="form-input"
                            placeholder="새 시트 이름"
                            value={newSheetName}
                            onChange={(e) => setNewSheetName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSheet(); }}
                            style={{ flex: 1 }}
                        />
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={handleCreateSheet}
                            disabled={!newSheetName.trim() || isCreating}
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            {isCreating ? '…' : '만들기'}
                        </button>
                    </div>
                </div>

                {/* ── 옵션 체크박스 */}
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                        <input
                            type="checkbox"
                            checked={openSuno}
                            onChange={(e) => setOpenSuno(e.target.checked)}
                            disabled={extStatus === 'not_installed'}
                            style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
                        />
                        <span style={{ color: extStatus === 'not_installed' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                            저장 후 Suno.com 바로 열기
                            {extStatus === 'not_installed' && (
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>(Extension 필요)</span>
                            )}
                        </span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                        <input
                            type="checkbox"
                            checked={goToSheet}
                            onChange={(e) => setGoToSheet(e.target.checked)}
                            style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
                        />
                        <span style={{ color: 'var(--text-primary)' }}>저장 완료 후 시트 페이지로 이동</span>
                    </label>
                </div>

                {/* ── 푸터 버튼 */}
                <div className="modal-footer" style={{ gap: 10 }}>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
                        취소
                    </button>
                    <button
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        onClick={handleSave}
                        disabled={!selectedSheetId || saving}
                    >
                        {saving ? '저장 중…' : '💾 저장하기'}
                    </button>
                </div>
            </div>
        </div>
    );
}
