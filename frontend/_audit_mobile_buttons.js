const { chromium } = require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(()=>{localStorage.setItem('jwt_token','fake-token');localStorage.setItem('user_email','qa@example.com');});
  await page.goto('https://marketing-zeta-flame.vercel.app/dashboard',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(3000);
  const buttons = await page.locator('button').evaluateAll(btns => btns.map(b => ({text:(b.textContent||'').trim(), aria:b.getAttribute('aria-label'), cls:b.className}))); 
  console.log(JSON.stringify(buttons.slice(0,25),null,2));
  await browser.close();
})();
