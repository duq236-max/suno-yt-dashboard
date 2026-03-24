# Extension 수동 테스트 가이드 (E1 · E2)

> Phase 6 — E1/E2 수동 검증 SOP
> 대상 extension: `suno-yt-extension` (Vanilla JS) · `suno-batch-extension` (TypeScript/MV3)

---

## 사전 준비 (공통)

### 1. Extension 빌드

**suno-batch-extension** (TypeScript 버전):

```bash
cd scratch/suno-batch-extension
npm run build          # dist/ 산출물 확인
# 기대 출력: background.js · content.js · dashboard-bridge.js · popup/popup.js
```

**suno-yt-extension** (Vanilla JS 버전):

```bash
# 빌드 불필요 — JS 파일 직접 로드
# 경로: scratch/suno-yt-extension/
```

### 2. Chrome 개발자 모드로 Extension 로드

| 단계 | 액션 |
|------|------|
| 1 | Chrome 주소창에 `chrome://extensions` 입력 |
| 2 | 우상단 **개발자 모드** 토글 ON |
| 3 | **압축 해제된 확장 프로그램 로드** 클릭 |
| 4 | E1 테스트: `scratch/suno-yt-extension/` 폴더 선택 |
|   | E2 테스트: `scratch/suno-batch-extension/dist/` 폴더 선택 |
| 5 | Extension 카드가 목록에 표시되는지 확인 |

> ⚠️ `background.js` 수정 후에는 Extension 카드 → **새로고침(↻)** 버튼 클릭 필수

### 3. 대시보드 실행

```bash
cd scratch/suno-yt-dashboard
npm run dev            # http://localhost:3000
```

### 4. suno.com 로그인

- suno.com에서 계정 로그인 확인
- `/create` 또는 홈 화면이 정상 로드되는지 확인

---

## E1 — 단일 프롬프트 전송 테스트

**목표**: `/lyrics`에서 생성된 프롬프트 1개를 suno.com에 자동 주입 후 생성 확인

**사용 Extension**: `suno-yt-extension` (Vanilla JS 버전)

### 테스트 절차

| # | 위치 | 액션 | 기대 결과 |
|---|------|------|-----------|
| 1 | `localhost:3000/lyrics` | 페이지 접속 | "Suno로 전송" 버튼 표시 |
| 2 | `/lyrics` | 장르·분위기·테마 입력 후 **생성** 클릭 | AI 가사 + Suno 프롬프트 생성됨 |
| 3 | `/lyrics` | **Suno로 전송** 버튼 클릭 | 버튼 "✓ 큐에 추가됨"으로 변경 |
| 4 | suno.com | 새 탭이 `suno.com/create`로 열림 | suno.com `/create` 페이지 로드 |
| 5 | suno.com `/create` | 자동으로 필드 채워짐 대기 (최대 15초) | 프롬프트 textarea에 텍스트 입력됨 |
| 6 | suno.com `/create` | **Create** 버튼 클릭 확인 | 음악 생성 시작 (로딩 UI 표시) |
| 7 | suno.com | 생성 완료 대기 | 곡 카드 또는 오디오 플레이어 표시 |

### 검증 포인트

```
□ textarea에 프롬프트 텍스트가 올바르게 입력됨
□ style/title 필드도 함께 입력됨 (해당 데이터가 있는 경우)
□ Create 버튼이 클릭됨 (자동 또는 수동)
□ 생성 완료 후 대시보드로 완료 신호 전달 (background Console 확인)
```

### 디버깅

```
# content.js 디버깅 (suno.com 탭)
suno.com 탭 → F12 → Console 탭
→ "[Suno YT] 주입 신호 감지됨!" 메시지 확인
→ "[Suno YT] Create 버튼 자동 클릭 완료!" 확인

# background.js 디버깅
chrome://extensions → suno-yt-extension → "서비스 워커" 클릭 → Console
→ pendingInject 저장 로그 확인

# 셀렉터 실패 시
suno.com → F12 → Console:
document.querySelectorAll('textarea')
document.querySelector('[data-testid="prompt-input"]')
```

### 실패 시 확인 사항

| 증상 | 원인 | 조치 |
|------|------|------|
| 버튼 클릭 후 suno.com 탭 안 열림 | Extension 권한 문제 | `manifest.json` tabs 권한 확인 |
| 필드 입력 안 됨 | 셀렉터 불일치 | Console에서 textarea 셀렉터 수동 확인 |
| React 상태 미반영 | nativeInputValueSetter 오류 | DevTools에서 value setter 실행 여부 확인 |
| Create 버튼 비활성화 | 필드 값 미반영 | 500ms 지연 후 재시도 |

---

## E2 — 배치 큐 처리 테스트 (3개 이상)

**목표**: 큐에 3개의 프롬프트를 추가하고 Extension 팝업에서 전체 실행 시, suno.com 탭이 자동으로 처리되는지 확인

**사용 Extension**: `suno-batch-extension` (TypeScript/MV3 버전)

### 테스트 절차

#### Step 1 — 큐 구성

| # | 위치 | 액션 | 기대 결과 |
|---|------|------|-----------|
| 1 | `localhost:3000/lyrics` | 가사 생성 #1 → **Suno로 전송** | "큐에 추가됨" |
| 2 | `/lyrics` | 다른 장르/분위기로 가사 생성 #2 → **Suno로 전송** | "큐에 추가됨" |
| 3 | `/lyrics` | 가사 생성 #3 → **Suno로 전송** | "큐에 추가됨" |

