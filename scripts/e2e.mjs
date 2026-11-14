// End-to-end playthrough with Playwright against the production build (vite preview).
// Usage: npm run build && npm run e2e   (screenshots go to ./e2e-screens, which is git-ignored)
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PORT = 4179;
// E2E_SHORT=1: stop each run after the first surface checks (quick smoke test instead of two full playthroughs)
const SHORT = process.env.E2E_SHORT === '1';
const BASE = `http://localhost:${PORT}/`;
// fileURLToPath: correct on Windows too (no "C:\\C:\\…%20…" paths); V4 6.7
const OUT = fileURLToPath(new URL('../e2e-screens/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe', shell: process.platform === 'win32' });
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

let assignChecked = false;
async function resolveOpenEvent(page, prefix, i) {
  // once per run: pick an option that needs crew and check the assignment grid (2 × 2 for four people)
  if (!assignChecked) {
    const crewOpt = page.locator('.event-card .option:not(.locked)', { hasText: /(görevlendir|assign)/i }).first();
    if (await crewOpt.count()) {
      assignChecked = true;
      await crewOpt.click();
      const cls = (await page.locator('.crew-pick-list').getAttribute('class')) ?? '';
      const picks = await page.locator('.crew-pick-list .pick').count();
      check(`${prefix} task assignment shows the whole crew as a grid`, /cols-2/.test(cls) && picks === 4, `${cls} · ${picks}`);
    }
  }
  // vary choices, but never pick "end the mission" so the run reaches day 30
  const all = page.locator('.event-card .option:not(.locked)');
  const safe = all.filter({ hasNotText: /(ascent vehicle|End the mission|Kalkış aracına|Görevi bitir)/ });
  const opts = (await safe.count()) ? safe : all;
  const n = await opts.count();
  // vary choices deterministically to exercise different branches
  await opts.nth(i % Math.max(1, n)).click();
  const commit = page.locator('.event-card .btn.primary.big');
  await commit.click();
  await page.locator('.event-card.result').waitFor({ timeout: 5000 });
  if (i < 3) await shot(page, `${prefix}-result-${i}`);
  await page.locator('.event-card.result .btn.primary').click();
}

