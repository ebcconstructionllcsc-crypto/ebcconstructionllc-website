import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const output = 'qa-overflow-artifacts';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 320, height: 844 }, locale: 'en-US' });
await context.route('https://www.openstreetmap.org/**', route => route.abort());
const page = await context.newPage();
await page.goto(`https://ebcconstructionllc.com/contact.html?qa=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1000);

const initial = await page.evaluate(() => {
  const viewportWidth = window.innerWidth;
  const selectorFor = element => {
    if (element.id) return `#${element.id}`;
    const classes = [...element.classList].slice(0, 3);
    return `${element.tagName.toLowerCase()}${classes.length ? `.${classes.join('.')}` : ''}`;
  };
  const offenders = [...document.querySelectorAll('body *')].map(element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      selector: selectorFor(element),
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      className: element.className || null,
      text: String(element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 140),
      rect: { left: rect.left, right: rect.right, width: rect.width, top: rect.top, bottom: rect.bottom },
      style: {
        display: style.display,
        position: style.position,
        width: style.width,
        minWidth: style.minWidth,
        maxWidth: style.maxWidth,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
        marginLeft: style.marginLeft,
        marginRight: style.marginRight,
        whiteSpace: style.whiteSpace,
        overflowX: style.overflowX,
        wordBreak: style.wordBreak,
        overflowWrap: style.overflowWrap
      }
    };
  }).filter(item => item.rect.width > 0 && (item.rect.left < -1 || item.rect.right > viewportWidth + 1));
  return {
    viewportWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    overflow: document.documentElement.scrollWidth - viewportWidth,
    offenders
  };
});

await page.screenshot({ path: path.join(output, 'contact-320-before-review.png'), fullPage: true });

await page.locator('#name').fill('Production QA');
await page.locator('#phone').fill('8645550100');
await page.locator('#email').fill('qa@example.com');
await page.locator('#address').evaluate(element => { element.value = '123 QA Test Street, Greer, SC'; });
await page.locator('#service').selectOption({ label: 'Concrete / Concreto' });
await page.locator('#project').fill('Automated production review. Do not send.');
await page.locator('#estimate-form button[type="submit"]').click();
await page.locator('#estimate-review').waitFor({ state: 'visible', timeout: 10000 });

const afterReview = await page.evaluate(() => {
  const viewportWidth = window.innerWidth;
  const selectorFor = element => {
    if (element.id) return `#${element.id}`;
    const classes = [...element.classList].slice(0, 3);
    return `${element.tagName.toLowerCase()}${classes.length ? `.${classes.join('.')}` : ''}`;
  };
  const offenders = [...document.querySelectorAll('body *')].map(element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      selector: selectorFor(element),
      text: String(element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 140),
      rect: { left: rect.left, right: rect.right, width: rect.width, top: rect.top, bottom: rect.bottom },
      style: {
        display: style.display,
        position: style.position,
        width: style.width,
        minWidth: style.minWidth,
        maxWidth: style.maxWidth,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
        marginLeft: style.marginLeft,
        marginRight: style.marginRight,
        whiteSpace: style.whiteSpace,
        overflowX: style.overflowX,
        wordBreak: style.wordBreak,
        overflowWrap: style.overflowWrap
      }
    };
  }).filter(item => item.rect.width > 0 && (item.rect.left < -1 || item.rect.right > viewportWidth + 1));
  return {
    viewportWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    overflow: document.documentElement.scrollWidth - viewportWidth,
    offenders
  };
});

await page.screenshot({ path: path.join(output, 'contact-320-after-review.png'), fullPage: true });

await page.evaluate(() => document.querySelector('[data-lang-btn="es"]')?.click());
const language = await page.locator('html').getAttribute('lang');
const reviewTitle = (await page.locator('#estimate-review-title').textContent())?.trim();

const report = { generatedAt: new Date().toISOString(), initial, afterReview, language, reviewTitle };
await fs.writeFile(path.join(output, 'contact-overflow-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
await context.close();
await browser.close();
