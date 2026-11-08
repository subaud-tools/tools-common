// Package splitpage is the family's split page: one browser tab with the
// session's terminal on the left (xterm.js over the tool's own websocket), a
// divider, and on the right a bar of tabs, each one of our own pages on
// 127.0.0.1 in a frame (on a hosted workspace with PAGE_PUBLIC_DOMAIN set, a
// tool's public page, https://<tool>.<PAGE_PUBLIC_DOMAIN>, or the bare domain
// for the tool PAGE_PUBLIC_HOME names).
//
// A tool serves it on localweb: Page as its Assets, Tabs.Handler under its
// API at /api/split/, and its own terminal websocket under /api/, keeping the
// contract in wire.go. Open is the client an agent's tool calls to open a tab;
// its base is the server's loopback address (pageserve's Entry.Loopback),
// never a public one.
//
// A tab opened with Types may type into the terminal (lwc's lesson does), a
// tab opened Behind joins the bar without showing, marked New until it first
// shows (lwc's file tabs beside its pinned lesson), and Config.Script adds a
// tool's own module to the page.
package splitpage
