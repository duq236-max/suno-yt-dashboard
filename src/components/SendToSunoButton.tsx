'use client';

import { useState, useEffect, useCallback } from 'react';

interface Props {
    lyrics: string;
    sunoPrompt: string;
}

type ExtStatus = 'detecting' | 'installed' | 'not_installed';

const PING_TYPE = 'SUNO_BATCH_PING';
const PONG_TYPE = 'SUNO_BATCH_PONG';
const ADD_TO_QUEUE_TYPE = 'ADD_TO_QUEUE';
const ADD_TO_QUEUE_RESULT_TYPE = 'ADD_TO_QUEUE_RESULT';
const DETECT_TIMEOUT_MS = 1000;

// Chrome Web Store URL — 개발 중에는 빈 문자열 (로드 테스트 안내로 대체)
const EXTENSION_STORE_URL = '';

export default function SendToSunoButton({ lyrics, sunoPrompt }: Props) {
    const [extStatus, setExtStatus] = useState<ExtStatus>('detecting');
    const [showModal, setShowModal] = useState(false);
    const [sent, setSent] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);

    // Extension 설치 감지: ping → 1초 타임아웃
    useEffect(() => {
        let resolved = false;

        function handlePong(event: MessageEvent) {
            if (event.data?.type === PONG_TYPE) {
                resolved = true;
                setExtStatus('installed');
                window.removeEventListener('message', handlePong);
            }
        }

        window.addEventListener('message', handlePong);
        window.postMessage({ type: PING_TYPE }, '*');

        const timer = setTimeout(() => {
            if (!resolved) {
                setExtStatus('not_installed');
                window.removeEventListener('message', handlePong);
            }
        }, DETECT_TIMEOUT_MS);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('message', handlePong);
        };
    }, []);

    const handleClick = useCallback(() => {
        if (extStatus === 'not_installed') {
            setShowModal(true);
            return;
        }

        if (extStatus === 'installed' && sunoPrompt) {
            setSendError(null);

            // background 응답을 ADD_TO_QUEUE_RESULT로 확인
            function handleResult(event: MessageEvent) {
                if (event.data?.type !== ADD_TO_QUEUE_RESULT_TYPE) return;
                window.removeEventListener('message', handleResult);
                if (event.data?.error) {
                    setSendError('전송 실패: ' + String(event.data.error));
                    setSent(false);
                }
            }
            window.addEventListener('message', handleResult);

            window.postMessage({
                type: ADD_TO_QUEUE_TYPE,
                prompts: [sunoPrompt],
                lyrics,
            }, '*');
            setSent(true);
            setTimeout(() => {
                setSent(false);
                window.removeEventListener('message', handleResult);
            }, 3000);
        }
    }, [extStatus, sunoPrompt, lyrics]);

    const buttonLabel = sent
        ? '✓ 큐에 추가됨'
        : extStatus === 'detecting'
            ? '감지 중…'
            : 'Suno로 전송';

    const buttonDisabled = extStatus === 'detecting' || sent;

    return (
        <>
            {sendError && (
                <span style={{ fontSize: 12, color: 'var(--accent)', marginRight: 8 }}>
                    {sendError}
                </span>
            )}
            <button
                className="btn btn-primary"
                onClick={handleClick}
                disabled={buttonDisabled}
                title={extStatus === 'not_installed' ? 'Chrome Extension 미설치' : 'Suno 배치 큐에 추가'}
                style={{ position: 'relative' }}
            >
                {extStatus === 'not_installed' && (
                    <span style={{ marginRight: 6, fontSize: 13 }}>⚠️</span>
                )}
                {buttonLabel}
            </button>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Chrome Extension 필요</h3>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setShowModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ padding: '16px 0', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                            <p style={{ marginBottom: 12 }}>
                                <strong style={{ color: 'var(--text-primary)' }}>Suno Batch Creator</strong> 확장 프로그램을
                                설치하면 이 버튼으로 Suno에 직접 프롬프트를 전송할 수 있습니다.
                            </p>
                            <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
                                <li>Chrome → <code style={codeStyle}>chrome://extensions</code> 접속</li>
                                <li><strong>개발자 모드</strong> 활성화 (우측 상단 토글)</li>
                                <li><strong>압축 해제된 항목 로드</strong> 클릭</li>
                                <li><code style={codeStyle}>suno-batch-extension/dist</code> 폴더 선택</li>
                                <li>설치 완료 후 이 페이지를 새로고침</li>
                            </ol>
                        </div>

                        <div className="modal-footer">
                            {EXTENSION_STORE_URL && (
                                <a
                                    href={EXTENSION_STORE_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary"
                                >
                                    Chrome 웹 스토어에서 설치
                                </a>
                            )}
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowModal(false)}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

const codeStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '1px 5px',
    fontSize: 12,
    fontFamily: 'monospace',
    color: 'var(--accent)',
};
