import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Tab } from '../wire.d.ts';
import { sentText } from './relay.ts';

const origin = 'http://127.0.0.1:5001';
const lesson: Tab = { id: 'tab-1', address: `${origin}/lesson?t=x`, title: 'Lesson', pinned: true, types: true };

test('a send from a tab that types gives its text', () => {
  assert.equal(sentText({ type: 'send', text: 'Say that again.' }, origin, lesson), 'Say that again.');
});

test('a send from a frame that is no tab gives nothing', () => {
  assert.equal(sentText({ type: 'send', text: 'x' }, origin, undefined), null);
});

test('a send from a tab without types gives nothing', () => {
  assert.equal(sentText({ type: 'send', text: 'x' }, origin, { ...lesson, types: false }), null);
});

test("a send from any origin but the tab's gives nothing", () => {
  for (const o of ['http://127.0.0.1:5002', 'http://evil.example', 'null', '']) {
    assert.equal(sentText({ type: 'send', text: 'rm -rf ~' }, o, lesson), null, o);
  }
});

test('anything but a send with text gives nothing', () => {
  for (const data of [null, 'send', { type: 'other', text: 'x' }, { type: 'lwc-send', text: 'x' }, { type: 'send' }, { type: 'send', text: 7 }, { type: 'send', text: '' }, { type: 'send', text: '\n\n' }]) {
    assert.equal(sentText(data, origin, lesson), null, JSON.stringify(data));
  }
});

test('a trailing newline is not an Enter', () => {
  assert.equal(sentText({ type: 'send', text: 'one\ntwo\n' }, origin, lesson), 'one\ntwo');
});
