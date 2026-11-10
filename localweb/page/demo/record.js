// The demo's Record: a small project's cards drawn read-only with recordPage.
// ?view=record on the demo page draws it from DEMO below; record-entry.js
// draws it from the data a record file carries, which is how the browser test
// opens a built record from disk. What the data holds is the demo's own.
import { h, decisionCard, recordCard, recordPage, renderMarkdown, thread } from '/_kit/kit.js';

export const DEMO = {
  title: 'galley · deployments',
  summary: 'Two findings, F2 and F3. F2 was decided and merged; F3 waits on F2\'s numbers.\n\n- Baseline: 14 minutes a push\n- After F2: 3 minutes',
  cards: [
    {
      id: 'F2',
      state: 'decided',
      question: 'Should galley pin its Node version?',
      example: 'Each run installs whatever Node the runner has, so `npm ci` starts cold: **14 minutes** where a warm run takes 3.',
      options: [
        { id: 'A', title: 'Pin Node 22 in .nvmrc', pullsIn: 'One file.', recommended: true, chosen: true },
        { id: 'B', title: 'Not yet', pullsIn: 'Cold installs go on.' },
      ],
      since: [{ at: '2026-11-03', text: 'Pull request #12 opened' }, { at: '2026-11-05', text: 'Merged' }],
      recommendation: { option: 'A', why: 'About **11 minutes** saved on every push.' },
      calls: [
        { name: 'Which version', took: 'Node 22', instead: 'Node 20', why: 'The last green run used 22.' },
        { name: 'Where it is read', took: 'From .nvmrc', instead: 'In the workflow', why: 'One place.', reversed: true },
      ],
      evidence: [{ text: 'Cold install, 14m 02s', source: 'run 11873024551' }],
      messages: [
        { id: 1, from: 'user', at: '2026-11-02T10:00:00Z', text: 'Why 22 and not 20?' },
        { id: 2, from: 'agent', at: '2026-11-02T10:04:00Z', text: 'The last green run used 22; see F3 for the cache.' },
      ],
    },
    {
      id: 'F3',
      state: 'open',
      question: 'Should the cache key leave out the date?',
      example: 'The key changes every day, so the first run each morning starts cold.',
      options: [
        { id: 'A', title: 'Key on the lockfile only', pullsIn: 'Nothing.', recommended: true },
        { id: 'B', title: 'Exempt', pullsIn: 'A reason and a review date.' },
      ],
      recommendation: { option: 'A', why: 'One cold run a lockfile change, not one a day.' },
      messages: [],
    },
  ],
};

// demoRecord draws data's Record into root, after a bar the caller put there.
export function demoRecord(root, data) {
  const cards = new Map(data.cards.map(c => [c.id, c]));
  const page = recordPage({
    root,
    name: 'kitdemo',
    tabs: [
      { id: 'overview', label: 'Overview', count: data.title },
      { id: 'findings', label: 'Findings', count: String(data.cards.length) },
    ],
    known: new Set(cards.keys()),
    draw(tab) {
      if (tab.id === 'overview') {
        const doc = h('div', { class: 'kit-prose', 'data-sec': 'Summary', id: 'overview-summary' });
        doc.innerHTML = renderMarkdown(`## ${data.title}\n\n${data.summary}`, { headingIds: false });
        return { el: doc, secs: [{ id: 'overview-summary', label: 'Summary' }] };
      }
      const els = data.cards.map(c => recordCard(decisionCard({
        id: c.id,
        head: { crumb: c.id, state: c.state },
        question: c.question,
        example: c.example,
        options: c.options,
        since: c.since,
        recommendation: c.recommendation,
        calls: c.calls,
        evidence: c.evidence,
        readOnly: true,
      }), { label: `${c.id} ${c.question}`, edge: c.state === 'open' ? 'signal' : '', messages: c.messages }));
      return { el: h('div', null, ...els), secs: data.cards.map(c => ({ id: `card-${c.id}`, label: `${c.id} ${c.question}` })) };
    },
    thread(open, selected) {
      const c = selected ? cards.get(selected) : null;
      return thread({ id: c?.id, name: c?.question, messages: c?.messages, readOnly: true, empty: 'Pick a card to read its thread.' });
    },
  });
  return page;
}
