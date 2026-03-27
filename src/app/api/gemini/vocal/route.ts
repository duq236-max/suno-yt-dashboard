import { NextRequest, NextResponse } from 'next/server';
import { vocalStyles } from '@/data/vocal-styles';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as {
            apiKey?: string;
            genre?: string;
            mood?: string;
        };

        const { apiKey, genre = '', mood = '' } = body;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API 키가 필요합니다.' },
                { status: 400 }
            );
        }

        const styleList = vocalStyles
            .map(v => `- id: "${v.id}", name: "${v.name}", description: "${v.description}", keywords: ${v.sunoKeywords.join(', ')}`)
            .join('\n');

        const prompt = `당신은 Suno AI 보컬 스타일 전문가입니다.
다음 장르와 분위기에 가장 잘 어울리는 보컬 스타일 하나를 추천해주세요.

장르: ${genre || '미지정'}
분위기: ${mood || '미지정'}

선택 가능한 보컬 스타일 목록:
${styleList}

반드시 아래 JSON 형식만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "id": "(추천 보컬 스타일 id)",
  "reason": "(추천 이유 한 문장, 한국어)"
}`;

        const res = await fetch(
            `${GEMINI_BASE}/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.4, topK: 20, topP: 0.85 },
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
        const parsed = JSON.parse(jsonText) as { id?: string; reason?: string };

        const matched = vocalStyles.find(v => v.id === parsed.id);
        if (!matched) {
            return NextResponse.json({ error: '추천 결과를 매칭할 수 없습니다.' }, { status: 422 });
        }

        return NextResponse.json({ id: matched.id, name: matched.name, reason: parsed.reason ?? '' });
    } catch (err) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
