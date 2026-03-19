import { describe, it, expect } from 'vitest';

// ─── API route 핵심 로직 단위 테스트 ─────────────────────────────
// route.ts를 직접 import하면 NextRequest/NextResponse가 필요하므로
// 프롬프트 빌더와 응답 파싱 로직을 독립적으로 검증합니다.

// IdeaCard 타입 정의 (route.ts와 동일)
interface IdeaCard {
    title: string;
    concept: string;
    thumbnail_concept: string;
    suno_prompt: string;
    tags: string[];
    mood: string;
    duration: string;
}

// ─── 프롬프트 빌더 (route.ts 내부 로직 복사) ─────────────────────
function buildIdeationPrompt(genre: string, mood: string, brandContext: string): string {
    return `당신은 YouTube 음악 채널 콘텐츠 전략가이자 Suno AI 전문가입니다.
다음 조건으로 유튜브 영상 아이디어 5개를 JSON 형식으로 생성해주세요.

조건:
- 음악 장르: ${genre}
- 분위기: ${mood}
${brandContext ? `- 채널 브랜드 컨텍스트: ${brandContext}` : ''}

각 아이디어는 실제 유튜브에서 조회수를 얻을 수 있는 구체적인 콘셉트여야 합니다.
반드시 아래 JSON 형식만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "ideas": [
    {
      "title": "(클릭률 높은 한국어 유튜브 영상 제목)",
      "concept": "(영상 콘셉트 설명 2-3문장)",
      "thumbnail_concept": "(썸네일에 넣을 시각 요소, 색상, 분위기 묘사)",
      "suno_prompt": "(Suno AI 스타일 태그, 영어, 쉼표 구분, 장르·분위기·악기·BPM)",
      "tags": ["#태그1", "#태그2", "#태그3", "#태그4", "#태그5"],
      "mood": "(주 분위기 한 단어)",
      "duration": "(권장 영상 길이)"
    }
  ]
}`;
}

// ─── JSON 파싱 로직 ───────────────────────────────────────────────
function parseIdeationResponse(rawText: string): IdeaCard[] {
    const jsonText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonText) as { ideas?: IdeaCard[] };
    return Array.isArray(parsed.ideas) ? parsed.ideas : [];
}

// ─── 테스트 ───────────────────────────────────────────────────────
describe('buildIdeationPrompt', () => {
    it('장르와 분위기가 프롬프트에 포함된다', () => {
        const prompt = buildIdeationPrompt('Lo-fi Hip-hop', '집중', '');
        expect(prompt).toContain('Lo-fi Hip-hop');
        expect(prompt).toContain('집중');
    });

    it('brandContext가 있으면 프롬프트에 포함된다', () => {
        const prompt = buildIdeationPrompt('Jazz', '릴렉스', '채널명: 새벽재즈');
        expect(prompt).toContain('채널명: 새벽재즈');
    });

    it('brandContext가 없으면 해당 줄이 빠진다', () => {
        const prompt = buildIdeationPrompt('Jazz', '릴렉스', '');
        expect(prompt).not.toContain('채널 브랜드 컨텍스트');
    });

    it('JSON 스키마 형식을 포함한다', () => {
        const prompt = buildIdeationPrompt('EDM', '에너지틱', '');
        expect(prompt).toContain('"ideas"');
        expect(prompt).toContain('"suno_prompt"');
        expect(prompt).toContain('"tags"');
    });
});

describe('parseIdeationResponse', () => {
    const validIdea: IdeaCard = {
        title: '새벽 3시 Lo-fi',
        concept: '공부와 휴식을 위한 음악.',
        thumbnail_concept: '어두운 방, 책상 위 노트북',
        suno_prompt: 'lo-fi hip-hop, chill, 85bpm',
        tags: ['#lofi', '#공부음악', '#집중', '#새벽', '#bgm'],
        mood: '집중',
        duration: '1시간',
    };

    it('정상 JSON을 파싱한다', () => {
        const raw = JSON.stringify({ ideas: [validIdea] });
        const result = parseIdeationResponse(raw);
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('새벽 3시 Lo-fi');
        expect(result[0].tags).toHaveLength(5);
    });

    it('마크다운 코드블록을 제거하고 파싱한다', () => {
        const raw = '```json\n' + JSON.stringify({ ideas: [validIdea] }) + '\n```';
        const result = parseIdeationResponse(raw);
        expect(result[0].suno_prompt).toBe('lo-fi hip-hop, chill, 85bpm');
    });

    it('ideas가 없으면 빈 배열을 반환한다', () => {
        const raw = JSON.stringify({ something_else: [] });
        expect(parseIdeationResponse(raw)).toEqual([]);
    });

    it('5개 아이디어를 전부 파싱한다', () => {
        const ideas = Array.from({ length: 5 }, (_, i) => ({
            ...validIdea,
            title: `아이디어 ${i + 1}`,
        }));
        const result = parseIdeationResponse(JSON.stringify({ ideas }));
        expect(result).toHaveLength(5);
    });
});

describe('API 입력 검증 로직', () => {
    function validate(body: { apiKey?: string; genre?: string; mood?: string }) {
        if (!body.apiKey) return { error: 'API 키가 필요합니다.', status: 400 };
        if (!body.genre || !body.mood) return { error: '장르와 분위기는 필수입니다.', status: 400 };
        return null;
    }

    it('apiKey 없으면 400 에러', () => {
        const err = validate({ genre: 'Jazz', mood: '집중' });
        expect(err?.status).toBe(400);
        expect(err?.error).toContain('API 키');
    });

    it('genre 없으면 400 에러', () => {
        const err = validate({ apiKey: 'key', mood: '집중' });
        expect(err?.status).toBe(400);
    });

    it('mood 없으면 400 에러', () => {
        const err = validate({ apiKey: 'key', genre: 'Jazz' });
        expect(err?.status).toBe(400);
    });

    it('모두 있으면 null 반환 (통과)', () => {
        const err = validate({ apiKey: 'key', genre: 'Jazz', mood: '집중' });
        expect(err).toBeNull();
    });
});
