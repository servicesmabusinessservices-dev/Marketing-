const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const events = [];

  page.on('request', (req) => {
    if (req.url().includes('auth') || req.url().includes('marketing-api-38a1')) {
      events.push({ type: 'request', method: req.method(), url: req.url() });
    }
  });
  page.on('response', async (res) => {
    const u = res.url();
    if (u.includes('auth') || u.includes('marketing-api-38a1')) {
      events.push({ type: 'response', status: res.status(), url: u });
    }
  });

  await page.goto('https://marketing-zeta-flame.vercel.app/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  events.push({ type: 'url-before', url: page.url() });

  const btn = page.getByRole('button', { name: /continue with google/i });
  await btn.click({ timeout: 10000 });
  events.push({ type: 'clicked' });

  await page.waitForTimeout(7000);
  events.push({ type: 'url-after', url: page.url(), title: await page.title() });

  console.log(JSON.stringify(events, null, 2));
  await browser.close();
})();
