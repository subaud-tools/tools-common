// The terminal socket's scheme, apart from the DOM so a test can run it.

// socketScheme is the websocket scheme for a page served over protocol
// (location.protocol): wss: on an https page, since a browser blocks a ws:
// socket from one as mixed content, and ws: otherwise.
export function socketScheme(protocol: string): 'ws:' | 'wss:' {
  return protocol === 'https:' ? 'wss:' : 'ws:';
}
