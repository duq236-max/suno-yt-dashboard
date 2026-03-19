import { NextRequest, NextResponse } from 'next/server';

type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function buildLyricsPrompt(params: {
    genre: string;
    mood: string;
    theme: string;
    language: string;
    style: string;
    copyrightDefense: boolean;
}): string {
    const { genre, mood, theme, language, style, copyrightDefense } = params;
    const langGuide = language === 'ko' ? '한국어' : language === 'en' ? '영어' : '한국어+영어 혼용';
    const defenseNote = copyrightDefense
        ? `\n저작권 방어 필수: suno_style 필드에 반드시 "No Choir, No Background Vocals, No Musical Theater Style, Straight Voice" 를 포함하세요.`
        : '';
    return `당신은 Suno AI 전문 작사가입니다.
다음 조건으로 완성된 가사를 JSON 형식으로 생성해주세요.${defenseNote}

조건:
- 장르: ${genre}
- 분위기: ${mood}
- 주제/테마: ${theme || '자유'}
- 언어: ${langGuide}
- 스타일: ${style || '일반'}

가사 구조 규칙:
- [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Outro] 섹션 사용
- 각 섹션 레이블은 대괄호로 표기
- Suno AI에 최적화된 가사 (반복 후렴 강조, 멜로디에 맞는 음절)
- 전체 가사는 최소 16줄 이상

반드시 아래 JSON 형식만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "title": "(곡 제목)",
  "lyrics": "[Intro]\\n(인트로 가사)\\n\\n[Verse 1]\\n(1절 가사)\\n\\n[Chorus]\\n(후렴 가사)\\n\\n[Verse 2]\\n(2절 가사)\\n\\n[Bridge]\\n(브릿지 가사)\\n\\n[Outro]\\n(아웃트로 가사)",
  "mood_tags": ["(분위기 태그1)", "(태그2)", "(태그3)"],
  "suno_style": "(Suno style prompt: 장르·분위기·악기·BPM 영어 태그들)"
}`;
}

interface CreativityParams {
    temperature: number;
    topP: number;
    topK: number;
}

const DEFAULT_CREATIVITY: CreativityParams = { temperature: 0.7, topP: 0.9, topK: 30 };

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as {
            apiKey?: string;
            model?: string;
            genre?: string;
            mood?: string;
            theme?: string;
            language?: string;
            style?: string;
            copyrightDefense?: boolean;
            creativityParams?: Partial<CreativityParams>;
        };

        const {
            apiKey,
            model = 'flash',
            genre = 'Lo-fi',
            mood = '힐링',
            theme = '',
            language = 'ko',
            style = '',
            copyrightDefense = false,
            creativityParams,
        } = body;

        const creativity: CreativityParams = {
            temperature: creativityParams?.temperature ?? DEFAULT_CREATIVITY.temperature,
            topP: creativityParams?.topP ?? DEFAULT_CREATIVITY.topP,
            topK: creativityParams?.topK ?? DEFAULT_CREATIVITY.topK,
        };

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API 키가 필요합니다. 설정 페이지에서 Gemini API 키를 입력하세요.' },
                { status: 400 }
            );
        }

        const modelId: GeminiModel = model === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
        const prompt = buildLyricsPrompt({ genre, mood, theme, language, style, copyrightDefense });

        const res = await fetch(
            `${GEMINI_BASE}/${modelId}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: creativity.temperature, topK: creativity.topK, topP: creativity.topP },
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
        const jsonText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const parsed = JSON.parse(jsonText) as {
            title?: string;
            lyrics?: string;
            mood_tags?: string[];
            suno_style?: string;
        };

        return NextResponse.json({
            title: parsed.title ?? `${genre} — ${mood}`,
            lyrics: parsed.lyrics ?? '',
            mood_tags: Array.isArray(parsed.mood_tags) ? parsed.mood_tags : [mood],
            suno_style: parsed.suno_style ?? '',
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        const status = message.includes('API_KEY') || message.includes('401') ? 401 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
