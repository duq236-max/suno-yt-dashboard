import { NextRequest, NextResponse } from 'next/server';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const MOOD_FLOW_LABELS: Record<string, string> = {
    upbeat_to_down: '업비트→다운비트 (에너지 하강)',
    down_to_up: '다운비트→업비트 (에너지 상승)',
    even: '균일한 에너지 유지',
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as {
            apiKey?: string;
            songCount?: number;
            bpmRange?: string;
            moodFlow?: string;
        };

        const { apiKey, songCount = 4, bpmRange = '80-120', moodFlow = 'even' } = body;

        if (!apiKey) {
            return NextResponse.json({ error: 'API 키가 필요합니다. 설정 페이지에서 입력하세요.' }, { status: 400 });
        }

        const moodLabel = MOOD_FLOW_LABELS[moodFlow] ?? moodFlow;

        const prompt = `당신은 음악 큐레이터이자 플레이리스트 전문가입니다.

다음 조건에 맞는 최적의 재생 순서 전략을 제안해주세요.

조건:
- 보유 곡 수: ${songCount}곡
- 주 BPM 범위: ${bpmRange} BPM
- 분위기 흐름: ${moodLabel}

아래 3가지 항목으로 구체적인 전략을 한국어로 작성하세요 (총 300자 이내):
1. 시작곡 선택 기준
2. 중간 흐름 유지 방법
3. 마무리곡 선택 기준`;

        const res = await fetch(
            `${GEMINI_BASE}/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.8, topK: 40, topP: 0.9, maxOutputTokens: 512 },
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
        const result = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

        return NextResponse.json({ result });
    } catch (err) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        const status = message.includes('API_KEY') || message.includes('401') ? 401 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
