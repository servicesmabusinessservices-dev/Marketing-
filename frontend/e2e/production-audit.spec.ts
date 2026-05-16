import { test, expect } from '@playwright/test';

test.describe('Production Audit - https://marketing.mabusinessservices.com', () => {
  
  test('should load landing page and check for CORS/Console errors', async ({ page }) => {
    const errors: string[] = [];
    const logs: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        errors.push(`[CONSOLE ERROR] ${text}`);
      }
      logs.push(`[${msg.type().toUpperCase()}] ${text}`);
    });

    page.on('pageerror', err => {
      errors.push(`[PAGE ERROR] ${err.message}`);
    });

    page.on('requestfailed', request => {
      const failure = request.failure();
      errors.push(`[REQUEST FAILED] ${request.url()} - ${failure?.errorText || 'Unknown error'}`);
    });

    console.log('Navigating to landing page...');
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Log all errors found
    if (errors.length > 0) {
      console.log('--- ERRORS FOUND ON LANDING PAGE ---');
      errors.forEach(err => console.log(err));
    } else {
      console.log('No errors found on landing page.');
    }

    // Check for premium aesthetics
    const body = page.locator('body');
    const hasGlassmorphism = await body.evaluate(() => {
      const styles = Array.from(document.styleSheets)
        .flatMap(sheet => {
          try { return Array.from(sheet.cssRules); } catch { return []; }
        })
        .filter(rule => rule.cssText.includes('backdrop-filter'));
      return styles.length > 0;
    });
    console.log(`Glassmorphism (backdrop-filter) detected: ${hasGlassmorphism}`);

    // Check for Connect Gmail button
    const connectButton = page.getByRole('link', { name: /Connect Gmail|Get Started/i });
    const isVisible = await connectButton.isVisible();
    console.log(`Connect Gmail button visible: ${isVisible}`);
    
    if (!isVisible) {
      const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => a.innerText));
      console.log('Available links:', links);
    }
  });

  test('should check /connect page for errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`[CONSOLE ERROR] ${msg.text()}`);
    });
    page.on('pageerror', err => errors.push(`[PAGE ERROR] ${err.message}`));
    page.on('requestfailed', request => errors.push(`[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`));

    console.log('Navigating to /connect...');
    await page.goto('/connect', { waitUntil: 'networkidle' });
    
    if (errors.length > 0) {
      console.log('--- ERRORS FOUND ON /CONNECT PAGE ---');
      errors.forEach(err => console.log(err));
    } else {
      console.log('No errors found on /connect page.');
    }

    const loginButton = page.getByRole('button', { name: /Continue with Google/i });
    console.log(`Login button visible: ${await loginButton.isVisible()}`);
  });
});
