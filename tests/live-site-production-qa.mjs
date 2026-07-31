import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.EBC_BASE_URL || 'https://ebcconstructionllc.com';
const OUTPUT_DIR = process.env.QA_OUTPUT_DIR || 'qa-artifacts';
const expectedVideos = [
  'assets/video/portfolio/preparation-base.mp4',
  'assets/video/portfolio/excavation-roots.mp4',
  'assets/video/portfolio/finish-power-trowel.mp4',
  'assets/video/portfolio/finish-large-slab.mp4',
  'assets/video/portfolio/finish-cleanup.mp4',
  'assets/video/portfolio/stories/ebc-project-story-horizontal-with-audio.mp4',
  'assets/video/portfolio/stories/ebc-project-story-vertical-with-audio.mp4'
];
const primaryPages = ['/', '/services.html', '/projects.html', '/about.html', '/contact.html'];
const responsiveWidths = [320, 360, 375, 390, 414, 680, 768, 980, 1280];
const checks = [];
const warnings = [];
const internalLinks = new Set();
const internalAssets = new Set();
const driveMedia = new Set();

await fs.mkdir(OUTPUT_DIR, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function check(name, operation) {
  const startedAt = Date.now();
  try {
    const details = await operation();
    checks.push({ name, status: 'passed', durationMs: Date.now() - startedAt, details: details ?? null });
    return details;
  } catch (error) {
    checks.push({
      name,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

function cacheBusted(relativePath) {
  const url = new URL(relativePath, BASE_URL);
  url.searchParams.set('qa', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return url.href;
}

function normalizedInternal(value, base) {
  if (!value || value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('javascript:')) return null;
  try {
    const url = new URL(value, base);
    if (url.origin !== new URL(BASE_URL).origin) return null;
    url.hash = '';
    url.search = '';
    return url.href;
  } catch {
    return null;
  }
}

async function fetchStatus(url, { range = false } = {}) {
  const headers = {
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'user-agent': 'EBC-Live-QA/1.0'
  };
  if (range) headers.range = 'bytes=0-2047';
  const response = await fetch(url, { redirect: 'follow', headers, signal: AbortSignal.timeout(45000) });
  const contentType = response.headers.get('content-type') || '';
  const contentLength = Number(response.headers.get('content-length') || 0);
  await response.arrayBuffer();
  return { status: response.status, ok: response.status >= 200 && response.status < 400, contentType, contentLength, finalUrl: response.url };
}

async function collectSitemapPages() {
  const response = await fetch(`${BASE_URL}/sitemap.xml?qa=${Date.now()}`, {
    headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
    signal: AbortSignal.timeout(45000)
  });
  assert(response.ok, `sitemap.xml returned ${response.status}`);
  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert(urls.length >= primaryPages.length, `sitemap.xml contains only ${urls.length} URLs`);
  return urls;
}

const browser = await chromium.launch({ headless: true });

async function newContext(viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport, locale: 'en-US', colorScheme: 'light' });
  await context.route('https://www.openstreetmap.org/**', route => route.abort());
  return context;
}

const sitemapUrls = await check('Sitemap is reachable and populated', collectSitemapPages) || [];
const pagesToAudit = [...new Set([...primaryPages.map(page => new URL(page, BASE_URL).href), ...sitemapUrls])];

await check('All public pages render with valid structure and local assets', async () => {
  const pageReports = [];
  for (const pageUrl of pagesToAudit) {
    const context = await newContext();
    const page = await context.newPage();
    const sameOriginFailures = [];
    const consoleErrors = [];
    const pageErrors = [];

    page.on('response', response => {
      const url = new URL(response.url());
      if (url.origin === new URL(BASE_URL).origin && response.status() >= 400) {
        sameOriginFailures.push(`${response.status()} ${url.pathname}`);
      }
    });
    page.on('requestfailed', request => {
      const url = new URL(request.url());
      if (url.origin === new URL(BASE_URL).origin) sameOriginFailures.push(`FAILED ${url.pathname}: ${request.failure()?.errorText || 'unknown'}`);
    });
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', error => pageErrors.push(error.message));

    const response = await page.goto(cacheBusted(pageUrl), { waitUntil: 'domcontentloaded', timeout: 60000 });
    assert(response && response.status() < 400, `${pageUrl} returned ${response?.status() ?? 'no response'}`);
    await page.waitForTimeout(1200);
    await page.evaluate(async () => {
      const step = Math.max(400, Math.floor(window.innerHeight * 0.8));
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise(resolve => setTimeout(resolve, 35));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);

    const audit = await page.evaluate(() => {
      const missingAlt = [...document.querySelectorAll('img')].filter(image => !image.hasAttribute('alt')).map(image => image.src);
      const unnamedButtons = [...document.querySelectorAll('button')].filter(button => {
        const name = button.getAttribute('aria-label') || button.getAttribute('title') || button.textContent?.trim();
        return !name;
      }).length;
      const urls = {
        links: [...document.querySelectorAll('a[href]')].map(element => element.getAttribute('href')),
        assets: [
          ...[...document.querySelectorAll('img[src], script[src], source[src]')].map(element => element.getAttribute('src')),
          ...[...document.querySelectorAll('video[poster]')].map(element => element.getAttribute('poster')),
          ...[...document.querySelectorAll('link[rel="stylesheet"][href], link[rel="icon"][href]')].map(element => element.getAttribute('href')),
          ...[...document.querySelectorAll('[srcset]')].flatMap(element => String(element.getAttribute('srcset') || '').split(',').map(entry => entry.trim().split(/\s+/)[0]))
        ]
      };
      return {
        title: document.title.trim(),
        h1Count: document.querySelectorAll('h1').length,
        mainPresent: Boolean(document.querySelector('main')),
        missingAlt,
        unnamedButtons,
        horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
        htmlLang: document.documentElement.lang,
        urls,
        driveMedia: [...document.querySelectorAll('img[src*="drive.google.com"], iframe[src*="drive.google.com"], source[src*="drive.google.com"]')].map(element => element.getAttribute('src'))
      };
    });

    assert(audit.title.length > 0, `${pageUrl} has no document title`);
    assert(audit.h1Count === 1, `${pageUrl} has ${audit.h1Count} h1 elements`);
    assert(audit.mainPresent, `${pageUrl} has no main element`);
    assert(audit.missingAlt.length === 0, `${pageUrl} has images without alt text`);
    assert(audit.unnamedButtons === 0, `${pageUrl} has ${audit.unnamedButtons} unnamed buttons`);
    assert(audit.horizontalOverflow <= 2, `${pageUrl} overflows horizontally by ${audit.horizontalOverflow}px`);
    assert(sameOriginFailures.length === 0, `${pageUrl} same-origin failures: ${sameOriginFailures.join('; ')}`);
    assert(pageErrors.length === 0, `${pageUrl} page errors: ${pageErrors.join('; ')}`);

    for (const value of audit.urls.links) {
      const normalized = normalizedInternal(value, pageUrl);
      if (normalized) internalLinks.add(normalized);
    }
    for (const value of audit.urls.assets) {
      const normalized = normalizedInternal(value, pageUrl);
      if (normalized) internalAssets.add(normalized);
    }
    for (const value of audit.driveMedia) {
      if (value) driveMedia.add(new URL(value, pageUrl).href);
    }
    if (consoleErrors.length) warnings.push({ page: pageUrl, type: 'console', messages: consoleErrors });

    pageReports.push({ pageUrl, title: audit.title, h1Count: audit.h1Count, horizontalOverflow: audit.horizontalOverflow, sameOriginFailures, consoleErrors, driveMediaCount: audit.driveMedia.length });
    await context.close();
  }
  return pageReports;
});

await check('All internal links return a successful response', async () => {
  const results = [];
  for (const url of [...internalLinks].sort()) {
    const result = await fetchStatus(url);
    assert(result.ok, `${url} returned ${result.status}`);
    results.push({ url, ...result });
  }
  return { count: results.length, results };
});

await check('All referenced local assets return a successful response', async () => {
  const results = [];
  for (const url of [...internalAssets].sort()) {
    const isMedia = /\.(?:mp4|webm|mov|jpe?g|png|webp|gif|svg|avif|heic)$/i.test(new URL(url).pathname);
    const result = await fetchStatus(url, { range: isMedia });
    assert(result.ok, `${url} returned ${result.status}`);
    results.push({ url, ...result });
  }
  return { count: results.length, results };
});

await check('Home language switch and mobile navigation work', async () => {
  const context = await newContext({ width: 390, height: 844 });
  const page = await context.newPage();
  await page.goto(cacheBusted('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(700);
  const menu = page.locator('.menu-btn');
  assert(await menu.isVisible(), 'Mobile menu button is not visible');
  await menu.click();
  assert(await menu.getAttribute('aria-expanded') === 'true', 'Mobile menu did not open');
  assert(await page.locator('.navlinks').evaluate(element => element.classList.contains('open')), 'Navigation did not receive open state');
  await page.keyboard.press('Escape');
  assert(await menu.getAttribute('aria-expanded') === 'false', 'Escape did not close mobile menu');

  const englishHeading = (await page.locator('h1').textContent())?.trim();
  await page.locator('[data-lang-btn="es"]').click();
  assert(await page.locator('html').getAttribute('lang') === 'es', 'Spanish language was not applied');
  const spanishHeading = (await page.locator('h1').textContent())?.trim();
  assert(spanishHeading && spanishHeading !== englishHeading, 'Spanish heading did not change');
  assert((await page.locator('.navlinks a').first().textContent())?.trim() === 'Inicio', 'Spanish navigation label is incorrect');
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'home-mobile-390.png'), fullPage: true });
  await context.close();
  return { englishHeading, spanishHeading };
});

await check('Portfolio filters, lightbox, language and seven video cards work', async () => {
  const context = await newContext({ width: 1280, height: 900 });
  const page = await context.newPage();
  await page.goto(cacheBusted('/projects.html'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1000);

  const storyCount = await page.locator('.project-story-card').count();
  const videoCount = await page.locator('.portfolio-card[data-media-type="video"]').count();
  const processVideoCount = await page.locator('.portfolio-card[data-media-type="video"]:not([data-project-story="true"])').count();
  assert(storyCount === 2, `Expected 2 edited stories, found ${storyCount}`);
  assert(videoCount === 7, `Expected 7 video cards, found ${videoCount}`);
  assert(processVideoCount === 5, `Expected 5 process videos, found ${processVideoCount}`);
  assert(!(await page.content()).includes('drive.google.com/thumbnail'), 'Portfolio still contains Google Drive thumbnail references');

  for (const filter of ['preparation', 'demolition', 'excavation', 'grading', 'concrete', 'finish']) {
    await page.locator(`[data-filter="${filter}"]`).click();
    const visiblePhases = await page.locator('[data-phase]:not([hidden])').evaluateAll(elements => elements.map(element => element.getAttribute('data-phase')));
    assert(visiblePhases.length === 1 && visiblePhases[0] === filter, `Filter ${filter} showed ${visiblePhases.join(', ')}`);
  }
  await page.locator('[data-filter="all"]').click();
  assert(await page.locator('[data-phase]:not([hidden])').count() === 6, 'All phases filter did not restore all sections');

  await page.locator('.portfolio-card[data-media-type="image"]').first().click();
  assert(await page.locator('#portfolio-lightbox').evaluate(dialog => dialog.open), 'Image lightbox did not open');
  assert(await page.locator('#portfolio-lightbox-image').isVisible(), 'Lightbox image is not visible');
  await page.locator('.portfolio-lightbox-close').click();

  await page.locator('.portfolio-card[data-media-type="video"]:not([data-project-story="true"])').first().click();
  assert(await page.locator('#portfolio-lightbox-video').isVisible(), 'Process video did not open');
  assert(await page.locator('#portfolio-lightbox-video').evaluate(video => video.muted), 'Process video is not muted');
  await page.locator('.portfolio-lightbox-close').click();

  await page.locator('.project-story-card').first().click();
  assert(await page.locator('#portfolio-lightbox-video').isVisible(), 'Edited story did not open');
  assert(!(await page.locator('#portfolio-lightbox-video').evaluate(video => video.muted)), 'Edited story is unexpectedly muted');
  const storySource = await page.locator('#portfolio-lightbox-video').getAttribute('src');
  assert(storySource?.includes('with-audio.mp4'), `Unexpected edited story source: ${storySource}`);
  await page.locator('.portfolio-lightbox-close').click();

  await page.locator('[data-lang-btn="es"]').click();
  assert((await page.locator('#project-stories-title').textContent())?.trim() === 'Mira cómo toma forma el trabajo.', 'Edited stories heading did not switch to Spanish');
  assert(await page.locator('.project-story-sound').first().textContent() === 'Con sonido', 'Sound label did not switch to Spanish');

  await page.screenshot({ path: path.join(OUTPUT_DIR, 'projects-desktop-1280.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'projects-mobile-390.png'), fullPage: true });
  await context.close();
  return { storyCount, videoCount, processVideoCount };
});

await check('Estimate form prepares a local review without transmitting data', async () => {
  const context = await newContext({ width: 390, height: 844 });
  const page = await context.newPage();
  const postRequests = [];
  page.on('request', request => {
    if (request.method() === 'POST') postRequests.push(request.url());
  });
  await page.goto(cacheBusted('/contact.html?service=concrete'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(800);
  assert((await page.locator('#service').inputValue()).includes('Concrete'), 'Concrete query parameter did not preselect the service');
  await page.locator('#name').fill('Production QA');
  await page.locator('#phone').fill('8645550100');
  await page.locator('#email').fill('qa@example.com');
  await page.locator('#address').evaluate(element => { element.value = '123 QA Test Street, Greer, SC'; });
  await page.locator('#timeline').fill('Planning stage');
  await page.locator('#project').fill('Automated production review. Do not send.');
  await page.locator('#estimate-form button[type="submit"]').click();
  await page.locator('#estimate-review').waitFor({ state: 'visible', timeout: 10000 });
  assert((await page.locator('#estimate-review-title').textContent())?.includes('has not been sent'), 'Review did not clearly state that the request was not sent');
  assert((await page.locator('#text-request').getAttribute('href'))?.startsWith('sms:+18644502954'), 'Text action is not configured for EBC');
  assert((await page.locator('#email-request').getAttribute('href'))?.startsWith('mailto:ebcconstructionllcsc@gmail.com'), 'Email action is not configured for EBC');
  assert(postRequests.length === 0, `Form transmitted data unexpectedly: ${postRequests.join(', ')}`);
  await page.locator('[data-lang-btn="es"]').click();
  assert((await page.locator('#estimate-review-title').textContent())?.includes('todavía no se ha enviado'), 'Review title did not switch to Spanish');
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'contact-review-mobile-390.png'), fullPage: true });
  await context.close();
  return { postRequests };
});

await check('Home, portfolio and estimate pages have no horizontal overflow at target widths', async () => {
  const context = await newContext({ width: 1280, height: 900 });
  const page = await context.newPage();
  await page.route('**/*', async route => {
    if (route.request().resourceType() === 'media') await route.abort();
    else await route.continue();
  });
  const results = [];
  for (const width of responsiveWidths) {
    await page.setViewportSize({ width, height: width <= 414 ? 844 : 900 });
    for (const relativePath of ['/', '/projects.html', '/contact.html']) {
      await page.goto(cacheBusted(relativePath), { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(300);
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        mainVisible: Boolean(document.querySelector('main')),
        bodyWidth: document.body.getBoundingClientRect().width
      }));
      assert(layout.mainVisible, `${relativePath} has no main element at ${width}px`);
      assert(layout.overflow <= 2, `${relativePath} overflows by ${layout.overflow}px at ${width}px`);
      results.push({ width, relativePath, ...layout });
    }
  }
  await context.close();
  return results;
});

await check('All seven published portfolio videos are reachable as MP4 files', async () => {
  const results = [];
  for (const relativePath of expectedVideos) {
    const url = new URL(relativePath, `${BASE_URL}/`).href;
    const result = await fetchStatus(url, { range: true });
    assert(result.ok, `${relativePath} returned ${result.status}`);
    assert(result.contentType.includes('video/mp4'), `${relativePath} returned ${result.contentType}`);
    results.push({ relativePath, ...result });
  }
  return results;
});

if (driveMedia.size) {
  const statuses = [];
  for (const url of [...driveMedia].sort()) {
    try {
      const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'EBC-Live-QA/1.0' }, signal: AbortSignal.timeout(45000) });
      statuses.push({ url, status: response.status, ok: response.ok, contentType: response.headers.get('content-type') || '' });
      await response.arrayBuffer();
    } catch (error) {
      statuses.push({ url, status: null, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  warnings.push({ type: 'external-google-drive-media', count: driveMedia.size, statuses });
}

await browser.close();

const failures = checks.filter(item => item.status === 'failed');
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  status: failures.length ? 'failed' : 'passed',
  summary: {
    checks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    warnings: warnings.length,
    pagesAudited: pagesToAudit.length,
    internalLinksChecked: internalLinks.size,
    internalAssetsChecked: internalAssets.size,
    videosChecked: expectedVideos.length,
    responsiveWidths
  },
  checks,
  warnings
};

await fs.writeFile(path.join(OUTPUT_DIR, 'live-site-qa-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(path.join(OUTPUT_DIR, 'live-site-qa-summary.md'), [
  '# EBC live-site QA',
  '',
  `- Status: **${report.status.toUpperCase()}**`,
  `- Generated: ${report.generatedAt}`,
  `- Pages audited: ${report.summary.pagesAudited}`,
  `- Checks passed: ${report.summary.passed}/${report.summary.checks}`,
  `- Internal links checked: ${report.summary.internalLinksChecked}`,
  `- Local assets checked: ${report.summary.internalAssetsChecked}`,
  `- Portfolio videos checked: ${report.summary.videosChecked}`,
  `- Responsive widths: ${responsiveWidths.join(', ')} px`,
  `- Warnings: ${report.summary.warnings}`,
  '',
  ...checks.map(item => `- ${item.status === 'passed' ? 'PASS' : 'FAIL'} — ${item.name}${item.error ? `: ${item.error}` : ''}`)
].join('\n') + '\n', 'utf8');

console.log(JSON.stringify(report.summary, null, 2));
if (failures.length) {
  console.error(`Live-site QA failed: ${failures.map(item => item.name).join(', ')}`);
  process.exitCode = 1;
}
