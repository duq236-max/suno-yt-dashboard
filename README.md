# suno-yt-dashboard

Suno AI + YouTube 대시보드 — MusePilot.pro 클론 프로젝트

## Getting Started

```bash
cp .env.local.example .env.local
# .env.local 에 키 입력 후 →
npm run dev   # http://localhost:3000
```

## Phase 6 신규 기능

### 주요 업데이트

| 기능 | 경로 | 설명 |
|------|------|------|
| Google OAuth 로그인 | `/api/auth` | NextAuth.js v5 + Google Provider, 세션 기반 인증 |
| Supabase 영구 저장 | `/scrapsheet`, `/lyrics`, `/revenue` | PostgreSQL DB 전환 (localStorage → Supabase) |
| YouTube Data API 실연동 | `/dashboard`, `/audit` | 채널 통계 실시간 조회 (조회수·구독자·동영상 수) |
| Recharts 차트 3종 | `/dashboard` | 조회수 추이 AreaChart, 장르별 BarChart, 수익 LineChart |

### Supabase 초기 설정

1. [Supabase Dashboard](https://supabase.com/dashboard) 에서 새 프로젝트 생성
2. SQL Editor 에서 아래 파일 전체 실행:

```sql
-- migrations/ALL_migrations.sql 내용을 SQL Editor에 붙여넣고 실행
```

> 파일 위치: `migrations/ALL_migrations.sql`
> 포함 내용: users, scrapsheet, lyrics, revenue 테이블 + RLS 정책 전체

### 환경변수 전체 가이드

`.env.local.example` 을 복사 후 아래 키를 모두 입력:

```bash
cp .env.local.example .env.local
```

| 변수명 | 설명 | 발급처 |
|--------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public 키 | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 사이드 관리자 키 (RLS 우회) | Supabase → Settings → API |
| `GOOGLE_CLIENT_ID` | Google OAuth 앱 클라이언트 ID | [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 앱 클라이언트 시크릿 | Google Cloud Console (위와 동일) |
| `YOUTUBE_API_KEY` | YouTube Data API v3 키 | Google Cloud Console → YouTube Data API v3 사용 설정 |
| `GEMINI_API_KEY` | Gemini API 키 | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `NEXTAUTH_SECRET` | 세션 서명 키 (`openssl rand -base64 32`) | 직접 생성 |
| `NEXTAUTH_URL` | 앱 기본 URL | 로컬: `http://localhost:3000`, 배포: Vercel 도메인 |

> **주의**: `NEXT_PUBLIC_` 접두사 변수는 브라우저에 노출됩니다.
> `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET` 은 절대 `NEXT_PUBLIC_` 로 시작하면 안 됩니다.

### Google OAuth 리디렉트 URI 설정

[Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client ID → **Authorized redirect URIs** 추가:

```
# 개발
http://localhost:3000/api/auth/callback/google

# 배포
https://your-app.vercel.app/api/auth/callback/google
```

---

## Phase 5 신규 기능

### 가나다순 전체 목록

| 기능 | 경로 | 설명 |
|------|------|------|
| 가사 생성 심화 | `/lyrics` | 창의성 파라미터(Temperature/Top-P/Top-K), 장르·무드 셀렉터, 저작권 방어 체크박스, 보컬 스타일 자동 추천, Shorts 모드 |
| 감사(Audit) 100점 | `/audit` | AI 채널 감사 점수 100점 만점 환산 표시 |
| 검색 페이지 | `/library` | 황금 프롬프트 6종 + 보컬 스타일 8종 탭 UI, 카드별 클립보드 복사 |
| 공개 일정 AI | `/schedule` | AI 추천 업로드 타임슬롯 카드, 캘린더 하이라이트 |
| 광고 수익 관리 | `/revenue` | 스트리밍 수익 계산기, RPM 계산기, 음원 등록 테이블, 유통 체크리스트 |
| 기획 순서 AI | `/planner` | 플리 순서 AI 추천 (playlist route 신규) |
| 다크/라이트 테마 | 전역 | 헤더 테마 토글 버튼, 라이트 팔레트 CSS 변수 |
| 보컬 스타일 프리셋 | `/lyrics` | 8종 보컬 스타일 선택 + 커스텀 보컬 저장/삭제 |
| 썸네일 갤러리 | `/cover` | Pollinations.ai 이미지 생성 + 썸네일 갤러리 뷰 |
| 아이디어 생성 | `/ideation` | CreativityPanel 통합, creativityParams API 전달 |
| 언어 확장 | `/lyrics` | 일본어(ja), 중국어(zh) 가사 생성 지원 |
| 창의성 파라미터 | 공통 컴포넌트 | 4종 프리셋(정밀·균형·창의적·카오스) + 슬라이더, localStorage 자동 저장 |
| 커버 아트 프리셋 | `/cover` | 6종 스타일 프리셋 카드, 일본어 오버레이, Shorts 토글 |
| 콘텐츠 기획 | `/planner` | CreativityPanel 통합, AI 기획 생성 |
| 토스트 알림 | 전역 | 복사/완료 액션 피드백 Toast 컴포넌트 |
| 최근 작업 배지 | Sidebar | 최근 방문 페이지 배지 표시 |
| Extension 전송 | `/library` | 황금 프롬프트를 Chrome Extension으로 직접 전송 |
| Suno 프롬프트 섹션 | `/lyrics` | 최종 Suno 스타일 프롬프트 자동 생성 및 복사 |
| V-매칭 | `/cover` | 보컬 스타일과 커버 아트 테마 자동 매칭 |

### 스크린샷 안내

> E2E 테스트 실행 후 `test-results/screenshots/` 폴더에서 확인 가능

```
test-results/screenshots/
├── lyrics-creativity-panel.png   ← CreativityPanel 펼친 상태
├── lyrics-chaos-preset.png       ← 카오스 프리셋 적용
├── smoke-lyrics.png              ← /lyrics 스모크
├── smoke-revenue.png             ← /revenue 스모크
├── smoke-library.png             ← /library 스모크
└── smoke-cover.png               ← /cover 스모크
```

## Chrome Extension 사용법

### 설치 (개발자 모드)

1. Chrome 브라우저 주소창에 `chrome://extensions` 입력
2. 우측 상단 **개발자 모드** 토글 활성화
3. **압축 해제된 확장 프로그램 로드** 클릭
4. `suno-yt-extension/` 폴더 선택
5. Extension 아이콘이 툴바에 표시되면 설치 완료

### 빌드 (TypeScript 소스 변경 시)

```bash
cd suno-yt-extension
npm install
npm run build   # dist/ 폴더 생성
```

> Chrome extensions에서는 `dist/` 폴더를 로드하세요.

### 배치 전송 방법

1. 대시보드(`http://localhost:3000`)에서 스크랩시트에 프롬프트 추가
2. Chrome Extension 아이콘 클릭 → **배치 전송 시작** 버튼 클릭
3. Extension이 자동으로 [suno.com](https://suno.com) 에 프롬프트를 순서대로 주입
4. 완료 시 대시보드로 결과 전송 (PING/PONG 메시지 브리지)

> **참고**: 대시보드(`http://localhost:3000`)가 실행 중이어야 Extension과 연동됩니다.

## Vercel 배포 설정

Vercel 대시보드 → **Settings → Environment Variables** 에서 위 [환경변수 전체 가이드](#환경변수-전체-가이드) 항목을 모두 추가하세요.

- `NEXTAUTH_URL` 은 배포 URL로 변경 (예: `https://your-app.vercel.app`)
- `GOOGLE_CLIENT_ID/SECRET` 은 Vercel 도메인을 OAuth 리디렉트 URI에 추가해야 함

## 프로젝트 구조

```
src/
├── app/
│   ├── api/          # API Routes (auth, gemini, youtube)
│   ├── audit/        # 채널 감사 (AI 100점 분석)
│   ├── cover/        # 커버 아트 생성 (스타일 프리셋 6종)
│   ├── dashboard/    # 메인 대시보드
│   ├── ideation/     # 아이디어 생성
│   ├── library/      # 황금 프롬프트 + 보컬 스타일 라이브러리
│   ├── lyrics/       # 가사 생성 (CreativityPanel 통합)
│   ├── planner/      # 채널 기획 + AI 플리 순서
│   ├── revenue/      # 광고 수익 관리
│   ├── schedule/     # 업로드 스케줄 (AI 추천)
│   └── settings/     # 설정 (Gemini API 키)
├── components/       # 공통 컴포넌트 (CreativityPanel, Toast 등)
├── data/             # 정적 데이터 (vocal-styles, golden-prompts)
├── lib/              # supabase, storage, gemini, youtube
└── types/            # TypeScript 타입 정의
```

## 기술 스택

- **Framework**: Next.js 16 + React 19 + TypeScript
- **Auth**: NextAuth.js v5 + Google OAuth
- **DB**: Supabase (PostgreSQL)
- **AI**: Google Gemini API
- **Charts**: Recharts
- **E2E**: Playwright
- **배포**: Vercel (서울 리전 `icn1`)

## E2E 테스트 실행

```bash
# 개발 서버 실행 후 (npm run dev)
npx playwright test               # 전체 실행
npx playwright test --headed      # 브라우저 UI 표시
npx playwright test creativity-panel  # CreativityPanel 테스트만
npx playwright show-report        # HTML 리포트 열기
```
