// What a tab asks of this page, apart from the DOM so a test can run it.

import type { Tab } from '../wire.d.ts';

// sentText is the text a tab's page asks to type into the terminal, or null
// when the message is not one. tab is the tab whose frame posted it (undefined
// for any other window): only a {type: "send", text} from a tab opened with
// types, and from that tab's own origin, counts, since any page can post a
// message to this one and a frame can go to another address. A trailing
// newline is dropped: the user presses Enter.
export function sentText(data: unknown, origin: string, tab: Tab | undefined): string | null {
  if (!tab?.types || origin !== new URL(tab.address).origin) return null;
  if (typeof data !== 'object' || data === null) return null;
  const { type, text } = data as { type?: unknown; text?: unknown };
  if (type !== 'send' || typeof text !== 'string') return null;
  const trimmed = text.replace(/\n+$/, '');
  return trimmed === '' ? null : trimmed;
}
