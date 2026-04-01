const { chromium } = require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(()=>{localStorage.setItem('jwt_token','fake-token');localStorage.setItem('user_email','qa@example.com');});
  await page.goto('https://marketing-zeta-flame.vercel.app/dashboard',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2000);
  const metrics = await page.evaluate(() => {
    const sb = document.querySelector('.sidebar')?.getBoundingClientRect();
    const main = document.querySelector('.main')?.getBoundingClientRect();
    const app = document.querySelector('.app')?.getBoundingClientRect();
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      sidebar: sb ? { x: sb.x, y: sb.y, w: sb.width, h: sb.height } : null,
      main: main ? { x: main.x, y: main.y, w: main.width, h: main.height } : null,
      app: app ? { x: app.x, y: app.y, w: app.width, h: app.height } : null,
      classes: {
        sidebar: document.querySelector('.sidebar')?.className,
        html: document.documentElement.className,
      }
    };
  });
  console.log(JSON.stringify(metrics,null,2));
  await browser.close();
})();
