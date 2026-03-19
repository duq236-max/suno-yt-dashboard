# 컴포넌트 인벤토리

> 현재 존재하는 컴포넌트와 앞으로 만들어야 할 컴포넌트 전체 목록.
> 새 컴포넌트 작업 전에 반드시 확인할 것 — 중복 작업 방지.

---

## ✅ 현재 존재하는 컴포넌트

### `src/components/Header.tsx`
```
props: title: string, subtitle?: string
용도:  각 페이지 상단 헤더 (타이틀 + 부제목)
사용:  모든 페이지에서 <Header title="대시보드" />
```

### `src/components/Sidebar.tsx`
```
props: 없음 (usePathname으로 활성 경로 감지)
용도:  좌측 네비게이션
항목:  대시보드, 스크랩시트, 채널기획, 스케줄 알림, 설정
상태:  'SOON' 배지 — 자동 주입(B안), 라이브 스트리밍
```

---

## 🔴 인라인 JSX → 컴포넌트화 필요 (Phase 1 우선)

현재 page.tsx 파일 안에 인라인으로 반복 사용 중인 패턴들.
컴포넌트화하면 재사용성 + 토큰 효율 모두 향상.

### `StatCard` (우선순위: 높음)
```
현재 위치: /dashboard/page.tsx — statCards.map() 인라인
props 설계:
  label: string
  value: string | number
  icon: string          (이모지)
  change?: string       (하단 보조 텍스트)
  positive?: boolean    (초록색 강조)
  href?: string         (클릭 시 이동)
사용 예정: /dashboard, 향후 analytics 페이지
CSS: .stat-card .stat-card-top .stat-card-value (이미 globals.css에 있음)
```

### `EmptyState` (우선순위: 중간)
```
현재 위치: 여러 페이지에 반복 — 시트 없음, 채널 없음 등
props 설계:
  icon: string          (이모지)
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  href?: string
CSS: .empty-state .empty-state-icon .empty-state-title (이미 있음)
```

### `Modal` (우선순위: 높음)
```
현재 위치: /dashboard/page.tsx — YouTube 채널 연결 모달 인라인
props 설계:
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
CSS: .modal-overlay .modal .modal-header .modal-footer (이미 있음)
```

### `StatusBadge` (우선순위: 중간)
```
현재 위치: /scrapsheet/[id]/page.tsx — 인라인 or 직접 클래스
props 설계:
  status: 'unused' | 'ready' | 'used'
  label?: string        (기본값: 한국어 상태명)
CSS: .status-badge .unused .ready .used (이미 있음)
```

---

## ❌ 아직 없는 컴포넌트 (새로 만들어야 함)

### Phase 1 — 기능 구현용

#### `GeminiPromptGenerator`
```
용도:  Gemini API 호출 → Suno 프롬프트 자동 생성
위치:  /scrapsheet/[id] 또는 새 시트 생성 모달
입력:  genre, mood, targetAudience, keywords
출력:  생성된 prompt 문자열 (ScrapItem.prompt에 채움)
의존:  src/lib/gemini.ts (신규 생성 필요)
```

#### `BatchInjectControl`
```
용도:  스크랩시트의 여러 아이템을 Extension으로 일괄 전송
위치:  /scrapsheet/[id] 페이지
기능:  선택 → 순서 지정 → 자동 주입 시작/중지
의존:  Chrome Extension INJECT_ITEM 메시지
```

#### `SchedulerCard`
```
용도:  스케줄 설정 + 다음 실행 시간 표시
위치:  /schedule 페이지 리디자인
기능:  빈도 선택, 시간 선택, 이메일 알림 토글
```

### Phase 2 — UI 매칭용

#### `AreaChart`
```
용도:  조회수/시청시간 추이 그래프
라이브러리: Recharts
위치:  /dashboard (YouTube 통계 섹션)
데이터: YoutubeChannel.totalViews 시계열
```

#### `BarChart`
```
용도:  장르별 프롬프트 현황
라이브러리: Recharts
위치:  /dashboard
```

#### `DataTable`
```
용도:  스크랩 아이템 목록 (현재 커스텀 div → 표준 테이블)
위치:  /scrapsheet/[id]
기능:  정렬, 필터, 페이지네이션
CSS:  .table-wrapper table (이미 있음)
```

#### `UserAvatar`
```
용도:  Header 우측 사용자 아바타 + 이름 (현재 하드코딩)
위치:  Header.tsx 내부
Phase: NextAuth 연동 후 구현
```

---

## 컴포넌트 파일 위치 규칙

```
src/components/           ← 여러 페이지에서 재사용되는 컴포넌트
src/app/[route]/_components/  ← 해당 라우트에서만 쓰이는 컴포넌트
```

## 새 컴포넌트 작성 전 체크리스트

- [ ] globals.css에 이미 필요한 CSS 클래스가 있는지 확인
- [ ] 비슷한 인라인 JSX가 기존 page.tsx에 있는지 확인 → 추출
- [ ] `'use client'` 가 필요한지 판단 (이벤트 핸들러/useState 있으면 필요)
- [ ] props 타입을 `src/types/index.ts`에 추가할지 판단
