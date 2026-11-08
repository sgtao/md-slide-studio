import { expect, test, type Page } from '@playwright/test';

// 閲覧UI（v0.6.1）: サムネ帯（T）・一覧グリッド（G）・ページ指定移動（J / Home / End / URL #番号）。
// アプリのプレビュー（React）と、アプリから書き出したHTML（core/standalone/overviewRuntime.ts）の
// 両方で同じ操作を確認する。DOM の id・クラス名・キーは両者で共通。

const TOTAL = 30;

/** 30枚のデッキ（サムネの遅延生成を確かめられる枚数）。point 付きのスライドを混ぜる */
function buildDeck(): string {
  const slides = Array.from({ length: TOTAL }, (_, i) => {
    const n = i + 1;
    const point = n % 5 === 0 ? `\npoint: ${n}枚目のポイント` : '';
    return `<!-- slide: points -->\n## スライド${n}${point}\n- **要点${n}**：説明${n}\n- **要点${n}-b**：説明${n}-b`;
  });
  return `---\ntitle: E2E overview\npalette: ocean\n---\n${slides.join('\n---\n')}\n`;
}
const deck = buildDeck();

const counter = (page: Page) => page.locator('#slide-counter');
const strip = (page: Page) => page.locator('#thumb-strip');
const grid = (page: Page) => page.locator('#overview-grid');
const builtThumbs = (page: Page, container: 'strip' | 'grid') =>
  page.locator(`#${container === 'strip' ? 'thumb-strip' : 'overview-grid'} .thumb-stage .slide`);

/** 枚数が同じでも、入力したデッキがプレビューに反映されるまで待つ（ノート付きデッキは .slide-notes の出現で判定） */
async function deckApplied(page: Page, md: string) {
  if (md.includes('\nnote:')) await expect(page.locator('.slide-notes')).toHaveCount(1);
}

async function openApp(page: Page, md: string = deck) {
  await page.goto('/');
  await page.locator('textarea').fill(md);
  await expect(page.locator('.slide-scaler .slide')).toHaveCount(TOTAL);
  await deckApplied(page, md);
  // キー操作がテキストエリアに奪われないよう、フォーカスをプレビュー側へ移す
  await page.locator('.preview-pane').click({ position: { x: 5, y: 5 } });
}

async function exportHtml(
  page: Page,
  testInfo: { outputPath: (n: string) => string },
  md: string = deck,
) {
  await page.goto('/');
  await page.locator('textarea').fill(md);
  await expect(page.locator('.slide-scaler .slide')).toHaveCount(TOTAL);
  await deckApplied(page, md);
  await page.locator('#export-toggle').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /HTMLとして保存/ }).click();
  const file = testInfo.outputPath('overview-exported.html');
  await (await downloadPromise).saveAs(file);
  return file;
}

/** ノートが1枚あるデッキ（🗒️ ボタンも出る＝右上は7ボタン） */
const deckWithNotes = deck.replace('## スライド3\n', '## スライド3\nnote: 3枚目のノート\n');

/** 右上ボタン（トグル類）の id・位置・無効状態 */
async function clusterButtons(page: Page) {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        '.control-cluster > button, .control-cluster .palette-menu > button, .control-cluster .export-menu > button',
      ),
    ).map((b) => {
      const r = b.getBoundingClientRect();
      return {
        id: b.id,
        x: Math.round(r.x),
        shown: r.width > 0 && getComputedStyle(b).display !== 'none',
        disabled: (b as HTMLButtonElement).disabled,
      };
    }),
  );
}

/**
 * ボタンの数と位置はビュー（list / hero / グリッド）で変わらない。
 * 🗒️・🎞️ も隠さず、どのビューでも押せる（無効になるのは「編集のみ」レイアウトだけ）。
 */
