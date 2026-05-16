import { test, expect } from '@playwright/test';

/**
 * Full E2E Backend API Integration Audit
 * 
 * Fakes a session, navigates every protected page, and captures ALL
 * console errors, failed network requests, CORS issues, and CSP violations.
 */

interface ErrorEntry {
  page: string;
  type: 'CONSOLE_ERROR' | 'PAGE_ERROR' | 'REQUEST_FAILED' | 'HTTP_ERROR' | 'CSP_VIOLATION';
  detail: string;
  url?: string;
  status?: number;
}

const PROTECTED_PAGES = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/emails', label: 'Email List' },
  { path: '/marketing', label: 'Marketing Hub' },
  { path: '/marketing/pipeline', label: 'Pipeline Board' },
  { path: '/marketing/analytics', label: 'Analytics Dashboard' },
  { path: '/marketing/suppression', label: 'Suppression List' },
];

test('Full API integration audit across all protected pages', async ({ page, context }) => {
  // Increase timeout for this comprehensive test
  test.setTimeout(180_000);

  const allErrors: ErrorEntry[] = [];
  const allRequests: { page: string; url: string; status: number; method: string }[] = [];
  let currentPage = '';

  // ── Inject fake session to bypass client-side auth guard ──
  await context.addInitScript(() => {
    localStorage.setItem('user_email', 'audit@test.com');
  });

  // ── Global listeners ──
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();

      // Categorize the error
      if (text.includes('Content-Security-Policy') || text.includes('content security policy') || text.includes('CSP')) {
        allErrors.push({ page: currentPage, type: 'CSP_VIOLATION', detail: text });
      } else if (text.includes('CORS') || text.includes('Access-Control-Allow-Origin') || text.includes('cross-origin')) {
        allErrors.push({ page: currentPage, type: 'CONSOLE_ERROR', detail: `[CORS] ${text}` });
      } else {
        allErrors.push({ page: currentPage, type: 'CONSOLE_ERROR', detail: text });
      }
    }
  });

  page.on('pageerror', err => {
    allErrors.push({ page: currentPage, type: 'PAGE_ERROR', detail: err.message });
  });

  page.on('requestfailed', request => {
    const failure = request.failure();
    allErrors.push({
      page: currentPage,
      type: 'REQUEST_FAILED',
      detail: `${request.method()} ${failure?.errorText || 'Unknown'}`,
      url: request.url(),
    });
  });

  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    const method = response.request().method();

    // Only track API calls (not static assets)
    if (url.includes('/api/') || url.includes('onrender.com')) {
      allRequests.push({ page: currentPage, url, status, method });

      if (status >= 400) {
        allErrors.push({
          page: currentPage,
          type: 'HTTP_ERROR',
          detail: `${method} → ${status}`,
          url,
          status,
        });
      }
    }
  });

  // ── Navigate each protected page ──
  for (const { path, label } of PROTECTED_PAGES) {
    currentPage = label;
    console.log(`\n━━━ Navigating to: ${label} (${path}) ━━━`);

    try {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      // Wait for API calls to complete
      await page.waitForTimeout(5000);
      // Also wait for network to settle
      await page.waitForLoadState('networkidle').catch(() => { });
    } catch (err: any) {
      allErrors.push({ page: currentPage, type: 'PAGE_ERROR', detail: `Navigation failed: ${err.message}` });
    }
  }

  // ── Print full report ──
  console.log('\n\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           FULL API INTEGRATION AUDIT REPORT             ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Group errors by page
  const errorsByPage = new Map<string, ErrorEntry[]>();
  for (const err of allErrors) {
    if (!errorsByPage.has(err.page)) errorsByPage.set(err.page, []);
    errorsByPage.get(err.page)!.push(err);
  }

  for (const [pageName, errors] of errorsByPage) {
    console.log(`\n┌── ${pageName} (${errors.length} errors) ──`);
    for (const err of errors) {
      const urlPart = err.url ? ` → ${err.url}` : '';
      console.log(`│  [${err.type}] ${err.detail}${urlPart}`);
    }
    console.log('└──');
  }

  // Summary by category
  const corsErrors = allErrors.filter(e => e.detail.includes('CORS') || e.detail.includes('cross-origin'));
  const cspErrors = allErrors.filter(e => e.type === 'CSP_VIOLATION');
  const http401 = allErrors.filter(e => e.status === 401);
  const http500 = allErrors.filter(e => e.status && e.status >= 500);
  const networkFails = allErrors.filter(e => e.type === 'REQUEST_FAILED');
  const jsErrors = allErrors.filter(e => e.type === 'PAGE_ERROR');

  console.log('\n┌── SUMMARY ──');
  console.log(`│  Total errors:        ${allErrors.length}`);
  console.log(`│  CORS errors:         ${corsErrors.length}`);
  console.log(`│  CSP violations:      ${cspErrors.length}`);
  console.log(`│  401 Unauthorized:    ${http401.length}`);
  console.log(`│  500+ Server errors:  ${http500.length}`);
  console.log(`│  Network failures:    ${networkFails.length}`);
  console.log(`│  JS runtime errors:   ${jsErrors.length}`);
  console.log(`│  Total API requests:  ${allRequests.length}`);
  console.log('└──');

  // Print all unique failing API endpoints
  const failingEndpoints = new Set(allErrors.filter(e => e.url).map(e => `${e.status || 'FAIL'} ${e.url}`));
  if (failingEndpoints.size > 0) {
    console.log('\n┌── FAILING API ENDPOINTS ──');
    for (const ep of failingEndpoints) {
      console.log(`│  ${ep}`);
    }
    console.log('└──');
  }

  // Don't fail the test - this is an audit
  console.log(`\n✅ Audit complete. Found ${allErrors.length} total errors across ${PROTECTED_PAGES.length} pages.`);
});