// End-to-end playthrough with Playwright against the production build (vite preview).
// Usage: npm run build && npm run e2e   (screenshots go to ./e2e-screens, which is git-ignored)
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4179;
const BASE = `http://localhost:${PORT}/`;
const OUT = new URL('../e2e-screens/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((resolve, reject) => {
  const to = setTimeout(() => reject(new Error('preview did not start')), 20000);
  server.stdout.on('data', (d) => {
    if (String(d).includes(String(PORT))) {
      clearTimeout(to);
      resolve();
    }
  });
});

const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok, extra });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: false });
}

async function noHorizontalOverflow(page, label) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`no horizontal overflow: ${label}`, over <= 1, `overflow=${over}px`);
}

async function resolveOpenEvent(page, prefix, i) {
  const opts = page.locator('.event-card .option:not(.locked)');
  const n = await opts.count();
  // vary choices deterministically to exercise different branches
  await opts.nth(i % Math.max(1, n)).click();
  const commit = page.locator('.event-card .btn.primary.big');
  await commit.click();
  await page.locator('.event-card.result').waitFor({ timeout: 5000 });
  if (i < 3) await shot(page, `${prefix}-result-${i}`);
  await page.locator('.event-card.result .btn.primary').click();
}

async function play(browser, { lang, dest, viewport, prefix, cargo }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const L = lang === 'tr'
    ? { next: 'İleri', newMission: 'Yeni görev', add: 'Ekibe ekle', launch: 'Kalkış', start: 'Yüzey operasyonlarını başlat', choose: dest === 'mars' ? 'Mars hedefini seç' : 'Ay hedefini seç', cont: 'Göreve devam et', site: dest === 'mars' ? 'Güney yazı' : 'Yakın yüz ekvatoru' }
    : { next: 'Next', newMission: 'New mission', add: 'Add to crew', launch: 'Launch', start: 'Begin surface operations', choose: dest === 'mars' ? 'Choose Mars' : 'Choose The Moon', cont: 'Continue mission', site: dest === 'mars' ? 'Southern summer' : 'Near-side equator' };

  await page.goto(BASE);
  // language switch sits in the top bar
  await page.locator('.title-nav .lang-switch button', { hasText: lang.toUpperCase() }).click();
  await page.waitForTimeout(400);
  await shot(page, `${prefix}-01-title`);
  await noHorizontalOverflow(page, `${prefix} title`);
  const navBox = await page.locator('.title-nav .lang-switch').boundingBox();
  check(`${prefix} language switch is at the top`, !!navBox && navBox.y < 60, JSON.stringify(navBox));
  await page.locator('.title-nav .nav-link').first().click();
  await page.locator('.story').waitFor();
  await shot(page, `${prefix}-01b-story`);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: L.newMission }).click();

  // identity
  const nameInput = page.locator('.identity input');
  await nameInput.fill('');
  await nameInput.blur();
  const autoName = await nameInput.inputValue();
  check(`${prefix} empty name gets a fallback`, autoName.trim().length > 0, autoName);
  await nameInput.fill('Test <b>Pilot</b>');
  await nameInput.press('Enter');
  const skillsBefore = await page.locator('.identity .statbar-val').allTextContents();
  await shot(page, `${prefix}-02-identity`);
  await noHorizontalOverflow(page, `${prefix} identity`);
  await page.getByRole('button', { name: L.next }).click();

  // destination
  await page.getByRole('button', { name: L.choose }).click();
  await page.getByRole('radio', { name: new RegExp(L.site) }).click();
  const siteOn = await page.getByRole('radio', { name: new RegExp(L.site) }).getAttribute('aria-checked');
  check(`${prefix} site can be chosen`, siteOn === 'true');
  // glossary tooltip opens on hover
  await page.locator('.site .term .infotip-btn').first().hover();
  const pops = await page.locator('.infotip-pop').count();
  check(`${prefix} glossary ⓘ shows an explanation on hover`, pops > 0);
  await shot(page, `${prefix}-03-destination`);
  await page.getByRole('button', { name: L.next }).click();

  // crew
  const adds = page.getByRole('button', { name: L.add });
  for (let i = 0; i < 3; i++) await adds.first().click();
  const disabledAdds = await page.locator('.cand .btn:disabled').count();
  check(`${prefix} 4th companion blocked`, disabledAdds >= 9, `${disabledAdds} disabled`);
  await page.locator('.cand').first().hover();
  await shot(page, `${prefix}-04-crew`);
  await noHorizontalOverflow(page, `${prefix} crew`);
  await page.getByRole('button', { name: L.next }).click();

  // cargo
  for (const label of cargo) await page.getByRole('button', { name: label }).click();
  const cap = await page.locator('.cap-readout strong').textContent();
  await shot(page, `${prefix}-05-cargo`);
  await noHorizontalOverflow(page, `${prefix} cargo`);
  check(`${prefix} launch mass shown`, /kg \/ 520 kg/.test(cap ?? ''), cap ?? '');
  await page.getByRole('button', { name: L.next }).click();

  // back to identity: skills unchanged, name kept (escaped)
  await page.locator('.stepper li').first().locator('button').click();
  const skillsAfter = await page.locator('.identity .statbar-val').allTextContents();
  check(`${prefix} going back keeps skills`, JSON.stringify(skillsBefore) === JSON.stringify(skillsAfter));
  const nameNow = await page.locator('.identity input').inputValue();
  check(`${prefix} custom name kept as text`, nameNow === 'Test <b>Pilot</b>', nameNow);
  await page.locator('.stepper li').nth(4).locator('button').click();

  // briefing + launch
  await shot(page, `${prefix}-06-briefing`);
  await page.getByRole('button', { name: new RegExp(L.launch) }).dblclick();
  await page.locator('.transit').waitFor();
  await page.locator('.event-card').waitFor({ timeout: 8000 });
  await shot(page, `${prefix}-07-transit`);
  await resolveOpenEvent(page, `${prefix}-out`, 0);

  // landing
  await page.getByRole('button', { name: L.start }).waitFor();
  await shot(page, `${prefix}-07b-landing`);
  await page.getByRole('button', { name: L.start }).click();
  await page.locator('.surface').waitFor();
  await shot(page, `${prefix}-08-surface-start`);
  await noHorizontalOverflow(page, `${prefix} surface`);

  // hidden tab: the mission clock must not advance
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const tA = await page.locator('.clock-time').textContent();
  await page.waitForTimeout(2500);
  const tB = await page.locator('.clock-time').textContent();
  const hiddenStatus = await page.locator('.status').textContent();
  check(`${prefix} clock stops while tab is hidden`, tA === tB, `${tA} → ${tB} (${hiddenStatus})`);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(1500);
  const tC = await page.locator('.clock-time').textContent();
  check(`${prefix} clock resumes when visible`, tC !== tB, `${tB} → ${tC}`);

  // speed up, play to the end
  await page.locator('.speed button').nth(4).click();
  let i = 0;
  let langToggled = false;
  let reloaded = false;
  let shotChat = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 300000) {
    if (await page.locator('.debrief').count()) break;
    const ev = page.locator('.event-card:not(.result)');
    if (await ev.count()) {
      const status = await page.locator('.status').textContent().catch(() => '');
      if (i === 1) {
        const bubble = await page.locator('.chat-bubble').count();
        console.log(`   ${prefix} chat bubble visible before event 2: ${bubble > 0}`);
      }
      if (i === 0) {
        check(`${prefix} clock shows decision pause`, /(decision|karar)/i.test(status ?? ''), status ?? '');
        await shot(page, `${prefix}-09-event`);
      }
      // mid-game: switch language and reload once; the run must survive both
      if (i === 2 && !langToggled) {
        langToggled = true;
        const title1 = await page.locator('#event-title').textContent();
        await page.locator('.lang-switch button').nth(lang === 'tr' ? 0 : 1).click();
        const title2 = await page.locator('#event-title').textContent();
        check(`${prefix} language switch re-translates open event`, !!title1 && !!title2 && title1 !== title2, `${title1} → ${title2}`);
        await page.locator('.lang-switch button').nth(lang === 'tr' ? 1 : 0).click();
      }
      if (i === 3 && !reloaded) {
        reloaded = true;
        const before = await page.locator('#event-title').textContent();
        await page.waitForTimeout(600);
        await page.reload();
        await page.getByRole('button', { name: new RegExp(L.cont) }).click();
        await page.locator('.event-card').waitFor({ timeout: 5000 });
        const after = await page.locator('#event-title').textContent();
        check(`${prefix} reload resumes the same open event`, before === after, `${before} / ${after}`);
      }
      if (await page.locator('.event-card .checklist').count()) await shot(page, `${prefix}-12b-return-check`);
      await resolveOpenEvent(page, prefix, i);
      i++;
      if (i === 4) {
        await page.getByRole('tab').nth(1).click();
        await shot(page, `${prefix}-10-crew-tab`);
        await page.getByRole('tab').nth(2).click();
        await shot(page, `${prefix}-11-log-tab`);
        await page.getByRole('tab').nth(3).click();
        await page.locator('.research-item', { hasText: lang === 'tr' ? 'Su–oksijen' : 'water–oxygen' }).click();
        await shot(page, `${prefix}-12-research`);
        const st = await page.locator('.status').textContent();
        check(`${prefix} research pauses the clock`, /(research|araştırma)/i.test(st ?? ''), st ?? '');
        await page.keyboard.press('Escape');
        await page.getByRole('tab').nth(0).click();
      }
      continue;
    }
    if (!shotChat && (await page.locator('.chat-bubble').count())) {
      shotChat = true;
      await shot(page, `${prefix}-09b-chat`);
    }
    if (await page.locator('.transit').count()) {
      await page.locator('.event-card').first().waitFor({ timeout: 8000 });
      continue;
    }
    await page.waitForTimeout(250);
  }
  const atDebrief = (await page.locator('.debrief').count()) > 0;
  if (atDebrief) {
    await page.locator('.debrief .link-btn').first().click();
    const chats = await page.locator('.j-chat').count();
    check(`${prefix} crew chatter happened between decisions`, chats >= 5, `${chats} chat lines`);
  }
  check(`${prefix} reached debrief`, atDebrief, `${i} decisions`);
  if (atDebrief) {
    await shot(page, `${prefix}-13-debrief`);
    await page.screenshot({ path: `${OUT}${prefix}-13-debrief-full.png`, fullPage: true });
    await noHorizontalOverflow(page, `${prefix} debrief`);
    const rating = await page.locator('.debrief-hero-text h2').textContent();
    console.log(`   ${prefix} outcome: ${rating}`);
  }
  check(`${prefix} no console errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

const browser = await chromium.launch();
try {
  await play(browser, {
    lang: 'tr',
    dest: 'mars',
    viewport: { width: 1440, height: 900 },
    prefix: 'desk-mars-tr',
    cargo: ['Bir Su filtresi kartuşu ekle', 'Bir Gıda paketi ekle', 'Bir Yedek parça kiti ekle', 'Bir Tohumluk patates kiti ekle'],
  });
  await play(browser, {
    lang: 'en',
    dest: 'moon',
    viewport: { width: 390, height: 844 },
    prefix: 'mob-moon-en',
    cargo: ['Add one Sealant patch kit', 'Add one Food pack', 'Add one Soybean seed kit', 'Add one Medical kit'],
  });
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
