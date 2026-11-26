package splitpage

// The wire: what crosses Go and the page. The tab calls' JSON, and the
// terminal's contract, which every tool's websocket handler keeps:
//
//   - a binary frame carries terminal bytes, both ways;
//   - a text frame from the page is a Resize;
//   - the first binary frame from the server is the replay, at least
//     TerminalReset, and the page sends no input until it has written it
//     (xterm answers terminal queries in old output as it writes them);
//   - the server closes with CloseNoSession, CloseReplaced or CloseStopped,
//     and the page says which;
//   - the handler refuses an Origin whose host is not the request's own
//     (coder/websocket Accept's default), and never sets InsecureSkipVerify
//     or broad OriginPatterns: localweb's cross-origin check skips GETs, and
//     every 127.0.0.1 port is the same site, so the cookie alone doesn't
//     protect the socket from another local page.
//
// wire.d.ts is generated from these structs by wire_test.go.

// Tab is one page in the tab bar.
type Tab struct {
	ID      string `json:"id"`
	Address string `json:"address"` // http://127.0.0.1:<port>/..., or https://<tool>.<PAGE_PUBLIC_DOMAIN>/...
	Title   string `json:"title"`
	Pinned  bool   `json:"pinned"` // can't be closed
	// Types says the tab's page may type into the terminal: a message
	// {type: "send", text} it posts to the split page from its own origin is
	// pasted at the terminal's input line, with its control characters and
	// final line endings dropped, so it never runs by itself. The trust is the
	// origin's: any page at that origin can reach the tab's window and post as
	// it, so open no untrusted page of that origin beside a tab that types.
	Types bool `json:"types"`
	// New says the tab was opened behind (OpenRequest.Behind) and hasn't
	// shown since: the page marks it until it is first shown.
	New bool `json:"new,omitempty"`
	// Tool is the switch tool whose page the tab shows (its address is on the
	// host of the tool's Href in the host's Place), or empty for any other
	// page: the page lists only those in its row of tabs.
	Tool string `json:"tool,omitempty"`
}

// TabList is a session's tabs, in bar order, and the one that shows ("" when
// there are none).
type TabList struct {
	Session  string `json:"session"`
	Tabs     []Tab  `json:"tabs"`
	Selected string `json:"selected"`
}

// OpenRequest is POST /api/split/open: open Address as a tab and show it, or
// show the tab that already has it. With Behind, the tab is added (marked New)
// and the tab that shows keeps showing, and an address already open is left as
// it is; into a bar with nothing showing, it shows.
type OpenRequest struct {
	Session string `json:"session"`
	Address string `json:"address"`
	Title   string `json:"title"`
	Pinned  bool   `json:"pinned,omitempty"`
	Types   bool   `json:"types,omitempty"`
	Behind  bool   `json:"behind,omitempty"`
}

// SelectRequest is POST /api/split/select: show tab ID.
type SelectRequest struct {
	Session string `json:"session"`
	ID      string `json:"id"`
}

// CloseRequest is POST /api/split/close: close tab ID.
type CloseRequest struct {
	Session string `json:"session"`
	ID      string `json:"id"`
}

// Place is GET /api/split/place: where the split page sits, which it draws
// as its bar's workspace link and switch. Its host gives it (Tabs.Place); a
// host that gives none answers 404, and the bar shows only its Terminal
// button.
type Place struct {
	Workspace string      `json:"workspace"` // the workspace's name, or locally the session's project
	Home      string      `json:"home"`      // where the workspace's name links
	Tools     []PlaceTool `json:"tools"`     // the switch, in order
}

// PlaceTool is one tool of the switch: its name, its front page (a tab whose
// address is on Href's host is the tool's), and whether it is running.
type PlaceTool struct {
	Name string `json:"name"`
	Href string `json:"href"`
	Up   bool   `json:"up"`
}

// ToolRequest is POST /api/split/tool: show tool Name's page, starting the
// tool first when it is down.
type ToolRequest struct {
	Session string `json:"session"`
	Name    string `json:"name"`
}

// PasteResponse answers POST /api/split/paste, whose body is a pasted
// image's bytes with its Content-Type: Path is where the server saved it
// (paste-*.<ext> in its temp folder), which the page types into the terminal.
type PasteResponse struct {
	Path string `json:"path"`
}

// ResizeType is a Resize message's type, always "resize".
type ResizeType string

// ResizeKind is the one ResizeType.
const ResizeKind ResizeType = "resize"

// Values lists the ResizeTypes, for wiregen.
func (ResizeType) Values() []string { return []string{string(ResizeKind)} }

// Resize is the text frame the page sends when the terminal's size changes.
type Resize struct {
	Type ResizeType `json:"type"`
	Cols int        `json:"cols"`
	Rows int        `json:"rows"`
}

// TerminalReset (RIS) is the least a replay holds: it puts the page's terminal
// in a known state before any kept output.
const TerminalReset = "\x1bc"

// The terminal websocket's close codes.
const (
	// CloseNoSession: the session the page asked for doesn't exist.
	CloseNoSession = 4404
	// CloseReplaced: another page took the terminal.
	CloseReplaced = 4409
	// CloseStopped: the program has exited; the page offers Start it again
	// when the tool serves a restart.
	CloseStopped = 4410
)
