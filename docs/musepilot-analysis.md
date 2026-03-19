# MusePilot.pro 전체 기능 분석 보고서

> 분석 일자: 2026-03-17
> 분석 대상: https://musepilot.pro (Studio Edition v2.0)
> 비교 대상: suno-yt-dashboard (현재 프로젝트)

---

## 1. MusePilot 내비게이션 구조 (전체 라우트 맵)

### 1-1. 글로벌 사이드바 메뉴 (채널 무관)

| 메뉴 항목 | 라우트 | 설명 |
|-----------|--------|------|
| Dashboard | `/dashboard` | 채널 목록, 통계 요약, 예정 업로드 |
| Statistics | `/statistics` | 크로스 채널 통합 통계 |
| Channel Planner (Form) | `/channelPlanner` | 6단계 설문 기반 채널 기획 |
| Channel Planner (Chat) | `/channelPlannerChat` | AI 대화형 채널 기획 |
| Scrap Sheet | `/scrapSheet` | 스크린샷/영감 수집 및 AI 분석 |
| AI Mastering | `/mastering` | AI 오디오 마스터링 |
| Live Streaming | (미공개) | 라이브 스트리밍 (예정?) |
| Resources | (미공개) | 리소스 라이브러리 |
| Album Cover Generator | `/coverGenerator` | 템플릿 기반 커버 이미지 생성 |
| Coupon Redemption | (미공개) | 쿠폰 입력 |
| Documentation | (미공개) | 사용 문서 |
| Schedule Alerts | (미공개) | 스케줄 알림 설정 |
| Settings | `/settings` | 계정 설정 |
| Subscription | `/subscription` | 구독 관리 |

### 1-2. 채널별 메뉴 (선택한 채널 컨텍스트)

| 메뉴 항목 | 라우트 | 설명 |
|-----------|--------|------|
| Composition | `/[channel]/composition` | 가사 + Suno 프롬프트 통합 관리 |
| Production Studio | `/[channel]/productionStudio` | 통합 제작 워크스페이스 |
| Video Ideas | `/[channel]/ideation` | AI 기반 영상 아이디어 생성 |
| Video List | `/[channel]/videoList` | 업로드된 영상 라이브러리 |
| Schedule | `/[channel]/schedule` | 업로드 예약 |
| Channel Audit | `/[channel]/channelAudit` | AI 채널 진단 |
| Thumbnail Check | `/[channel]/thumbnailCheck` | 썸네일 검수 |
| Analytics | `/[channel]/analytics` | 채널 퍼포먼스 분석 |
| BrandKit | `/[channel]/brandKit` | 브랜드 아이덴티티 설정 |
| Operations | `/[channel]/operations` | 채널 운영 관리 |
| Comments | `/[channel]/comments` | 댓글 관리 + AI 답변 |
| Upload | `/[channel]/upload` | 영상 업로드 워크플로우 |
| Competitor Analysis | `/[channel]/competitors` | 경쟁 채널 분석 |
| AI Analyst | `/[channel]/analyst` | AI 분석가 채팅 인터페이스 |

### 1-3. 인증/공통 페이지

| 라우트 | 설명 |
|--------|------|
| `/auth/signin` | Google OAuth 로그인 |
| `/auth/signup` | 회원가입 |
| `/commons/terms` | 이용약관 |
| `/commons/privacy` | 개인정보처리방침 |
| `/commons/refund` | 환불정책 |
| `/waitlist` | 웨이트리스트 |
| `/notifications` | 알림 설정 |

---

## 2. 기능 상세 분석 (카테고리별)

### 2-1. 음악 생성 및 제작

| 기능 | 상세 설명 |
|------|-----------|
| **Composition (가사/프롬프트 관리)** | 가사 작성 + Suno 프롬프트 자동 생성. BrandKit 기반으로 일관된 스타일 유지 |
| **AI Lyrics Generation** | 장르, 분위기, 테마 커스텀으로 AI 가사 생성 |
| **Production Studio** | 가사 -> Suno 생성 -> MP3 병합 -> MP4 변환 -> 메타데이터 -> 업로드까지 일관된 워크플로우 |
| **AI Mastering** | 오디오 파일 업로드 -> AI 마스터링 (다수 프리셋) -> 배치 처리 지원 |
| **MP3 Merging** | 여러 MP3 파일을 하나로 병합 |

### 2-2. 채널 기획 및 전략

