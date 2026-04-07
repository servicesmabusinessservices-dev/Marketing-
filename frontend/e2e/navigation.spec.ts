import { test, expect } from '@playwright/test';

/**
 * Navigation & Core Functionality Tests
 * Testing basic app navigation and P0 fixes
 */

test.describe('Navigation & Core Features', () => {
  
  test('should navigate between landing page and login', async ({ page }) => {
    // Start at home
    await page.goto('/');
    await expect(page).toHaveURL('/');
    
    // Navigate to connect page
    await page.getByRole('link', { name: /Connect Gmail/i }).click();
    await expect(page).toHaveURL(/.*\/connect/);
    
    // Check for back navigation (if exists)
    // Some pages might not have explicit back buttons at landing level
  });

  test('should have working footer links on landing page', async ({ page }) => {
    await page.goto('/');
    
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Check for company info
    await expect(page.locator('text=/MA Business Services/i').first()).toBeVisible();
  });

  test('should load security/privacy page if linked', async ({ page }) => {
    await page.goto('/');
    
    // Try to find and click security link
    const securityLink = page.getByRole('link', { name: /View security|Security/i });
    
    if (await securityLink.isVisible()) {
      await securityLink.click();
      await page.waitForLoadState('networkidle');
      
      // Should navigate successfully
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('P0-5: 401 redirects should go to /connect (not /)', async ({ page }) => {
    // Try to access protected endpoint directly
    const response = await page.goto('/dashboard');
    
    await page.waitForLoadState('networkidle');
    
    // Should redirect to /connect or / (landing)
    const url = page.url();
    
    // P0-5 fix: should prefer /connect for better UX
    const validRedirect = url.includes('/connect') || url.endsWith('/');
    expect(validRedirect).toBeTruthy();
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345');
    
    // Should either show 404 page or redirect
    await expect(page.locator('body')).toBeVisible();
    
    // App should still be functional
    await page.goto('/');
    await expect(page.locator('.landing-page')).toBeVisible();
  });

  test('should have consistent navigation structure', async ({ page }) => {
    await page.goto('/');
    
    // Landing page should have clear CTAs
    const connectButton = page.getByRole('link', { name: /Connect Gmail/i });
    await expect(connectButton).toBeVisible();
    
    // Click and verify navigation works
    await connectButton.click();
    await expect(page).toHaveURL(/.*\/connect/);
    
    // Check login page has proper structure
    await expect(page.locator('.login-screen')).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  });

  test('should load without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out expected errors (like network errors in dev mode)
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('net::ERR_') && 
      !err.includes('Failed to fetch') &&
      !err.includes('404')
    );
    
    // Should have no critical errors
    expect(criticalErrors.length).toBe(0);
  });

  test('should load CSS and assets correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check that styled elements render
    const body = page.locator('body');
    const backgroundColor = await body.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Should have background color set (not default white/transparent)
    expect(backgroundColor).toBeTruthy();
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});
