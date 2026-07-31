import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://ebcconstructionllc.com';
const OUT = 'final-qa-artifacts';
const widths = [320, 360, 375, 390, 414, 680, 768, 980, 1280];
const pages = ['/', '/services.html', '/projects.html', '/about.html', '/contact.html'];
const videos = [
  'assets/video/portfolio/preparation-base.mp4',
  'assets/video/portfolio/excavation-roots.mp4',
  'assets/video/portfolio/finish-power-trowel.mp4',
  'assets/video/portfolio/finish-large-slab.mp4',
  'assets/video/portfolio/finish-cleanup.mp4',
  'assets/video/portfolio/stories/ebc-project-story-horizontal-with-audio.mp4',
  'assets/video/portfolio/stories/ebc-project-story-vertical-with-audio.mp4'
];

await fs.mkdir(OUT, { recursive: true });
const results = [];
const warnings = [];

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function run(name, fn) {
  const started = Date.now();
  try {
    const details = await fn();
    results.push({ name, status: 'passed', durationMs: Date.now() - started, details: details ?? null });
  } catch (error) {
    results.push({ name, status: 'failed', durationMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) });
  }
}

function url(relative) {
  const value = new URL(relative, BASE);
  value.searchParams.set('finalqa', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return value.href;
}

async function fetchOk(relative, options = {}) {
  const response = await fetch(url(relative), {
    redirect: 'follow',
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      ...(options.range ? { range: 'bytes=0-4095' } : {})
    },
    signal: AbortSignal.timeout(60000)
  });
  await response.arrayBuffer();
  return {
    status: response.status,
    ok: response.status >= 200 && response.status < 400,
    contentType: response.headers.get('content-type') || '',
    contentLength: Number(response.headers.get('content-length') || 0),
    finalUrl: response.url
  };
}

await run('Production contains the narrow-phone contact fix', async () => {
  let lastCss = '';
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    const response = await fetch(url('/assets/phase-two.css'), {
      headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
      signal: AbortSignal.timeout(45000)
    });
    assert(response.ok, `phase-two.css returned ${response.status}`);
    lastCss = await response.text();
    if (lastCss.includes('.contact-grid-wide > * { min-width: 0; }') && lastCss.includes('overflow-wrap: anywhere')) {
      return { attempt, bytes: Buffer.byteLength(lastCss) };
    }
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  throw new Error(`Production CSS did not contain the mobile fix after polling; received ${Buffer.byteLength(lastCss)} bytes`);
});

const browser = await chromium.launch({ headless: true });

async function context(viewport) {
  const value = await browser.newContext({ viewport, locale: 'en-US' });
  await value.route('https://www.openstreetmap.org/**', route => route.abort());
  return value;
}

await run('Five public pages load without same-origin errors', async () => {
  const report = [];
  for (const relative of pages) {
    const ctx = await context({ width: 1280, height: 900 });
    const page = await ctx.newPage();
    const failures = [];
    const pageErrors = [];
    const consoleErrors = [];
    page.on('response', response => {
      const target = new URL(response.url());
      if (target.origin === BASE && response.status() >= 400) failures.push(`${response.status()} ${target.pathname}`);
    });
    page.on('requestfailed', request => {
      const target = new URL(request.url());
      if (target.origin === BASE) failures.push(`FAILED ${target.pathname}: ${request.failure()?.errorText || 'unknown'}`);
    });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    const response = await page.goto(url(relative), { waitUntil: 'domcontentloaded', timeout: 60000 });
    assert(response && response.status() < 400, `${relative} returned ${response?.status() ?? 'no response'}`);
    await page.waitForTimeout(900);
    const structure = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelectorAll('h1').length,
      main: Boolean(document.querySelector('main')),
      missingAlt: [...document.querySelectorAll('img')].filter(image => !image.hasAttribute('alt')).length,
      unnamedButtons: [...document.querySelectorAll('button')].filter(button => !(button.getAttribute('aria-label') || button.textContent?.trim())).length,
      overflow: document.documentElement.scrollWidth - innerWidth
    }));
    assert(structure.title, `${relative} has no title`);
    assert(structure.h1 === 1, `${relative} has ${structure.h1} h1 elements`);
    assert(structure.main, `${relative} has no main`);
    assert(structure.missingAlt === 0, `${relative} has ${structure.missingAlt} images without alt`);
    assert(structure.unnamedButtons === 0, `${relative} has ${structure.unnamedButtons} unnamed buttons`);
    assert(structure.overflow <= 2, `${relative} overflows by ${structure.overflow}px at desktop width`);
    assert(failures.length === 0, `${relative} asset failures: ${failures.join('; ')}`);
    assert(pageErrors.length === 0, `${relative} page errors: ${pageErrors.join('; ')}`);
    if (consoleErrors.length) warnings.push({ type: 'console', page: relative, messages: consoleErrors });
    report.push({ relative, ...structure, failures, consoleErrors });
    await ctx.close();
  }
  return report;
});

