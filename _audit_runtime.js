const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const logs = {
    console: [],
    pageErrors: [],
    requestFailed: [],
    badResponses: [],
    clicks: [],
    headings: [],
    buttons: [],
    links: []
  };

  page.on('console', (msg) => logs.console.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', (err) => logs.pageErrors.push(String(err)));
  page.on('requestfailed', (req) => logs.requestFailed.push({ url: req.url(), method: req.method(), error: req.failure()?.errorText }));
  page.on('response', (res) => {
    if (res.status() >= 400) logs.badResponses.push({ status: res.status(), url: res.url(), method: res.request().method() });
  });

  await page.goto('https://marketing-zeta-flame.vercel.app/', { waitUntil: 'networkidle', timeout: 120000 });

  logs.headings = await page.locator('h1,h2,h3').allTextContents();
  logs.buttons = await page.locator('button').allTextContents();
  logs.links = await page.locator('a').evaluateAll((els) => els.map((a) => ({ text: (a.textContent || '').trim(), href: a.getAttribute('href') })));

  // Try likely login CTA
  const googleBtn = page.getByRole('button', { name: /continue with google/i });
  if (await googleBtn.count()) {
    await googleBtn.first().click();
    logs.clicks.push('Clicked Continue with Google');
    await page.waitForTimeout(5000);
  }

  // Try skip onboarding/welcome if present
  const skipBtn = page.getByRole('button', { name: /skip/i });
  if (await skipBtn.count()) {
    await skipBtn.first().click();
    logs.clicks.push('Clicked Skip');
    await page.waitForTimeout(2000);
  }

  // Try nav to dashboard directly
  await page.goto('https://marketing-zeta-flame.vercel.app/dashboard', { waitUntil: 'networkidle', timeout: 120000 });
  logs.clicks.push('Navigated to /dashboard');
  await page.waitForTimeout(3000);

  // capture post-dashboard state
  const dashButtons = await page.locator('button').allTextContents();
  logs.dashboardButtons = dashButtons;
  logs.finalUrl = page.url();
  logs.title = await page.title();

  await page.screenshot({ path: 'c:/EmailMultiAccountApp/_audit_full_desktop.png', fullPage: true });

  // Mobile pass
  const mContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mPage = await mContext.newPage();
  const mLogs = { console: [], pageErrors: [], badResponses: [] };
  mPage.on('console', (msg) => mLogs.console.push({ type: msg.type(), text: msg.text() }));
  mPage.on('pageerror', (err) => mLogs.pageErrors.push(String(err)));
  mPage.on('response', (res) => {
    if (res.status() >= 400) mLogs.badResponses.push({ status: res.status(), url: res.url(), method: res.request().method() });
  });
  await mPage.goto('https://marketing-zeta-flame.vercel.app/', { waitUntil: 'networkidle', timeout: 120000 });
  await mPage.screenshot({ path: 'c:/EmailMultiAccountApp/_audit_mobile.png', fullPage: true });
  logs.mobile = {
    width: 390,
    url: mPage.url(),
    title: await mPage.title(),
    buttons: await mPage.locator('button').allTextContents(),
    h1: await mPage.locator('h1').allTextContents(),
    console: mLogs.console,
    pageErrors: mLogs.pageErrors,
    badResponses: mLogs.badResponses,
  };

  await mContext.close();
  await browser.close();

  require('fs').writeFileSync('c:/EmailMultiAccountApp/_audit_runtime.json', JSON.stringify(logs, null, 2));
  console.log(JSON.stringify({
    finalUrl: logs.finalUrl,
    title: logs.title,
    headings: logs.headings.slice(0, 10),
    buttons: logs.buttons.slice(0, 20),
    linksCount: logs.links.length,
    consoleCount: logs.console.length,
    pageErrors: logs.pageErrors.length,
    requestFailed: logs.requestFailed.length,
    badResponses: logs.badResponses.length,
    sampleConsole: logs.console.slice(0, 6),
    sampleBadResponses: logs.badResponses.slice(0, 10)
  }, null, 2));
})();
