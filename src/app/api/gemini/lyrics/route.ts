import { NextRequest, NextResponse } from 'next/server';

type GeminiModel = 'gemini-3.1-flash-lite-preview';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function buildLyricsPrompt(params: {
    genre: string;
    mood: string;
    theme: string;
    language: string;
    style: string;
    copyrightDefense: boolean;
    vocalKeywords?: string;
    shortForm?: boolean;
}): string {
    const { genre, mood, theme, language, style, copyrightDefense, vocalKeywords, shortForm } = params;
    const langGuide =
        language === 'ko' ? '한국어' :
        language === 'en' ? '영어' :
        language === 'ja' ? '일본어 (ひらがな·カタカナ·漢字 혼용)' :
        language === 'zh' ? '중국어 간체 (普通話)' :
        '한국어+영어 혼용';
    const langInstructions =
        language === 'ja' ? '일본어 J-Pop 가사 형식, 자연스러운 일본어 시적 표현 사용' :
        language === 'zh' ? '중국어 C-Pop 가사 형식, 자연스러운 중국어 시적 표현 사용' :
        language === 'en' ? '영어 팝 가사 형식, 자연스러운 영어 시적 표현 사용' :
        language === 'ko' ? '한국어 K-Pop/K-Ballad 가사 형식, 자연스러운 한국어 시적 표현 사용' :
        '한국어와 영어를 자연스럽게 혼용, 후렴구는 영어 권장';
    const defenseNote = copyrightDefense
        ? `\n저작권 방어 필수: suno_style 및 suno_prompt 필드에 반드시 "No Choir, No Background Vocals, No Musical Theater Style, Straight Voice" 를 포함하세요.`
        : '';
    const vocalNote = vocalKeywords
        ? `\n- 보컬 스타일: ${vocalKeywords} (suno_prompt에 반드시 포함)`
        : '';
    const shortFormNote = shortForm
        ? '\n- 🎬 Shorts 모드: 정확히 4줄, 최대 60초 분량, 강렬한 훅으로 시작할 것 (Generate exactly 4 lines, max 60 seconds, start with a strong hook)'
        : '';
    const structureRule = shortForm
        ? `가사 구조 규칙 (Shorts 모드):
- [Hook] 섹션 하나만 사용
- 정확히 4줄, 각 줄은 짧고 강렬하게
- 첫 줄은 귀에 바로 꽂히는 강렬한 훅
- Suno AI 60초 Shorts에 최적화`
        : `가사 구조 규칙:
- [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Outro] 섹션 사용
- 각 섹션 레이블은 대괄호로 표기
- Suno AI에 최적화된 가사 (반복 후렴 강조, 멜로디에 맞는 음절)
- 전체 가사는 최소 16줄 이상`;
    return `당신은 Suno AI 전문 작사가 겸 프롬프트 엔지니어입니다.
다음 조건으로 완성된 가사와 Suno 전용 프롬프트를 JSON 형식으로 생성해주세요.${defenseNote}

조건:
- 장르: ${genre}
- 분위기: ${mood}
- 주제/테마: ${theme || '자유'}
- 언어: ${langGuide}
- 언어 가이드: ${langInstructions}
- 스타일: ${style || '일반'}${vocalNote}${shortFormNote}

${structureRule}

suno_prompt 규칙 (Suno 웹 UI 스타일 입력창에 그대로 붙여넣는 용도):
- 장르 태그 + 보컬 스타일 태그 + BPM 범위 + 악기 구성 + 분위기 태그를 영어 콤마 구분으로 나열
- BPM은 장르에 맞게 숫자 범위로 명시 (예: 80-90 BPM)
- 30단어 이내의 간결한 영어 태그 문자열

반드시 아래 JSON 형식만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "title": "(곡 제목)",
  "lyrics": "[Intro]\\n(인트로 가사)\\n\\n[Verse 1]\\n(1절 가사)\\n\\n[Chorus]\\n(후렴 가사)\\n\\n[Verse 2]\\n(2절 가사)\\n\\n[Bridge]\\n(브릿지 가사)\\n\\n[Outro]\\n(아웃트로 가사)",
  "mood_tags": ["(분위기 태그1)", "(태그2)", "(태그3)"],
  "suno_style": "(Suno style prompt: 장르·분위기·악기·BPM 영어 태그들)",
  "suno_prompt": "(완전한 Suno 전용 프롬프트: 장르+보컬스타일+BPM+악기+분위기 태그 30단어 이내 영어)"
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
            vocalKeywords?: string;
            creativityParams?: Partial<CreativityParams>;
            shortForm?: boolean;
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
            vocalKeywords = '',
            creativityParams,
            shortForm = false,
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

        const modelId: GeminiModel = model === 'pro' ? 'gemini-3.1-flash-lite-preview' : 'gemini-3.1-flash-lite-preview';
        const prompt = buildLyricsPrompt({ genre, mood, theme, language, style, copyrightDefense, vocalKeywords, shortForm });

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
            suno_prompt?: string;
        };

        return NextResponse.json({
            title: parsed.title ?? `${genre} — ${mood}`,
            lyrics: parsed.lyrics ?? '',
            mood_tags: Array.isArray(parsed.mood_tags) ? parsed.mood_tags : [mood],
            suno_style: parsed.suno_style ?? '',
            suno_prompt: parsed.suno_prompt ?? parsed.suno_style ?? '',
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        const status = message.includes('API_KEY') || message.includes('401') ? 401 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
