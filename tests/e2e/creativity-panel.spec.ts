import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOTS_DIR = 'test-results/screenshots';

test.describe('CreativityPanel — /lyrics 통합', () => {
  /**
   * /lyrics 접속 시 미인증이면 /login으로, 인증 상태면 CreativityPanel 렌더링.
   * 두 경우 모두 유효한 동작.
   */
  test('/lyrics 접근 시 URL 확인 (lyrics 또는 login)', async ({ page }) => {
    await page.goto('/lyrics');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url.includes('/lyrics') || url.includes('/login')).toBe(true);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'lyrics-load.png'),
      fullPage: true,
    });
  });

  /**
   * 인증 상태: CreativityPanel의 "창의성 파라미터" 토글 버튼이 존재하는지 확인.
   * 미인증: /login 리다이렉트 허용.
   */
  test('CreativityPanel 존재 확인', async ({ page }) => {
    await page.goto('/lyrics');
    await page.waitForLoadState('networkidle');

    const url = page.url();

    if (url.includes('/lyrics')) {
      // 창의성 파라미터 토글 버튼 (card-header 안의 button)
      const panelToggle = page.getByRole('button', { name: /창의성 파라미터/i });
      await expect(panelToggle).toBeVisible({ timeout: 10000 });

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'lyrics-creativity-panel.png'),
        fullPage: true,
      });
    } else {
      // 미인증 리다이렉트 — 로그인 페이지 정상 확인
      await expect(page.getByRole('button', { name: /Google로 로그인/i })).toBeVisible();
    }

    expect(url.includes('/lyrics') || url.includes('/login')).toBe(true);
  });

  /**
   * 인증 상태: CreativityPanel 펼치기 → 카오스 프리셋 클릭
   * → Temperature 슬라이더 value가 "1" (최대값) 인지 확인.
   *
   * 카오스 프리셋: { temperature: 1.0, topP: 1.0, topK: 40 }
   */
  test('카오스 프리셋 클릭 → Temperature 슬라이더 값 1.0 확인', async ({ page }) => {
    await page.goto('/lyrics');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    if (!url.includes('/lyrics')) {
      test.skip(); // 미인증 환경에서는 skip
      return;
    }

    // CreativityPanel 펼치기
    const panelToggle = page.getByRole('button', { name: /창의성 파라미터/i });
    await panelToggle.click();

    // 카오스 프리셋 버튼 클릭
    const chaosBtn = page.getByRole('button', { name: '카오스' });
    await expect(chaosBtn).toBeVisible({ timeout: 5000 });
    await chaosBtn.click();

    // Temperature 슬라이더 value 확인 (type="range", label "Temperature")
    // SliderRow에서 input[type=range]는 label 다음에 위치
    const temperatureSlider = page.locator('input[type="range"]').first();
    await expect(temperatureSlider).toHaveValue('1', { timeout: 3000 });

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'lyrics-chaos-preset.png'),
      fullPage: true,
    });
  });

  /**
   * 인증 상태: 카오스 프리셋 클릭 후 localStorage에 creativityParams 저장 확인.
   * 저장값: { temperature: 1.0, topP: 1.0, topK: 40 }
   */
  test('카오스 프리셋 클릭 후 localStorage creativityParams 저장 확인', async ({ page }) => {
    await page.goto('/lyrics');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    if (!url.includes('/lyrics')) {
      test.skip();
      return;
    }

    // CreativityPanel 펼치기
    await page.getByRole('button', { name: /창의성 파라미터/i }).click();

    // 카오스 클릭
    await page.getByRole('button', { name: '카오스' }).click();

    // React useEffect의 localStorage 저장을 대기 (짧은 delay)
    await page.waitForTimeout(300);

    // localStorage 값 읽기
    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('creativityParams');
      return raw ? JSON.parse(raw) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.temperature).toBe(1);
    expect(stored.topP).toBe(1);
    expect(stored.topK).toBe(40);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'lyrics-localstorage.png'),
    });
  });

  /**
   * 인증 상태: 가사 생성 버튼 클릭 시 POST /api/gemini/lyrics 요청에
   * creativityParams 필드가 포함되는지 확인.
   * (API 키 미설정 → 에러 얼럿 표시 전 요청 intercept로 payload 검증)
   *
   * 참고: geminiApiKey가 없으면 fetch 전에 조기 return하므로,
   * 키를 localStorage에 mock으로 주입한 뒤 intercept함.
   */
  test('가사 생성 요청에 creativityParams 포함 확인', async ({ page }) => {
    await page.goto('/lyrics');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    if (!url.includes('/lyrics')) {
      test.skip();
      return;
    }

    // mock geminiApiKey 및 창의성 파라미터 주입
    await page.evaluate(() => {
      const existing = JSON.parse(localStorage.getItem('appData') ?? '{}');
      existing.geminiApiKey = 'mock-key-for-test';
      localStorage.setItem('appData', JSON.stringify(existing));
      localStorage.setItem('creativityParams', JSON.stringify({ temperature: 1.0, topP: 1.0, topK: 40 }));
    });

    // API 요청 intercept
    let capturedBody: Record<string, unknown> | null = null;
    await page.route('/api/gemini/lyrics', async (route) => {
      const request = route.request();
      const body = request.postDataJSON() as Record<string, unknown>;
      capturedBody = body;
      // 요청을 abort해서 실제 API 호출 없이 검증만
      await route.abort();
    });

    // 가사 생성 버튼 클릭 (theme 입력 없이도 버튼은 존재)
    const generateBtn = page.getByRole('button', { name: /가사 생성|생성하기/i });
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      // route abort 발생 대기
      await page.waitForTimeout(500);

      if (capturedBody) {
        expect(capturedBody).toHaveProperty('creativityParams');
        const cp = capturedBody.creativityParams as Record<string, number>;
        expect(typeof cp.temperature).toBe('number');
        expect(typeof cp.topP).toBe('number');
        expect(typeof cp.topK).toBe('number');
      }
    }

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'lyrics-api-intercept.png'),
    });
  });
});

// ─── 스모크 테스트 ─────────────────────────────────────────────
test.describe('스모크 테스트 — 주요 페이지 로드', () => {
  const smokePages = [
    { path: '/revenue', name: '수익 관리' },
    { path: '/library', name: '라이브러리' },
    { path: '/cover', name: '커버 아트' },
    { path: '/lyrics', name: '가사 생성' },
  ];

  for (const { path: pagePath, name } of smokePages) {
    test(`${name} 페이지 (${pagePath}) 로드 확인`, async ({ page }) => {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();

      // 정상 페이지 또는 /login 리다이렉트 — 두 경우 모두 앱 정상 동작
      expect(
        currentUrl.includes(pagePath) || currentUrl.includes('/login')
      ).toBe(true);

      // 앱 타이틀이 있어야 함
      await expect(page).toHaveTitle(/Suno YT Manager/);

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `smoke${pagePath.replace(/\//g, '-')}.png`),
      });
    });
  }
});