| 기능 | 상세 설명 |
|------|-----------|
| **6-Step Channel Planner** | 설문 기반: 장르/타겟/빈도/컨셉/차별화/수익화 6단계 |
| **Chat Channel Planner** | AI 대화형으로 채널 전략 수립 (자연어) |
| **Channel Audit** | AI가 채널 기본 설정 분석 + 개선 제안 |
| **BrandKit** | 채널별 비주얼 가이드라인, 콘텐츠 규칙, Suno 프롬프트 템플릿 |
| **Competitor Analysis** | 경쟁 채널 트래킹, 퍼포먼스 비교, 업로드 패턴 분석 |

### 2-3. YouTube 관리 및 분석

| 기능 | 상세 설명 |
|------|-----------|
| **Multi-Channel Dashboard** | 여러 채널 연결/해제, 실시간 통계 동기화 |
| **Analytics** | 조회수, 구독자, 참여율, 시청시간, 지역별, 인구통계 |
| **Video List** | 상태 트래킹 (pending/uploading/published/failed), 메타데이터 편집 |
| **Schedule** | 날짜/시간 예약 업로드, 자동 YouTube 게시 |
| **Upload Workflow** | Suno 결과물 -> YouTube 직접 업로드 (YouTube API 연동) |
| **Comment Management** | AI 답변 제안, 자동 답변 스케줄, 스팸 감지, 필터링 |
| **SEO Analysis** | 메타데이터 최적화 점수, 키워드 추천 |

### 2-4. 콘텐츠 아이디어 및 인텔리전스

| 기능 | 상세 설명 |
|------|-----------|
| **Video Ideation** | 최근 30개 영상 분석 -> 다음 영상 주제 추천 |
| **Deep Insight** | 지역별 검색 트렌드 분석 + 최적화 추천 |
| **AI Analyst Chat** | 경쟁 채널 데이터 기반 대화형 분석 |
| **Scrap Sheet** | 영감 수집 (스크린샷/링크), AI 관점 분석 |
| **Thumbnail Check** | 썸네일 효과 검수 도구 |

### 2-5. 시각 콘텐츠

| 기능 | 상세 설명 |
|------|-----------|
| **Cover Generator** | 템플릿 기반 앨범 커버/플레이리스트 커버 생성, 커스터마이즈 |
| **Thumbnail Creation** | 영상 썸네일 생성 (커버 생성기와 연계) |

### 2-6. 인프라 기능

| 기능 | 상세 설명 |
|------|-----------|
| **Chrome Extension** | 브라우저에서 콘텐츠 캡처, Scrap Sheet로 전송 |
| **Credit System** | AI 기능 사용량 토큰 관리, 월간 할당 + 일회성 구매 |
| **Subscription Tiers** | Hobby / Pro / Premium (크레딧/기능 차등) |
| **Google OAuth** | Google 계정 인증 |

---

## 3. 우리 프로젝트와 비교 분석

### [이미 있음] -- 현재 구현 완료

| MusePilot 기능 | 우리 구현 | 차이점 |
|----------------|-----------|--------|
| Dashboard 통계 카드 | `/dashboard` StatCard | 거의 동일 |
| ScrapSheet (프롬프트 관리) | `/scrapsheet`, `/scrapsheet/[id]` | 구조 유사, 가사/프롬프트/장르/상태 |
| Channel Planner (설문) | `/planner` | 6단계 설문 기본 존재 |
| Schedule 설정 | `/schedule` | UI만 존재 (실제 동작 안 함) |
| Settings | `/settings` | Gemini API 키 설정만 |
| Sidebar Navigation | `Sidebar.tsx` | 기본 네비 완성 |
| YouTube 채널 관리 | `/dashboard` YT채널 수동입력 | 수동 통계 입력 방식 |
| Chrome Extension | `suno-yt-extension` | 기본 브리지 구조 |

### [강화 가능] -- 있지만 개선 필요

| 기능 | 현재 상태 | MusePilot 수준 | 갭 |
|------|-----------|---------------|-----|
| ScrapSheet | 프롬프트/가사 텍스트 관리 | + AI 관점 분석, 스크린샷 첨부, 영감 태깅 | 중 |
| Channel Planner | 설문 6단계, 저장만 됨 | + AI 기반 추천, 데이터 활용, 결과 리포트 | 상 |
| Schedule | UI만 존재 | + 실제 YouTube 예약 업로드, 알림 발송 | 상 |
| Dashboard | 통계 카드 + YT 채널 목록 | + 실시간 동기화, 예정 업로드 표시, 차트 | 중 |
| Settings | Gemini 키만 | + 계정 관리, 알림 설정, 구독 관리 | 중 |
| ScrapItem 타입 | instruments, mood_tags, is_instrumental 있음 | + BrandKit 연동, 자동 프롬프트 생성 | 중 |

