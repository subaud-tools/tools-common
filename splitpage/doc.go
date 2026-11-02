// Package splitpage is the family's split page: one browser tab with the
// session's terminal on the left (xterm.js over the tool's own websocket), a
// divider, and on the right a bar of tabs, each one of our own pages on
// 127.0.0.1 in a frame.
//
// A tool serves it on localweb: Page as its Assets, Tabs.Handler under its
// API at /api/split/, and its own terminal websocket under /api/, keeping the
// contract in wire.go. Open is the client an agent's tool calls to open a tab.
//
// A tab opened with Types may type into the terminal (lwc's lesson does), and
// Config.Script adds a tool's own module to the page.
package splitpage
