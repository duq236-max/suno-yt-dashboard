import { NextRequest, NextResponse } from 'next/server';
import { type GeminiModel } from '@/lib/gemini';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface IdeaCard {
    title: string;         // 영상 제목 (한국어)
    concept: string;       // 영상 콘셉트 설명 (2-3문장)
    thumbnail_concept: string; // 썸네일 시각 요소 묘사
    suno_prompt: string;   // Suno AI 프롬프트 (영어)
    tags: string[];        // YouTube 해시태그 5개
    mood: string;          // 주 분위기 한 단어
    duration: string;      // 권장 영상 길이 (예: "1시간", "3시간")
}

export interface IdeationResult {
    ideas: IdeaCard[];
}

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

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as {
            apiKey?: string;
            model?: string;
            genre?: string;
            mood?: string;
            brandContext?: string;
            creativityParams?: { temperature: number; topP: number; topK: number };
        };

        const { apiKey, model, genre, mood, brandContext = '', creativityParams } = body;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API 키가 필요합니다. 설정 페이지에서 Gemini API 키를 입력하세요.' },
                { status: 400 }
            );
        }
        if (!genre || !mood) {
            return NextResponse.json(
                { error: '장르와 분위기는 필수입니다.' },
                { status: 400 }
            );
        }

        const modelId: GeminiModel = model === 'pro' ? 'gemini-3.1-flash-lite-preview' : 'gemini-3.1-flash-lite-preview';

        const generationConfig = creativityParams
            ? { temperature: creativityParams.temperature, topP: creativityParams.topP, topK: creativityParams.topK }
            : { temperature: 0.7, topP: 0.9, topK: 30 };

        const res = await fetch(
            `${GEMINI_BASE}/${modelId}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: buildIdeationPrompt(genre, mood, brandContext) }] }],
                    generationConfig,
                }),
            }
        );

        if (!res.ok) {
            const errData = await res.json().catch(() => ({})) as { error?: { message?: string } };
            const message = errData?.error?.message ?? `Gemini API 오류 (${res.status})`;
            const status = message.includes('API_KEY') || res.status === 401 ? 401 : 500;
            return NextResponse.json({ error: message }, { status });
        }

        const data = await res.json() as {
            candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
        };
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

        // 마크다운 코드블록 제거 후 JSON 파싱
        const jsonText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonText) as { ideas?: IdeaCard[] };

        return NextResponse.json({
            ideas: Array.isArray(parsed.ideas) ? parsed.ideas : [],
        } satisfies IdeationResult);

    } catch (err) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
