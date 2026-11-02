// What a tab asks of this page, apart from the DOM so a test can run it.

import type { Tab } from '../wire.d.ts';

// sentText is the text a tab's page asks to type into the terminal, or null
// when the message is not one. tab is the tab whose frame posted it (undefined
// for any other window): only a {type: "send", text} from a tab opened with
// types, and from that tab's own origin, counts, since any page can post a
// message to this one and a frame can go to another address.
//
// The text never carries its own Enter: line endings inside it become \n,
// every other control character (ESC above all, which could end a bracketed
// paste early and run what follows) is dropped, and so are the line endings
// at its end. The user presses Enter.
export function sentText(data: unknown, origin: string, tab: Tab | undefined): string | null {
  if (!tab?.types || origin !== new URL(tab.address).origin) return null;
  if (typeof data !== 'object' || data === null) return null;
  const { type, text } = data as { type?: unknown; text?: unknown };
  if (type !== 'send' || typeof text !== 'string') return null;
  const trimmed = text
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '')
    .replace(/\n+$/, '');
  return trimmed === '' ? null : trimmed;
}