### [추가 가능] -- 우리에게 없고 추가하면 좋은 것

| 기능 | 설명 | 난이도 | 임팩트 |
|------|------|--------|--------|
| **BrandKit** | 채널별 비주얼/콘텐츠 규칙 + Suno 프롬프트 템플릿 | 중 | 상 |
| **AI Lyrics Generation** | Gemini API로 가사 자동 생성 | 하 | 상 |
| **Production Studio** | 가사->프롬프트->생성->업로드 통합 워크플로우 | 상 | 상 |
| **Video Ideation** | 채널 데이터 기반 AI 주제 추천 | 중 | 상 |
| **Channel Audit** | AI 채널 진단 + 개선 제안 | 중 | 중 |
| **Comment Management** | AI 답변 제안 + 자동 답변 | 상 | 중 |
| **Competitor Analysis** | 경쟁 채널 트래킹 + 비교 | 중 | 중 |
| **Cover Generator** | 템플릿 기반 커버 이미지 | 상 | 중 |
| **AI Mastering** | 오디오 마스터링 + 배치 처리 | 상 | 하 |
| **Chat Channel Planner** | 대화형 채널 기획 | 중 | 중 |
| **SEO Analysis** | 메타데이터 최적화 점수 | 중 | 중 |
| **Deep Insight** | 트렌드 분석 by 지역 | 중 | 중 |
| **Thumbnail Check** | 썸네일 효과 검수 | 하 | 하 |
| **Video List** | 업로드 영상 라이브러리 관리 | 중 | 중 |
| **Statistics (Cross-channel)** | 통합 채널 통계 차트 | 중 | 상 |
| **Credit System** | AI 사용량 토큰 관리 | 중 | 하 |

### [관련 없음] -- 우리 서비스와 맞지 않는 것

| 기능 | 이유 |
|------|------|
| Google OAuth 가입/로그인 UI | Phase 2에서 NextAuth.js로 별도 구현 예정 |
| Subscription 결제 | Phase 3 Paddle 연동 예정 |
| Live Streaming | 현재 범위 밖 |
| Coupon Redemption | 결제 시스템 전제 필요 |

---

## 4. 우선순위 매트릭스

| 순위 | 기능명 | 난이도 | 임팩트 | 우선순위 | 구현 위치 |
|------|--------|--------|--------|----------|-----------|
| 1 | AI Lyrics Generation | 하 | 상 | **P1** | `/scrapsheet/[id]` 버튼 추가 |
| 2 | BrandKit | 중 | 상 | **P1** | 새 라우트 `/brandkit` |
| 3 | Statistics (Cross-channel) | 중 | 상 | **P1** | 새 라우트 `/statistics` |
| 4 | Video Ideation | 중 | 상 | **P1** | 새 라우트 `/ideation` |
| 5 | Channel Planner 강화 | 중 | 상 | **P1** | 기존 `/planner` 개선 |
| 6 | Chat Channel Planner | 중 | 중 | **P2** | 새 라우트 `/planner/chat` |
| 7 | Channel Audit | 중 | 중 | **P2** | 새 라우트 `/audit` |
| 8 | Competitor Analysis | 중 | 중 | **P2** | 새 라우트 `/competitors` |
| 9 | SEO Analysis | 중 | 중 | **P2** | `/scrapsheet/[id]` 탭 추가 |
| 10 | Deep Insight (트렌드) | 중 | 중 | **P2** | 새 라우트 `/trends` |
| 11 | Video List | 중 | 중 | **P2** | 새 라우트 `/videos` |
| 12 | Thumbnail Check | 하 | 하 | **P3** | 새 라우트 `/thumbnail-check` |
| 13 | Production Studio | 상 | 상 | **P3** | 새 라우트 `/studio` |
| 14 | Cover Generator | 상 | 중 | **P3** | 새 라우트 `/cover-generator` |
| 15 | Comment Management | 상 | 중 | **P3** | 새 라우트 `/comments` |
| 16 | AI Mastering | 상 | 하 | **P3** | 새 라우트 `/mastering` |
| 17 | Credit System | 중 | 하 | **P3** | Settings 하위 |