async function exerciseFixedButtons(page: Page, hasNotes: boolean) {
  const expectedIds = [
    ...(hasNotes ? ['notes-toggle'] : []),
    'theme-toggle',
    'view-toggle',
    'grid-toggle',
    'strip-toggle',
    'palette-toggle',
    'export-toggle',
  ];
  // hero に揃えてから測る（ビュー切替ボタンは hero で ☰、list で ▭ を表示する）
  if ((await page.locator('#view-toggle').textContent())?.trim() !== '☰')
    await page.keyboard.press('v');
  await expect(page.locator('#view-toggle')).toHaveText('☰');
  await expect(counter(page)).toBeVisible();
  const hero = await clusterButtons(page);
  expect(hero.map((b) => b.id)).toEqual(expectedIds);
  expect(hero.every((b) => b.shown)).toBe(true);
  expect(hero.every((b) => !b.disabled)).toBe(true);

  // list（V）: 数も位置も同じ。全部押せる
  await page.keyboard.press('v');
  await expect(counter(page)).toBeHidden();
  const list = await clusterButtons(page);
  expect(list.map((b) => ({ id: b.id, x: b.x, shown: b.shown }))).toEqual(
    hero.map((b) => ({ id: b.id, x: b.x, shown: b.shown })),
  );
  expect(list.every((b) => !b.disabled)).toBe(true);

  // グリッド（G）: 同じ
  await page.keyboard.press('g');
  await expect(grid(page)).toBeVisible();
  const g = await clusterButtons(page);
  expect(g.map((b) => ({ id: b.id, x: b.x, shown: b.shown }))).toEqual(
    hero.map((b) => ({ id: b.id, x: b.x, shown: b.shown })),
  );
  expect(g.every((b) => !b.disabled)).toBe(true);

  // 戻す（Esc でグリッドを閉じ、V で hero へ）
  await page.keyboard.press('Escape');
  await expect(grid(page)).toBeHidden();
  await page.keyboard.press('v');
  await expect(counter(page)).toBeVisible();
  const back = await clusterButtons(page);
  expect(back).toEqual(hero);
}

const popup = (page: Page) => page.locator('#notes-popup');
const currentThumbNum = (page: Page) => strip(page).locator('.thumb.is-current .thumb-num');
async function toList(page: Page) {
  if ((await page.locator('#view-toggle').textContent())?.trim() === '☰')
    await page.keyboard.press('v');
  await expect(page.locator('#view-toggle')).toHaveText('▭');
}
async function toHero(page: Page) {
  if ((await page.locator('#view-toggle').textContent())?.trim() !== '☰')
    await page.keyboard.press('v');
  await expect(page.locator('#view-toggle')).toHaveText('☰');
}

/**
 * どのビューからでも、1回のキー／ボタンで目的に届く（ノートのあるデッキ）。
 *  - list でもサムネ帯（T）を出せ、クリックでそのスライドまでスクロールする（1枚表示には切り替えない）
 *  - list では「見えているスライド」が現在のスライドになる（サムネ帯の強調・Home/End・V・N・J の基準）
 *  - list・グリッド中の N / J は hero に移って実行、グリッド中の T はグリッドを閉じて帯を開く
 */
