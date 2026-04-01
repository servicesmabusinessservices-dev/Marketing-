const { chromium } = require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(()=>{localStorage.setItem('jwt_token','fake-token');localStorage.setItem('user_email','qa@example.com');});
  await page.goto('https://marketing-zeta-flame.vercel.app/dashboard',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2500);
  const html = await page.content();
  require('fs').writeFileSync('c:/EmailMultiAccountApp/_audit_mobile_dom.html', html);
  console.log((await page.locator('body').innerText()).split('\n').slice(0,15));
  await browser.close();
})();