await run('Responsive layout has no horizontal scrolling at nine widths', async () => {
  const ctx = await context({ width: 1280, height: 900 });
  const page = await ctx.newPage();
  await page.route('**/*', async route => {
    if (route.request().resourceType() === 'media') await route.abort();
    else await route.continue();
  });
  const report = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: width <= 414 ? 844 : 900 });
    for (const relative of ['/', '/projects.html', '/contact.html']) {
      const response = await page.goto(url(relative), { waitUntil: 'domcontentloaded', timeout: 60000 });
      assert(response && response.status() < 400, `${relative} returned ${response?.status()}`);
      await page.waitForTimeout(250);
      const layout = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        overflow: document.documentElement.scrollWidth - innerWidth
      }));
      assert(layout.overflow <= 2, `${relative} overflows by ${layout.overflow}px at ${width}px`);
      report.push({ width, relative, ...layout });
    }
  }
  await ctx.close();
  return report;
});

await run('Mobile menu and bilingual interface work', async () => {
  const ctx = await context({ width: 390, height: 844 });
  const page = await ctx.newPage();
  await page.goto(url('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(600);
  const menu = page.locator('.menu-btn');
  assert(await menu.isVisible(), 'Mobile menu button is hidden');
  await menu.click();
  assert(await menu.getAttribute('aria-expanded') === 'true', 'Mobile menu did not open');
  await page.locator('[data-lang-btn="es"]').click();
  assert(await page.locator('html').getAttribute('lang') === 'es', 'Spanish language was not set');
  assert((await page.locator('.navlinks a').first().textContent())?.trim() === 'Inicio', 'Spanish Home label is incorrect');
  assert(await menu.getAttribute('aria-expanded') === 'false', 'Language change did not close menu');
  await menu.click();
  await page.keyboard.press('Escape');
  assert(await menu.getAttribute('aria-expanded') === 'false', 'Escape did not close menu');
  await page.screenshot({ path: path.join(OUT, 'home-mobile-390.png'), fullPage: true });
  await ctx.close();
  return { language: 'es' };
});

await run('Portfolio has correct filters, lightbox and audio behavior', async () => {
  const ctx = await context({ width: 1280, height: 900 });
  const page = await ctx.newPage();
  await page.goto(url('/projects.html'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(900);
  const counts = {
    allVideos: await page.locator('.portfolio-card[data-media-type="video"]').count(),
    processVideos: await page.locator('.portfolio-card[data-media-type="video"]:not([data-project-story="true"])').count(),
    stories: await page.locator('.project-story-card').count(),
    phases: await page.locator('[data-phase]').count()
  };
  assert(counts.allVideos === 7, `Expected 7 videos, found ${counts.allVideos}`);
  assert(counts.processVideos === 5, `Expected 5 silent process videos, found ${counts.processVideos}`);
  assert(counts.stories === 2, `Expected 2 stories, found ${counts.stories}`);
  assert(counts.phases === 6, `Expected 6 phases, found ${counts.phases}`);
  assert(!(await page.content()).includes('drive.google.com/thumbnail'), 'Portfolio contains Google Drive thumbnails');

  for (const filter of ['preparation', 'demolition', 'excavation', 'grading', 'concrete', 'finish']) {
    await page.locator(`[data-filter="${filter}"]`).click();
    const visible = await page.locator('[data-phase]:not([hidden])').evaluateAll(items => items.map(item => item.dataset.phase));
    assert(visible.length === 1 && visible[0] === filter, `${filter} filter displayed ${visible.join(', ')}`);
  }
  await page.locator('[data-filter="all"]').click();

  await page.locator('.portfolio-card[data-media-type="image"]').first().click();
  assert(await page.locator('#portfolio-lightbox').evaluate(dialog => dialog.open), 'Image lightbox did not open');
  assert(await page.locator('#portfolio-lightbox-image').isVisible(), 'Lightbox image is hidden');
  await page.locator('.portfolio-lightbox-close').click();

  await page.locator('.portfolio-card[data-media-type="video"]:not([data-project-story="true"])').first().click();
  assert(await page.locator('#portfolio-lightbox-video').evaluate(video => video.muted), 'Process clip is not muted');
  await page.locator('.portfolio-lightbox-close').click();

  await page.locator('.project-story-card').first().click();
  assert(!(await page.locator('#portfolio-lightbox-video').evaluate(video => video.muted)), 'Edited story is muted');
  assert((await page.locator('#portfolio-lightbox-video').getAttribute('src'))?.includes('with-audio.mp4'), 'Edited story source is incorrect');
  await page.locator('.portfolio-lightbox-close').click();

  await page.evaluate(() => document.querySelector('[data-lang-btn="es"]')?.click());
  assert((await page.locator('#project-stories-title').textContent())?.trim() === 'Mira cómo toma forma el trabajo.', 'Stories title did not switch to Spanish');
  assert((await page.locator('.project-story-sound').first().textContent())?.trim() === 'Con sonido', 'Sound label did not switch to Spanish');
  await page.screenshot({ path: path.join(OUT, 'projects-desktop-1280.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(OUT, 'projects-mobile-390.png'), fullPage: true });
  await ctx.close();
  return counts;
});

await run('Estimate form creates a private local review without sending data', async () => {
  const ctx = await context({ width: 320, height: 844 });
  const page = await ctx.newPage();
  const posts = [];
  page.on('request', request => {
    if (request.method() === 'POST') posts.push(request.url());
  });
  await page.goto(url('/contact.html?service=concrete'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(700);
  assert((await page.locator('#service').inputValue()).includes('Concrete'), 'Concrete service was not preselected');
  await page.locator('#name').fill('Production QA');
  await page.locator('#phone').fill('8645550100');
  await page.locator('#email').fill('qa@example.com');
  await page.locator('#address').evaluate(element => { element.value = '123 QA Test Street, Greer, SC'; });
  await page.locator('#project').fill('Automated production verification. Do not send.');
  await page.locator('#estimate-form button[type="submit"]').click();
  await page.locator('#estimate-review').waitFor({ state: 'visible', timeout: 10000 });
  assert((await page.locator('#estimate-review-title').textContent())?.includes('has not been sent'), 'English review does not say it was not sent');
  assert(posts.length === 0, `Form sent unexpected POST requests: ${posts.join(', ')}`);
  assert((await page.locator('#text-request').getAttribute('href'))?.startsWith('sms:+18644502954'), 'Text link is incorrect');
  assert((await page.locator('#email-request').getAttribute('href'))?.startsWith('mailto:ebcconstructionllcsc@gmail.com'), 'Email link is incorrect');
  await page.evaluate(() => document.querySelector('[data-lang-btn="es"]')?.click());
  assert((await page.locator('#estimate-review-title').textContent())?.includes('todavía no se ha enviado'), 'Spanish review title is incorrect');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert(overflow <= 2, `Contact review overflows by ${overflow}px at 320px`);
  await page.screenshot({ path: path.join(OUT, 'contact-review-mobile-320.png'), fullPage: true });
  await ctx.close();
  return { posts, overflow };
});

await run('All seven published videos respond as MP4', async () => {
  const report = [];
  for (const relative of videos) {
    const response = await fetchOk(`/${relative}`, { range: true });
    assert(response.ok, `${relative} returned ${response.status}`);
    assert(response.contentType.includes('video/mp4'), `${relative} returned ${response.contentType}`);
    report.push({ relative, ...response });
  }
  return report;
});

await run('Legacy external images remain reachable', async () => {
  const external = new Set();
  for (const relative of pages) {
    const response = await fetch(url(relative), { signal: AbortSignal.timeout(45000) });
    assert(response.ok, `${relative} returned ${response.status}`);
    const html = await response.text();
    for (const match of html.matchAll(/https:\/\/drive\.google\.com\/thumbnail[^"')\s]+/g)) external.add(match[0].replace(/&amp;/g, '&'));
  }
  const report = [];
  for (const target of external) {
    const response = await fetch(target, { redirect: 'follow', signal: AbortSignal.timeout(60000) });
    await response.arrayBuffer();
    assert(response.ok, `External image returned ${response.status}: ${target}`);
    report.push({ target, status: response.status, contentType: response.headers.get('content-type') || '' });
  }
  if (external.size) warnings.push({ type: 'external-media-dependency', count: external.size });
  return { count: external.size, report };
});

await browser.close();

const failures = results.filter(item => item.status === 'failed');
const report = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  status: failures.length ? 'failed' : 'passed',
  summary: {
    total: results.length,
    passed: results.length - failures.length,
    failed: failures.length,
    warnings: warnings.length,
    widths,
    pages: pages.length,
    videos: videos.length
  },
  results,
  warnings
};
await fs.writeFile(path.join(OUT, 'final-live-site-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(path.join(OUT, 'final-live-site-qa.md'), [
  '# Final EBC production QA',
  '',
  `- Status: **${report.status.toUpperCase()}**`,
  `- Checks: ${report.summary.passed}/${report.summary.total} passed`,
  `- Public pages: ${pages.length}`,
  `- Responsive widths: ${widths.join(', ')} px`,
  `- Videos: ${videos.length}`,
  `- Warnings: ${warnings.length}`,
  '',
  ...results.map(item => `- ${item.status === 'passed' ? 'PASS' : 'FAIL'} — ${item.name}${item.error ? `: ${item.error}` : ''}`)
].join('\n') + '\n');
console.log(JSON.stringify(report.summary, null, 2));
if (failures.length) process.exitCode = 1;
