import { NextRequest, NextResponse } from 'next/server';
import { generateWithGemini, type GeminiModel } from '@/lib/gemini';

const VALID_MODELS: GeminiModel[] = ['gemini-2.5-flash', 'gemini-2.5-pro'];

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as {
            apiKey?: string;
            model?: string;
            genre?: string;
            mood?: string;
            instruments?: string;
            hasLyrics?: boolean;
        };

        const { apiKey, model, genre, mood, instruments = '', hasLyrics = true } = body;

        if (!apiKey) {
            return NextResponse.json({ error: 'API 키가 필요합니다. 설정 페이지에서 Gemini API 키를 입력하세요.' }, { status: 400 });
        }
        if (!genre || !mood) {
            return NextResponse.json({ error: '장르와 분위기는 필수입니다.' }, { status: 400 });
        }

        // 'flash' | 'pro' 단축어 → 실제 모델 ID로 변환
        const modelId: GeminiModel = model === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
        if (!VALID_MODELS.includes(modelId)) {
            return NextResponse.json({ error: '유효하지 않은 모델입니다.' }, { status: 400 });
        }

        const result = await generateWithGemini({
            apiKey,
            model: modelId,
            genre,
            mood,
            instruments,
            hasLyrics,
        });

        return NextResponse.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        // Gemini API 키 오류 구분
        const status = message.includes('API_KEY') || message.includes('401') ? 401 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