---

## 5. P1 기능 상세 구현 스펙

### 5-1. AI Lyrics Generation (AI 가사 자동 생성)

#### 개요
Gemini API를 활용하여 장르, 분위기, 테마, 악기 정보를 기반으로 가사를 자동 생성하는 기능. 기존 ScrapSheet 상세 페이지(`/scrapsheet/[id]`)에서 버튼 하나로 호출.

#### 데이터 구조 (types/index.ts에 추가)
```typescript
interface LyricsGenerationRequest {
  genre: string;
  mood: string[];
  theme?: string;
  isInstrumental: boolean;
  language: 'ko' | 'en' | 'ja';
  style?: string;         // "verse-chorus-verse", "freeform" 등
  brandKitId?: string;    // BrandKit 연동 시
}

interface LyricsGenerationResult {
  lyrics: string;
  suggestedTitle: string;
  suggestedPrompt: string; // Suno 프롬프트도 함께 생성
  generatedAt: string;
}
```

#### UI 구현 위치
- 기존 페이지: `/scrapsheet/[id]` -- 가사 편집 영역 상단에 "AI 가사 생성" 버튼 추가
- 모달 or 사이드 패널로 옵션 입력 (장르, 분위기, 테마)
- 생성 결과를 가사 필드에 자동 채움 (덮어쓰기 전 확인)

#### 필요한 API/외부 서비스
- Gemini API (이미 키 입력 필드 있음, `settings`에서 관리)
- API Route: `/api/generate-lyrics` (POST)

#### 구현 단계
1. `types/index.ts` -- `LyricsGenerationRequest`, `LyricsGenerationResult` 타입 추가
2. `src/app/api/generate-lyrics/route.ts` -- Gemini API 호출 API Route
3. `src/components/LyricsGenerator.tsx` -- 옵션 입력 + 생성 결과 표시 모달
4. `/scrapsheet/[id]/page.tsx` -- LyricsGenerator 컴포넌트 통합

#### Gemini 프롬프트 예시
```
당신은 음악 작사가입니다.
장르: {genre}, 분위기: {mood}, 테마: {theme}
{language}로 가사를 작성하세요.
구조: verse 1 - chorus - verse 2 - chorus - bridge - chorus
각 섹션을 [Verse 1], [Chorus] 등으로 표시하세요.
```

---

### 5-2. BrandKit (브랜드 키트)

#### 개요
채널별 비주얼 가이드라인, 콘텐츠 규칙, Suno 프롬프트 기본 템플릿을 관리하는 기능. 모든 콘텐츠 생성 시 BrandKit을 참조하여 일관된 스타일 유지.

#### 데이터 구조 (types/index.ts에 추가)
```typescript
interface BrandKit {
  id: string;
  channelId: string;           // YoutubeChannel.id 연결
  // 비주얼
  primaryColor: string;        // hex
  secondaryColor: string;
  fontStyle: string;           // "modern", "classic", "minimal" 등
  thumbnailTemplate?: string;  // 썸네일 레이아웃 프리셋
  // 콘텐츠 규칙
  defaultGenre: string;
  defaultMoods: string[];
  defaultLanguage: 'ko' | 'en' | 'ja';
  isInstrumentalDefault: boolean;
  // Suno 프롬프트 템플릿
  sunoPromptTemplate: string;  // "{genre}, {mood}, cinematic, ..." 기본 프롬프트
  sunoNegativePrompt?: string; // 제외할 스타일
  // 메타
  description?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### UI 구현 위치
- 새 라우트: `/brandkit`
- 레이아웃: 좌측 채널 선택 리스트 + 우측 BrandKit 편집 폼
- 섹션: "비주얼 설정", "콘텐츠 규칙", "Suno 프롬프트 템플릿"

#### 필요한 API/외부 서비스
- 없음 (localStorage/Supabase 저장)
- 선택적: Gemini API로 "이 채널에 맞는 BrandKit 추천해줘" 기능

#### 구현 단계
1. `types/index.ts` -- `BrandKit` 인터페이스 추가, `AppData`에 `brandKits: BrandKit[]` 추가
2. `lib/storage.ts` -- `updateBrandKits()`, `getBrandKitByChannel()` 함수
3. `src/components/BrandKitForm.tsx` -- 폼 컴포넌트
4. `src/app/brandkit/page.tsx` -- 페이지 구현
5. `Sidebar.tsx` -- 메뉴 항목 추가

---

### 5-3. Statistics (통합 채널 통계)

#### 개요
연결된 모든 YouTube 채널의 통계를 한 화면에서 비교/분석. AreaChart(조회수 추이), BarChart(채널별 비교), 주요 지표 카드.

#### 데이터 구조 (types/index.ts에 추가)
```typescript
interface ChannelStatSnapshot {
  id: string;
  channelId: string;
  date: string;                // "2026-03-17"
  views: number;
  subscribers: number;
  watchHours: number;
  likes: number;
  comments: number;
  engagement: number;          // %
}

