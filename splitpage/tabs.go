package splitpage

import (
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Errors the tab calls return; Handler answers them with 400, 404 and 409.
var (
	ErrNotLocal = errors.New("splitpage: a tab holds only an http://127.0.0.1:<port> address")
	ErrNoTab    = errors.New("splitpage: no such tab")
	ErrPinned   = errors.New("splitpage: a pinned tab can't be closed")
)

// maxBody bounds one tab call's JSON.
const maxBody = 64 << 10

// Tabs holds each session's tabs and the one that shows, in memory, for as
// long as the server runs. A tool mounts Handler under its localweb /api/, or
// calls Open, Select and Close itself (lwc pins its Lesson). Safe for
// concurrent use.
type Tabs struct {
	mu       sync.Mutex
	sessions map[string]*session
	next     int // the last tab id's number, across every session
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

// List returns a copy of the session's tabs.
func (t *Tabs) List(name string) TabList {
	t.mu.Lock()
	defer t.mu.Unlock()
	return copyList(t.get(name).list)
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
// port, our own tools' pages and nothing else.
func localAddress(address string) bool {
	u, err := url.Parse(address)
	return err == nil && u.Scheme == "http" && u.User == nil && u.Hostname() == "127.0.0.1" && u.Port() != ""
}

// titleTag finds a page's <title>.
var titleTag = regexp.MustCompile(`(?is)<title[^>]*>(.*?)</title>`)

// pageTitle names a tab opened with no title: the <title> of its server's front
// page (a family tool's page is titled with the tool's name), read without the
// address's path or query, so a ?t= token never reaches the label; else the
// address's host and port.
func pageTitle(address string) string {
	u, err := url.Parse(address)
	if err != nil {
		return ""
	}
	c := http.Client{Timeout: time.Second}
	res, err := c.Get("http://" + u.Host + "/")
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
// at that address.
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
			s.list.Selected = tb.ID
			s.changed()
			return copyList(s.list), nil
		}
	}
	t.next++
	tb := Tab{ID: "tab-" + strconv.Itoa(t.next), Address: r.Address, Title: r.Title, Pinned: r.Pinned, Types: r.Types}
	s.list.Tabs = append(s.list.Tabs, tb)
	s.list.Selected = tb.ID
	s.changed()
	return copyList(s.list), nil
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
	s.list.Selected = id
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
			s.list.Selected = s.list.Tabs[i].ID
		case i > 0:
			s.list.Selected = s.list.Tabs[i-1].ID
		default:
			s.list.Selected = ""
		}
	}
	s.changed()
	return copyList(s.list), nil
}

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
func (t *Tabs) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/split/tabs", func(w http.ResponseWriter, r *http.Request) {
		writeList(w, t.List(r.URL.Query().Get("session")), nil)
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
	return mux
}

func readBody(w http.ResponseWriter, r *http.Request, v any) bool {
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBody)).Decode(v); err != nil {
		http.Error(w, "bad request: "+err.Error(), http.StatusBadRequest)
		return false
	}
	return true
}

func writeList(w http.ResponseWriter, l TabList, err error) {
	switch {
	case errors.Is(err, ErrNotLocal):
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	case errors.Is(err, ErrNoTab):
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	case errors.Is(err, ErrPinned):
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
			b, err := json.Marshal(l)
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
