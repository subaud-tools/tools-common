// The page's own key bindings, apart from xterm so a test can run them.

export interface KeyLike {
  type: string;
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  preventDefault(): void;
}

// handleKey is xterm's custom key handler: false means xterm must ignore the
// event. Shift+Enter and Ctrl+Enter send a newline. Ctrl+V (and Ctrl+Shift+V)
// is left to the browser, whose paste event then reaches xterm: otherwise xterm
// sends the program a bare ^V and Windows and Linux learners can't paste text.
export function handleKey(ev: KeyLike, send: (data: string) => void): boolean {
  if (ev.ctrlKey && !ev.altKey && !ev.metaKey && ev.key.toLowerCase() === 'v') return false;
  if (ev.key !== 'Enter' || (!ev.shiftKey && !ev.ctrlKey)) return true;
  ev.preventDefault();
  if (ev.type === 'keydown') send('\n');
  return false;
}
