# E4 — Vercel 배포 환경 Extension 통신 테스트 절차서

> **목적:** suno-yt-dashboard 를 Vercel에 배포한 후,
> `suno-batch-extension` ↔ Dashboard 간 PING/PONG 통신이 정상 동작하는지 확인합니다.
>
> **관련 파일:**
> - `src/lib/ping-test.ts` — PING/PONG 감지 유틸리티
> - `src/components/SendToSunoButton.tsx` — 실제 PING/PONG 사용 컴포넌트
> - `suno-batch-extension/src/dashboard-bridge.ts` — Extension 측 PONG 응답 처리

---

## 사전 준비 (Pre-flight)

| 항목 | 확인 |
|------|------|
| Vercel 배포 URL 확보 (예: `https://your-project.vercel.app`) | ☐ |
| `NEXTAUTH_URL` 환경변수를 실제 배포 URL로 설정 완료 | ☐ |
| Google OAuth — 승인된 리디렉션 URI에 배포 URL 추가 완료 | ☐ |
| `suno-batch-extension` 빌드 완료 (`npm run build` → `dist/` 존재) | ☐ |
| Chrome 개발자 모드 + `dist/` 폴더 로드 완료 | ☐ |

---

## Step 1 — 배포 URL에서 Extension 로드 확인

1. Chrome 주소창에 `chrome://extensions` 입력
2. `suno-batch-extension` 카드의 **"오류"** 표시 없음 확인
3. 확장 프로그램 카드 → **"서비스 워커"** 링크 클릭 → DevTools 콘솔에서 오류 없음 확인

```
예상 콘솔 출력 (오류 없을 때):
[suno-batch] dashboard-bridge 초기화 완료
```

---

## Step 2 — `/settings` Extension 연결 상태 카드 확인

1. Chrome 에서 `https://your-project.vercel.app/settings` 접속
2. **"🔌 Extension 연결 상태"** 카드 확인:
   - ✅ **"연결됨 (Xms)"** → 정상 (PING/PONG 왕복 성공)
   - ❌ **"Extension 미설치 또는 비활성화"** → Step 3 진행

| 상태 | 의미 | 조치 |
|------|------|------|
| ✅ 연결됨 | Extension 활성 + PONG 응답 정상 | 다음 Step 진행 |
| ⏳ 감지 중 | 아직 PONG 대기 중 | 1.2초 후 자동 갱신 |
| ❌ 미설치 | PONG 응답 없음 (1.2초 타임아웃) | 아래 트러블슈팅 참조 |

### Extension 연결 안 될 때 트러블슈팅

```bash
# 1. 배포 URL이 허용 오리진에 추가되어 있는지 확인
# suno-batch-extension/src/dashboard-bridge.ts 또는 manifest.json 확인:
#   "matches": ["https://your-project.vercel.app/*"]

# 2. Extension 수동 재로드
# chrome://extensions → 새로고침 아이콘 클릭

# 3. /settings 페이지 새로고침 후 "↻ 재감지" 버튼 클릭

# 4. DevTools Console (배포 페이지) 에서 수동 PING 전송:
#    window.postMessage({ type: 'SUNO_BATCH_PING' }, '*')
#    → 'SUNO_BATCH_PONG' 메시지 수신되는지 확인
```

---

## Step 3 — PING/PONG 수동 검증 (DevTools)

배포 URL 페이지의 DevTools Console 에서 직접 PING/PONG 왕복을 검증합니다.

```javascript
// 1. PONG 리스너 등록
window.addEventListener('message', (e) => {
    if (e.data?.type === 'SUNO_BATCH_PONG') {
        console.log('✅ PONG 수신 확인:', e.data);
    }
});

// 2. PING 전송
window.postMessage({ type: 'SUNO_BATCH_PING' }, '*');

// 3. 예상 출력
// ✅ PONG 수신 확인: { type: 'SUNO_BATCH_PONG', extensionId: 'xxxxx...' }
```

| 결과 | 판정 | 조치 |
|------|------|------|
| PONG 수신 | ✅ PASS | 다음 Step 진행 |
| 1초 이내 응답 없음 | ❌ FAIL | Extension manifest.json `matches` URL 확인 |

---

## Step 4 — `/library` 페이지 전송 버튼 E2E 검증

1. `https://your-project.vercel.app/library` 접속
2. 황금 프롬프트 카드 중 하나 → **"Suno로 전송"** 버튼 상태 확인:
   - 버튼 라벨이 `"Suno로 전송"` (Extension 연결됨)
   - ⚠️ 버튼 라벨이 `"⚠️ Suno로 전송"` (Extension 미감지)
3. **"Suno로 전송"** 클릭 → `"✓ 큐에 추가됨"` 표시 확인
4. suno.com 탭이 열리거나 기존 탭에서 프롬프트 주입 시도 확인

---

## Step 5 — Extension → Dashboard 역방향 통신 확인

1. suno.com 에서 곡 생성 완료 후 Extension의 완료 감지 동작 확인
2. Dashboard `/dashboard` 페이지에서 곡 데이터 수신 확인

> **참고:** 역방향 통신은 `suno-yt-extension/dash-content.js` 또는
> `suno-batch-extension` 의 `observer.ts` 가 담당합니다.

---

## 최종 통과 기준 (Pass Criteria)

| 항목 | 기준 | 결과 |
|------|------|------|
| `/settings` Extension 상태 카드 | "연결됨" 표시 | ☐ PASS / ☐ FAIL |
| PING/PONG 수동 검증 | PONG 수신 확인 | ☐ PASS / ☐ FAIL |
| `/library` 전송 버튼 | "큐에 추가됨" 표시 | ☐ PASS / ☐ FAIL |
| 오류 없음 | Console 에러 0개 | ☐ PASS / ☐ FAIL |

모든 항목 PASS 시 **E4 완료** ✅

---

## 참고 링크

- [Vercel 배포 체크리스트](./vercel-deploy-checklist.md)
- [Extension 통합 테스트 가이드](./extension-integration-test.md)
- PING/PONG 구현: `src/lib/ping-test.ts`, `src/components/SendToSunoButton.tsx`

---

*작성일: 2026-03-20 | Phase 6 E4*
