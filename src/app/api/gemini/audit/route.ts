import { NextRequest, NextResponse } from 'next/server';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface AuditSuggestion {
    title: string;       // 개선 제안 제목
    description: string; // 구체적인 행동 방안
    priority: 'high' | 'medium' | 'low';
}

export interface AuditResult {
    score: number;           // 0~100
    grade: string;           // A+/A/B/C/D
    summary: string;         // 한 줄 요약
    suggestions: AuditSuggestion[]; // TOP 3 개선 제안
}

interface ChannelStats {
    channelName: string;
    subscriberCount: number;
    totalViews: number;
    videoCount: number;
    avgEngagementRate: number; // (likes+comments)/views * 100
}

function buildAuditPrompt(stats: ChannelStats): string {
    return `당신은 YouTube 채널 전략 컨설턴트입니다.
아래 채널 통계를 분석하여 채널 건강도 점수와 개선 제안을 JSON으로 반환하세요.

채널 통계:
- 채널명: ${stats.channelName}
- 구독자수: ${stats.subscriberCount.toLocaleString()}명
- 총 조회수: ${stats.totalViews.toLocaleString()}회
- 업로드 영상수: ${stats.videoCount}개
- 평균 참여율: ${stats.avgEngagementRate.toFixed(2)}%

채널 건강도 점수 기준:
- 구독자 대비 조회수 비율
- 참여율 (업계 평균: 2~5%)
- 업로드 수 (콘텐츠 볼륨)
- 종합 성장 가능성

반드시 아래 JSON 형식만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "score": (0~100 정수),
  "grade": "(A+/A/B+/B/C+/C/D)",
  "summary": "(채널 현황 한 줄 요약, 한국어, 50자 이내)",
  "suggestions": [
    {
      "title": "(개선 제안 제목, 한국어, 20자 이내)",
      "description": "(구체적 실행 방안, 한국어, 60자 이내)",
      "priority": "high"
    },
    {
      "title": "...",
      "description": "...",
      "priority": "medium"
    },
    {
      "title": "...",
      "description": "...",
      "priority": "low"
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
            subscriberCount?: number;
            totalViews?: number;
            videoCount?: number;
            avgEngagementRate?: number;
        };

        const {
            apiKey,
            model,
            channelName = '알 수 없음',
            subscriberCount = 0,
            totalViews = 0,
            videoCount = 0,
            avgEngagementRate = 0,
        } = body;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API 키가 필요합니다. 설정 페이지에서 Gemini API 키를 입력하세요.' },
                { status: 400 }
            );
        }

        const modelId = model === 'pro' ? 'gemini-3.1-flash-lite-preview' : 'gemini-3.1-flash-lite-preview';
        const stats: ChannelStats = { channelName, subscriberCount, totalViews, videoCount, avgEngagementRate };

        const res = await fetch(
            `${GEMINI_BASE}/${modelId}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: buildAuditPrompt(stats) }] }],
                    generationConfig: { temperature: 0.7, topK: 40, topP: 0.95 },
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
        const parsed = JSON.parse(jsonText) as AuditResult;

        return NextResponse.json(parsed);

    } catch (err) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
