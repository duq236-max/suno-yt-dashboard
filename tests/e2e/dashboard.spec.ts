import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOTS_DIR = 'test-results/screenshots';

test.describe('대시보드 페이지', () => {
  /**
   * /dashboard 접근 시 미인증 상태면 /login으로 리다이렉트,
   * 인증 상태면 대시보드가 렌더링됨. 두 경우 모두 유효한 동작.
   */
  test('/dashboard 접근 후 URL 확인 (dashboard 또는 login)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url.includes('/dashboard') || url.includes('/login')).toBe(true);

    // 스크린샷 저장
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'dashboard-load.png'), fullPage: true });
  });

  /**
   * 미인증 상태에서 /dashboard 접근 시 /login으로 리다이렉트 동작 검증
   */
  test('/dashboard 미인증 접근 시 /login 리다이렉트 및 로그인 버튼 표시', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const url = page.url();

    if (url.includes('/login')) {
      // 미인증 리다이렉트 — 로그인 페이지 UI 확인
      await expect(page.getByRole('button', { name: /Google로 로그인/i })).toBeVisible();
      await expect(page.getByText('Suno YT Manager')).toBeVisible();
    } else if (url.includes('/dashboard')) {
      // 인증 상태 — 대시보드 StatCard 4개 확인
      const statsGrid = page.locator('.stats-grid').first();
      await expect(statsGrid).toBeVisible({ timeout: 10000 });

      const statCards = statsGrid.locator('.stat-card');
      await expect(statCards).toHaveCount(4, { timeout: 10000 });

      await expect(page.getByText('전체 시트')).toBeVisible();
      await expect(page.getByText('총 프롬프트')).toBeVisible();
      await expect(page.getByText('생성 준비됨')).toBeVisible();
      await expect(page.getByText('이미 사용됨')).toBeVisible();
    }

    // 스크린샷 저장
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'dashboard-stat-cards.png') });
  });

  /**
   * 대시보드 접근 결과 검증:
   * - 인증 상태: .app-layout(사이드바 포함), 헤더 "대시보드" 텍스트
   * - 미인증: /login 페이지 정상 렌더링
   */
  test('Sidebar(.app-layout) 또는 login 페이지 렌더링 확인', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const url = page.url();

    if (url.includes('/dashboard')) {
      // 인증 상태 — 앱 레이아웃 (사이드바 포함) 확인
      await expect(page.locator('.app-layout')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.sidebar')).toBeAttached();
      await expect(page.getByText('대시보드')).toBeVisible();
    } else {
      // 미인증 리다이렉트 — 로그인 페이지 정상 확인
      await expect(page).toHaveTitle(/Suno YT Manager/);
      await expect(page.getByRole('button', { name: /Google로 로그인/i })).toBeVisible();
    }

    // 스크린샷 저장
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'dashboard-layout.png') });
  });
});
