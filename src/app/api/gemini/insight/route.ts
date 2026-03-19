import { NextRequest, NextResponse } from 'next/server';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface InsightCard {
    title: string;       // 인사이트 제목
    description: string; // 설명
    type: 'time' | 'keyword' | 'content' | 'audience' | 'trend';
    icon: string;        // 이모지
    actionable: string;  // 구체적 실행 방안
}

export interface InsightResult {
    weeklyDirection: string;        // 이번 주 추천 콘텐츠 방향
    bestUploadTime: string;         // 최적 업로드 시간대
    trendKeywords: string[];        // 트렌드 키워드 5개
    cards: InsightCard[];           // 인사이트 카드 3~5개
    generatedAt: string;            // ISO 날짜
}

interface InsightInput {
    channelName: string;
    genre: string;
    targetAudience: string;
    uploadFrequency: string;
    moodKeywords: string[];
    subscriberCount: number;
    totalViews: number;
    avgEngagementRate: number;
}

function buildInsightPrompt(input: InsightInput): string {
    return `당신은 YouTube 음악 채널 성장 전략 전문가입니다.
아래 채널 정보와 통계를 분석하여 이번 주 콘텐츠 전략 인사이트를 JSON으로 반환하세요.

채널 정보:
- 채널명: ${input.channelName}
- 주요 장르: ${input.genre}
- 타겟 시청자: ${input.targetAudience}
- 업로드 빈도: ${input.uploadFrequency}
- 무드 키워드: ${input.moodKeywords.join(', ') || '미설정'}
- 구독자수: ${input.subscriberCount.toLocaleString()}명
- 총 조회수: ${input.totalViews.toLocaleString()}회
- 평균 참여율: ${input.avgEngagementRate.toFixed(2)}%

반드시 아래 JSON 형식만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "weeklyDirection": "(이번 주 추천 콘텐츠 방향, 한국어, 100자 이내, 구체적이고 실행 가능하게)",
  "bestUploadTime": "(최적 업로드 시간대 설명, 예: '화·목 저녁 9시~11시 (귀가 후 이완 시간대)', 60자 이내)",
  "trendKeywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "cards": [
    {
      "title": "(인사이트 제목, 20자 이내)",
      "description": "(인사이트 설명, 60자 이내)",
      "type": "time",
      "icon": "(관련 이모지 1개)",
      "actionable": "(실행 방안, 40자 이내)"
    },
    {
      "title": "...",
      "description": "...",
      "type": "keyword",
      "icon": "...",
      "actionable": "..."
    },
    {
      "title": "...",
      "description": "...",
      "type": "content",
      "icon": "...",
      "actionable": "..."
    },
    {
      "title": "...",
      "description": "...",
      "type": "audience",
      "icon": "...",
      "actionable": "..."
    },
    {
      "title": "...",
      "description": "...",
      "type": "trend",
      "icon": "...",
      "actionable": "..."
    }
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
            moodKeywords?: string[];
            subscriberCount?: number;
            totalViews?: number;
            avgEngagementRate?: number;
        };

        const {
            apiKey,
            model,
            channelName = '내 채널',
            genre = '미설정',
            targetAudience = '미설정',
            uploadFrequency = '미설정',
            moodKeywords = [],
            subscriberCount = 0,
            totalViews = 0,
            avgEngagementRate = 0,
        } = body;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API 키가 필요합니다. 설정 페이지에서 Gemini API 키를 입력하세요.' },
                { status: 400 }
            );
        }

        const modelId = model === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
        const input: InsightInput = {
            channelName,
            genre,
            targetAudience,
            uploadFrequency,
            moodKeywords,
            subscriberCount,
            totalViews,
            avgEngagementRate,
        };

        const res = await fetch(
            `${GEMINI_BASE}/${modelId}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: buildInsightPrompt(input) }] }],
                    generationConfig: { temperature: 0.8, topK: 40, topP: 0.95 },
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
        const parsed = JSON.parse(jsonText) as InsightResult;

        return NextResponse.json({ ...parsed, generatedAt: new Date().toISOString() });

    } catch (err) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
