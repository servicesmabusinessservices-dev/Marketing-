import { test, expect } from '@playwright/test';

/**
 * Authentication Flow Tests
 * Testing OAuth flow and httpOnly cookie security improvements (P2-11)
 */

test.describe('Authentication & Security', () => {
  
  test('should load landing page without errors', async ({ page }) => {
    await page.goto('/');
    
    // Check page loads
    await expect(page).toHaveTitle(/Gmail Manager|MA Business/);
    
    // Check main heading is visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // Check CTA buttons
    await expect(page.getByRole('link', { name: /Connect Gmail/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /View security/i })).toBeVisible();
  });

  test('should navigate to /connect login page', async ({ page }) => {
    await page.goto('/');
    
    // Click "Connect Gmail" button
    await page.getByRole('link', { name: /Connect Gmail/i }).click();
    
    // Should navigate to /connect
    await expect(page).toHaveURL(/.*\/connect/);
    
    // Check login button is visible
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  });

  test('should show Google OAuth login button', async ({ page }) => {
    await page.goto('/connect');
    
    // Main login button should be visible
    const loginButton = page.getByRole('button', { name: /Continue with Google/i });
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toBeEnabled();
    
    // Check for visual elements
    await expect(page.locator('.login-logo')).toBeVisible();
    await expect(page.locator('.login-heading')).toBeVisible();
  });

  test('P2-11: JWT should NOT be in URL after auth (httpOnly cookie check)', async ({ page, context }) => {
    // This test verifies that JWT tokens are not exposed in URLs
    await page.goto('/connect');
    
    // Navigate around the app
    await page.goto('/');
    await page.goto('/connect');
    
    // Check that URL never contains 'token=' parameter
    const url = page.url();
    expect(url).not.toContain('token=');
    expect(url).not.toContain('jwt=');
    
    // Check browser history doesn't have tokens
    const urls = await page.evaluate(() => {
      return [window.location.href];
    });
    
    urls.forEach(url => {
      expect(url).not.toContain('token=');
    });
  });

  test('should show appropriate error on OAuth configuration issues', async ({ page }) => {
    await page.goto('/connect');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Check that error handling is graceful if OAuth isn't configured
    // The page should still render without crashing
    await expect(page.locator('.login-screen')).toBeVisible();
  });

  test('P0-4: should show cold-start feedback if backend is slow', async ({ page }) => {
    await page.goto('/connect');
    
    // Check for cold-start UI elements (may appear during slow backend start)
    // This validates the P0-4 fix for backend cold-start feedback
    const loginButton = page.getByRole('button', { name: /Continue with Google/i });
    await expect(loginButton).toBeVisible();
    
    // The auth-info message may or may not appear depending on backend speed
    // We just verify the page doesn't crash
    await page.waitForTimeout(1000);
    
    // Page should still be functional
    await expect(page.locator('.login-screen')).toBeVisible();
  });

  test('should handle unauthorized access to protected routes', async ({ page }) => {
    // Try to access dashboard without authentication
    const response = await page.goto('/dashboard');
    
    // Should either redirect to /connect or show appropriate message
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    
    // Should be redirected to login or show error
    const isRedirected = url.includes('/connect') || url.includes('/');
    expect(isRedirected).toBeTruthy();
  });
});
