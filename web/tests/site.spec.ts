import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage is readable, navigable and accessible', async ({page})=>{
  await page.goto('/');
  await expect(page).toHaveTitle(/L4G/);
  await expect(page.getByRole('heading',{level:1})).toContainText('Idei care');
  expect(await page.locator('h1').count()).toBe(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://l4g.ro/');
  await page.getByRole('link',{name:'Descoperă Google Ads'}).click();
  await expect(page).toHaveURL(/servicii\/google-ads/);
  await expect(page.getByRole('heading',{level:1})).toContainText('Fii răspunsul');
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag21a']).analyze();
  expect(results.violations).toEqual([]);
});

test('mobile menu, FAQ and motion controls work',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.getByRole('button',{name:'Deschide meniul'}).click();
  await expect(page.locator('#mobile-nav')).toBeVisible();
  await page.locator('#mobile-nav').getByRole('link',{name:/Expertiză/}).click();
  await expect(page.locator('#mobile-nav')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const question=page.locator('summary').filter({hasText:'Pot începe cu un singur serviciu?'});
  await question.click();
  await expect(page.locator('details[open]')).toContainText('Da.');
  await page.evaluate(()=>scrollTo(0,0));
  await page.getByRole('button',{name:'Mișcare ON: oprește animațiile'}).click();
  await expect(page.locator('html')).toHaveClass(/motion-off/);
});

test('reduced motion does not load video and content remains visible',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await expect(page.locator('#hero-video[src]')).toHaveCount(0);
  expect(await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.mp4')).length)).toBe(0);
  if (await page.locator('.set-camera').count()) await expect(page.locator('.set-camera')).toHaveCSS('transform','none');
  await expect(page.locator('#intro-title')).toHaveCSS('opacity','1');
});

test('contact validates input and prepares an email without claiming delivery',async({page})=>{
  await page.goto('/contact/?serviciu=branding');
  await expect(page.getByLabel('Cu ce te putem ajuta?')).toHaveValue('Branding');
  await page.getByRole('button',{name:'Pregătește emailul'}).click();
  await expect(page.locator('#name:invalid')).toHaveCount(1);
  await page.getByLabel('Numele tău').fill('Test L4G');
  await page.getByLabel('Adresa de email').fill('test@example.com');
  await page.getByLabel('Câteva cuvinte').fill('Vreau o identitate vizuală pentru afacerea mea.');
  await page.getByRole('button',{name:'Pregătește emailul'}).click();
  await expect(page.getByRole('status')).toContainText('Apasă Trimite acolo');
  await expect(page.getByRole('link',{name:'0755 436 284'}).first()).toHaveAttribute('href','tel:+40755436284');
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag21a']).analyze();
  expect(results.violations).toEqual([]);
});

test('all service pages, sitemap and robots are available without JS',async({browser,request})=>{
  const ctx=await browser.newContext({javaScriptEnabled:false});const page=await ctx.newPage();
  for(const slug of ['google-ads','web-design','branding']){
    await page.goto(`http://127.0.0.1:4321/servicii/${slug}/`);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBeTruthy();
    expect(await page.locator('script[type="application/ld+json"]').count()).toBe(2);
  }
  await ctx.close();
  expect((await request.get('/sitemap-index.xml')).status()).toBe(200);
  expect(await (await request.get('/robots.txt')).text()).toContain('https://l4g.ro/sitemap-index.xml');
});

test('home accessibility and no horizontal overflow at common widths',async({page})=>{
  await page.goto('/');
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const width of [360,768,1440]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag21a']).analyze();
  expect(results.violations).toEqual([]);
});

test('hero renders a complete studio and its position follows scroll',async({page,request})=>{
  await page.goto('/');
  const video=page.locator('video');
  if (await video.count()) {
    const manifest = await request.get('/media/studio/manifest.json');
    expect(manifest.ok()).toBe(true);
    expect((await manifest.json()).model).toBe('bytedance/seedance-2.5/text-to-video');
    await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
    await page.evaluate(()=>scrollTo({top:400,behavior:'instant'}));
    await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(1);
  } else {
    const camera=page.locator('.set-camera');
    await expect(camera).toBeVisible();
    const start=await camera.evaluate(el=>getComputedStyle(el).transform);
    await page.evaluate(()=>scrollTo({top:400,behavior:'instant'}));
    await expect.poll(()=>camera.evaluate(el=>getComputedStyle(el).transform)).not.toBe(start);
    await expect(page.locator('.set-ad')).toBeVisible();
    await expect(page.locator('.set-browser')).toBeVisible();
    await expect(page.locator('.set-brand')).toBeVisible();
  }
  const failed=await page.evaluate(()=>performance.getEntriesByType('resource').filter((r:PerformanceResourceTiming)=>r.responseStatus>=400).map(r=>r.name));
  expect(failed).toEqual([]);
  const broken=await page.locator('img').evaluateAll((images:HTMLImageElement[])=>images.filter(i=>i.complete && i.naturalWidth===0).map(i=>i.src));
  expect(broken).toEqual([]);
});


test('connected disciplines update explanation and destination with keyboard',async({page})=>{
  await page.goto('/');
  const branding=page.getByRole('button',{name:/03 Branding/});
  await branding.focus();
  await page.keyboard.press('Enter');
  await expect(branding).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('button',{name:/01 Google Ads/})).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#lab-heading')).toContainText('să fii ținut minte.');
  await expect(page.locator('#lab-link')).toHaveAttribute('href','/servicii/branding/');
  await page.locator('#lab-link').click();
  await expect(page).toHaveURL(/servicii\/branding/);
});

test('hero chapters follow scroll and motion control restores the readable opening',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>{const hero=document.querySelector('.hero-scroll')!;scrollTo({top:(hero.clientHeight-innerHeight)*.58,behavior:'instant'})});
  await expect(page.locator('[data-chapter="1"]')).toHaveClass(/is-active/);
  await expect(page.locator('#scene-number')).toHaveText('02');
  await expect(page.locator('.studio-opening')).toHaveCSS('opacity','0');
  await page.getByRole('button',{name:'Mișcare ON: oprește animațiile'}).click();
  await expect(page.locator('.studio-opening')).toHaveCSS('opacity','1');
  await expect(page.locator('.studio-project-link')).toHaveAttribute('tabindex','0');
});
