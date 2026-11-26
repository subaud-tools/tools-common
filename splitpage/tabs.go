package splitpage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/subaud-tools/tools-common/localweb"
)

// Errors the tab calls return; Handler answers them with 400, 404 and 409.
var (
	ErrNotLocal = errors.New("splitpage: a tab holds only an http://127.0.0.1:<port> address, or https://<tool>.<PAGE_PUBLIC_DOMAIN> when that is set")
	ErrNoTab    = errors.New("splitpage: no such tab")
	ErrPinned   = errors.New("splitpage: a pinned tab can't be closed")
	ErrNoTool   = errors.New("splitpage: no such tool in the split page's place")
	ErrNoStart  = errors.New("splitpage: the tool isn't running, and this host can't start it")
)

// maxBody bounds one tab call's JSON.
const maxBody = 64 << 10

// maxPaste bounds one pasted image.
const maxPaste = 20 << 20

// pasteExt is each image type a paste may hold, with its file's extension.
var pasteExt = map[string]string{
	"image/png":  "png",
	"image/jpeg": "jpg",
	"image/gif":  "gif",
	"image/webp": "webp",
}

// Tabs holds each session's tabs and the one that shows, in memory, for as
// long as the server runs. A tool mounts Handler under its localweb /api/, or
// calls Open, Select and Close itself (lwc pins its Lesson). Safe for
// concurrent use.
type Tabs struct {
	mu       sync.Mutex
	sessions map[string]*session
	next     int // the last tab id's number, across every session
	place    func(session string) (Place, bool)
	start    func(ctx context.Context, name string) (href string, err error)
	starting map[string]*flight // the tools being started, by name
}

// flight is one Start of a tool, which later presses of it wait for.
type flight struct {
	done chan struct{}
	href string
	err  error
}

// started starts tool name once at a time: a call while its Start runs waits
// for that Start and takes its answer, never calling start again.
func (t *Tabs) started(ctx context.Context, start func(context.Context, string) (string, error), name string) (string, error) {
	t.mu.Lock()
	if t.starting == nil {
		t.starting = map[string]*flight{}
	}
	if f := t.starting[name]; f != nil {
		t.mu.Unlock()
		select {
		case <-f.done:
			return f.href, f.err
		case <-ctx.Done():
			return "", ctx.Err()
		}
	}
	f := &flight{done: make(chan struct{})}
	t.starting[name] = f
	t.mu.Unlock()
	f.href, f.err = start(ctx, name)
	t.mu.Lock()
	delete(t.starting, name)
	t.mu.Unlock()
	close(f.done)
	return f.href, f.err
}

// Place sets where the split page sits, which the host knows: f gives a
// session's Place, or false for none. The page draws it as its bar, and a
// tab on a place's tool's host is marked with the tool (Tab.Tool). Unset, the
// split page has no place.
func (t *Tabs) Place(f func(session string) (Place, bool)) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.place = f
}

// Start sets how the host starts a switch tool that isn't up: f starts tool
// name and answers its front page's address. Unset, pressing a tool that is
// down answers 409.
func (t *Tabs) Start(f func(ctx context.Context, name string) (href string, err error)) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.start = f
}

// placeOf is the session's place from the host, if it gives one.
func (t *Tabs) placeOf(name string) (Place, bool) {
	t.mu.Lock()
	f := t.place
	t.mu.Unlock()
	if f == nil {
		return Place{}, false
	}
	return f(name)
}

// hostOf is address's host, or "" for an address that doesn't parse.
func hostOf(address string) string {
	u, err := url.Parse(address)
	if err != nil {
		return ""
	}
	return strings.ToLower(u.Host)
}

