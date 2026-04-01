const { chromium } = require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.addInitScript(()=>{localStorage.setItem('jwt_token','fake-token');localStorage.setItem('user_email','qa@example.com');});
  await page.goto('https://marketing-zeta-flame.vercel.app/dashboard',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(3000);
  await page.locator('.sidebar-footer-action .nav-item').click();
  await page.waitForTimeout(2000);
  const data = await page.evaluate(()=>({jwt:localStorage.getItem('jwt_token'), email:localStorage.getItem('user_email')}));
  console.log(JSON.stringify({url:page.url(), ...data, body:(await page.locator('body').innerText()).split('\n').slice(0,8)},null,2));
  await browser.close();
})();
