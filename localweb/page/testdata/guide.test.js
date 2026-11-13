import { test, eq, assert, fixture } from './harness.js';
import { guideView, openGuide } from '/_kit/guide.js';
import { tour } from '/_kit/tour.js';
import { bar } from '/_kit/dom.js';

const data = () => ({
  tool: 'diazo',
  family: 'https://subaud.tools',
  fit: '# How they fit together\n\n## You ask\n\nYou tell your agent.',
  tools: [
    { name: 'diazo', summary: 'The planning page.', core: true, asks: ['Plan this with diazo: ‹idea›.', 'What waits on me?'],
      when: '- A change with a choice.', skip: '- A one-line fix.', where: 'First.', pointers: '- **Decide on the page.**' },
    { name: 'galley', summary: 'Revise a document.', core: true, asks: ['Let\'s use galley.'], when: '- Prose.', skip: '- Code.',
      where: 'After the plan.', pointers: '- Revise.', guide: 'https://galley.tools/guide/' },
    { name: 'sift', summary: 'Audits instruction files.', core: false, asks: ['Run a sift round.'], when: '- Big files.' },
  ],
});
const text = el => el.textContent.replace(/\s+/g, ' ').trim();

test('guide: opens on the tool you are in, with when, skip and its asks', () => {
  const v = guideView(data());
  fixture().append(v);
  const main = v.querySelector('.kit-guide-main');
  eq(main.querySelector('h2').textContent, 'diazo');
  assert(text(main).includes('The planning page.'));
  assert(text(main).includes('A change with a choice.') && text(main).includes('A one-line fix.'));
  eq([...main.querySelectorAll('.kit-guide-ask-text')].map(e => e.textContent), ['Plan this with diazo: ‹idea›.', 'What waits on me?']);
});

test('guide: where it sits and pointers wait behind More', () => {
  const v = guideView(data());
  fixture().append(v);
  const more = v.querySelector('.kit-guide-more');
  assert(more && !more.open, 'More is closed');
  assert(text(more).includes('First.') && text(more).includes('Decide on the page.'));
  eq(more.querySelector('summary').textContent, 'More');
});

test('guide: each ask has Copy, which copies the ask', async () => {
  const copied = [];
  const v = guideView(data(), { copy: async s => copied.push(s) });
  fixture().append(v);
  const b = v.querySelector('.kit-guide-ask button');
  eq(b.textContent, 'Copy');
  b.click();
  await new Promise(r => setTimeout(r, 0));
  eq(copied, ['Plan this with diazo: ‹idea›.']);
  eq(b.textContent, 'Copied');
});

test('guide: the side lists core tools, the rest folded under Also installed, and How they fit together', () => {
  const v = guideView(data());
  fixture().append(v);
  const side = v.querySelector('.kit-guide-side');
  eq([...side.querySelectorAll('.kit-guide-core .kit-guide-pick')].map(e => e.textContent), ['diazo', 'galley']);
  const also = side.querySelector('details.kit-guide-also');
  assert(also && !also.open, 'Also installed is folded');
  eq(also.querySelector('summary').textContent, 'Also installed');
  eq([...also.querySelectorAll('.kit-guide-pick')].map(e => e.textContent), ['sift']);
  assert(side.querySelector('[data-pick="diazo"]').classList.contains('on'));
  const fit = side.querySelector('[data-pick="fit"]');
  eq(fit.textContent, 'How they fit together');
  fit.click();
  assert(text(v.querySelector('.kit-guide-main')).includes('You tell your agent.'));
  eq(v.querySelector('.kit-guide-main h2').textContent, 'How they fit together');
  const family = side.querySelector('a.kit-guide-family');
  eq(family.getAttribute('href'), 'https://subaud.tools');
});

test('guide: another tool opens in the main pane, with its public guide page', () => {
  const v = guideView(data());
  fixture().append(v);
  v.querySelector('[data-pick="galley"]').click();
  eq(v.querySelector('.kit-guide-main h2').textContent, 'galley');
  eq(v.querySelector('.kit-guide-main a.kit-guide-public').getAttribute('href'), 'https://galley.tools/guide/');
  v.querySelector('[data-pick="sift"]').click();
  const main = v.querySelector('.kit-guide-main');
  assert(text(main).includes('Big files.') && !main.querySelector('.kit-guide-more'), 'a light entry has no More');
});

test('guide: Show me around only when the page registered a tour, on its own tool', async () => {
  fixture().innerHTML = '<button id="x">x</button>';
  let started = 0;
  const t = tour([{ id: 'x', target: '#x', note: 'x' }], { seenKey: 'kit.tour.guide' });
  t.start = () => started++;
  let closed = 0;
  const v = guideView(data(), { tour: t, onTour: () => closed++ });
  fixture().append(v);
  const b = v.querySelector('.kit-guide-tour');
  eq(b.textContent, 'Show me around');
  b.click();
  eq([started, closed], [1, 1]);
  v.querySelector('[data-pick="galley"]').click();
  assert(!v.querySelector('.kit-guide-tour'), 'not on another tool');
  assert(!guideView(data()).querySelector('.kit-guide-tour'), 'not without a tour');
});

test('openGuide: loads /api/kit/guide into a dialog, and Esc closes it', async () => {
  const real = window.fetch;
  const asked = [];
  window.fetch = async url => { asked.push(String(url)); return new Response(JSON.stringify(data()), { headers: { 'Content-Type': 'application/json' } }); };
  try {
    const s = await openGuide();
    eq(asked, ['/api/kit/guide']);
    const dlg = document.querySelector('.kit-guide-sheet[role="dialog"]');
    assert(dlg && dlg.querySelector('.kit-guide-main h2').textContent === 'diazo');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert(!document.querySelector('.kit-guide-sheet'), 'closed');
    assert(s);
  } finally {
    window.fetch = real;
  }
});

test('bar: every page has Guide, left of the theme control, and it opens the guide', async () => {
  const real = window.fetch;
  window.fetch = async () => new Response(JSON.stringify(data()));
  try {
    const b = bar({ brand: { name: 't' } });
    fixture().append(b.el);
    const g = b.el.querySelector('.kit-guide-btn');
    eq(g.textContent, 'Guide');
    assert(g.compareDocumentPosition(b.themeControl) & Node.DOCUMENT_POSITION_FOLLOWING, 'left of theme');
    g.click();
    await new Promise(r => setTimeout(r, 30));
    const dlg = document.querySelector('.kit-guide-sheet');
    assert(dlg, 'guide opened');
    dlg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  } finally {
    window.fetch = real;
  }
});