async function exerciseOneStep(page: Page) {
  const slideAt = (i: number) => page.locator('.slide-scaler .slide').nth(i);
  await toList(page);

  // list でサムネ帯を開く。クリックでそのスライドへスクロール（list のまま）
  await expect(strip(page)).toBeHidden();
  await page.keyboard.press('t');
  await expect(strip(page)).toBeVisible();
  await expect(strip(page)).toBeInViewport();
  await strip(page).locator('.thumb[data-index="9"]').click();
  await expect(slideAt(9)).toBeInViewport({ ratio: 0.5 });
  await expect(currentThumbNum(page)).toHaveText('10');
  await expect(page.locator('#view-toggle')).toHaveText('▭'); // list のまま

  // スクロールに現在のスライドが追従する
  await slideAt(20).evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await expect(currentThumbNum(page)).toHaveText('21');

  // Home / End は list では先頭・末尾へスクロール
  await page.keyboard.press('End');
  await expect(currentThumbNum(page)).toHaveText(`${TOTAL}`);
  await expect(slideAt(TOTAL - 1)).toBeInViewport({ ratio: 0.5 });
  await page.keyboard.press('Home');
  await expect(currentThumbNum(page)).toHaveText('1');
  await expect(slideAt(0)).toBeInViewport({ ratio: 0.5 });

  // V で hero に戻ると、list で見ていたスライドが開く
  await strip(page).locator('.thumb[data-index="14"]').click();
  await expect(currentThumbNum(page)).toHaveText('15');
  await page.keyboard.press('v');
  await expect(counter(page)).toHaveText(`15 / ${TOTAL}`);

  // list で N: hero に移って、見ていたスライドのノートを開く（3枚目にだけノートがある）
  await toList(page);
  await strip(page).locator('.thumb[data-index="2"]').click();
  await expect(currentThumbNum(page)).toHaveText('3');
  await page.keyboard.press('n');
  await expect(counter(page)).toHaveText(`3 / ${TOTAL}`);
  await expect(popup(page)).toBeVisible();
  await expect(popup(page)).toContainText('3枚目のノート');
  await page.keyboard.press('n');
  await expect(popup(page)).toBeHidden();

  // list で 🗒️ ボタン: 同じ
  await toList(page);
  await page.locator('#notes-toggle').click();
  await expect(popup(page)).toBeVisible();
  await page.keyboard.press('n');
  await expect(popup(page)).toBeHidden();

  // list で J: hero に移って番号入力に入る
  await toList(page);
  await page.keyboard.press('j');
  await expect(page.locator('#view-toggle')).toHaveText('☰');
  await expect(page.locator('#slide-counter .counter-input')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#slide-counter .counter-input')).toHaveCount(0);

  // グリッド中の T: グリッドを閉じて、直前のビューでサムネ帯を開く（帯は開いたまま）
  await page.keyboard.press('g');
  await expect(grid(page)).toBeVisible();
  await page.keyboard.press('t');
  await expect(grid(page)).toBeHidden();
  await expect(strip(page)).toBeVisible();
  await page.keyboard.press('t'); // 帯を閉じる

  // グリッド中の N: hero に移ってノートを開く（グリッドの現在ページ＝3枚目）
  await toHero(page);
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(counter(page)).toHaveText(`3 / ${TOTAL}`);
  await page.keyboard.press('g');
  await expect(grid(page)).toBeVisible();
  await page.keyboard.press('n');
  await expect(grid(page)).toBeHidden();
  await expect(popup(page)).toBeVisible();
  await page.keyboard.press('n');
  await expect(popup(page)).toBeHidden();

  // グリッド中の J: hero に移って番号入力に入る
  await page.keyboard.press('g');
  await expect(grid(page)).toBeVisible();
  await page.keyboard.press('j');
  await expect(grid(page)).toBeHidden();
  await expect(page.locator('#slide-counter .counter-input')).toBeFocused();
}

/** ページ指定移動（J / Home / End / カウンタークリック）。hero で開始している前提 */
async function exerciseJump(page: Page) {
  await expect(counter(page)).toHaveText(`1 / ${TOTAL}`);

  // End / Home で末尾・先頭へ
  await page.keyboard.press('End');
  await expect(counter(page)).toHaveText(`${TOTAL} / ${TOTAL}`);
  await page.keyboard.press('Home');
  await expect(counter(page)).toHaveText(`1 / ${TOTAL}`);

  // J で数字入力欄に変わり、Enter で移動する
  await page.keyboard.press('j');
  const input = page.locator('#slide-counter .counter-input');
  await expect(input).toBeFocused();
  await input.fill('12');
  await page.keyboard.press('Enter');
  await expect(input).toHaveCount(0);
  await expect(counter(page)).toHaveText(`12 / ${TOTAL}`);
  await expect(page.locator('.slide.active')).toContainText('スライド12');

  // 範囲外は先頭・末尾に丸める
  await page.keyboard.press('j');
  await input.fill('999');
  await page.keyboard.press('Enter');
  await expect(counter(page)).toHaveText(`${TOTAL} / ${TOTAL}`);
  await page.keyboard.press('j');
  await input.fill('0');
  await page.keyboard.press('Enter');
  await expect(counter(page)).toHaveText(`1 / ${TOTAL}`);

  // Esc で取消（ページは変わらない）。入力欄の Esc はグリッド等へ伝わらない
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('j');
  await input.fill('20');
  await page.keyboard.press('Escape');
  await expect(input).toHaveCount(0);
  await expect(counter(page)).toHaveText(`2 / ${TOTAL}`);

  // 入力中は → や Home がページ移動にならない（入力欄の操作）
  await page.keyboard.press('j');
  await page.keyboard.press('Home');
  await expect(counter(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(counter(page)).toHaveText(`2 / ${TOTAL}`);

  // カウンターのクリックでも入力欄になる
  await counter(page).click();
  await expect(input).toBeFocused();
  await input.fill('7');
  await page.keyboard.press('Enter');
  await expect(counter(page)).toHaveText(`7 / ${TOTAL}`);
}

/** サムネ帯（T）。hero で開始している前提 */
async function exerciseStrip(page: Page) {
  // 既定は閉
  await expect(strip(page)).toBeHidden();
  await page.keyboard.press('t');
  await expect(strip(page)).toBeVisible();
  await expect(page.locator('#strip-toggle')).toHaveAttribute('aria-expanded', 'true');

  // 現在のページ（1枚目）が強調される
  await expect(strip(page).locator('.thumb.is-current')).toHaveCount(1);
  await expect(strip(page).locator('.thumb.is-current .thumb-num')).toHaveText('1');

  // 遅延生成: 見える分だけ複製され、見えない分は未生成
  await expect.poll(async () => await builtThumbs(page, 'strip').count()).toBeGreaterThan(0);
  expect(await builtThumbs(page, 'strip').count()).toBeLessThan(TOTAL);
  await expect(strip(page).locator('.thumb[data-index="29"] .thumb-stage .slide')).toHaveCount(0);

  // スライド本体は帯に隠れない（スライド表示領域が帯の上に縮む）
  const stripTop = (await strip(page).boundingBox())!.y;
  const slideBottom =
    (await page.locator('.slide.active').boundingBox())!.y +
    (await page.locator('.slide.active').boundingBox())!.height;
  expect(slideBottom).toBeLessThanOrEqual(stripTop + 1);

  // サムネのクリックでそのページへ移動し、現在位置の強調が追従する
  await strip(page).locator('.thumb[data-index="3"]').click();
  await expect(counter(page)).toHaveText(`4 / ${TOTAL}`);
  await expect(strip(page).locator('.thumb.is-current .thumb-num')).toHaveText('4');

  // クリック後も Space は1回分だけスライド送りになる（フォーカスを奪わない）
  await page.keyboard.press('Space');
  await expect(counter(page)).toHaveText(`5 / ${TOTAL}`);

  // 末尾へ移動すると、帯が現在位置までスクロールして、そのサムネが生成・強調される
  await page.keyboard.press('End');
  await expect(counter(page)).toHaveText(`${TOTAL} / ${TOTAL}`);
  await expect(strip(page).locator('.thumb.is-current .thumb-num')).toHaveText(`${TOTAL}`);
  await expect(strip(page).locator('.thumb.is-current')).toBeInViewport();
  await expect(strip(page).locator('.thumb.is-current .thumb-stage .slide')).toHaveCount(1);

  // 複製は元のスライドと同じ見た目（opacity 1・同じ背景）で、表示中のスライドに id は付かない
  const cloneStyle = await strip(page)
    .locator('.thumb.is-current .thumb-stage .slide')
    .evaluate((el) => ({
      opacity: getComputedStyle(el).opacity,
      id: el.id,
      active: el.classList.contains('active'),
    }));
  expect(cloneStyle.opacity).toBe('1');
  expect(cloneStyle.id).toBe('');
  expect(cloneStyle.active).toBe(false);

  // T で閉じる。list（V）でも帯は出たままで、ボタンも押せる
  await page.keyboard.press('t');
  await expect(strip(page)).toBeHidden();
  await page.keyboard.press('t');
  await expect(strip(page)).toBeVisible();
  await page.keyboard.press('v');
  await expect(strip(page)).toBeVisible();
  await expect(page.locator('#strip-toggle')).toBeEnabled();
  await page.keyboard.press('v');
  await expect(strip(page)).toBeVisible();
  // ボタンでも開閉できる
  await page.locator('#strip-toggle').click();
  await expect(strip(page)).toBeHidden();
}

/** 一覧グリッド（G）。hero で開始している前提・1枚目 */
async function exerciseGrid(page: Page) {
  await expect(grid(page)).toBeHidden();
  await expect(page.locator('#grid-toggle')).toBeVisible();

  // G で開く: 現在のページが強調され、フォーカスされる。遅延生成で全部は作らない
  await page.keyboard.press('g');
  await expect(grid(page)).toBeVisible();
  await expect(page.locator('#grid-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(grid(page).locator('.thumb')).toHaveCount(TOTAL);
  await expect(grid(page).locator('.thumb.is-current')).toHaveCount(1);
  await expect(grid(page).locator('.thumb[data-index="0"]')).toBeFocused();
  await expect.poll(async () => await builtThumbs(page, 'grid').count()).toBeGreaterThan(0);
  expect(await builtThumbs(page, 'grid').count()).toBeLessThan(TOTAL);

  // 矢印キーでフォーカス移動（ページ送りにはならない）。→ ↓ ← ↑
  await page.keyboard.press('ArrowRight');
  await expect(grid(page).locator('.thumb[data-index="1"]')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  const idxAfterDown = Number(
    await page.evaluate(() => (document.activeElement as HTMLElement).dataset.index),
  );
  expect(idxAfterDown).toBeGreaterThan(1); // 次の行（狭いペインでは1列なので 2）
  await page.keyboard.press('ArrowUp');
  await expect(grid(page).locator('.thumb[data-index="1"]')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(grid(page).locator('.thumb[data-index="0"]')).toBeFocused();
  await page.keyboard.press('End');
  await expect(grid(page).locator(`.thumb[data-index="${TOTAL - 1}"]`)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(grid(page).locator('.thumb[data-index="0"]')).toBeFocused();
  // 現在のページ（強調）はフォーカス移動では変わらない
  await expect(grid(page).locator('.thumb.is-current .thumb-num')).toHaveText('1');

  // Enter で、そのページを hero で開く
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(grid(page)).toBeHidden();
  await expect(counter(page)).toHaveText(`3 / ${TOTAL}`);

  // G → Esc で直前のビューへ戻る（hero）。現在のページは変わらない
  await page.keyboard.press('g');
  await expect(grid(page)).toBeVisible();
  await expect(grid(page).locator('.thumb.is-current .thumb-num')).toHaveText('3');
  await page.keyboard.press('Escape');
  await expect(grid(page)).toBeHidden();
  await expect(counter(page)).toHaveText(`3 / ${TOTAL}`);

  // G もう一度で閉じる（grid ⇄ 直前のビュー）
  await page.keyboard.press('g');
  await expect(grid(page)).toBeVisible();
  await page.keyboard.press('g');
  await expect(grid(page)).toBeHidden();

  // クリックでそのページの hero へ
  await page.locator('#grid-toggle').click();
  await expect(grid(page)).toBeVisible();
  await grid(page).locator('.thumb[data-index="8"]').click();
  await expect(grid(page)).toBeHidden();
  await expect(counter(page)).toHaveText(`9 / ${TOTAL}`);

  // list から G を開いて Esc で閉じると list に戻る
  await page.keyboard.press('v');
  await expect(counter(page)).toBeHidden();
  await page.keyboard.press('g');
  await expect(grid(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(grid(page)).toBeHidden();
  await expect(counter(page)).toBeHidden();
  // list から開いたグリッドのクリックは hero で開く
  await page.keyboard.press('g');
  await grid(page).locator('.thumb[data-index="14"]').click();
  await expect(counter(page)).toHaveText(`15 / ${TOTAL}`);
}

test.describe('閲覧UI（アプリのプレビュー）', () => {
  test('どのビューからも1回のキー／ボタンで届く（list のサムネ帯・N・J・T）', async ({ page }) => {
    await openApp(page, deckWithNotes);
    await exerciseOneStep(page);
  });

  test('右上ボタンの数と位置はビューで変わらない（ノートなし6個・あり7個）', async ({ page }) => {
    await openApp(page);
    await exerciseFixedButtons(page, false);
    await openApp(page, deckWithNotes);
    await exerciseFixedButtons(page, true);
  });

  test('J / Home / End / カウンタークリックでページ指定移動できる', async ({ page }) => {
    await openApp(page);
    await exerciseJump(page);
  });

  test('T でサムネ帯が開閉し、クリックで移動・現在位置が強調される', async ({ page }) => {
    await openApp(page);
    await exerciseStrip(page);
  });

  test('G で一覧グリッドが開き、キー操作・クリックで hero のそのページへ移動する', async ({
    page,
  }) => {
    await openApp(page);
    await exerciseGrid(page);
  });

  test('入力欄にフォーカス中は J / G / T / Home / End が効かない', async ({ page }) => {
    await page.goto('/');
    await page.locator('textarea').fill(deck);
    await expect(page.locator('.slide-scaler .slide')).toHaveCount(TOTAL);
    await page.locator('textarea').click();
    await page.keyboard.press('g');
    await page.keyboard.press('t');
    await expect(grid(page)).toHaveCount(0);
    await expect(strip(page)).toHaveCount(0);
    await expect(page.locator('#slide-counter .counter-input')).toHaveCount(0);
  });

  test('ノートポップアップとグリッドは同時に出ない', async ({ page }) => {
    await page.goto('/');
    await page.locator('.preview-pane').click({ position: { x: 5, y: 5 } });
    // サンプルデッキ（note: あり）
    await page.keyboard.press('n');
    await expect(page.locator('#notes-popup')).toBeVisible();
    await page.keyboard.press('g');
    await expect(grid(page)).toBeVisible();
    await expect(page.locator('#notes-popup')).toBeHidden();
    await expect(page.locator('#notes-toggle')).toBeEnabled(); // 消えず、押せる（押すと hero へ移る）
    await page.keyboard.press('Escape');
    await expect(grid(page)).toBeHidden();
    await expect(page.locator('#notes-popup')).toBeVisible();
  });
});

test.describe('閲覧UI（書き出しHTML）', () => {
  test('どのビューからも1回のキー／ボタンで届く（list のサムネ帯・N・J・T）', async ({
    page,
  }, testInfo) => {
    const file = await exportHtml(page, testInfo, deckWithNotes);
    await page.goto(`file://${file}`);
    await exerciseOneStep(page);
  });

  test('右上ボタンの数と位置はビューで変わらない（ノートなし6個・あり7個）', async ({
    page,
  }, testInfo) => {
    const file = await exportHtml(page, testInfo);
    await page.goto(`file://${file}`);
    await exerciseFixedButtons(page, false);
    const fileNotes = await exportHtml(page, testInfo, deckWithNotes);
    await page.goto(`file://${fileNotes}`);
    await exerciseFixedButtons(page, true);
  });

  test('J / Home / End / カウンタークリックでページ指定移動できる', async ({ page }, testInfo) => {
    const file = await exportHtml(page, testInfo);
    await page.goto(`file://${file}`);
    await page.keyboard.press('v');
    await exerciseJump(page);
  });

  test('T でサムネ帯が開閉し、クリックで移動・現在位置が強調される', async ({ page }, testInfo) => {
    const file = await exportHtml(page, testInfo);
    await page.goto(`file://${file}`);
    await page.keyboard.press('v');
    await exerciseStrip(page);
  });

  test('G で一覧グリッドが開き、キー操作・クリックで hero のそのページへ移動する', async ({
    page,
  }, testInfo) => {
    const file = await exportHtml(page, testInfo);
    await page.goto(`file://${file}`);
    await page.keyboard.press('v');
    await exerciseGrid(page);
  });

  test('URL #番号 で開くとそのページを hero で表示し、移動するたびに # が更新される', async ({
    page,
  }, testInfo) => {
    const file = await exportHtml(page, testInfo);
    await page.goto(`file://${file}#12`);
    await expect(counter(page)).toHaveText(`12 / ${TOTAL}`);
    await expect(page.locator('.slide.active')).toContainText('スライド12');
    await expect(page.locator('html')).toHaveAttribute('data-view', 'hero');

    await page.keyboard.press('ArrowRight');
    await expect(counter(page)).toHaveText(`13 / ${TOTAL}`);
    expect(new URL(page.url()).hash).toBe('#13');
    await page.keyboard.press('End');
    expect(new URL(page.url()).hash).toBe(`#${TOTAL}`);

    // 履歴は増やさない（replaceState）
    const historyLength = await page.evaluate(() => history.length);
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
    expect(new URL(page.url()).hash).toBe('#2');

    // アドレス欄でハッシュを変えると追従する
    await page.evaluate(() => {
      location.hash = '#20';
    });
    await expect(counter(page)).toHaveText(`20 / ${TOTAL}`);
  });

  test('範囲外の #番号 は先頭・末尾に丸める。# が無ければ従来どおり list で開く', async ({
    page,
  }, testInfo) => {
    const file = await exportHtml(page, testInfo);
    await page.goto(`file://${file}#999`);
    await expect(counter(page)).toHaveText(`${TOTAL} / ${TOTAL}`);
    await page.goto(`file://${file}#0`);
    await page.reload();
    await expect(counter(page)).toHaveText(`1 / ${TOTAL}`);

    await page.goto(`file://${file}`);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-view', 'list');
    await expect(counter(page)).toHaveCount(1);
    await expect(counter(page)).toBeHidden();
    expect(new URL(page.url()).hash).toBe('');
  });

  test('書き出しHTMLに一覧・サムネ帯のボタンと入れ物が入り、既定は閉', async ({
    page,
  }, testInfo) => {
    const file = await exportHtml(page, testInfo);
    await page.goto(`file://${file}`);
    await expect(page.locator('#grid-toggle')).toBeVisible();
    await expect(page.locator('#strip-toggle')).toBeVisible(); // list でも消えない
    await expect(page.locator('#strip-toggle')).toBeEnabled();
    await expect(strip(page)).toBeHidden();
    await expect(grid(page)).toBeHidden();
    // 閉じている間はサムネを1つも作らない
    await expect(page.locator('.thumb')).toHaveCount(0);
  });
});
