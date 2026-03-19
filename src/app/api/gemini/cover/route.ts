import { NextRequest, NextResponse } from 'next/server';
import type { GeminiModel } from '@/lib/gemini';
import type { CoverResult } from '@/types';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function buildCoverPrompt(channelName: string, genre: string, keywords: string): string {
    return `당신은 YouTube 뮤직 채널 썸네일 디자이너이자 Stable Diffusion 프롬프트 전문가입니다.
다음 채널 정보를 바탕으로 썸네일/커버 이미지 생성을 위한 상세 정보를 JSON으로 반환하세요.

채널 정보:
- 채널명: ${channelName}
- 음악 장르: ${genre}
${keywords ? `- 키워드/분위기: ${keywords}` : ''}

아래 JSON 형식만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "title_suggestion": "(썸네일에 넣을 한국어 텍스트 제안, 10자 이내)",
  "sd_prompt": "(Stable Diffusion positive prompt, 영어, 쉼표 구분, 시각적 요소·스타일·분위기·조명·카메라앵글 포함, 80토큰 이내)",
  "negative_prompt": "(SD negative prompt, 영어, 피해야 할 요소, 30토큰 이내)",
  "composition": "(썸네일 구도 및 레이아웃 설명, 2-3문장, 한국어)",
  "color_palette": ["#색상1", "#색상2", "#색상3", "#색상4"],
  "design_tips": ["팁1", "팁2", "팁3"],
  "style_tags": ["스타일태그1", "스타일태그2", "스타일태그3", "스타일태그4", "스타일태그5"]
}`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as {
            apiKey?: string;
            model?: string;
            channelName?: string;
            genre?: string;
            keywords?: string;
            creativityParams?: { temperature: number; topP: number; topK: number };
        };

        const { apiKey, model, channelName, genre, keywords = '', creativityParams } = body;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API 키가 필요합니다. 설정 페이지에서 Gemini API 키를 입력하세요.' },
                { status: 400 }
            );
        }
        if (!channelName || !genre) {
            return NextResponse.json(
                { error: '채널명과 장르는 필수입니다.' },
                { status: 400 }
            );
        }

        const modelId: GeminiModel = model === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
        const generationConfig = creativityParams
            ? { temperature: creativityParams.temperature, topP: creativityParams.topP, topK: creativityParams.topK }
            : { temperature: 0.9, topK: 40, topP: 0.95 };

        const res = await fetch(
            `${GEMINI_BASE}/${modelId}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: buildCoverPrompt(channelName, genre, keywords) }] }],
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
        const parsed = JSON.parse(jsonText) as Partial<CoverResult>;

        const result: CoverResult = {
            title_suggestion: parsed.title_suggestion ?? '',
            sd_prompt: parsed.sd_prompt ?? '',
            negative_prompt: parsed.negative_prompt ?? '',
            composition: parsed.composition ?? '',
            color_palette: Array.isArray(parsed.color_palette) ? parsed.color_palette : [],
            design_tips: Array.isArray(parsed.design_tips) ? parsed.design_tips : [],
            style_tags: Array.isArray(parsed.style_tags) ? parsed.style_tags : [],
        };

        return NextResponse.json(result);

    } catch (err) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
