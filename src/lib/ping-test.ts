/**
 * ping-test.ts — Extension 연결 상태 감지 유틸리티
 *
 * suno-batch-extension 의 dashboard-bridge(PING/PONG) 메커니즘을 이용해
 * 현재 페이지에서 Extension이 활성화되어 있는지 비동기로 확인합니다.
 *
 * 사용처:
 *  - /settings 페이지의 "Extension 연결 상태" 카드
 *  - E4 테스트 절차서의 자동 감지 단계
 *
 * 주의: 브라우저 전용 (window 객체 필요) — 서버 컴포넌트에서 직접 import 금지.
 *       'use client' 컴포넌트 또는 useEffect 내부에서만 호출하세요.
 */

// Extension과 동일한 메시지 타입 (suno-batch-extension/src/dashboard-bridge.ts 와 맞춤)
export const PING_TYPE = 'SUNO_BATCH_PING' as const;
export const PONG_TYPE = 'SUNO_BATCH_PONG' as const;

export type PingResult =
    | { connected: true; latencyMs: number }
    | { connected: false; reason: 'timeout' | 'error' };

/**
 * Extension 연결 여부를 단일 PING → PONG 왕복으로 확인합니다.
 *
 * @param timeoutMs - PONG을 기다리는 최대 시간 (기본값: 1000ms)
 * @returns PingResult — 연결 성공 시 latencyMs 포함, 실패 시 reason 포함
 */
export function pingExtension(timeoutMs = 1000): Promise<PingResult> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined') {
            resolve({ connected: false, reason: 'error' });
            return;
        }

        const sentAt = Date.now();
        let settled = false;

        function handlePong(event: MessageEvent) {
            if (event.data?.type !== PONG_TYPE) return;
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            window.removeEventListener('message', handlePong);
            resolve({ connected: true, latencyMs: Date.now() - sentAt });
        }

        window.addEventListener('message', handlePong);
        window.postMessage({ type: PING_TYPE }, '*');

        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            window.removeEventListener('message', handlePong);
            resolve({ connected: false, reason: 'timeout' });
        }, timeoutMs);
    });
}

/**
 * Extension 연결 여부를 boolean 으로 간략히 확인합니다.
 * 빠른 UI 분기용 헬퍼.
 */
export async function isExtensionConnected(timeoutMs = 1000): Promise<boolean> {
    const result = await pingExtension(timeoutMs);
    return result.connected;
}
