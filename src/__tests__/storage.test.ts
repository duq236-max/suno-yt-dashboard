import { describe, it, expect, beforeEach } from 'vitest';
import {
    generateId,
    formatDate,
    formatNumber,
    loadData,
    saveData,
    updateGeminiApiKey,
    getBrandKit,
    saveBrandKit,
    addLyricsHistory,
    loadLyricsHistory,
    deleteLyricsHistory,
} from '@/lib/storage';
import type { BrandKit, LyricsHistoryItem } from '@/types';

beforeEach(() => {
    localStorage.clear();
});

// ─── generateId ──────────────────────────────────────
describe('generateId', () => {
    it('고유한 ID를 반환한다', () => {
        const ids = Array.from({ length: 100 }, () => generateId());
        const unique = new Set(ids);
        expect(unique.size).toBe(100);
    });

    it('문자열을 반환한다', () => {
        expect(typeof generateId()).toBe('string');
    });

    it('비어있지 않다', () => {
        expect(generateId().length).toBeGreaterThan(0);
    });
});

// ─── formatNumber ─────────────────────────────────────
describe('formatNumber', () => {
    it('1만 이상은 X만 형식', () => {
        expect(formatNumber(10000)).toBe('1.0만');
        expect(formatNumber(25000)).toBe('2.5만');
    });

    it('1000 이상은 XK 형식', () => {
        expect(formatNumber(1000)).toBe('1.0K');
        expect(formatNumber(1500)).toBe('1.5K');
    });

    it('1000 미만은 그대로', () => {
        expect(formatNumber(0)).toBe('0');
        expect(formatNumber(999)).toBe('999');
    });
});

// ─── formatDate ───────────────────────────────────────
describe('formatDate', () => {
    it('ISO 날짜 문자열을 한국어 날짜로 변환한다', () => {
        const result = formatDate('2026-03-17T00:00:00.000Z');
        expect(result).toMatch(/2026/);
    });
});

// ─── loadData / saveData ──────────────────────────────
describe('loadData', () => {
    it('localStorage가 비어있으면 기본값을 반환한다', () => {
        const data = loadData();
        expect(data.channel).toBeNull();
        expect(data.sheets).toEqual([]);
        expect(data.geminiApiKey).toBe('');
        expect(data.brandKit).toBeNull();
    });

    it('저장한 데이터를 그대로 읽어온다', () => {
        const data = loadData();
        saveData({ ...data, geminiApiKey: 'test-key-123' });
        expect(loadData().geminiApiKey).toBe('test-key-123');
    });

    it('잘못된 JSON은 기본값을 반환한다', () => {
        localStorage.setItem('suno-yt-data', 'not-json{{');
        const data = loadData();
        expect(data.channel).toBeNull();
    });
});

// ─── updateGeminiApiKey ───────────────────────────────
describe('updateGeminiApiKey', () => {
    it('geminiApiKey를 업데이트한다', () => {
        updateGeminiApiKey('my-gemini-key');
        expect(loadData().geminiApiKey).toBe('my-gemini-key');
    });

    it('빈 문자열로 업데이트된다', () => {
        updateGeminiApiKey('key');
        updateGeminiApiKey('');
        expect(loadData().geminiApiKey).toBe('');
    });
});

// ─── BrandKit ─────────────────────────────────────────
describe('BrandKit', () => {
    const kit: BrandKit = {
        channelName: '새벽 Lo-fi',
        tagline: '집중을 위한 음악',
        primaryGenre: 'Lo-fi Hip-hop',
        subGenres: ['Chillhop', 'Jazz'],
        targetAudience: '공부·업무',
        moodKeywords: ['집중', '새벽', '차분함'],
        avoidKeywords: ['시끄러운'],
        promptTemplate: 'lo-fi hip-hop, chill, focus',
        updatedAt: new Date().toISOString(),
    };

    it('BrandKit을 저장하고 불러온다', () => {
        saveBrandKit(kit);
        const loaded = getBrandKit();
        expect(loaded?.channelName).toBe('새벽 Lo-fi');
        expect(loaded?.primaryGenre).toBe('Lo-fi Hip-hop');
        expect(loaded?.moodKeywords).toHaveLength(3);
    });

    it('저장 전에는 null을 반환한다', () => {
        expect(getBrandKit()).toBeNull();
    });

    it('덮어쓰기가 가능하다', () => {
        saveBrandKit(kit);
        saveBrandKit({ ...kit, channelName: '업데이트됨' });
        expect(getBrandKit()?.channelName).toBe('업데이트됨');
    });
});

// ─── LyricsHistory ────────────────────────────────────
describe('LyricsHistory', () => {
    function makeItem(id: string): LyricsHistoryItem {
        return {
            id,
            title: `테스트 제목 ${id}`,
            genre: 'Lo-fi',
            mood: '집중',
            theme: '새벽',
            language: 'ko',
            style: '감성적',
            lyrics: '가사 내용...',
            model: 'flash',
            createdAt: new Date().toISOString(),
        };
    }

    it('비어있으면 빈 배열을 반환한다', () => {
        expect(loadLyricsHistory()).toEqual([]);
    });

    it('아이템을 추가하면 맨 앞에 삽입된다', () => {
        addLyricsHistory(makeItem('a'));
        addLyricsHistory(makeItem('b'));
        const history = loadLyricsHistory();
        expect(history[0].id).toBe('b');
        expect(history[1].id).toBe('a');
    });

    it('50개 초과 시 자동으로 잘린다', () => {
        for (let i = 0; i < 55; i++) {
            addLyricsHistory(makeItem(String(i)));
        }
        expect(loadLyricsHistory()).toHaveLength(50);
    });

    it('id로 삭제한다', () => {
        addLyricsHistory(makeItem('x'));
        addLyricsHistory(makeItem('y'));
        deleteLyricsHistory('x');
        const history = loadLyricsHistory();
        expect(history.find(i => i.id === 'x')).toBeUndefined();
        expect(history.find(i => i.id === 'y')).toBeDefined();
    });
});
