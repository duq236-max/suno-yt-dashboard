import { NextRequest, NextResponse } from 'next/server';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface ContentCalendarItem {
    week: string;          // 예: "1주차"
    theme: string;         // 콘텐츠 테마
    titles: string[];      // 영상 제목 후보 2개
    hashtags: string[];    // 추천 해시태그
}

export interface PlannerReport {
    targetPositioning: string;          // 타겟 포지셔닝 (2~3문장)
    differentiationPoints: string[];    // 경쟁 차별화 포인트 3가지
    contentCalendar: ContentCalendarItem[]; // 4주 콘텐츠 캘린더
    growthStrategy: string;             // 성장 전략 요약
    urgentActions: string[];            // 즉시 실행 필요 액션 3가지
}

interface PlannerInput {
    channelName: string;
    genre: string;
    targetAudience: string;
    uploadFrequency: string;
    concept: string;
    youtubeName: string;
}

function buildPlannerPrompt(input: PlannerInput): string {
    return `당신은 유튜브 음악 채널 전략 컨설턴트입니다.
아래 채널 기획 정보를 바탕으로 채널 전략 리포트를 JSON으로 작성하세요.

채널 기획 정보:
- 채널명: ${input.channelName}
- 유튜브 채널: ${input.youtubeName || '미설정'}
- 주요 장르: ${input.genre}
- 타겟 시청자: ${input.targetAudience}
- 업로드 빈도: ${input.uploadFrequency}
- 채널 콘셉트: ${input.concept || '미설정'}

반드시 아래 JSON 형식만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "targetPositioning": "(타겟 포지셔닝 설명, 한국어, 150자 이내, 채널의 독자적 위치와 강점 포함)",
  "differentiationPoints": [
    "(차별화 포인트 1, 50자 이내)",
    "(차별화 포인트 2, 50자 이내)",
    "(차별화 포인트 3, 50자 이내)"
  ],
  "contentCalendar": [
    {
      "week": "1주차",
      "theme": "(콘텐츠 테마, 20자 이내)",
      "titles": ["(영상 제목 후보1, 30자 이내)", "(영상 제목 후보2, 30자 이내)"],
      "hashtags": ["#태그1", "#태그2", "#태그3"]
    },
    {
      "week": "2주차",
      "theme": "...",
      "titles": ["...", "..."],
      "hashtags": ["...", "...", "..."]
    },
    {
      "week": "3주차",
      "theme": "...",
      "titles": ["...", "..."],
      "hashtags": ["...", "...", "..."]
    },
    {
      "week": "4주차",
      "theme": "...",
      "titles": ["...", "..."],
      "hashtags": ["...", "...", "..."]
    }
  ],
  "growthStrategy": "(성장 전략 요약, 한국어, 120자 이내, 3개월 목표 포함)",
  "urgentActions": [
    "(즉시 실행 액션 1, 50자 이내)",
    "(즉시 실행 액션 2, 50자 이내)",
    "(즉시 실행 액션 3, 50자 이내)"
  ]
}`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as {
            apiKey?: string;
            model?: string;
            channelName?: string;
            genre?: string;
            targetAudience?: string;
            uploadFrequency?: string;
            concept?: string;
            youtubeName?: string;
            creativityParams?: { temperature: number; topP: number; topK: number };
        };

        const {
            apiKey,
            model,
            channelName = '내 채널',
            genre = '미설정',
            targetAudience = '미설정',
            uploadFrequency = '미설정',
            concept = '',
            youtubeName = '',
            creativityParams,
        } = body;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API 키가 필요합니다. 설정 페이지에서 Gemini API 키를 입력하세요.' },
                { status: 400 }
            );
        }

        const modelId = model === 'pro' ? 'gemini-3.1-flash-lite-preview' : 'gemini-3.1-flash-lite-preview';
        const input: PlannerInput = { channelName, genre, targetAudience, uploadFrequency, concept, youtubeName };
        const generationConfig = creativityParams
            ? { temperature: creativityParams.temperature, topP: creativityParams.topP, topK: creativityParams.topK }
            : { temperature: 0.8, topK: 40, topP: 0.95 };

        const res = await fetch(
            `${GEMINI_BASE}/${modelId}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: buildPlannerPrompt(input) }] }],
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
        const jsonText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonText) as PlannerReport;

        return NextResponse.json(parsed);

    } catch (err) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
