# Vercel 배포 체크리스트

> Suno YT Dashboard — Phase 6 배포 전 필수 확인 사항

---

## 1. Vercel 환경변수 설정

Vercel Dashboard → Project → Settings → Environment Variables 에서 아래 9개 변수를 **Production** 환경에 모두 추가하세요.

| 변수명 | 설명 | 발급 위치 |
|--------|------|-----------|
| `NEXTAUTH_SECRET` | NextAuth.js JWT 서명 키 (최소 32자 랜덤 문자열) | `openssl rand -base64 32` 명령으로 생성 |
| `NEXTAUTH_URL` | 앱의 공개 URL | **Vercel 배포 후 실제 도메인으로 교체 필요** (아래 주의사항 참조) |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 | Google Cloud Console → Credentials (Client ID 생성 시 함께 발급) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | [Supabase Dashboard](https://supabase.com/dashboard) → Project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) 키 | Supabase Dashboard → Project → Settings → API → `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role 키 (서버 전용) | Supabase Dashboard → Project → Settings → API → `service_role` ⚠️ 절대 클라이언트 노출 금지 |
| `YOUTUBE_API_KEY` | YouTube Data API v3 키 | [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → API Key |
| `GEMINI_API_KEY` | Google Gemini API 키 | [Google AI Studio](https://aistudio.google.com/app/apikey) |

---

## 2. NEXTAUTH_URL 주의사항

```
# 로컬 개발
NEXTAUTH_URL=http://localhost:3000

# Vercel 배포 후 반드시 실제 도메인으로 교체!
NEXTAUTH_URL=https://your-project-name.vercel.app
# 또는 커스텀 도메인이 있는 경우
NEXTAUTH_URL=https://yourdomain.com
```

> **중요:** `NEXTAUTH_URL`이 실제 배포 URL과 다르면 Google OAuth 로그인이 동작하지 않습니다.
> Vercel은 자동으로 `VERCEL_URL` 환경변수를 제공하지만, NextAuth는 명시적인 `NEXTAUTH_URL`을 권장합니다.

Google Cloud Console에서도 **승인된 리디렉션 URI**를 업데이트해야 합니다:
```
https://your-project-name.vercel.app/api/auth/callback/google
```

---

## 3. Supabase 마이그레이션 실행

Supabase SQL Editor에서 전체 마이그레이션을 한 번에 실행하세요.

**파일 위치:** `migrations/ALL_migrations.sql`

**실행 방법:**
1. [Supabase Dashboard](https://supabase.com/dashboard) → Project 선택
2. 왼쪽 메뉴 → **SQL Editor** 클릭
3. `migrations/ALL_migrations.sql` 파일 내용 전체 복사
4. SQL Editor에 붙여넣기 후 **Run** 클릭
5. 오류 없이 완료되면 성공

**포함된 마이그레이션:**
- `001_initial.sql` — 기본 테이블 구조
- `002_phase1.sql` — Phase 1 스키마
- `003_fix_rls_nextauth.sql` — NextAuth RLS 정책 수정
- `004_fix_userid_for_nextauth.sql` — NextAuth용 userId UUID 수정
- `005_revenue_songs.sql` — Revenue 및 Songs 테이블

> **주의:** 이미 일부 마이그레이션이 실행된 경우, `ALL_migrations.sql` 대신 개별 파일을 순서대로 실행하세요.

---

## 4. 배포 후 확인 체크리스트

### 인증
- [ ] Google 로그인 버튼 클릭 → Google OAuth 화면으로 이동 확인
- [ ] 로그인 완료 후 대시보드로 리디렉트 확인
- [ ] Header에 사용자 아바타/이름 표시 확인
- [ ] 로그아웃 동작 확인

### 데이터베이스 (Supabase)
- [ ] Scrapsheet에 항목 추가 → Supabase에 저장 확인
- [ ] Lyrics 페이지 저장/불러오기 동작 확인
- [ ] Revenue 페이지 수익 입력 → DB 저장 확인
- [ ] 로그아웃 후 재로그인 시 데이터 유지 확인

### YouTube API
- [ ] `/api/youtube/videos` 엔드포인트 응답 확인
- [ ] Analytics 페이지 차트 데이터 로드 확인
- [ ] YouTube API 할당량 초과 시 에러 메시지 표시 확인

### Extension 통신
- [ ] `suno-batch-extension/dist` 로드 후 `/settings` 페이지 → Extension 연결 상태 카드가 **"연결됨"** 표시 확인
- [ ] `/settings` → "↻ 재감지" 버튼으로 수동 재확인 가능
- [ ] `/library` 페이지 → "Suno로 전송" 버튼 클릭 시 큐 추가 동작 확인
- [ ] `suno-batch-extension/src/dashboard-bridge.ts` 허용 오리진 목록에 배포 URL 추가 여부 확인
  ```
  // 배포 URL 예시 — ALLOWED_ORIGINS 배열에 추가
  'https://your-project-name.vercel.app'
  ```
- [ ] `/api/extension/send` 엔드포인트 응답 확인 (curl 또는 E4 체크리스트 참조)

### 빌드 & 성능
- [ ] Vercel 빌드 로그에 오류 없음 확인
- [ ] 주요 페이지 로드 시간 3초 이내 확인
- [ ] 모바일 반응형 레이아웃 확인

---

## 5. 문제 해결 가이드

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| Google 로그인 실패 | `NEXTAUTH_URL` 불일치 또는 리디렉션 URI 미등록 | NEXTAUTH_URL 및 Google Console 리디렉션 URI 확인 |
| DB 저장 안 됨 | Supabase RLS 정책 또는 마이그레이션 미실행 | SQL Editor에서 `ALL_migrations.sql` 재실행 |
| YouTube API 오류 | API 키 제한 또는 할당량 초과 | Google Cloud Console에서 키 제한 설정 및 할당량 확인 |
| Extension 연결 안 됨 | `NEXTAUTH_URL` 오리진 불일치 | Extension의 허용 오리진 목록에 배포 URL 추가 |
| 빌드 실패 | 환경변수 누락 | Vercel 환경변수 9개 모두 설정되었는지 확인 |

---

## 6. 환경변수 빠른 복사 템플릿

Vercel CLI를 사용하는 경우 `.env.local`을 참고하여 아래 형식으로 설정하세요:

```bash
# NextAuth
NEXTAUTH_SECRET=<openssl rand -base64 32 으로 생성>
NEXTAUTH_URL=https://your-project-name.vercel.app

# Google OAuth
GOOGLE_CLIENT_ID=<Google Cloud Console에서 복사>
GOOGLE_CLIENT_SECRET=<Google Cloud Console에서 복사>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase API 설정에서 복사>
SUPABASE_SERVICE_ROLE_KEY=<Supabase API 설정에서 복사>

# APIs
YOUTUBE_API_KEY=<Google Cloud Console에서 복사>
GEMINI_API_KEY=<Google AI Studio에서 복사>
```

---

*최종 업데이트: Phase 6 완료 (2026-03-20)*
