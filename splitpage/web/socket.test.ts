import assert from 'node:assert/strict';
import { test } from 'node:test';
import { socketScheme } from './socket.ts';

test('an https page opens its terminal socket over wss', () => {
  assert.equal(socketScheme('https:'), 'wss:');
});

test('an http page opens its terminal socket over ws', () => {
  assert.equal(socketScheme('http:'), 'ws:');
});