// marked is l with each tool's tab marked with the tool: the first tab, in
// bar order, on the host of the tool's Href. A later tab on that host (a
// second diazo plan) is an other page, listed in the slim row with its ×, so
// it stays reachable: the switch reaches only the tool's one tab.
func (t *Tabs) marked(l TabList) TabList {
	p, ok := t.placeOf(l.Session)
	l = copyList(l)
	taken := map[string]bool{} // the tools whose tab is found
	for i := range l.Tabs {
		l.Tabs[i].Tool = ""
		if !ok {
			continue
		}
		h := hostOf(l.Tabs[i].Address)
		for _, tool := range p.Tools {
			if h != "" && hostOf(tool.Href) == h && !taken[tool.Name] {
				l.Tabs[i].Tool = tool.Name
				taken[tool.Name] = true
				break
			}
		}
	}
	return l
}

type session struct {
	list     TabList
	watchers map[chan TabList]struct{}
}

// NewTabs returns an empty list.
func NewTabs() *Tabs { return &Tabs{sessions: map[string]*session{}} }

// get returns the session's entry, made if new. Callers hold mu.
func (t *Tabs) get(name string) *session {
	s := t.sessions[name]
	if s == nil {
		s = &session{list: TabList{Session: name, Tabs: []Tab{}}, watchers: map[chan TabList]struct{}{}}
		t.sessions[name] = s
	}
	return s
}

// List returns a copy of the session's tabs, each marked with its tool.
func (t *Tabs) List(name string) TabList {
	t.mu.Lock()
	l := copyList(t.get(name).list)
	t.mu.Unlock()
	return t.marked(l)
}

func copyList(l TabList) TabList {
	l.Tabs = append([]Tab{}, l.Tabs...)
	return l
}

// changed sends the session's list to every stream watching it, the newest
// replacing one not yet read. Callers hold mu.
func (s *session) changed() {
	l := copyList(s.list)
	for w := range s.watchers {
		select {
		case <-w:
		default:
		}
		w <- l
	}
}

// localAddress says whether a frame may show address: http on 127.0.0.1 with a
// port, or on a hosted workspace a tool's public page
// (https://<tool>.<PAGE_PUBLIC_DOMAIN>, or the bare domain for the tool
// PAGE_PUBLIC_HOME names; see localweb.PublicTool), our own
// tools' pages and nothing else.
func localAddress(address string) bool {
	if _, ok := localweb.PublicTool(address); ok {
		return true
	}
	return loopback(address)
}

// loopback says whether address is http on 127.0.0.1 with a port.
func loopback(address string) bool {
	u, err := url.Parse(address)
	return err == nil && u.Scheme == "http" && u.User == nil && u.Hostname() == "127.0.0.1" && u.Port() != ""
}

// titleTag finds a page's <title>.
var titleTag = regexp.MustCompile(`(?is)<title[^>]*>(.*?)</title>`)

// pageTitle names a tab opened with no title: the <title> of its server's front
// page (a family tool's page is titled with the tool's name), read without the
// address's path or query, so a ?t= token never reaches the label; else the
// address's host and port. A public page is read from its tool's loopback
// server, named by the tool's live entry: its public address answers only
// through the workspace's proxy.
func pageTitle(address string) string {
	u, err := url.Parse(address)
	if err != nil {
		return ""
	}
	front := "http://" + u.Host
	if tool, ok := localweb.PublicTool(address); ok {
		local, ok := liveLoopback(tool)
		if !ok || !loopback(local) {
			return u.Host
		}
		front = local
	}
	c := http.Client{Timeout: time.Second}
	res, err := c.Get(front + "/")
	if err == nil {
		defer func() { _ = res.Body.Close() }()
		b, _ := io.ReadAll(io.LimitReader(res.Body, 64<<10))
		if m := titleTag.FindSubmatch(b); m != nil {
			if s := strings.TrimSpace(html.UnescapeString(string(m[1]))); s != "" {
				return s
			}
		}
	}
	return u.Host
}

