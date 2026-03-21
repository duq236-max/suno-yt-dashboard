import { NextRequest, NextResponse } from 'next/server';
import type { MusicGeneratorForm, GeneratedSong } from '@/types/music-generator';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function buildPrompt(form: MusicGeneratorForm): string {
    const parts: string[] = [];

    if (form.genres.length > 0) parts.push(`장르: ${form.genres.join(', ')}`);
    if (form.moods.length > 0) parts.push(`분위기: ${form.moods.join(', ')}`);
    if (form.vocals.length > 0) parts.push(`보컬: ${form.vocals.join(', ')}`);
    if (form.usage.length > 0) parts.push(`용도: ${form.usage.join(', ')}`);
    if (form.instruments.length > 0) parts.push(`악기: ${form.instruments.join(', ')}`);
    if (form.bpm) parts.push(`BPM: ${form.bpm}`);
    if (form.targetAge) parts.push(`타겟 연령: ${form.targetAge}`);
    if (form.language) parts.push(`가사 언어: ${form.language}`);
    if (form.theme.length > 0) parts.push(`주제: ${form.theme.join(', ')}`);
    if (form.customRequest) parts.push(`추가 요청: ${form.customRequest}`);

    const lyricsNote = form.shortsMode
        ? '가사는 Shorts용으로 4줄 이내로 매우 짧게 작성하세요.'
        : '가사는 버스 1절 + 코러스 형태로 20~30줄로 작성하세요.';

    return `당신은 Suno AI 전문 음악 프롬프트 작성가입니다.
아래 조건으로 음악 10곡의 정보를 JSON으로 생성하세요.

조건:
${parts.length > 0 ? parts.join('\n') : '조건 없음 — 자유롭게 다양한 음악 스타일로 생성하세요.'}

${lyricsNote}

반드시 아래 JSON 형식만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "songs": [
    {
      "title": "(인상적인 곡 제목, 한국어 또는 영어)",
      "style": "(Suno AI 스타일 태그, 영어, 쉼표 구분, 장르·분위기·악기·BPM)",
      "lyrics": "(가사 전체)",
      "bpm": 120
    }
  ]
}`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as {
            form: MusicGeneratorForm;
            apiKey?: string;
        };

        const { form, apiKey } = body;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API 키가 필요합니다. 설정 페이지에서 Gemini API 키를 입력하세요.' },
                { status: 400 }
            );
        }

        const modelId = form.model === 'pro'
            ? 'gemini-2.5-pro-preview-05-06'
            : 'gemini-2.5-flash-preview-05-20';

        const prompt = buildPrompt(form);

        const res = await fetch(
            `${GEMINI_BASE}/${modelId}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.9, topP: 0.95, topK: 40 },
                }),
            }
        );

        if (!res.ok) {
            const err = await res.text();
            return NextResponse.json({ error: `Gemini API 오류: ${err}` }, { status: res.status });
        }

        const data = await res.json() as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
        };

        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({ error: 'JSON 파싱 실패' }, { status: 500 });
        }

        const parsed = JSON.parse(jsonMatch[0]) as { songs?: GeneratedSong[] };
        return NextResponse.json({ songs: parsed.songs ?? [] });
    } catch (err) {
        const message = err instanceof Error ? err.message : '서버 오류';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
