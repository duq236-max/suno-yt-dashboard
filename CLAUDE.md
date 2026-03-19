# suno-yt-dashboard — CLAUDE.md

## 프로젝트 목표
**musepilot.pro** 의 대시보드를 교육 목적으로 클론.
우선순위: ① 기능 완성 → ② UI 디자인 매칭 → ③ 외부 기능 흡수

참고 원본: `https://musepilot.pro/dashboard/overview`

---

## 기술 스택 (실제 현재 상태)

| 레이어 | 현재 (실제) | 목표 (Phase 2+) |
|--------|-----------|----------------|
| Framework | Next.js 16 + React 19 + TypeScript | 유지 |
| 폰트 | **Inter** (Google Fonts — globals.css L1) | Geist로 교체 (Phase 2) |
| Styling | **globals.css 단일 파일** + CSS Variables 완성 | Tailwind v4 병행 (Phase 2) |
| State | **localStorage** (`src/lib/storage.ts`) | Supabase + Zustand (Phase 2) |
| Auth | 없음 | NextAuth.js v5 + Google OAuth (Phase 2) |
| Charts | 없음 | Recharts (Phase 2) |
| AI | Gemini API (settings에서 키 입력) | 유지 + Claude API 병행 |
| DB | 없음 | Supabase PostgreSQL (Phase 2) |
| Payments | 없음 | Paddle (Phase 3) |

---

## 현재 구현 상태 (정확한 인벤토리)

### 라우트
```
/                      → /dashboard 리다이렉트
/dashboard             ✅ 완성 — 통계카드, YT채널관리, 스크랩시트 목록
/planner               ✅ 존재 — 채널 기획 설문
/schedule              ✅ 존재 — 스케줄 설정 UI
/scrapsheet            ✅ 존재 — 시트 목록
/scrapsheet/[id]       ✅ 존재 — 시트 상세 (프롬프트/가사 편집)
/settings              ✅ 존재 — Gemini API 키 설정
```

### 컴포넌트 (src/components/)
```
Header.tsx    ✅ — 페이지 타이틀 + 부제목
Sidebar.tsx   ✅ — 네비게이션, 섹션 그룹, badge 지원
              ❌ StatCard, Modal, Chart, DataTable — 인라인 JSX → 컴포넌트화 필요
```

### 전역 CSS 클래스 (globals.css — 이미 완성, 수정 최소화)
```
레이아웃:  .app-layout .main-content .page-content .page-header
버튼:      .btn .btn-primary .btn-secondary .btn-ghost .btn-sm .btn-danger
카드:      .card .card-header .card-title .stats-grid .stat-card
폼:        .form-group .form-label .form-input .form-textarea .form-select
상태:      .status-badge (.unused / .ready / .used)
모달:      .modal-overlay .modal .modal-header .modal-footer
기타:      .empty-state .info-banner .table-wrapper .loading-pulse
```

### CSS 변수 (수정 금지 — MusePilot 색상과 이미 매칭)
```css
--bg-primary: #0a0a0a      --accent: #e53e3e
--bg-secondary: #111111    --accent-hover: #fc5050
--bg-card: #1a1a1a         --text-primary: #ffffff
--bg-sidebar: #0f0f0f      --text-muted: #666666
--border: #2a2a2a          --radius-md: 12px
--transition: 0.18s ease   --shadow-glow: 0 0 20px rgba(229,62,62,0.2)
```

### 데이터 타입 (src/types/index.ts)
```typescript
AppData {
  channel: ChannelInfo | null       // 채널 기획 정보
  sheets: ScrapSheet[]              // 프롬프트/가사 시트
  schedule: ScheduleConfig          // 업로드 스케줄
  stats: { totalSongs, usedSongs, totalViews, uploadedCount }
  youtubeChannels: YoutubeChannel[] // 수동 입력 YT 통계 (API 연동 예정)
  geminiApiKey?: string
}
ScrapItem: { prompt, lyrics, title, genre, status, instruments, mood_tags, is_instrumental }
```