#### Step 2 — 큐 확인

| # | 위치 | 액션 | 기대 결과 |
|---|------|------|-----------|
| 4 | Chrome 툴바 | Extension 아이콘(팝업) 클릭 | 팝업에 3개 항목 목록 표시 |
| 5 | 팝업 | 각 항목의 상태 확인 | 모두 "대기 중(pending)" 상태 |

#### Step 3 — 전체 처리 시작

| # | 위치 | 액션 | 기대 결과 |
|---|------|------|-----------|
| 6 | 팝업 | **전체 시작** (또는 Run All) 버튼 클릭 | 첫 번째 항목 처리 시작 |
| 7 | Chrome 탭 | 새 탭이 `suno.com/create`로 열림 | 첫 번째 프롬프트 자동 주입 |
| 8 | suno.com | 생성 완료 감지 대기 | 오디오 플레이어 또는 곡 카드 표시 |
| 9 | Chrome 탭 | 두 번째 탭 자동 열림 (or 재사용) | 두 번째 프롬프트 주입 시작 |
| 10 | suno.com | 2번째 생성 완료 | 3번째 처리 자동 시작 |
| 11 | 팝업 | 최종 상태 확인 | 3개 모두 "완료(done)" 상태 |

### 검증 포인트

```
□ 팝업에 3개 큐 항목이 정확히 표시됨
□ "전체 시작" 후 첫 번째 항목이 immediately 처리 시작
□ 생성 완료 후 자동으로 다음 항목 처리 (GENERATION_COMPLETE 메시지)
□ 탭이 2개 이상 동시에 열리지 않음 (순차 처리)
□ 모든 항목 처리 완료 후 팝업 상태 갱신
```

### 디버깅

```
# background service worker 디버깅
chrome://extensions → Suno Batch Creator → "서비스 워커" 검사 → Console
→ [background] ADD_TO_QUEUE: enqueued N prompt(s)
→ [background] startQueue called
→ [background] processing job: <id>

# dashboard-bridge.js 디버깅 (대시보드 탭)
localhost:3000 탭 → F12 → Console
→ SUNO_BATCH_PING 발송 확인
→ SUNO_BATCH_PONG 수신 확인 (1초 내)
→ ADD_TO_QUEUE postMessage 발송 확인
→ ADD_TO_QUEUE_RESULT 수신 확인

# content.js 디버깅 (suno.com 탭)
suno.com 탭 → F12 → Console
→ [observer] generation complete — audio player detected
→ 또는: [observer] generating text disappeared
```

### GENERATION_COMPLETE 신호 확인

```
suno.com 완료 후 background service worker Console에서:
→ GENERATION_COMPLETE 수신
→ [background] job <id> done, proceeding to next

신호가 오지 않으면:
- observer.ts의 AUDIO_PLAYER_SELECTORS 검증 (E3 절차 참조)
- 5분 타임아웃 후 자동 종료 여부 확인
```

### 실패 시 확인 사항

| 증상 | 원인 | 조치 |
|------|------|------|
| 팝업에 큐 항목 0개 | postMessage 실패 | Dashboard Console에서 ADD_TO_QUEUE_RESULT 확인 |
| 2번째 항목 미처리 | GENERATION_COMPLETE 미수신 | observer.ts 셀렉터 업데이트 (E3 참조) |
| 탭이 2개 동시에 열림 | 큐 동기화 오류 | background storage lock 확인 |
| 팝업 상태 갱신 안 됨 | popup.js 메시지 리스너 확인 | popup 재열기 후 확인 |

---

## 셀렉터 상태 빠른 점검 (E3 사전 준비)

suno.com에서 F12 Console에서 아래 명령어로 현재 셀렉터 동작 여부를 즉시 확인:

```javascript
// 프롬프트 입력창 확인
[
  '[data-testid="prompt-input"]',
  'textarea[placeholder*="lyric"]',
  'textarea[placeholder*="prompt"]',
  'textarea',
].map(s => ({ sel: s, el: document.querySelector(s) }))
 .filter(r => r.el)

// Create 버튼 확인
[
  '[data-testid="create-button"]',
  'button[aria-label*="Create"]',
  'button[aria-label*="Generate"]',
  'button[type="submit"]',
].map(s => ({ sel: s, el: document.querySelector(s) }))
 .filter(r => r.el)

// 완료 감지 셀렉터 확인
[
  '[data-testid="audio-player"]',
  '[data-testid="song-row"]',
  '[class*="AudioPlayer"]',
  'audio[src]',
].map(s => ({ sel: s, el: document.querySelector(s) }))
 .filter(r => r.el)
```

> 각 배열에서 `el`이 있는 항목이 1개 이상이면 정상. 0개이면 셀렉터 업데이트 필요 → `SELECTOR_UPDATE_GUIDE.md` 참조

---

## 합격 기준

| 테스트 | 합격 조건 |
|--------|----------|
| E1 | 프롬프트 1개 → suno.com 주입 → Create 클릭 → 생성 시작 확인 |
| E2 | 큐 3개 → 순차 처리 → 모두 완료 상태, 탭 동시 열림 없음 |

---

## 관련 문서

- `docs/extension-integration-test.md` — 시나리오별 전체 통합 테스트
- `suno-batch-extension/docs/SELECTOR_UPDATE_GUIDE.md` — 셀렉터 업데이트 프로세스
- `suno-yt-extension/CLAUDE.md` — Extension 아키텍처 및 개발 규칙
