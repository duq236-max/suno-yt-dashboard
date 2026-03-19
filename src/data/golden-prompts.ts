export interface GoldenPrompt {
  id: string;
  title: string;
  sunoPrompt: string;
  bpm: number | null;
  language: 'korean' | 'english' | 'japanese' | 'any';
  resultTitle: string;
  notes: string;
}

export const goldenPrompts: GoldenPrompt[] = [
  {
    id: 'boombap-soul-grandpiano',
    title: '붐뱁 소울 힙합',
    sunoPrompt:
      'boom bap soul hip hop, grand piano, raspy male voice, sentimental, 100 bpm',
    bpm: 100,
    language: 'english',
    resultTitle: 'Sentimental Boom Bap Soul',
    notes:
      '✅ 저작권 방어 팁: Grand Piano + Raspy 조합은 고유 사운드를 만들어 유사 트랙 구분에 유리. No Choir + No Background Vocals 키워드 불필요 — 솔로 랩 장르 특성상 합창 없이 생성됨.',
  },
  {
    id: 'dark-kpop-female-synth',
    title: '다크 K-pop 여자',
    sunoPrompt:
      'Dark K-pop, Intense, Female Vocals, Synth-heavy, Energetic, BPM: 105',
    bpm: 105,
    language: 'korean',
    resultTitle: 'Dark Synth K-Pop Banger',
    notes:
      '✅ 저작권 방어 팁: "Intense + Synth-heavy" 조합이 특정 아이돌 스타일과 차별화. No Choir + No Background Vocals 명시 권장 — K-pop은 합창 레이어 자동 추가 경향이 있어 단독 보컬 명시 필요.',
  },
  {
    id: 'korean-ballad-straight-voice',
    title: '한국 모던 발라드',
    sunoPrompt:
      'Modern Korean Ballad, Male Solo Vocal, No Choir, No Background Vocals, No Musical Theater Style, Straight Voice, Grand Piano',
    bpm: null,
    language: 'korean',
    resultTitle: 'Modern Korean Ballad Solo',
    notes:
      '🛡️ 핵심 저작권 방어 조합: "No Choir + No Background Vocals" — 이 두 키워드를 함께 쓰면 Suno가 합창 레이어를 추가하지 않아 유사 아이돌 곡과 명확히 구분됨. "Straight Voice + No Vibrato"는 특정 가수 창법 모방 회피에 효과적.',
  },
  {
    id: 'neosoul-rnb-husky',
    title: 'Neo-Soul R&B 허스키',
    sunoPrompt:
      'Neo-Soul R&B, Romantic Ballad, Husky Male Vocals, Dreamy Synth, Smooth falsetto breaks',
    bpm: null,
    language: 'english',
    resultTitle: 'Neo-Soul Romantic Ballad',
    notes:
      '✅ 저작권 방어 팁: "Husky + Dreamy Synth" 조합이 D\'Angelo·Frank Ocean 유사 경고를 낮춤. Falsetto breaks 명시로 멜로디 자연스러운 변화 유도. No Choir 불필요 — Soul 장르 특성상 단독 구성.',
  },
  {
    id: 'kpop-ballad-female-piano',
    title: 'K-pop 감성 발라드 여자',
    sunoPrompt:
      'K-pop, romantic ballad, female vocal, grand piano, emotional, 95 BPM, sentimental',
    bpm: 95,
    language: 'korean',
    resultTitle: 'Romantic K-Pop Piano Ballad',
    notes:
      '✅ 저작권 방어 팁: "Grand Piano + emotional" 조합은 특정 기획사 사운드 회피에 유리. BPM 95 명시로 곡 구조 고정 — 저작권 분쟁 시 창작 의도 입증에 활용 가능. No Background Vocals 추가 권장.',
  },
  {
    id: 'sophisticated-ballad-male-deep',
    title: '세련된 모던 발라드 남자',
    sunoPrompt:
      'Sophisticated Modern Ballad, Male Solo, Deep and Solid Vocal, No Vibrato, Straight Voice, Airy but Firm',
    bpm: null,
    language: 'korean',
    resultTitle: 'Sophisticated Modern Male Ballad',
    notes:
      '🛡️ 핵심 저작권 방어 조합: "No Vibrato + Straight Voice" — 비브라토 없는 직선적 창법 명시로 특정 유명 남성 발라드 가수 창법 모방 회피. "Airy but Firm"은 독자적 보컬 질감 정의. Male Solo 명시로 No Choir 효과 내포.',
  },
];

export default goldenPrompts;