---

## 개발 우선순위

### ① Phase 1 — 기능 완성 (최우선, 내일 시작)
MusePilot이 실제로 하는 것들을 먼저 전부 동작하게 만들기.

```
[ ] Gemini AI 프롬프트 자동 생성 — 키 입력 후 실제 API 호출
[ ] Extension ↔ Dashboard 연동 완성 — 배치 주입, 완료 감지
[ ] 스케줄러 실제 동작 — 날짜/시간 알림 (현재 UI만 존재)
[ ] 스크랩시트 일괄 처리 — 여러 프롬프트 순서대로 Suno에 자동 주입
[ ] 채널 기획 설문 → 데이터 활용 (현재 저장만 됨, 추천 기능 없음)
[ ] Google OAuth 로그인
[ ] Supabase 마이그레이션 — localStorage → DB (데이터 영속성)
[ ] YouTube Analytics API 실제 연동 (현재 수동 입력)
```

### ② Phase 2 — UI 디자인 매칭
기능이 동작한 후 원본과 시각적으로 맞추기.

```
[ ] Geist 폰트 적용 (Inter → Geist)
[ ] Recharts 차트 — AreaChart(조회수 추이), BarChart(장르별 통계)
[ ] StatCard 컴포넌트화 (현재 인라인 JSX)
[ ] 원본 대비 spacing/타이포/애니메이션 정밀 조정
[ ] 반응형 레이아웃 완성
[ ] Tailwind v4 통합
```

### ③ Phase 3 — 외부 기능 흡수
다른 서비스의 좋은 기능을 URL로 분석해서 우리 것으로 통합.

```
사용법: "이 URL 분석해서 추가 가능한 기능 뽑아줘" → site-feature-extractor 에이전트
예상 타겟: DistroKid, TuneCore, Soundraw, Udio, 기타 AI 음악 플랫폼
```

---

## Chrome Extension 연동
- `suno-yt-extension` (localhost:3000 ↔ suno.com 브리지)
- background.js: 메시지 중계, chrome.storage.local 관리
- content.js: suno.com DOM에 프롬프트 주입
- dash-content.js: 대시보드 데이터 읽기

---

## Claude 작업 효율 규칙

### 요청 시 포함할 정보
```
파일 + 위치: "src/app/dashboard/page.tsx 의 statCards 배열에 추가"
범위 명시:   "dashboard 페이지만", "storage.ts 함수 하나만"
타입 먼저:   새 기능은 types/index.ts 타입 정의 후 구현 요청
```

### 금지 사항
- CSS 변수 값 직접 변경 금지 (이미 MusePilot과 매칭됨)
- globals.css에 없는 새 스타일 → `page.module.css` 사용
- `any` 타입 사용 금지
- localStorage 직접 접근 금지 → `src/lib/storage.ts` 경유
- `console.log` 커밋 금지

### 새 기능 추가 표준 순서
```
1. src/types/index.ts — 타입 정의
2. src/lib/storage.ts — 스토리지 함수
3. src/app/api/       — API Route (서버 필요 시)
4. src/components/    — 재사용 컴포넌트
5. src/app/[route]/   — 페이지 구현
```

---

## 개발 서버
```bash
cd scratch/suno-yt-dashboard
npm run dev   # http://localhost:3000
```

## 환경변수
`.env.local.example` 참조. `.env.local` 로 복사 후 키 입력.

## 관련 에이전트 (scratch/.claude/agents/)
- `musepilot-feature-cloner` — MusePilot 기능 역분석 + 구현
- `site-feature-extractor`   — 외부 URL 분석 → 기능 흡수 제안
- `schema-designer`          — localStorage → Supabase 스키마 변환
- `prompt-engineer`          — Suno/Gemini 프롬프트 최적화
