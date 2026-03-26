import { NextRequest, NextResponse } from 'next/server';
import type { CoverImageForm } from '@/types/cover-image';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function POST(req: NextRequest) {
  const { form, apiKey }: { form: CoverImageForm; apiKey: string } =
    await req.json();

  if (!apiKey) {
    return NextResponse.json({ error: 'API key required' }, { status: 400 });
  }

  const chips = [
    form.mood,
    form.color,
    form.concept,
    form.artStyle,
    form.lighting,
    form.timeSeason,
    form.textStyle,
    form.composition,
  ]
    .flat()
    .filter(Boolean)
    .join(', ');

  const prompt = `당신은 유튜브 썸네일 전문 디자이너입니다.

선택된 스타일: ${chips || '없음'}
자유 설명: ${form.freeDescription || '없음'}
이미지 비율: ${form.aspectRatio}

다음 3가지를 JSON으로 반환하세요:
{
  "claudeInstruction": "Claude.ai에 붙여넣을 작업지시서. 한국어로 상세하게. 선택한 스타일을 반영하여 어떤 이미지를 만들지 구체적으로 지시. Gemini Imagen 프롬프트도 포함해서 작성할 것.",
  "geminiPrompt": "Gemini Imagen에 직접 입력할 영어 프롬프트. 150자 내외. 선택한 스타일을 최적화된 영어로 변환. 비율 ${form.aspectRatio} 포함.",
  "conceptPreview": "이 이미지의 컨셉 설명. 한국어로 3~5문장. 어떤 느낌의 이미지가 생성될지 구체적으로 묘사."
}

JSON만 반환하고 다른 텍스트는 포함하지 마세요.`;

  try {
    const res = await fetch(
      `${GEMINI_BASE}/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, topP: 0.95 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      let errorMsg: string;
      if (res.status === 429) {
        errorMsg = 'API 사용량 초과. 잠시 후 다시 시도하거나 설정에서 API 키를 확인하세요.';
      } else if (res.status === 404) {
        errorMsg = 'AI 모델을 찾을 수 없습니다. 관리자에게 문의하세요.';
      } else {
        errorMsg = `Gemini API 오류 (코드: ${res.status})`;
      }
      return NextResponse.json({ error: errorMsg }, { status: res.status });
    }

    const data = await res.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'JSON 파싱 실패' }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