interface StatisticsFilter {
  period: '7d' | '30d' | '90d' | '1y';
  channels: string[];          // 선택된 채널 ID 목록
  metric: 'views' | 'subscribers' | 'watchHours' | 'engagement';
}
```

#### UI 구현 위치
- 새 라우트: `/statistics`
- 상단: 기간 필터 + 채널 선택 칩
- 중단: AreaChart (시간별 추이) -- Recharts
- 하단: 채널별 비교 BarChart + 테이블

#### 필요한 API/외부 서비스
- Phase 1: localStorage의 수동 입력 데이터 활용
- Phase 2: YouTube Analytics API 실제 연동

#### 구현 단계
1. `types/index.ts` -- `ChannelStatSnapshot`, `StatisticsFilter` 추가
2. `lib/storage.ts` -- `getStatSnapshots()`, `addStatSnapshot()` 함수
3. Recharts 설치: `npm install recharts`
4. `src/components/ViewsChart.tsx` 강화 (이미 존재) + `ChannelComparisonChart.tsx` 신규
5. `src/app/statistics/page.tsx` -- 페이지 구현
6. `Sidebar.tsx` -- 메뉴 항목 추가

---

### 5-4. Video Ideation (AI 영상 아이디어)

#### 개요
채널 데이터 (장르, 과거 퍼포먼스, BrandKit)를 기반으로 AI가 다음 영상 주제를 추천. MusePilot은 "최근 30개 영상 분석 -> 주제 추천" 방식.

#### 데이터 구조 (types/index.ts에 추가)
```typescript
interface VideoIdea {
  id: string;
  channelId: string;
  title: string;
  description: string;
  genre: string;
  estimatedViews?: string;    // "1K-5K" 예상 범위
  keywords: string[];
  reasoning: string;          // AI가 이 아이디어를 추천한 이유
  status: 'new' | 'accepted' | 'rejected' | 'produced';
  createdAt: string;
}

interface IdeationRequest {
  channelId: string;
  brandKitId?: string;
  count: number;              // 생성할 아이디어 수
  focus?: string;             // "trending", "seasonal", "niche" 등
}
```

#### UI 구현 위치
- 새 라우트: `/ideation`
- 상단: 채널 선택 + "아이디어 생성" 버튼
- 메인: 카드 그리드 형태로 아이디어 표시
- 각 카드: 제목, 설명, 장르, 키워드, 추천 이유, 상태 배지
- 액션: 수락/거절/스크랩시트로 보내기

#### 필요한 API/외부 서비스
- Gemini API (채널 컨텍스트 + 프롬프트)
- API Route: `/api/generate-ideas` (POST)

#### 구현 단계
1. `types/index.ts` -- `VideoIdea`, `IdeationRequest` 추가, `AppData`에 `videoIdeas: VideoIdea[]`
2. `lib/storage.ts` -- `getVideoIdeas()`, `addVideoIdeas()`, `updateVideoIdeaStatus()`
3. `src/app/api/generate-ideas/route.ts` -- Gemini API 호출
4. `src/components/IdeaCard.tsx` -- 개별 아이디어 카드
5. `src/app/ideation/page.tsx` -- 페이지 구현
6. `Sidebar.tsx` -- 메뉴 항목 추가

#### Gemini 프롬프트 예시
```
당신은 YouTube 음악 채널 전문가입니다.
채널 정보: {channelInfo}
BrandKit: {brandKit}
최근 업로드: {recentUploads}

