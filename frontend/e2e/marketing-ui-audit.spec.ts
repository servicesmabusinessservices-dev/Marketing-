import { test, expect } from '@playwright/test';

/**
 * UI Audit for the Marketing site (https://marketing.mabusinessservices.com)
 *
 * This test navigates through a set of public pages and records:
 *   • Console error messages
 *   • Page runtime errors
 *   • Failed network requests
 *   • HTTP responses with status >= 400
 *   • CSP and CORS violations detected via console messages
 *
 * The results are printed to the console for CI visibility. The test never fails –
 * it is purely an audit, mirroring the approach used for the full‑api audit.
 */

interface ErrorEntry {
  page: string;
  type: 'CONSOLE_ERROR' | 'PAGE_ERROR' | 'REQUEST_FAILED' | 'HTTP_ERROR' | 'CSP_VIOLATION';
  detail: string;
  url?: string;
  status?: number;
}

// Define the public pages we want to audit. Extend this array as new sections are added.
const MARKETING_PAGES = [
  { path: '/', label: 'Home' },
  { path: '/features', label: 'Features' },
  { path: '/pricing', label: 'Pricing' },
  { path: '/about', label: 'About' },
  { path: '/contact', label: 'Contact' },
];

const BASE_URL = 'https://marketing.mabusinessservices.com';

test('Marketing UI audit – capture console, network and response errors', async ({ page }) => {
  test.setTimeout(180_000); // generous timeout for full navigation sequence

  const allErrors: ErrorEntry[] = [];
  const allRequests: { page: string; url: string; status: number; method: string }[] = [];
  let currentPage = '';

  // ---- Global listeners ----
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (text.includes('Content-Security-Policy') || text.includes('CSP')) {
        allErrors.push({ page: currentPage, type: 'CSP_VIOLATION', detail: text });
      } else if (text.toLowerCase().includes('cors') || text.includes('Access-Control-Allow-Origin')) {
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
    // Track only API‑like calls (skip CSS, images, etc.)
    if (url.includes('/api/') || url.includes('marketing.mabusinessservices.com')) {
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

  // ---- Navigate each marketing page ----
  for (const { path, label } of MARKETING_PAGES) {
    currentPage = label;
    console.log(`\n━━━ Navigating to: ${label} (${path}) ━━━`);
    try {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      // Allow any lazy‑loaded API calls to finish
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle').catch(() => {});
    } catch (err: any) {
      allErrors.push({ page: currentPage, type: 'PAGE_ERROR', detail: `Navigation failed: ${err.message}` });
    }
  }

  // ---- Report ----
  console.log('\n\n╔══════════════════════════════════════════════════════════╗');
  console.log('║               MARKETING UI AUDIT REPORT               ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Group errors by page for readability
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

  // Summary statistics
  const corsErrors = allErrors.filter(e => e.detail.includes('CORS') || e.detail.includes('cross‑origin'));
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
  console.log(`│  500+ Server errors: ${http500.length}`);
  console.log(`│  Network failures:    ${networkFails.length}`);
  console.log(`│  JS runtime errors:   ${jsErrors.length}`);
  console.log(`│  Total API requests:  ${allRequests.length}`);
  console.log('└──');

  // Show unique failing endpoints, if any
  const failingEndpoints = new Set(allErrors.filter(e => e.url).map(e => `${e.status || 'FAIL'} ${e.url}`));
  if (failingEndpoints.size > 0) {
    console.log('\n┌── FAILING ENDPOINTS ──');
    for (const ep of failingEndpoints) {
      console.log(`│  ${ep}`);
    }
    console.log('└──');
  }

  // The audit never fails the test – it records information only
  console.log(`\n✅ Marketing UI audit complete. Found ${allErrors.length} total errors across ${MARKETING_PAGES.length} pages.`);
});
