// The ⤢ viewer: any element shown bigger, over the page.
//   const mark = zoomable(holder, () => holder.querySelector('table'), 'Now (13)', { markOnly: true });
//   viewer(el, caption, back);
// Ported from diazo's web/frame.ts viewer, without its mockup frames.

/** Copy el for the stage, without ids (they'd repeat the page's) or editing. */
function copyOf(el) {
  const copy = el.cloneNode(true);
  for (const n of [copy, ...copy.querySelectorAll('[id], [contenteditable]')]) {
    n.removeAttribute('id');
    n.removeAttribute('contenteditable');
  }
  return copy;
}

/**
 * Show el bigger over the page, with caption: an SVG scaled to fill the window,
 * an image scaled to fill the window, and anything else (a table) as a copy on a
 * white panel at most the window's width that scrolls both ways.
 * Esc, Close or a click outside the picture closes it, and focus goes back to
 * back, else to what had it.
 */
export function viewer(el, caption, back = null) {
  const ret = back ?? document.activeElement;
  const stage = document.createElement('div');
  stage.className = 'kit-viewer-stage';
  let fit = () => {};
  // A table (or a holder of one) is shown whole, even with an icon in a cell.
  const tabular = el.tagName === 'TABLE' || !!el.querySelector('table');
  const svg = el instanceof SVGSVGElement ? el : tabular ? null : el.querySelector('svg');
  const img = el instanceof HTMLImageElement ? el : tabular ? null : el.querySelector('img');
  if (svg) {
    const copy = svg.cloneNode(true);
    // mermaid caps the drawing at its own width; the viewer fills the window.
    copy.removeAttribute('width');
    copy.removeAttribute('height');
    copy.style.maxWidth = 'none';
    copy.classList.add('kit-viewer-pic', 'kit-viewer-svg');
    stage.append(copy);
  } else if (img) {
    const copy = document.createElement('img');
    copy.src = img.src;
    copy.alt = img.alt;
    copy.className = 'kit-viewer-pic kit-viewer-img';
    stage.append(copy);
    // Scaled up or down to fill the window, keeping its shape.
    fit = () => {
      const w = copy.naturalWidth;
      const h = copy.naturalHeight;
      if (!w || !h) return;
      const s = Math.min(stage.clientWidth / w, stage.clientHeight / h);
      copy.style.width = `${Math.round(w * s)}px`;
      copy.style.height = `${Math.round(h * s)}px`;
    };
    copy.addEventListener('load', () => fit());
  } else {
    const panel = document.createElement('div');
    panel.className = 'kit-viewer-pic kit-viewer-panel';
    panel.append(copyOf(el));
    stage.append(panel);
  }
  const close = () => {
    over.remove();
    document.removeEventListener('keydown', onKey);
    removeEventListener('resize', fit);
    ret?.focus?.();
  };
  const onKey = e => {
    if (e.key === 'Escape') close();
  };
  const shut = document.createElement('button');
  shut.className = 'kit-ctl kit-viewer-close';
  shut.type = 'button';
  shut.textContent = 'Close';
  shut.addEventListener('click', close);
  const title = document.createElement('b');
  title.textContent = caption;
  const head = document.createElement('div');
  head.className = 'kit-viewer-head';
  head.append(title, shut);
  const over = document.createElement('div');
  over.className = 'kit-viewer';
  over.setAttribute('role', 'dialog');
  over.setAttribute('aria-modal', 'true');
  over.setAttribute('aria-label', caption);
  over.append(head, stage);
  // A click outside the picture closes it.
  over.addEventListener('click', e => {
    if (e.target === over || e.target === stage) close();
  });
  document.addEventListener('keydown', onKey);
  addEventListener('resize', fit);
  document.body.append(over);
  fit();
  shut.focus();
}

/**
 * Give holder the ⤢ mark that opens pic() in the viewer, and return the mark.
 * A click on the holder opens it too, unless opts.markOnly: then the holder
 * keeps its clicks (a table's text stays selectable). The caller hides the mark
 * with mark.hidden, or takes it off and puts it back in the holder.
 */
export function zoomable(holder, pic, caption, opts = {}) {
  const mark = document.createElement('button');
  // A click on the holder focuses nothing: closing goes back to its mark.
  const open = () => {
    const el = pic();
    if (el) viewer(el, caption, mark);
  };
  mark.className = 'kit-grow';
  mark.type = 'button';
  mark.textContent = '⤢';
  mark.title = 'See it bigger';
  mark.setAttribute('aria-label', `See ${caption} bigger`);
  mark.addEventListener('click', e => {
    e.stopPropagation();
    open();
  });
  holder.classList.add('kit-zoomable');
  if (!opts.markOnly) {
    holder.classList.add('kit-zoom-click');
    holder.addEventListener('click', e => {
      if (e.target.closest('button, a')) return;
      open();
    });
  }
  holder.append(mark);
  return mark;
}
