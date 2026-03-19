export interface VocalStyle {
  id: string;
  name: string;
  description: string;
  sunoKeywords: string[];
  genre: string;
  gender: 'male' | 'female' | 'neutral';
}

export const vocalStyles: VocalStyle[] = [
  {
    id: 'jpop-idol-female',
    name: '일본 감성 귀여운 여자',
    description: '일본 아이돌 특유의 가볍고 청아한 보컬',
    sunoKeywords: ['J-pop idol', 'soft breathy', 'airy falsetto', 'cute female vocals', 'kawaii'],
    genre: 'J-Pop',
    gender: 'female',
  },
  {
    id: 'dark-hiphop-male',
    name: '다크 힙합 흑인 남자',
    description: '애틀란타 스타일의 묵직하고 거친 힙합 보컬',
    sunoKeywords: ['Deep raspy', 'trap flow', 'Atlanta style', 'dark male vocals', 'aggressive delivery'],
    genre: 'Trap / Hip-Hop',
    gender: 'male',
  },
  {
    id: 'korean-ballad-male',
    name: '한국 감성 발라드 남자',
    description: '비브라토 없는 직선적이고 감성적인 한국 발라드 보컬',
    sunoKeywords: ['Straight Voice', 'No Vibrato', 'Grand Piano', 'Korean ballad', 'emotional male vocal'],
    genre: 'K-Ballad',
    gender: 'male',
  },
  {
    id: 'dark-kpop-female',
    name: '다크 K-pop 여자',
    description: '강렬한 신스와 함께하는 파워풀한 K-pop 여성 보컬',
    sunoKeywords: ['Intense', 'Synth-heavy', 'Powerful belt', 'dark K-pop', 'fierce female'],
    genre: 'K-Pop',
    gender: 'female',
  },
  {
    id: 'neosoul-rnb-male',
    name: 'Neo-Soul R&B 남자',
    description: '허스키하고 몽환적인 네오소울 팔세토 남성 보컬',
    sunoKeywords: ['Husky', 'Dreamy Synth', 'Soulful falsetto', 'neo-soul', 'R&B male'],
    genre: 'Neo-Soul / R&B',
    gender: 'male',
  },
  {
    id: 'lofi-dreamy-female',
    name: '몽환적 Lo-Fi 여자',
    description: '카세트 질감의 베드룸팝 속삭임 여성 보컬',
    sunoKeywords: ['Whisper-soft', 'cassette warmth', 'bedroom pop', 'lo-fi female', 'intimate'],
    genre: 'Lo-Fi / Bedroom Pop',
    gender: 'female',
  },
  {
    id: 'boombap-soul-male',
    name: '붐뱁 소울 남자',
    description: 'NY 언더그라운드 90s 그랜드 피아노 붐뱁 보컬',
    sunoKeywords: ['Raspy', 'Grand Piano', 'NY underground 90s', 'boom bap', 'soulful rap'],
    genre: 'Boom Bap / Soul Hip-Hop',
    gender: 'male',
  },
  {
    id: 'cinematic-epic-female',
    name: '시네마틱 웅장 여자',
    description: '영화 스코어급 소프라노 무드의 웅장한 여성 보컬',
    sunoKeywords: ['Soprano', 'wordless vocals', 'film score', 'epic', 'cinematic female'],
    genre: 'Cinematic / Orchestral',
    gender: 'female',
  },
];

export default vocalStyles;
