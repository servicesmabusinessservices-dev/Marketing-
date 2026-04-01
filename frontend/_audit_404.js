const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 await page.goto('https://marketing-zeta-flame.vercel.app/this-route-does-not-exist',{waitUntil:'networkidle'});
 console.log(JSON.stringify({url:page.url(), title:await page.title(), h1:await page.locator('h1').allTextContents(), has404:await page.getByText(/404|not found/i).count()},null,2));
 await browser.close();
})();
