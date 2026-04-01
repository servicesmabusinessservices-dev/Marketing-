const { chromium } = require('playwright');
(async()=>{
  const browser = await chromium.launch({ headless:true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const out = { console:[], pageErrors:[], badResponses:[], requestFailed:[], url:'', title:'', h1:[], alerts:[], visibleTexts:[] };

  await page.addInitScript(() => {
    localStorage.setItem('jwt_token', 'fake-token-for-qa');
    localStorage.setItem('user_email', 'qa@example.com');
  });

  page.on('console', (m)=> out.console.push({type:m.type(), text:m.text()}));
  page.on('pageerror', (e)=> out.pageErrors.push(String(e)));
  page.on('requestfailed', (r)=> out.requestFailed.push({url:r.url(), method:r.method(), error:r.failure()?.errorText}));
  page.on('response', (r)=> { if(r.status()>=400) out.badResponses.push({status:r.status(), url:r.url(), method:r.request().method()}); });

  await page.goto('https://marketing-zeta-flame.vercel.app/dashboard', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(15000);

  out.url = page.url();
  out.title = await page.title();
  out.h1 = await page.locator('h1').allTextContents();
  out.alerts = await page.locator('[role="alert"], .error, .auth-error, .error-state').allTextContents();
  out.visibleTexts = (await page.locator('body').innerText()).split('\n').slice(0,50);

  await page.screenshot({ path:'c:/EmailMultiAccountApp/_audit_dashboard_fakeauth.png', fullPage:true });

  require('fs').writeFileSync('c:/EmailMultiAccountApp/_audit_dashboard_fakeauth.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify({url:out.url,title:out.title,badResponses:out.badResponses.slice(0,20),console:out.console.slice(0,20),alerts:out.alerts.slice(0,10),h1:out.h1},null,2));
  await browser.close();
})();