async function play(browser, { lang, dest, viewport, prefix, cargo, offline }) {
  assignChecked = false;
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, acceptDownloads: true });
  const ctx2 = ctx;
  const page = await ctx2.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // failed NASA requests are expected (FLR answers 404; the offline run blocks the API) and handled in-app
  page.on('console', (m) => {
    const url = m.location()?.url ?? '';
    if (m.type() === 'error' && !url.startsWith('https://api.nasa.gov/') && !url.endsWith('donki-latest.json')) errors.push(m.text());
  });
  const L = lang === 'tr'
    ? { next: 'İleri', newMission: 'Yeni görev', add: 'Ekibe ekle', launch: 'Kalkış', start: 'Yüzey operasyonlarını başlat', choose: dest === 'mars' ? 'Mars hedefini seç' : 'Ay hedefini seç', cont: 'Göreve devam et', site: dest === 'mars' ? 'Güney yazı' : 'Yakın yüz ekvatoru' }
    : { next: 'Next', newMission: 'New mission', add: 'Add to crew', launch: 'Launch', start: 'Begin surface operations', choose: dest === 'mars' ? 'Choose Mars' : 'Choose The Moon', cont: 'Continue mission', site: dest === 'mars' ? 'Southern summer' : 'Near-side equator' };

  // offline run: NASA is unreachable, the bundled DONKI snapshot must take over
  if (offline) {
    await page.route('https://api.nasa.gov/**', (r) => r.abort());
    await page.route('**/donki-latest.json', (r) => r.abort());
  }
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
  // live NASA DONKI card on the title page
  await page.locator('[data-testid="sw-card"]').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !/(Checking|kontrol ediliyor)/.test(document.querySelector('.sw-status')?.textContent ?? ''), null, { timeout: 25000 }).catch(() => {});
  const swStatus = await page.locator('.sw-status').textContent();
  const swSource = await page.locator('.sw-source-label').textContent();
  const swCount = Number(await page.locator('.sw-counts strong').first().textContent());
  await shot(page, `${prefix}-01c-spaceweather`);
  if (offline) check(`${prefix} DONKI offline falls back to bundled data`, /(unreachable|ulaşılamadı)/.test(swStatus ?? '') && /(bundled|oyunla gelen)/.test(swSource ?? '') && swCount > 0, `${swStatus} | ${swSource} | ${swCount}`);
  else check(`${prefix} live NASA DONKI data loaded (partial if a list failed)`, /(Up to date|Partly up to date|Güncel|Kısmen güncel)/.test(swStatus ?? '') && /(live|canlı)/.test(swSource ?? '') && swCount > 0, `${swStatus} | ${swSource} | ${swCount} CMEs`);
  if (!offline && (await page.locator('.sw-counts li.missing').count())) {
    const unknown = await page.locator('.sw-counts li.missing strong').first().textContent();
    check(`${prefix} a list that failed shows "—", not 0`, unknown === '—', unknown ?? '');
  }
  // v0.8: no feature blurbs on the home page; a Credits button next to the story
  check(`${prefix} home page has no feature blurbs`, (await page.locator('.features').count()) === 0);
  await page.locator('[data-testid="credits-btn"]').click();
  await page.locator('.credits').waitFor({ timeout: 3000 });
  check(`${prefix} credits open`, true);
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
  await page.getByRole('button', { name: new RegExp('^' + L.next + ' →$') }).click();

  // destination
  await page.getByRole('button', { name: L.choose }).click();
  // v0.8: no site choice any more; the landing is random and the possible sites are listed
  const sites = await page.locator('.random-landing .landing-list li').count();
  check(`${prefix} random landing lists the possible sites`, sites === 8, `${sites} sites`);
  await shot(page, `${prefix}-03-destination`);
  await page.getByRole('button', { name: new RegExp('^' + L.next + ' →$') }).click();

  // crew
  const adds = page.getByRole('button', { name: L.add });
  for (let i = 0; i < 3; i++) await adds.first().click();
  const disabledAdds = await page.locator('.cand .btn:disabled').count();
  if (lang === 'tr') {
    const names = await page.locator('.cand-id h3').allTextContents();
    check(`${prefix} Turkish game shows Turkish crew names`, names.some((n) => /[çğıöşüÇĞİÖŞÜ]|Can |Ece |Ada |Efe /.test(n)), names.slice(0, 4).join(', '));
  }
  const cards = await page.locator('.cand').count();
  check(`${prefix} all 16 candidates in one grid; 4th companion blocked`, cards === 16 && disabledAdds === 13, `${cards} cards, ${disabledAdds} disabled`);
  // bug fix: hovering never opens details; the Details button does, and several can stay open
  await page.locator('.cand').nth(1).hover();
  await page.waitForTimeout(300);
  check(`${prefix} hover does not open candidate details`, (await page.locator('.cand-details').count()) === 0);
  for (const n of [0, 1, 2]) await page.locator('.cand').nth(n).locator('.details-btn').click();
  await page.mouse.move(5, 5);
  await page.waitForTimeout(200);
  check(`${prefix} three candidates' details open side by side`, (await page.locator('.cand-details').count()) === 3);
  await shot(page, `${prefix}-04-crew`);
  await page.locator('.cand').nth(1).locator('.details-btn').click();
  check(`${prefix} details close only via the button`, (await page.locator('.cand-details').count()) === 2);
  if (viewport.width > 1100) {
    // the crew profile stays in view while the list scrolls
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(300);
    const top = (await page.locator('.crew-summary').boundingBox())?.y ?? -1;
    check(`${prefix} crew profile scrolls along (sticky)`, top >= 0 && top < 120, `top=${Math.round(top)}`);
    await page.mouse.wheel(0, -1200);
  }
  await noHorizontalOverflow(page, `${prefix} crew`);
  await page.getByRole('button', { name: new RegExp('^' + L.next + ' →$') }).click();

  // cargo
  for (const label of cargo) await page.getByRole('button', { name: label }).click();
  const cap = await page.locator('.cap-readout strong').textContent();
  await shot(page, `${prefix}-05-cargo`);
  await noHorizontalOverflow(page, `${prefix} cargo`);
  check(`${prefix} launch mass shown`, /kg \/ 520 kg/.test(cap ?? ''), cap ?? '');
  const goalText = await page.locator('[data-testid="stay-goal"]').first().textContent();
  check(`${prefix} estimated stay and goal shown before launch`, /\d+/.test(goalText ?? ''), (goalText ?? '').slice(0, 90));
  await page.getByRole('button', { name: new RegExp('^' + L.next + ' →$') }).click();

  // back to identity: skills unchanged, name kept (escaped)
  await page.locator('.stepper li').first().locator('button').click();
  const skillsAfter = await page.locator('.identity .statbar-val').allTextContents();
  check(`${prefix} going back keeps skills`, JSON.stringify(skillsBefore) === JSON.stringify(skillsAfter));
  const nameNow = await page.locator('.identity input').inputValue();
  check(`${prefix} custom name kept as text`, nameNow === 'Test <b>Pilot</b>', nameNow);
  await page.locator('.stepper li').nth(4).locator('button').click();

  // briefing + launch
  await page.locator('.sw-brief').waitFor({ timeout: 5000 });
  check(`${prefix} briefing explains that real NASA events happen in the game`, (await page.locator('[data-testid="sw-explain"]').count()) === 1);
  check(`${prefix} briefing shows the mission's real space-weather window`, /DONKI/.test((await page.locator('.sw-brief').textContent()) ?? ''));
  await shot(page, `${prefix}-06-briefing`);
  await page.getByRole('button', { name: new RegExp(L.launch) }).dblclick();
  await page.locator('.transit').waitFor();
  await page.locator('.event-card').waitFor({ timeout: 15000 });
  await shot(page, `${prefix}-07-transit`);
  await resolveOpenEvent(page, `${prefix}-out`, 0);

  // landing
  await page.getByRole('button', { name: L.start }).waitFor();
  check(`${prefix} landing reveals the site`, (await page.locator('[data-testid="landing-reveal"]').count()) === 1);
  await shot(page, `${prefix}-07b-landing`);
  await page.getByRole('button', { name: L.start }).click();
  await page.locator('.surface').waitFor();
  await shot(page, `${prefix}-08-surface-start`);
  await noHorizontalOverflow(page, `${prefix} surface`);
  const speedLabel = await page.locator('.speed-label').textContent().catch(() => '');
  const speedVisible = await page.locator('.speed-label').isVisible().catch(() => false);
  check(`${prefix} speed buttons are labelled`, (speedLabel ?? '').trim() === (lang === 'tr' ? 'Hız' : 'Speed'), `${speedLabel} visible=${speedVisible}`);
  const earth = await page.locator('.ta-earth').textContent();
  check(`${prefix} Earth time shown next to mission time`, /(Dünya|Earth)/.test(earth ?? ''), earth ?? '');
  if (dest === 'mars') {
    const delay = await page.locator('.ta-delay').textContent();
    check(`${prefix} Mars signal delay computed from the real date`, /JPL/.test(delay ?? ''), delay ?? '');
  }
  const sceneH0 = (await page.locator('.base-scene').boundingBox())?.height ?? 0;
  const day = await page.locator('.clock-day').textContent();
  check(`${prefix} 30-day clock`, /\/ 30/.test(day ?? '') && (dest !== 'mars' || /Sol/.test(day ?? '')), day ?? '');
  if (SHORT) {
    const caption = await page.locator('.scene-caption, .surface-caption').first().textContent().catch(() => '');
    if (caption) console.log(`  caption: ${caption}`);
    if (!(await page.locator('.event-card:visible').count())) {
      await page.locator('.go-home').click();
      await page.locator('[data-testid="return-home"]').waitFor({ timeout: 4000 });
      await page.locator('[data-testid="return-home"] .btn.primary').click();
      await page.locator('.go-home.booked').waitFor({ timeout: 4000 });
      const chip = (await page.locator('.cd-return').textContent()) ?? '';
      const status = (await page.locator('.status').textContent()) ?? '';
      check(`${prefix} the departure is booked (13:00 window) and the clock runs on`, /\d/.test(chip) && !/(by you|tarafından)/.test(status), `${chip} · ${status}`);
      await shot(page, `${prefix}-08b-departure-booked`);
      await noHorizontalOverflow(page, `${prefix} surface after booking`);
    }
    check(`${prefix} no console errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
    return;
  }

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
  let forecastDone = false;
  let goneHome = false;
  let habChecked = false;
  while (Date.now() - t0 < 720000) {
    if (await page.locator('.debrief').count()) break;
    // night: all four crew members fit inside the habitat (bug: the 4th was drawn outside)
    if (!habChecked) {
      const hh = Number(((await page.locator('.clock-time').textContent().catch(() => '')) ?? '').slice(0, 2));
      if (hh >= 23 || (hh >= 0 && hh < 5)) {
        const xs = await page.evaluate(() =>
          [...document.querySelectorAll('.base-scene g[transform$=" 336)"]')].map((g) => Number(g.getAttribute('transform').match(/translate\(([\d.]+)/)[1])),
        );
        if (xs.length >= 3) {
          habChecked = true;
          check(`${prefix} every crew member sleeps inside the habitat`, xs.every((x) => x >= 455 && x <= 585), xs.join(','));
          await shot(page, `${prefix}-08b-night-hab`);
        }
      }
    }
    // forecasts no longer stop the clock: a banner with a link to the plan
    const fc = page.locator('.fc-banner');
    if (!forecastDone && (await fc.count()) && !(await page.locator('.event-card:visible').count())) {
      forecastDone = true;
      const text = await fc.locator('.fc-text').textContent();
      const st = await page.locator('.status').textContent();
      check(`${prefix} forecast banner shows a countdown without pausing`, /\d/.test(text ?? '') && !/(decision|karar)/i.test(st ?? ''), `${text} | ${st}`);
      await shot(page, `${prefix}-09c-forecast`);
      await fc.locator('.btn.primary').click();
      await page.locator('.prep-card').first().waitFor({ timeout: 4000 });
      const chips = await page.locator('.cd-chip').count();
      check(`${prefix} countdown chips in the top bar`, chips >= 2, `${chips}`);
      const startBtn = page.locator('.prep-action .btn.primary:not(:disabled)').first();
      if (await startBtn.count()) {
        await startBtn.click();
        await page.waitForTimeout(300);
        const st = await page.locator('.prep-action.doing, .prep-action.done, .prep-action.failed').count();
        check(`${prefix} a preparation task can be started`, st > 0, `${st}`);
      } else {
        // everyone may be busy right now: then each task must say why it is locked
        const locked = await page.locator('.prep-action.locked .locks li, .prep-action .prep-status').count();
        check(`${prefix} a preparation task can be started (or explains why not)`, locked > 0, `${locked} lock reasons`);
      }
      await shot(page, `${prefix}-09d-plan`);
      await page.getByRole('tab').nth(0).click();
      continue;
    }
    const ev = page.locator('.event-card:not(.result)');
    if (await ev.count()) {
      const status = await page.locator('.status').textContent().catch(() => '');
      if (i === 1) {
        const bubble = await page.locator('.chat-bubble').count();
        console.log(`   ${prefix} chat bubble visible before event 2: ${bubble > 0}`);
      }
      if (i === 0) {
        check(`${prefix} clock shows decision pause`, /(decision|karar)/i.test(status ?? ''), status ?? '');
        const sceneH1 = (await page.locator('.base-scene').boundingBox())?.height ?? 0;
        check(`${prefix} the base scene keeps its size when a card opens`, Math.abs(sceneH1 - sceneH0) < 2, `${sceneH0.toFixed(0)} → ${sceneH1.toFixed(0)} px`);
        await shot(page, `${prefix}-09-event`);
      }
      // mid-game: switch language and reload once; the run must survive both
      if (i === 2 && !langToggled) {
        langToggled = true;
        const title1 = await page.locator('#event-title').textContent();
        await page.locator('.lang-switch button').nth(lang === 'tr' ? 0 : 1).click();
        // the Turkish dictionary is a lazy chunk: wait for the re-render
        await page.waitForFunction((t) => document.querySelector('#event-title')?.textContent !== t, title1, { timeout: 5000 }).catch(() => {});
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
      // mobile: use "Go home" partway through (early return flow)
      if (prefix.startsWith('mob') && i >= 9 && !goneHome && !(await page.locator('.event-card:visible').count())) {
        goneHome = true;
        await page.locator('.go-home').click();
        await page.locator('[data-testid="return-home"]').waitFor({ timeout: 4000 });
        const lines = await page.locator('.ret-lines li').count();
        check(`${prefix} "go home" lists what the trip needs`, lines === 4, `${lines} lines`);
        await shot(page, `${prefix}-12c-go-home`);
        await page.locator('[data-testid="return-home"] .btn.primary').click();
        // v0.8: the ascent leaves in the next 13:00 window; the HUD shows the booked departure
        await page.locator('.go-home.booked').waitFor({ timeout: 4000 });
        check(`${prefix} the departure is booked`, true);
      }
      if (i === 4) {
        await page.getByRole('tab').nth(2).click();
        await shot(page, `${prefix}-10-crew-tab`);
        await page.getByRole('tab').nth(3).click();
        await shot(page, `${prefix}-11-log-tab`);
        await page.getByRole('tab').nth(4).click();
        await page.locator('.research-item', { hasText: lang === 'tr' ? 'Su–oksijen' : 'water–oxygen' }).click();
        await page.locator('.research-card').waitFor({ timeout: 5000 });
        await shot(page, `${prefix}-12-research`);
        const st = await page.locator('.status').textContent();
        // research pauses the clock (a decision that opened at the same moment takes precedence in the label)
        check(`${prefix} research pauses the clock`, /(research|araştırma|decision|karar)/i.test(st ?? ''), st ?? '');
        await page.keyboard.press('Escape');
        await page.getByRole('tab').nth(0).click();
      }
      continue;
    }
    if (!shotChat && (await page.locator('.chat-bubble').count())) {
      shotChat = true;
      await shot(page, `${prefix}-09b-chat`);
    }
    // lazy screens: React keeps the previous screen in the DOM (hidden) while the next chunk loads
    if (await page.locator('.transit:visible').count()) {
      await page.locator('.event-card:visible').first().waitFor({ timeout: 15000 }).catch(() => {});
      continue;
    }
    await page.waitForTimeout(250);
  }
  const atDebrief = (await page.locator('.debrief').count()) > 0;
  if (atDebrief) {
    await page.locator('.debrief .link-btn').first().click();
    const chats = await page.locator('.j-chat').count();
    check(`${prefix} crew chatter happened between decisions`, chats >= 5, `${chats} chat lines`);
    const bulletins = await page.locator('.j-sw').count();
    const nasaLinks = await page.locator('.j-sw a[href*="nasa.gov"]').count();
    check(`${prefix} real NASA bulletins reached the base, with record links`, bulletins >= 1 && nasaLinks >= 1, `${bulletins} bulletins, ${nasaLinks} links`);
  }
  check(`${prefix} reached debrief`, atDebrief, `${i} decisions`);
  if (atDebrief) {
    await shot(page, `${prefix}-13-debrief`);
    await page.screenshot({ path: `${OUT}${prefix}-13-debrief-full.png`, fullPage: true });
    await noHorizontalOverflow(page, `${prefix} debrief`);
    const rating = await page.locator('.debrief-hero-text h2').textContent();
    console.log(`   ${prefix} outcome: ${rating}`);
    // recap film: canvas drawn, image card and video downloads
    await page.locator('.recap-canvas').scrollIntoViewIfNeeded();
    const painted = await page.evaluate(() => {
      const c = document.querySelector('.recap-canvas');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let k = 0; k < d.length; k += 400) if (d[k] + d[k + 1] + d[k + 2] > 120) lit++;
      return lit;
    });
    check(`${prefix} recap film is drawn`, painted > 20, `${painted} bright samples`);
    const [png] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.getByRole('button', { name: lang === 'tr' ? /Görsel kartı/ : /image card/ }).click()]);
    await png.saveAs(`${OUT}${prefix}-recap.png`);
    check(`${prefix} recap image card downloads`, png.suggestedFilename().endsWith('.png'), png.suggestedFilename());
    if (prefix.startsWith('desk')) {
      await page.waitForTimeout(6000);
      await shot(page, `${prefix}-14-recap`);
      const [vid] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: lang === 'tr' ? /Videoyu kaydet/ : /Save video/ }).click()]);
      await vid.saveAs(`${OUT}${prefix}-recap-${vid.suggestedFilename()}`);
      check(`${prefix} recap video records and downloads`, /\.(webm|mp4)$/.test(vid.suggestedFilename()), vid.suggestedFilename());
    }
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
    offline: true,
    cargo: ['Add one Sealant patch kit', 'Add one Food pack', 'Add one Soybean seed kit', 'Add one Medical kit'],
  });
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
