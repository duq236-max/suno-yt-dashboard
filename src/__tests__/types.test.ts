import { describe, it, expect } from 'vitest';
import type { ScrapItem, ScrapSheet, BrandKit, LyricsHistoryItem } from '@/types';

// ─── 타입 형태 검증 (런타임 객체 구조 테스트) ─────────────────────

describe('ScrapItem 구조', () => {
    it('필수 필드를 가진 ScrapItem을 생성할 수 있다', () => {
        const item: ScrapItem = {
            id: 'test-id',
            prompt: 'lo-fi hip-hop, chill',
            lyrics: '',
            title: '테스트 곡',
            genre: 'Lo-fi',
            status: 'unused',
            createdAt: new Date().toISOString(),
        };
        expect(item.status).toBe('unused');
        expect(item.lyrics).toBe('');
    });

    it('ScrapStatus는 3가지 값만 가능하다', () => {
        const statuses = ['unused', 'ready', 'used'] as const;
        statuses.forEach(s => {
            const item: ScrapItem = {
                id: s,
                prompt: '',
                lyrics: '',
                title: '',
                genre: '',
                status: s,
                createdAt: '',
            };
            expect(item.status).toBe(s);
        });
    });
});

describe('ScrapSheet 구조', () => {
    it('items 배열을 포함한다', () => {
        const sheet: ScrapSheet = {
            id: 'sheet-1',
            name: '테스트 시트',
            items: [],
            createdAt: new Date().toISOString(),
        };
        expect(Array.isArray(sheet.items)).toBe(true);
    });
});

describe('BrandKit 구조', () => {
    it('모든 필드를 포함한다', () => {
        const kit: BrandKit = {
            channelName: '새벽 Lo-fi',
            tagline: '집중을 위한 음악',
            primaryGenre: 'Lo-fi Hip-hop',
            subGenres: ['Chillhop'],
            targetAudience: '공부',
            moodKeywords: ['집중', '새벽'],
            avoidKeywords: [],
            promptTemplate: 'lo-fi, chill',
            updatedAt: new Date().toISOString(),
        };
        expect(kit.subGenres).toHaveLength(1);
        expect(kit.moodKeywords).toHaveLength(2);
        expect(kit.avoidKeywords).toHaveLength(0);
    });
});

describe('LyricsHistoryItem 구조', () => {
    it('language 필드는 ko/en/mixed 중 하나이다', () => {
        const languages: LyricsHistoryItem['language'][] = ['ko', 'en', 'mixed'];
        languages.forEach(lang => {
            const item: LyricsHistoryItem = {
                id: lang,
                title: '',
                genre: '',
                mood: '',
                theme: '',
                language: lang,
                style: '',
                lyrics: '',
                model: 'flash',
                createdAt: '',
            };
            expect(item.language).toBe(lang);
        });
    });

    it('model 필드는 flash/pro 중 하나이다', () => {
        const models: LyricsHistoryItem['model'][] = ['flash', 'pro'];
        models.forEach(m => {
            const item: LyricsHistoryItem = {
                id: m,
                title: '',
                genre: '',
                mood: '',
                theme: '',
                language: 'ko',
                style: '',
                lyrics: '',
                model: m,
                createdAt: '',
            };
            expect(item.model).toBe(m);
        });
    });
});
