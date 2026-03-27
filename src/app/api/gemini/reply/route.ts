import { NextRequest, NextResponse } from 'next/server';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface ReplyResult {
  reply: string;
  generatedAt: string;
}

interface ReplyInput {
  comment: string;
  authorName: string;
  channelName: string;
  genre: string;
  moodKeywords: string[];
}

function buildReplyPrompt(input: ReplyInput): string {
  return `당신은 YouTube 음악 채널 "${input.channelName}" 의 운영자입니다.
장르: ${input.genre || '음악'}
무드 키워드: ${input.moodKeywords.join(', ') || '없음'}

시청자 "${input.authorName}"이(가) 다음 댓글을 남겼습니다:
"${input.comment}"

위 댓글에 채널 운영자로서 진심 어린 답글을 작성하세요.

규칙:
- 댓글과 같은 언어로 답글 작성 (한국어 댓글 → 한국어, 영어 댓글 → 영어)
- 2~3문장 이내, 따뜻하고 친근하게
- 채널의 장르/무드와 어울리는 톤 유지
- 이모지 1~2개 포함 가능
- 채널 홍보나 광고 문구 절대 포함 금지
- 반드시 아래 JSON 형식만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "reply": "(작성한 답글 텍스트)"
}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      apiKey?: string;
      model?: string;
      comment?: string;
      authorName?: string;
      channelName?: string;
      genre?: string;
      moodKeywords?: string[];
    };

    const {
      apiKey,
      model,
      comment = '',
      authorName = '시청자',
      channelName = '내 채널',
      genre = '음악',
      moodKeywords = [],
    } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 필요합니다. 설정 페이지에서 Gemini API 키를 입력하세요.' },
        { status: 400 }
      );
    }

    if (!comment.trim()) {
      return NextResponse.json({ error: '댓글 내용이 없습니다.' }, { status: 400 });
    }

    const modelId = model === 'pro' ? 'gemini-3.1-flash-lite-preview' : 'gemini-3.1-flash-lite-preview';
    const input: ReplyInput = { comment, authorName, channelName, genre, moodKeywords };

    const res = await fetch(
      `${GEMINI_BASE}/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildReplyPrompt(input) }] }],
          generationConfig: { temperature: 0.9, topK: 40, topP: 0.95 },
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
    const parsed = JSON.parse(jsonText) as { reply: string };

    return NextResponse.json({ reply: parsed.reply, generatedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
