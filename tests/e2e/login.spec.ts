import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOTS_DIR = 'test-results/screenshots';

test.describe('로그인 페이지', () => {
  test('/login 접근 시 앱 이름 표시', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 페이지 타이틀 확인
    await expect(page).toHaveTitle(/Suno YT Manager/);

    // 앱 이름 텍스트 표시 확인
    await expect(page.getByText('Suno YT Manager')).toBeVisible();

    // 스크린샷 저장
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'login-page.png'), fullPage: true });
  });

  test('Google OAuth 버튼 존재 및 활성화 확인', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // "Google로 로그인" 버튼 — role=button + 텍스트 기준
    const googleBtn = page.getByRole('button', { name: /Google로 로그인/i });
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toBeEnabled();

    // 스크린샷 저장
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'login-google-button.png') });
  });

  test('로그인 페이지는 사이드바(.app-layout) 없이 렌더링', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // AppShell은 /login 경로에서 사이드바를 렌더링하지 않음
    await expect(page.locator('.app-layout')).not.toBeVisible();

    // Google 로그인 버튼은 보임
    await expect(page.getByRole('button', { name: /Google로 로그인/i })).toBeVisible();
  });

  test('루트(/) 접근 시 /dashboard 또는 /login으로 이동', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/(dashboard|login)/);

    const url = page.url();
    expect(url.includes('/dashboard') || url.includes('/login')).toBe(true);
  });
});
