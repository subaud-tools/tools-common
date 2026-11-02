import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleKey } from './keys.ts';

// Runs one press of a key through handleKey, as the browser's three events.
function press(mods: { shiftKey?: boolean; ctrlKey?: boolean }) {
  const sent: string[] = [];
  const handled = ['keydown', 'keypress', 'keyup'].map((type) =>
    handleKey(
      {
        type,
        key: 'Enter',
        shiftKey: false,
        ctrlKey: false,
        preventDefault() {},
        ...mods,
      },
      (s) => sent.push(s),
    ),
  );
  return { sent, handled };
}

test('Shift+Enter sends one newline, and xterm never sees it', () => {
  const { sent, handled } = press({ shiftKey: true });
  assert.deepEqual(sent, ['\n']);
  assert.deepEqual(handled, [false, false, false]);
});

test('Ctrl+Enter sends one newline, and xterm never sees it', () => {
  const { sent, handled } = press({ ctrlKey: true });
  assert.deepEqual(sent, ['\n']);
  assert.deepEqual(handled, [false, false, false]);
});

test('plain Enter is left to xterm, which sends a carriage return', () => {
  const { sent, handled } = press({});
  assert.deepEqual(sent, []);
  assert.deepEqual(handled, [true, true, true]);
});

// Ctrl+V on Windows and Linux: the browser's own paste must run, so xterm and
// the program must not see the key.
function pressV(mods: { shiftKey?: boolean; ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean }) {
  const sent: string[] = [];
  let prevented = false;
  const handled = ['keydown', 'keyup'].map((type) =>
    handleKey(
      { type, key: 'v', shiftKey: false, ctrlKey: false, preventDefault() { prevented = true; }, ...mods },
      (s) => sent.push(s),
    ),
  );
  return { sent, handled, prevented };
}

test('Ctrl+V is left to the browser to paste', () => {
  const { sent, handled, prevented } = pressV({ ctrlKey: true });
  assert.deepEqual(sent, []);
  assert.deepEqual(handled, [false, false]);
  assert.equal(prevented, false);
});

test('Ctrl+Shift+V is left to the browser to paste', () => {
  const { handled, prevented } = pressV({ ctrlKey: true, shiftKey: true });
  assert.deepEqual(handled, [false, false]);
  assert.equal(prevented, false);
});

test('a plain v still goes to the program', () => {
  assert.deepEqual(pressV({}).handled, [true, true]);
});
