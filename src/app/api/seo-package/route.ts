import { NextRequest, NextResponse } from 'next/server';
import type { SeoForm, SeoOutput } from '@/types/seo-package';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL_ID = 'gemini-2.5-flash-preview-05-20';

function buildPrompt(form: SeoForm): string {
    return `당신은 유튜브 SEO 전문가입니다.
아래 조건을 분석하여 최적화된 SEO 패키지를 JSON으로 반환하세요.

조건:
${JSON.stringify(form, null, 2)}

반드시 아래 JSON 형식만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "seoScore": 숫자(0-100, 조건 풍부도 기반),
  "titleCandidates": ["제목1", "제목2", "제목3", "제목4", "제목5"],
  "mainKeywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "longTailKeywords": ["롱테일1", "롱테일2", "롱테일3", "롱테일4", "롱테일5"],
  "description": "유튜브 영상 설명문 (출력 언어 기준, 500자 내외, 해시태그 포함)",
  "tags": ["태그1", "태그2", ..., "태그30개"],
  "uploadTime": "타겟 지역·요일·시간대 기반 최적 업로드 시간 설명 (2-3문장)",
  "claudeInstruction": "Claude.ai에 붙여넣을 수 있는 작업지시서 (마크다운 형식, 콘텐츠 제작 지침 포함)"
}`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as {
            form: SeoForm;
            apiKey?: string;
        };

        const { form, apiKey } = body;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API 키가 필요합니다. 설정 페이지에서 Gemini API 키를 입력하세요.' },
                { status: 400 }
            );
        }

        const prompt = buildPrompt(form);

        const res = await fetch(
            `${GEMINI_BASE}/${MODEL_ID}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7, topP: 0.95, topK: 40 },
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

        const parsed = JSON.parse(jsonMatch[0]) as {
            seoScore?: number;
            titleCandidates?: string[];
            mainKeywords?: string[];
            longTailKeywords?: string[];
            description?: string;
            tags?: string[];
            uploadTime?: string;
            claudeInstruction?: string;
        };

        const output: SeoOutput = {
            seoScore: parsed.seoScore ?? 0,
            titles: parsed.titleCandidates ?? [],
            mainKeywords: parsed.mainKeywords ?? [],
            longTailKeywords: parsed.longTailKeywords ?? [],
            description: parsed.description ?? '',
            tags: parsed.tags ?? [],
            uploadTimes: [],
            claudeInstruction: parsed.claudeInstruction ?? '',
        };

        return NextResponse.json({ output, uploadTime: parsed.uploadTime ?? '' });
    } catch (err) {
        const message = err instanceof Error ? err.message : '서버 오류';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
