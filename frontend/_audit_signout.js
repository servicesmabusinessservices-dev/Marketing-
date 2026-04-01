const { chromium } = require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({ viewport:{width:1280,height:800}});
  await page.addInitScript(()=>{localStorage.setItem('jwt_token','fake-token');localStorage.setItem('user_email','qa@example.com');});
  await page.goto('https://marketing-zeta-flame.vercel.app/dashboard',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(4000);
  const signout = page.getByRole('button', {name:/sign out/i});
  let clicked=false;
  if(await signout.count()){ await signout.first().click(); clicked=true; }
  await page.waitForTimeout(1500);
  console.log(JSON.stringify({clicked,url:page.url(),hasGoogleBtn:await page.getByRole('button',{name:/continue with google/i}).count(),jwt:await page.evaluate(()=>localStorage.getItem('jwt_token'))},null,2));
  await browser.close();
})();
