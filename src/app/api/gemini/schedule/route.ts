import { NextRequest, NextResponse } from 'next/server';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface ScheduleRecommendation {
    bestDay: string;
    bestTime: string;
    reason: string;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as {
            apiKey?: string;
            genre?: string;
            targetAudience?: string;
            channelName?: string;
        };

        const { apiKey, genre, targetAudience, channelName } = body;

        if (!apiKey) {
            return NextResponse.json({ error: '설정 페이지에서 Gemini API 키를 입력하세요.' }, { status: 400 });
        }

        const prompt = `당신은 YouTube 콘텐츠 전략 전문가입니다.
다음 채널 정보를 바탕으로 최적의 영상 업로드 시간을 추천해주세요.

채널 정보:
- 채널명: ${channelName || '미설정'}
- 주 장르: ${genre || '미설정'}
- 타겟 시청자: ${targetAudience || '미설정'}

YouTube 알고리즘, 시청자 활동 패턴, 장르별 특성을 고려하여 반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "bestDay": "(한국어로 최적 요일, 예: 목요일)",
  "bestTime": "(시간대, 예: 저녁 8~9시)",
  "reason": "(50자 이내 이유)"
}`;

        const res = await fetch(
            `${GEMINI_BASE}/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7, topK: 40, topP: 0.9 },
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
        const parsed = JSON.parse(jsonText) as Partial<ScheduleRecommendation>;

        return NextResponse.json({
            bestDay: parsed.bestDay ?? '목요일',
            bestTime: parsed.bestTime ?? '저녁 8~9시',
            reason: parsed.reason ?? 'AI 분석 결과입니다.',
        } satisfies ScheduleRecommendation);
    } catch (err) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        const status = message.includes('API_KEY') || message.includes('401') ? 401 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