// Open opens r.Address as a tab and shows it, or shows the tab already open
// at that address. With r.Behind it adds the tab, marked New, and leaves the
// tab that shows (in one change, so the page never shows the new tab), and an
// address already open is left as it is; a bar with nothing showing shows it.
// A tab showing the front page of the same server ("/", only a token in its query)
// moves to r.Address in place, keeping its id, pin and types, as a tool's
// front-page browser tab is moved to a page: one tab per tool, which a reload
// brings back on the page.
func (t *Tabs) Open(r OpenRequest) (TabList, error) {
	if !localAddress(r.Address) {
		return TabList{}, ErrNotLocal
	}
	if r.Title == "" {
		r.Title = pageTitle(r.Address)
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	s := t.get(r.Session)
	for _, tb := range s.list.Tabs {
		if tb.Address == r.Address {
			if r.Behind {
				return copyList(s.list), nil
			}
			s.show(tb.ID)
			s.changed()
			return copyList(s.list), nil
		}
	}
	if i := frontPageOf(s.list.Tabs, r.Address); i >= 0 {
		tb := &s.list.Tabs[i]
		tb.Address, tb.Title = r.Address, r.Title
		if !r.Behind || s.list.Selected == "" {
			s.show(tb.ID)
		}
		s.changed()
		return copyList(s.list), nil
	}
	t.next++
	tb := Tab{ID: "tab-" + strconv.Itoa(t.next), Address: r.Address, Title: r.Title, Pinned: r.Pinned, Types: r.Types}
	behind := r.Behind && s.list.Selected != ""
	tb.New = behind
	s.list.Tabs = append(s.list.Tabs, tb)
	if !behind {
		s.list.Selected = tb.ID
	}
	s.changed()
	return copyList(s.list), nil
}

// frontPageOf is the index of the tab showing the front page of address's
// server, or -1; none when address is that front page itself. A front page
// is the server's "/" with nothing in its query but the token (t): diazo's
// plan is "/" with the plan in its query, so it is a page, not the front.
func frontPageOf(tabs []Tab, address string) int {
	front := func(u *url.URL) bool {
		if u.Path != "" && u.Path != "/" {
			return false
		}
		for k := range u.Query() {
			if k != "t" {
				return false
			}
		}
		return true
	}
	a, err := url.Parse(address)
	if err != nil || front(a) {
		return -1
	}
	for i, tb := range tabs {
		if u, err := url.Parse(tb.Address); err == nil && u.Scheme == a.Scheme && u.Host == a.Host && front(u) {
			return i
		}
	}
	return -1
}

// Replace moves tab id to address in place, keeping its id, title, pin and
// whether it types, and whether it shows. It is for the tool, not the page: a
// tool whose own page comes back on a new port (lwc's lesson after a restart)
// keeps it one tab. Handler does not serve it.
func (t *Tabs) Replace(name, id, address string) (TabList, error) {
	if !localAddress(address) {
		return TabList{}, ErrNotLocal
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	s := t.get(name)
	i := s.index(id)
	if i < 0 {
		return TabList{}, ErrNoTab
	}
	s.list.Tabs[i].Address = address
	s.changed()
	return copyList(s.list), nil
}

// Select shows tab id.
func (t *Tabs) Select(name, id string) (TabList, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	s := t.get(name)
	if s.index(id) < 0 {
		return TabList{}, ErrNoTab
	}
	s.show(id)
	s.changed()
	return copyList(s.list), nil
}

// Close closes tab id; if it showed, the tab after it shows, or else the one
// before.
func (t *Tabs) Close(name, id string) (TabList, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	s := t.get(name)
	i := s.index(id)
	if i < 0 {
		return TabList{}, ErrNoTab
	}
	if s.list.Tabs[i].Pinned {
		return TabList{}, ErrPinned
	}
	s.list.Tabs = append(s.list.Tabs[:i], s.list.Tabs[i+1:]...)
	if s.list.Selected == id {
		switch {
		case i < len(s.list.Tabs):
			s.show(s.list.Tabs[i].ID)
		case i > 0:
			s.show(s.list.Tabs[i-1].ID)
		default:
			s.list.Selected = ""
		}
	}
	s.changed()
	return copyList(s.list), nil
}

// show makes tab id the one that shows, which clears its New mark. Callers
// hold mu.
func (s *session) show(id string) {
	s.list.Selected = id
	if i := s.index(id); i >= 0 {
		s.list.Tabs[i].New = false
	}
}

// tool shows switch tool r.Name's front page for r.Session: the tool's tab
// (the session's first tab on the tool's host), moved to the front page in
// place if it shows another of the tool's pages (a diazo plan), else the
// front page as a new tab in front, once the host has started the tool if it
// was down; presses while it starts wait for that one Start. A tool's host is
// the host of its Href.
func (t *Tabs) tool(ctx context.Context, r ToolRequest) (TabList, error) {
	p, ok := t.placeOf(r.Session)
	if !ok {
		return TabList{}, ErrNoTool
	}
	var tool *PlaceTool
	for i := range p.Tools {
		if p.Tools[i].Name == r.Name {
			tool = &p.Tools[i]
			break
		}
	}
	if tool == nil {
		return TabList{}, ErrNoTool
	}
	host := hostOf(tool.Href)
	t.mu.Lock()
	s := t.get(r.Session)
	for i := range s.list.Tabs {
		if tb := &s.list.Tabs[i]; host != "" && hostOf(tb.Address) == host {
			// In place, as Open moves a front-page tab: the same id, pin and
			// types, so the page keeps one frame for the tool.
			tb.Address, tb.Title = tool.Href, tool.Name
			s.show(tb.ID)
			s.changed()
			l := copyList(s.list)
			t.mu.Unlock()
			return l, nil
		}
	}
	start := t.start
	t.mu.Unlock()
	href := tool.Href
	if !tool.Up {
		if start == nil {
			return TabList{}, ErrNoStart
		}
		var err error
		if href, err = t.started(ctx, start, tool.Name); err != nil {
			return TabList{}, startError{err}
		}
	}
	return t.Open(OpenRequest{Session: r.Session, Address: href, Title: tool.Name})
}

// startError is the host's Start failing: Handler answers its text with 500.
type startError struct{ error }

func (e startError) Unwrap() error { return e.error }

func (s *session) index(id string) int {
	for i, tb := range s.list.Tabs {
		if tb.ID == id {
			return i
		}
	}
	return -1
}

// Handler serves the tab calls, for a tool to mount under its localweb API at
// /api/split/:
//
//	GET  /api/split/tabs?session=    the session's TabList
//	POST /api/split/open             OpenRequest → TabList (400 not local)
//	POST /api/split/select           SelectRequest → TabList (404)
//	POST /api/split/close            CloseRequest → TabList (404, 409 pinned)
//	GET  /api/split/stream?session=  server-sent events: the TabList now and after every change
//	GET  /api/split/place?session=   the session's Place (404 when the host gives none)
//	POST /api/split/tool             ToolRequest → TabList (404 no such tool, 409 down with no Start, 500 Start failed)
//	POST /api/split/paste            an image's bytes → PasteResponse (415 not PNG, JPEG, GIF or WebP, 413 over 20 MB)
//
// Every TabList it answers has each tab marked with its tool (Tab.Tool).
func (t *Tabs) Handler() http.Handler {
	mux := http.NewServeMux()
	writeList := func(w http.ResponseWriter, l TabList, err error) {
		if err == nil {
			l = t.marked(l)
		}
		writeList(w, l, err)
	}
	mux.HandleFunc("GET /api/split/tabs", func(w http.ResponseWriter, r *http.Request) {
		writeList(w, t.List(r.URL.Query().Get("session")), nil)
	})
	mux.HandleFunc("GET /api/split/place", func(w http.ResponseWriter, r *http.Request) {
		p, ok := t.placeOf(r.URL.Query().Get("session"))
		if !ok {
			http.Error(w, "no place", http.StatusNotFound)
			return
		}
		if p.Tools == nil {
			p.Tools = []PlaceTool{}
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		_ = json.NewEncoder(w).Encode(p)
	})
	mux.HandleFunc("POST /api/split/tool", func(w http.ResponseWriter, r *http.Request) {
		var req ToolRequest
		if readBody(w, r, &req) {
			l, err := t.tool(r.Context(), req)
			writeList(w, l, err)
		}
	})
	mux.HandleFunc("POST /api/split/open", func(w http.ResponseWriter, r *http.Request) {
		var req OpenRequest
		if readBody(w, r, &req) {
			l, err := t.Open(req)
			writeList(w, l, err)
		}
	})
	mux.HandleFunc("POST /api/split/select", func(w http.ResponseWriter, r *http.Request) {
		var req SelectRequest
		if readBody(w, r, &req) {
			l, err := t.Select(req.Session, req.ID)
			writeList(w, l, err)
		}
	})
	mux.HandleFunc("POST /api/split/close", func(w http.ResponseWriter, r *http.Request) {
		var req CloseRequest
		if readBody(w, r, &req) {
			l, err := t.Close(req.Session, req.ID)
			writeList(w, l, err)
		}
	})
	mux.HandleFunc("GET /api/split/stream", t.stream)
	mux.HandleFunc("POST /api/split/paste", paste)
	return mux
}

// paste saves a pasted image in the system temp folder as paste-*.<ext>,
// readable only by the server's user, and answers its path, which the page
// types into the terminal: a program there (pi, Claude Code) attaches an image
// named by its path. The body's Content-Type and its bytes must both say one
// of the image types pasteExt lists.
func paste(w http.ResponseWriter, r *http.Request) {
	mt, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type"))
	ext, ok := pasteExt[mt]
	if !ok {
		http.Error(w, "paste: not a PNG, JPEG, GIF or WebP image", http.StatusUnsupportedMediaType)
		return
	}
	b, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxPaste))
	var tooBig *http.MaxBytesError
	switch {
	case errors.As(err, &tooBig):
		http.Error(w, "paste: the image is over 20 MB", http.StatusRequestEntityTooLarge)
		return
	case err != nil:
		http.Error(w, "paste: "+err.Error(), http.StatusBadRequest)
		return
	}
	if http.DetectContentType(b) != mt {
		http.Error(w, "paste: the bytes are not a "+mt+" image", http.StatusUnsupportedMediaType)
		return
	}
	f, err := os.CreateTemp("", "paste-*."+ext) // mode 0600
	if err != nil {
		http.Error(w, "paste: "+err.Error(), http.StatusInternalServerError)
		return
	}
	_, err = f.Write(b)
	if cerr := f.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		_ = os.Remove(f.Name())
		http.Error(w, "paste: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(PasteResponse{Path: f.Name()})
}

func readBody(w http.ResponseWriter, r *http.Request, v any) bool {
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBody)).Decode(v); err != nil {
		http.Error(w, "bad request: "+err.Error(), http.StatusBadRequest)
		return false
	}
	return true
}

