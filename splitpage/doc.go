// Package splitpage is the family's split page: one browser tab with the
// kit's bar across the top, the session's terminal on the left under a header
// of its own (xterm.js over the tool's own websocket), a divider, and on the
// right one tab per page, each one of our own pages on 127.0.0.1 in a frame
// (on a hosted workspace with PAGE_PUBLIC_DOMAIN set, a tool's public page,
// https://<tool>.<PAGE_PUBLIC_DOMAIN>, or the bare domain for the tool
// PAGE_PUBLIC_HOME names).
//
// A tool serves it on localweb: Page as its Assets, with the kit's assets at
// /_kit/ (localweb/page's With: the page links /_kit/kit.css), Tabs.Handler
// under its API at /api/split/, and its own terminal websocket under /api/,
// keeping the contract in wire.go. Open is the client an agent's tool calls
// to open a tab; its base is the server's loopback address (pageserve's
// Entry.Loopback), never a public one.
//
// The bar draws the place the tool gives with Tabs.Place: the workspace, and
// the diazo | cast | galley switch, which shows a tool's tab on the right, or
// opens its front page, starting the tool first through Tabs.Start when it is
// down. A tab on a switch tool's host is that tool's (Tab.Tool) and is reached
// through the switch; the others are listed in a slim row over the pages,
// shown while one is open. The Terminal button closes and opens the
// terminal, as the divider's arrows do; the terminal's × leaves the split
// page for the page showing on the right (or the place's home, or /), and
// the session keeps running.
//
// A tab opened with Types may type into the terminal (lwc's lesson does), a
// tab opened Behind joins the page without showing, marked New until it first
// shows (on the switch, or in the row), and Config.Script adds a tool's own
// module to the page.
package splitpage
