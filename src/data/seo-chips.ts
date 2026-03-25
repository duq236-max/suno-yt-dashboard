import type { SeoChipSection } from '@/types/seo-package';

export const SEO_CHIPS: SeoChipSection[] = [
  {
    id: 'targetAge',
    label: '타겟 연령대',
    mode: 'multi',
    chips: ['어린이(0-7)', '유아(8-12)', '청소년(13-17)', '10대 후반(18-20)', '20대 초반', '20대 후반', '30대', '40대', '50대', '60대+', '전 연령', '유튜브 일반'],
  },
  {
    id: 'language',
    label: '출력 언어',
    mode: 'single',
    chips: ['한국어', '영어', '일본어', '혼합(한/영)', '스페인어', '포르투갈어', '인도네시아어'],
  },
  {
    id: 'category',
    label: '채널 카테고리',
    mode: 'multi',
    chips: ['로파이', '팝', 'K-POP', '재즈', 'EDM', '클래식', '힙합', 'R&B', '인디', '사운드트랙', '엔터테인먼트', '교육', '게임', '테크', '뷰티', '요리', '스포츠', 'ASMR', '뉴스', '코미디', 'DIY', '패션', '브이로그', '애니/영화'],
  },
  {
    id: 'format',
    label: '콘텐츠 형식',
    mode: 'multi',
    chips: ['플레이리스트', 'Shorts', '뮤직비디오', '라이브', '믹스테이프', '컴필레이션', '앨범 하이라이트', '커버곡', '인터뷰/비하인드'],
  },
  {
    id: 'situation',
    label: '타겟 청취 상황',
    mode: 'multi',
    chips: ['공부할 때', '운동할 때', '드라이브', '수면', '카페', '집중', '파티', '감성 충전', '명상', '작업', '이별/감성', '아침 루틴', '요리/청소'],
  },
  {
    id: 'region',
    label: '타겟 지역',
    mode: 'single',
    chips: ['한국', '미국', '일본', '동남아', '유럽', '브라질', '전세계'],
  },
  {
    id: 'strategy',
    label: 'SEO 전략',
    mode: 'single',
    chips: ['조회수 최대화', '구독자 전환', '틈새시장 공략', '트렌드 편승', '장기 검색 유입'],
  },
];

// 지역 → UTC 오프셋 (KST 변환용)
export const REGION_UTC_OFFSET: Record<string, number> = {
  한국: 9,
  일본: 9,
  미국: -5,
  동남아: 7,
  유럽: 1,
  브라질: -3,
  전세계: 0,
};
