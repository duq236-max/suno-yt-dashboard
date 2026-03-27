// 서버사이드 전용 — 클라이언트에서 직접 import 금지
// Phase 2: apiKey 파라미터를 제거하고 Supabase에서 읽도록 교체 예정

export type GeminiModel = 'gemini-3.1-flash-lite-preview';

export interface GeminiGenerateParams {
    apiKey: string;
    model: GeminiModel;
    genre: string;
    mood: string;
    instruments: string;
    hasLyrics: boolean;
}

export interface GeminiGenerateResult {
    title: string;
    prompt: string;
    lyrics: string;
    mood_tags: string[];
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function buildPrompt(params: Omit<GeminiGenerateParams, 'apiKey' | 'model'>): string {
    const { genre, mood, instruments, hasLyrics } = params;
    return `당신은 Suno AI 음악 프롬프트 전문가입니다.
다음 조건으로 음악 정보를 JSON 형식으로 생성해주세요.

조건:
- 장르: ${genre}
- 분위기(Mood): ${mood}
- 악기: ${instruments || '제한 없음'}
- 가사 포함 여부: ${hasLyrics ? '예' : '아니오 (Instrumental)'}

반드시 아래 JSON 형식만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "title": "(한국어 곡 제목)",
  "prompt": "(Suno AI 스타일 태그, 영어로 쉼표 구분, 장르·분위기·악기·BPM 포함)",
  "lyrics": "(가사 포함이면 [Verse]\\n...\\n[Chorus]\\n... 형식, 미포함이면 빈 문자열)",
  "mood_tags": ["(분위기 키워드1)", "(키워드2)", "(키워드3)"]
}`;
}

export async function generateWithGemini(params: GeminiGenerateParams): Promise<GeminiGenerateResult> {
    const { apiKey, model, mood } = params;

    const res = await fetch(
        `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: buildPrompt(params) }] }],
                generationConfig: { temperature: 1.0, topK: 40, topP: 0.95 },
            }),
        }
    );

    if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(errData?.error?.message ?? `Gemini API 오류 (${res.status})`);
    }

    const data = await res.json() as {
        candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
    };
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // 마크다운 코드블록 제거 후 JSON 파싱
    const jsonText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(jsonText) as {
        title?: string;
        prompt?: string;
        lyrics?: string;
        mood_tags?: string[];
    };

    return {
        title: parsed.title ?? '',
        prompt: parsed.prompt ?? '',
        lyrics: parsed.lyrics ?? '',
        mood_tags: Array.isArray(parsed.mood_tags) ? parsed.mood_tags : [mood],
    };
}