이 채널에 적합한 다음 영상 아이디어 {count}개를 추천해주세요.
각 아이디어에 대해:
- 제목 (한국어, SEO 최적화)
- 설명 (2-3문장)
- 장르/분위기
- 추천 키워드 (5개)
- 추천 이유
```

---

### 5-5. Channel Planner 강화

#### 개요
현재 `/planner`는 설문 데이터를 저장만 하고 활용하지 않음. AI 기반 분석 결과 리포트 생성, BrandKit 자동 초안, 추천 업로드 전략을 출력하도록 강화.

#### 데이터 구조 (types/index.ts에 추가)
```typescript
interface PlannerReport {
  id: string;
  channelId: string;
  // AI 분석 결과
  summary: string;              // 채널 전략 요약
  targetAudienceAnalysis: string;
  contentStrategy: string;
  uploadScheduleRecommendation: string;
  monetizationPlan: string;
  competitorInsights: string;
  // 추천 BrandKit 초안
  suggestedBrandKit: Partial<BrandKit>;
  // 메타
  generatedAt: string;
}
```

#### UI 구현 위치
- 기존 `/planner` 페이지 하단에 "AI 분석 리포트 생성" 버튼 추가
- 리포트 표시: 섹션별 아코디언 (전략 요약, 타겟 분석, 콘텐츠 전략, ...)
- "이 리포트로 BrandKit 만들기" 원클릭 버튼

#### 필요한 API/외부 서비스
- Gemini API
- API Route: `/api/generate-planner-report` (POST)

#### 구현 단계
1. `types/index.ts` -- `PlannerReport` 추가
2. `lib/storage.ts` -- `savePlannerReport()`, `getPlannerReport()`
3. `src/app/api/generate-planner-report/route.ts` -- Gemini 호출
4. `src/components/PlannerReport.tsx` -- 리포트 표시 컴포넌트
5. `/planner/page.tsx` -- 리포트 생성 버튼 + 표시 영역 추가

---

## 6. MusePilot UI/UX 패턴 (디자인 시스템 참고)

### 레이아웃
- **좌측 사이드바**: 고정, 다크 배경(#0f0f0f), 섹션 그룹핑
- **상단 헤더**: 페이지 타이틀 + 브레드크럼
- **메인 콘텐츠**: 패딩 있는 영역, 카드 기반 레이아웃
- **채널 컨텍스트**: 사이드바에서 채널 선택 시 하위 메뉴 확장

### 컴포넌트 패턴
- **StatCard**: 아이콘 + 숫자 + 라벨 + 변화율(%)
- **DataTable**: 정렬, 필터, 페이지네이션
- **Modal**: 중앙 오버레이, 폼 입력
- **Tab Navigation**: 페이지 내 섹션 전환
- **Badge**: 상태 표시 (unused/ready/used/pending/published)
- **Chart**: Recharts 기반 AreaChart, BarChart

### 인터랙션 패턴
- **Inline Edit**: 테이블/카드에서 직접 편집
- **Drag & Drop**: 스케줄 정렬
- **Batch Actions**: 체크박스 선택 -> 일괄 처리
- **Toast Notifications**: 성공/에러 피드백
- **Loading States**: 스켈레톤 UI + pulse 애니메이션

### 색상 시스템 (이미 우리 CSS 변수와 매칭)
- 배경: #0a0a0a (primary), #111111 (secondary), #1a1a1a (card)
- 액센트: #e53e3e (빨강 계열)
- 텍스트: #ffffff (primary), #666666 (muted)
- 보더: #2a2a2a

---

## 7. 구현 로드맵 요약

### Phase 1-A (즉시 착수 -- 1-2일)
1. AI Lyrics Generation -- 가장 낮은 난이도, 높은 임팩트
2. BrandKit 기본 구조 -- 다른 기능의 기반

### Phase 1-B (1주 내)
3. Statistics 페이지 -- Recharts 차트 통합
4. Video Ideation -- Gemini 연동
5. Channel Planner 강화 -- 기존 코드 확장

### Phase 2 (2-4주)
6. Chat Channel Planner
7. Channel Audit
8. Competitor Analysis
9. SEO Analysis
10. Deep Insight
11. Video List

### Phase 3 (1-2개월, 외부 API 필요)
12. Production Studio (Suno API 직접 연동 필요)
13. Cover Generator (이미지 생성 API 필요)
14. Comment Management (YouTube API 필요)
15. AI Mastering (오디오 처리 라이브러리 필요)
16. Credit System (결제 시스템 전제)
