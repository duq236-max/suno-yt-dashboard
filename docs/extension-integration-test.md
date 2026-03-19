# E2 — Extension 수동 통합 테스트 체크리스트

Dashboard(localhost:3000) ↔ suno-batch-extension ↔ suno.com 전체 플로우 검증.

---

## 사전 준비

- [ ] `suno-batch-extension` 빌드 완료 (`npm run build` → `dist/` 생성)
- [ ] Chrome 개발자 모드에서 `dist/` 폴더 로드 완료
- [ ] `npm run dev` — 대시보드가 `localhost:3000`에서 실행 중
- [ ] suno.com 계정 로그인 상태
- [ ] Gemini API 키가 `/settings`에 입력되어 있음

---

## 시나리오 1 — Extension 설치 감지

| # | 액션 | 기대 결과 |
|---|------|-----------|
| 1 | `/lyrics` 페이지 접속 | "Suno로 전송" 버튼이 1초 내로 표시됨 |
| 2 | Extension 설치된 상태에서 버튼 로드 | ⚠️ 아이콘 없음, 버튼 정상 활성화 |
| 3 | Extension 비활성화 후 페이지 새로고침 | 버튼에 ⚠️ 아이콘 표시 |
| 4 | ⚠️ 버튼 클릭 | "Chrome Extension 필요" 모달 표시 |
| 5 | 모달 닫기 (X 또는 배경 클릭) | 모달 닫힘, 버튼 상태 유지 |

---

## 시나리오 2 — 가사 생성 → 큐 전송

| # | 액션 | 기대 결과 |
|---|------|-----------|
| 1 | `/lyrics`에서 장르·분위기·테마 입력 후 **생성** 클릭 | AI 가사 + Suno 프롬프트 생성됨 |
| 2 | 생성 결과 하단 **Suno로 전송** 클릭 | 버튼이 "✓ 큐에 추가됨"으로 변경 (3초) |
| 3 | Extension 팝업 열기 | 방금 추가한 프롬프트가 큐 목록에 표시됨 |
| 4 | DevTools Console 확인 | `[background] ADD_TO_QUEUE: enqueued 1 prompt(s)` 로그 |
| 5 | `ADD_TO_QUEUE_RESULT` 메시지 확인 | `{ type: "ADD_TO_QUEUE_RESULT", response: { ok: true, count: 1 } }` |

---

## 시나리오 3 — 큐 실행 → suno.com 주입

| # | 액션 | 기대 결과 |
|---|------|-----------|
| 1 | Extension 팝업 → **▶ 시작** 클릭 | 새 suno.com 탭이 자동으로 열림 |
| 2 | suno.com 탭 관찰 | 프롬프트 입력창에 텍스트가 주입됨 |
| 3 | "Create" 버튼이 자동 클릭됨 | Suno 생성 시작 (로딩 스피너 표시) |
| 4 | 생성 완료 후 | 팝업 큐에서 해당 작업이 "done" 상태로 변경 |
| 5 | 완료 감지 로그 | `[observer] generation complete` (DevTools > background service worker) |

---

## 시나리오 4 — 에러 케이스

| # | 시나리오 | 기대 결과 |
|---|---------|-----------|
| 1 | suno_prompt가 빈 문자열인 상태에서 전송 | 버튼 클릭 무반응 (sunoPrompt 빈 값 guard) |
| 2 | Extension 설치 후 background service worker 충돌 | `ADD_TO_QUEUE_RESULT` error 수신 → 버튼 옆 에러 메시지 표시 |
| 3 | suno.com에서 프롬프트 셀렉터 찾기 실패 | `INJECT_FAILED` 메시지 → 팝업에서 해당 작업 "error" 표시 |
| 4 | 네트워크 없이 사이트 접속 | suno.com 접속 실패, 큐 타임아웃 |

---

## 시나리오 5 — 배포 환경 (Vercel)

| # | 액션 | 기대 결과 |
|---|------|-----------|
| 1 | Vercel URL에서 `/lyrics` 접속 | Extension 감지 정상 동작 (manifest에 `*.vercel.app` 포함됨) |
| 2 | Vercel URL에서 "Suno로 전송" 클릭 | localhost와 동일하게 큐 추가 동작 |

---

## DevTools 디버깅 체크포인트

```
# 대시보드 페이지 Console
- SUNO_BATCH_PING 발송 확인
- SUNO_BATCH_PONG 수신 확인 (1초 내)
- ADD_TO_QUEUE postMessage 발송 확인
- ADD_TO_QUEUE_RESULT 수신 확인

# Extension background service worker Console
chrome://extensions → Suno Batch Creator → "서비스 워커" → 검사
- [background] ADD_TO_QUEUE: enqueued N prompt(s)
- [background] startQueue called

# Extension content script (dashboard-bridge.js) Console
chrome://extensions → 대시보드 페이지 DevTools → Console
- [dashboard-bridge] → background로 전달 성공/실패 로그
```

---

## 합격 기준

- 시나리오 1~3 전 항목 PASS
- 시나리오 4 에러케이스 중 1·2·3 PASS
- 시나리오 5 배포환경 1·2 PASS (Vercel 배포 후)
