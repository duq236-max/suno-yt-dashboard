# suno-yt-dashboard

Suno AI + YouTube 대시보드 — MusePilot.pro 클론 프로젝트

## Getting Started

```bash
cp .env.local.example .env.local
# .env.local 에 키 입력 후 →
npm run dev   # http://localhost:3001
```

## Vercel 배포 환경변수 설정

Vercel 대시보드 → **Settings → Environment Variables** 에서 아래 항목 추가:

### 필수 항목

| 변수명 | 설명 | 발급처 |
|--------|------|--------|
| `NEXTAUTH_URL` | 배포 URL (예: `https://your-app.vercel.app`) | Vercel 도메인 |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` 로 생성 | 직접 생성 |
| `GOOGLE_CLIENT_ID` | Google OAuth 앱 클라이언트 ID | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 앱 클라이언트 시크릿 | Google Cloud Console |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public 키 | Supabase Dashboard |
| `YOUTUBE_API_KEY` | YouTube Data API v3 키 | Google Cloud Console |
| `GEMINI_API_KEY` | Gemini API 키 | Google AI Studio |

### 선택 항목

| 변수명 | 설명 |
|--------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 사이드 Supabase 작업 시 필요 |
| `ANTHROPIC_API_KEY` | Claude API 기능 사용 시 |

> **주의**: `NEXT_PUBLIC_` 접두사가 붙은 변수는 클라이언트에 노출됩니다.
> 시크릿 값(API 키, Secret)은 절대 `NEXT_PUBLIC_` 로 시작하면 안 됩니다.

## Google OAuth 리디렉트 URI 설정

[Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client ID 에서 **Authorized redirect URIs** 추가:

```
# 개발
http://localhost:3001/api/auth/callback/google

# 배포
https://your-app.vercel.app/api/auth/callback/google
```

## 프로젝트 구조

```
src/
├── app/
│   ├── api/          # API Routes (auth, gemini, youtube)
│   ├── dashboard/    # 메인 대시보드
│   ├── planner/      # 채널 기획
│   ├── scrapsheet/   # 프롬프트 시트
│   └── settings/     # 설정 (Gemini API 키)
├── components/       # 공통 컴포넌트
├── lib/              # supabase, storage, gemini, youtube
└── types/            # TypeScript 타입 정의
```

## 기술 스택

- **Framework**: Next.js 16 + React 19 + TypeScript
- **Auth**: NextAuth.js v5 + Google OAuth
- **DB**: Supabase (PostgreSQL)
- **AI**: Google Gemini API
- **Charts**: Recharts
- **배포**: Vercel (서울 리전 `icn1`)
