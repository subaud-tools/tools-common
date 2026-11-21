import { test, eq, assert, fixture } from './harness.js';
import { zoomable, viewer } from '/_kit/viewer.js';

const over = () => document.querySelector('.kit-viewer');
const shut = () => { while (over()) over().remove(); };

function tableHolder() {
  const fx = fixture();
  const holder = document.createElement('div');
  holder.innerHTML = '<table id="t"><thead><tr><th>Item</th><th>Why</th></tr></thead>'
    + '<tbody><tr><td>#47</td><td>a long reason</td></tr></tbody></table>';
  fx.append(holder);
  return { holder, table: holder.querySelector('table') };
}

test('zoomable: a ⤢ button on the holder, named for the caption', () => {
  shut();
  const { holder, table } = tableHolder();
  const mark = zoomable(holder, () => table, 'Now (13)');
  assert(mark instanceof HTMLButtonElement, 'returns the mark');
  assert(mark.parentElement === holder, 'the mark is in the holder');
  eq(mark.className, 'kit-grow');
  eq(mark.type, 'button');
  eq(mark.textContent, '⤢');
  eq(mark.title, 'See it bigger');
  eq(mark.getAttribute('aria-label'), 'See Now (13) bigger');
  assert(holder.classList.contains('kit-zoomable'), 'holder is kit-zoomable');
  eq(getComputedStyle(holder).position, 'relative');
  eq(getComputedStyle(mark).position, 'absolute');
});

test('zoomable: the button opens a viewer with the caption and a copy of the table', () => {
  shut();
  const { holder, table } = tableHolder();
  const mark = zoomable(holder, () => table, 'Now (13)');
  mark.click();
  const v = over();
  assert(v, 'the viewer is open');
  eq(v.getAttribute('role'), 'dialog');
  eq(v.getAttribute('aria-modal'), 'true');
  eq(v.getAttribute('aria-label'), 'Now (13)');
  eq(v.querySelector('.kit-viewer-head b').textContent, 'Now (13)');
  const copy = v.querySelector('.kit-viewer-stage .kit-viewer-panel table');
  assert(copy, 'a copy of the table on the panel');
  assert(copy !== table, 'a copy, not the table itself');
  assert(table.parentElement === holder, 'the table stays where it was');
  eq([...copy.querySelectorAll('td')].map(c => c.textContent), ['#47', 'a long reason']);
  assert(!copy.hasAttribute('id'), 'the copy carries no id');
  eq(getComputedStyle(v).position, 'fixed');
  const panel = v.querySelector('.kit-viewer-panel');
  eq(getComputedStyle(panel).overflow, 'auto');
  assert(document.activeElement === v.querySelector('.kit-viewer-close'), 'Close has the focus');
  shut();
});

test('viewer: Close closes it and focus goes back to the button', () => {
  shut();
  const { holder, table } = tableHolder();
  const mark = zoomable(holder, () => table, 'T');
  mark.click();
  over().querySelector('.kit-viewer-close').click();
  assert(!over(), 'closed');
  assert(document.activeElement === mark, 'focus back on the mark');
});

test('viewer: Esc closes it and focus goes back to the button', () => {
  shut();
  const { holder, table } = tableHolder();
  const mark = zoomable(holder, () => table, 'T');
  mark.click();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(!over(), 'closed');
  assert(document.activeElement === mark, 'focus back on the mark');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
});

test('viewer: a click on the backdrop or the stage closes it; a click on the panel does not', () => {
  shut();
  const { holder, table } = tableHolder();
  const mark = zoomable(holder, () => table, 'T');
  mark.click();
  over().querySelector('.kit-viewer-panel td').click();
  assert(over(), 'a click on the table leaves it open');
  over().querySelector('.kit-viewer-panel').click();
  assert(over(), 'a click on the panel leaves it open');
  over().click();
  assert(!over(), 'a backdrop click closes it');
  assert(document.activeElement === mark, 'focus back on the mark');
  mark.click();
  over().querySelector('.kit-viewer-stage').click();
  assert(!over(), 'a click on the stage closes it');
  assert(document.activeElement === mark, 'focus back on the mark');
});

test('zoomable: a click on the holder opens it too, without markOnly', () => {
  shut();
  const { holder, table } = tableHolder();
  zoomable(holder, () => table, 'T');
  assert(holder.classList.contains('kit-zoom-click'), 'zoom-in cursor class');
  table.querySelector('td').click();
  assert(over(), 'open');
  shut();
});

test('zoomable: with markOnly a click on the holder does not open it; the mark still does', () => {
  shut();
  const { holder, table } = tableHolder();
  const mark = zoomable(holder, () => table, 'T', { markOnly: true });
  assert(!holder.classList.contains('kit-zoom-click'), 'no zoom-in cursor');
  table.querySelector('td').click();
  holder.click();
  assert(!over(), 'still closed');
  mark.click();
  assert(over(), 'the mark opens it');
  shut();
});

test('zoomable: the mark can be hidden and taken off, and shown again', () => {
  shut();
  const { holder, table } = tableHolder();
  const mark = zoomable(holder, () => table, 'T', { markOnly: true });
  mark.hidden = true;
  eq(getComputedStyle(mark).display, 'none');
  mark.hidden = false;
  assert(getComputedStyle(mark).display !== 'none', 'shown again');
  mark.remove();
  holder.append(mark);
  mark.click();
  assert(over(), 'a re-added mark still opens it');
  shut();
});

test('viewer: an SVG is copied without its fixed size, an image by its src', () => {
  shut();
  const fx = fixture();
  fx.innerHTML = '<div id="d"><svg width="100" height="50" viewBox="0 0 100 50"><rect width="100" height="50"/></svg></div>';
  viewer(fx.querySelector('#d'), 'Diagram', null);
  const svg = over().querySelector('svg.kit-viewer-pic.kit-viewer-svg');
  assert(svg, 'svg copy');
  assert(!svg.hasAttribute('width') && !svg.hasAttribute('height'), 'no fixed size');
  shut();
  const img = document.createElement('img');
  img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  img.alt = 'a dot';
  fx.replaceChildren(img);
  viewer(img, 'Shot', null);
  const copy = over().querySelector('img.kit-viewer-pic.kit-viewer-img');
  assert(copy && copy.src === img.src && copy.alt === 'a dot', 'img copy');
  shut();
});