func writeList(w http.ResponseWriter, l TabList, err error) {
	var started startError
	switch {
	case errors.As(err, &started): // the host's Start, whatever it wraps
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	case errors.Is(err, ErrNotLocal):
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	case errors.Is(err, ErrNoTab), errors.Is(err, ErrNoTool):
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	case errors.Is(err, ErrPinned), errors.Is(err, ErrNoStart):
		http.Error(w, err.Error(), http.StatusConflict)
		return
	case err != nil:
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(l)
}

// stream sends the session's list as a server-sent event now and after every
// change, until the client goes.
func (t *Tabs) stream(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("session")
	rc := http.NewResponseController(w)
	ch := make(chan TabList, 1)
	t.mu.Lock()
	s := t.get(name)
	s.watchers[ch] = struct{}{}
	ch <- copyList(s.list)
	t.mu.Unlock()
	defer func() {
		t.mu.Lock()
		delete(s.watchers, ch)
		t.mu.Unlock()
	}()
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-store")
	for {
		select {
		case <-r.Context().Done():
			return
		case l := <-ch:
			b, err := json.Marshal(t.marked(l))
			if err != nil {
				return
			}
			if _, err := fmt.Fprintf(w, "data: %s\n\n", b); err != nil {
				return
			}
			if rc.Flush() != nil {
				return
			}
		}
	}
}
