import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const response=await page.goto('http://127.0.0.1:4173/carl-crayon/',{waitUntil:'networkidle'});
if(!response?.ok()) throw new Error('Site did not return HTTP 200');
await page.locator('h1').waitFor();
const title=await page.locator('h1').innerText();
if(!title.includes('DISCIPLINE'))throw new Error('Missing hero headline');
const expected=['images/carl-hero.jpg','images/carl-youtube.jpg','images/carl-legday.jpg','images/carl-shoulders.jpg','images/carl-back.jpg','images/carl-chest.jpg','images/carl-lifestyle.jpg'];
for(const path of expected){const r=await page.request.get('http://127.0.0.1:4173/carl-crayon/'+path);if(!r.ok())throw new Error('Missing image '+path);}
const socialLinks=await page.locator('a[href]').evaluateAll(anchors=>anchors.map(a=>a.getAttribute('href')));
if(await page.locator('.video-link[href="https://www.youtube.com/@carlc.official"]').count()!==1)throw new Error('YouTube preview play control is not a link');
for(const url of ['https://www.youtube.com/@carlc.official','https://www.tiktok.com/@carlc.official','https://www.instagram.com/carlc.official/'])if(!socialLinks.includes(url))throw new Error('Missing social '+url);
for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
  await page.setViewportSize({width,height:844});
  await page.waitForTimeout(100);
  const result=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth-window.innerWidth,
    headlineWidth:document.querySelector('h1').getBoundingClientRect().width,
    viewport:window.innerWidth
  }));
  if(result.overflow>2)throw new Error('Horizontal overflow at '+width+'px: '+result.overflow+'px');
  if(result.headlineWidth>result.viewport)throw new Error('Headline too wide at '+width+'px');
  const headerClearance=await page.evaluate(()=>{
    const header=document.querySelector('header').getBoundingClientRect();
    const brand=document.querySelector('.brand').getBoundingClientRect();
    const logo=document.querySelector('.brand .logo').getBoundingClientRect();
    const tagline=document.querySelector('.brand-tagline').getBoundingClientRect();
    const menu=document.querySelector('.toggle');
    const navVisible=window.getComputedStyle(menu).display!=='none';
    const menuLeft=navVisible?menu.getBoundingClientRect().left:Infinity;
    return {headerBottom:header.bottom,brandBottom:brand.bottom,logoBottom:logo.bottom,taglineTop:tagline.top,taglineRight:tagline.right,menuLeft};
  });
  if(headerClearance.taglineTop<headerClearance.logoBottom-1 || headerClearance.brandBottom>headerClearance.headerBottom+1)
    throw new Error('Brand lockup overlaps or exceeds header at '+width+'px: '+JSON.stringify(headerClearance));
  if(headerClearance.taglineRight>headerClearance.menuLeft-5)
    throw new Error('Brand pillars overlap mobile menu at '+width+'px: '+JSON.stringify(headerClearance));
}
await page.setViewportSize({width:390,height:844});
const layout=await page.evaluate(()=>{
  const box=s=>document.querySelector(s).getBoundingClientRect();
  const headline=box('.hero h1'),buttons=box('.hero .buttons'),hero=box('.hero'),youtube=box('.youtube'),intro=box('.youtube .eyebrow'),header=box('header');
  return {headlineGap:headline.top-header.bottom,buttonGap:hero.bottom-buttons.bottom,sectionGap:intro.top-youtube.top,heroHeight:hero.height};
});
if(layout.headlineGap<10)throw new Error('Hero headline overlaps header: '+JSON.stringify(layout));
if(layout.buttonGap>120)throw new Error('Excessive blank area below hero buttons: '+JSON.stringify(layout));
if(layout.sectionGap>105)throw new Error('Excessive top spacing before YouTube section: '+JSON.stringify(layout));
await page.getByRole('button',{name:/toggle menu/i}).click();
if(!(await page.getByRole('navigation',{name:'Main navigation'}).isVisible()))throw new Error('Mobile navigation does not open');
if(errors.length)throw new Error('JavaScript runtime errors: '+errors.join('; '));
await page.screenshot({path:'mobile-smoke.png',fullPage:true});
await page.setViewportSize({width:1440,height:900});
await page.screenshot({path:'desktop-smoke.png',fullPage:true});
console.log('PASS: mobile + desktop widths, assets, navigation, links, zero overflow and runtime errors');
await browser.close();
