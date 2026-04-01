const { chromium } = require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(()=>{localStorage.setItem('jwt_token','fake-token');localStorage.setItem('user_email','qa@example.com');});
  const consoleLogs=[];
  page.on('console', m=>consoleLogs.push({type:m.type(), text:m.text()}));
  await page.goto('https://marketing-zeta-flame.vercel.app/dashboard',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(6000);
  await page.screenshot({path:'c:/EmailMultiAccountApp/_audit_dashboard_mobile_fakeauth.png', fullPage:true});
  // open mobile menu if button exists
  const menuBtn = page.locator('button[aria-label*="menu" i], button:has-text("Menu")').first();
  if (await menuBtn.count()) {
    await menuBtn.click({timeout:2000}).catch(()=>{});
    await page.waitForTimeout(1200);
    await page.screenshot({path:'c:/EmailMultiAccountApp/_audit_dashboard_mobile_menu.png', fullPage:true});
  }
  console.log(JSON.stringify({url:page.url(), title:await page.title(), h1:await page.locator('h1').allTextContents(), consoleCount:consoleLogs.length, consoleSample:consoleLogs.slice(0,8)},null,2));
  await browser.close();
})();
