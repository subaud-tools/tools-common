package splitpage

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
)

func serveTabs(t *testing.T) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(NewTabs().Handler())
	t.Cleanup(srv.Close)
	return srv
}

// post sends body to /api/split/<call> and returns the status and the list
// the server answered with (zero when it refused).
func post(t *testing.T, srv *httptest.Server, call string, body any) (int, TabList) {
	t.Helper()
	b, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	res, err := http.Post(srv.URL+"/api/split/"+call, "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = res.Body.Close() }()
	var list TabList
	if res.StatusCode == http.StatusOK {
		if err := json.NewDecoder(res.Body).Decode(&list); err != nil {
			t.Fatal(err)
		}
	}
	return res.StatusCode, list
}

func list(t *testing.T, srv *httptest.Server, session string) TabList {
	t.Helper()
	res, err := http.Get(srv.URL + "/api/split/tabs?session=" + url.QueryEscape(session))
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("GET tabs: %d", res.StatusCode)
	}
	var l TabList
	if err := json.NewDecoder(res.Body).Decode(&l); err != nil {
		t.Fatal(err)
	}
	return l
}

func open(t *testing.T, srv *httptest.Server, session, address string, pinned bool) TabList {
	t.Helper()
	code, l := post(t, srv, "open", OpenRequest{Session: session, Address: address, Title: address, Pinned: pinned})
	if code != http.StatusOK {
		t.Fatalf("open %s: %d", address, code)
	}
	return l
}

func addresses(l TabList) []string {
	var out []string
	for _, tb := range l.Tabs {
		out = append(out, tb.Address)
	}
	return out
}

const (
	pageA = "http://127.0.0.1:4001/"
	pageB = "http://127.0.0.1:4002/review"
)

func TestOpenAddsATabAndShowsIt(t *testing.T) {
	srv := serveTabs(t)
	open(t, srv, "s1", pageA, false)
	l := open(t, srv, "s1", pageB, false)
	if got := addresses(l); len(got) != 2 || got[0] != pageA || got[1] != pageB {
		t.Fatalf("tabs = %v", got)
	}
	if l.Selected != l.Tabs[1].ID {
		t.Fatalf("selected %q, want the new tab %q", l.Selected, l.Tabs[1].ID)
	}
	if got := list(t, srv, "s1"); got.Selected != l.Selected || len(got.Tabs) != 2 {
		t.Fatalf("GET tabs = %+v", got)
	}
}

func TestOpenAnOpenAddressSelectsIt(t *testing.T) {
	srv := serveTabs(t)
	first := open(t, srv, "s1", pageA, false)
	open(t, srv, "s1", pageB, false)
	l := open(t, srv, "s1", pageA, false)
	if len(l.Tabs) != 2 {
		t.Fatalf("opened twice: %v", addresses(l))
	}
	if l.Selected != first.Tabs[0].ID {
		t.Fatalf("selected %q, want the open tab %q", l.Selected, first.Tabs[0].ID)
	}
}

// A tab opened behind joins the bar without changing which tab shows, marked
// new until it is first shown; an address already open stays as it was.
func TestOpenBehindKeepsTheShownTab(t *testing.T) {
	srv := serveTabs(t)
	lesson := open(t, srv, "s1", pageA, true)
	code, l := post(t, srv, "open", OpenRequest{Session: "s1", Address: pageB, Title: "File", Behind: true})
	if code != http.StatusOK {
		t.Fatalf("open behind: %d", code)
	}
	if got := addresses(l); len(got) != 2 || got[1] != pageB {
		t.Fatalf("tabs = %v", got)
	}
	if l.Selected != lesson.Selected {
		t.Fatalf("selected %q, want the shown tab %q", l.Selected, lesson.Selected)
	}
	if l.Tabs[0].New || !l.Tabs[1].New {
		t.Fatalf("new = %v, %v; want false, true", l.Tabs[0].New, l.Tabs[1].New)
	}
	// Opened behind again, after the user moved to it and back: still not shown.
	post(t, srv, "select", SelectRequest{Session: "s1", ID: l.Tabs[1].ID})
	post(t, srv, "select", SelectRequest{Session: "s1", ID: lesson.Selected})
	code, l = post(t, srv, "open", OpenRequest{Session: "s1", Address: pageB, Title: "File", Behind: true})
	if code != http.StatusOK || len(l.Tabs) != 2 || l.Selected != lesson.Selected {
		t.Fatalf("open an open address behind: %d %+v", code, l)
	}
	if l.Tabs[1].New {
		t.Fatalf("a tab already seen is marked new again: %+v", l.Tabs[1])
	}
}

// Showing a tab clears its new mark: Select, or Close showing it as a neighbour.
func TestShowingATabClearsNew(t *testing.T) {
	tabs := NewTabs()
	lesson, _ := tabs.Open(OpenRequest{Session: "s", Address: pageA, Title: "Lesson", Pinned: true})
	l, _ := tabs.Open(OpenRequest{Session: "s", Address: pageB, Title: "File", Behind: true})
	file := l.Tabs[1].ID
	l, err := tabs.Select("s", file)
	if err != nil {
		t.Fatal(err)
	}
	if l.Tabs[1].New {
		t.Fatal("select left the tab marked new")
	}
	_, _ = tabs.Select("s", lesson.Selected)
	l, _ = tabs.Open(OpenRequest{Session: "s", Address: "http://127.0.0.1:4003/", Title: "Three", Behind: true})
	third := l.Tabs[2].ID
	_, _ = tabs.Select("s", file)
	l, err = tabs.Close("s", file)
	if err != nil {
		t.Fatal(err)
	}
	if l.Selected != third || l.Tabs[1].New {
		t.Fatalf("after closing the shown tab: selected %q, tabs %+v", l.Selected, l.Tabs)
	}
}

// With nothing showing, a tab opened behind shows: an empty bar has no tab to
// keep showing.
func TestOpenBehindIntoAnEmptyBarShowsIt(t *testing.T) {
	l, err := NewTabs().Open(OpenRequest{Session: "s", Address: pageA, Title: "A", Behind: true})
	if err != nil {
		t.Fatal(err)
	}
	if l.Selected != l.Tabs[0].ID || l.Tabs[0].New {
		t.Fatalf("open behind into an empty bar: %+v", l)
	}
}

// Opening behind is one change, so the page draws once and never shows the
// new tab.
func TestStreamSendsOneListForAnOpenBehind(t *testing.T) {
	srv := serveTabs(t)
	lesson := open(t, srv, "s1", pageA, true)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, srv.URL+"/api/split/stream?session=s1", nil)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = res.Body.Close() }()
	events := make(chan TabList, 8)
	go func() {
		sc := bufio.NewScanner(res.Body)
		for sc.Scan() {
			if data, ok := strings.CutPrefix(sc.Text(), "data: "); ok {
				var l TabList
				if json.Unmarshal([]byte(data), &l) == nil {
					events <- l
				}
			}
		}
		close(events)
	}()
	<-events // the list now
	post(t, srv, "open", OpenRequest{Session: "s1", Address: pageB, Title: "File", Behind: true})
	got := <-events
	if len(got.Tabs) != 2 || got.Selected != lesson.Selected {
		t.Fatalf("after open behind: %+v", got)
	}
	select {
	case more := <-events:
		t.Fatalf("a second event after one open behind: %+v", more)
	case <-time.After(200 * time.Millisecond):
	}
}

func TestOpenKeepsTypes(t *testing.T) {
	srv := serveTabs(t)
	code, l := post(t, srv, "open", OpenRequest{Session: "s1", Address: pageA, Title: "Lesson", Pinned: true, Types: true})
	if code != http.StatusOK {
		t.Fatalf("open: %d", code)
	}
	open(t, srv, "s1", pageB, false)
	got := list(t, srv, "s1")
	if !got.Tabs[0].Types || got.Tabs[1].Types {
		t.Fatalf("types = %v, %v; want true, false", got.Tabs[0].Types, got.Tabs[1].Types)
	}
	if !l.Tabs[0].Types {
		t.Fatalf("open's answer lost types: %+v", l.Tabs[0])
	}
}

func TestOpenRefusesANonLocalAddress(t *testing.T) {
	srv := serveTabs(t)
	for _, addr := range []string{
		"https://github.com/",
		"http://example.com:4001/",
		"https://127.0.0.1:4001/",
		"http://localhost:4001/",
		"http://127.0.0.1/",
		"javascript:alert(1)",
	} {
		if code, _ := post(t, srv, "open", OpenRequest{Session: "s1", Address: addr}); code != http.StatusBadRequest {
			t.Errorf("open %q: %d, want 400", addr, code)
		}
	}
	if l := list(t, srv, "s1"); len(l.Tabs) != 0 {
		t.Fatalf("refused addresses were opened: %v", addresses(l))
	}
}

func TestSelect(t *testing.T) {
	srv := serveTabs(t)
	l := open(t, srv, "s1", pageA, false)
	open(t, srv, "s1", pageB, false)
	code, got := post(t, srv, "select", SelectRequest{Session: "s1", ID: l.Tabs[0].ID})
	if code != http.StatusOK || got.Selected != l.Tabs[0].ID {
		t.Fatalf("select: %d %+v", code, got)
	}
	if code, _ := post(t, srv, "select", SelectRequest{Session: "s1", ID: "nope"}); code != http.StatusNotFound {
		t.Fatalf("select an unknown tab: %d, want 404", code)
	}
}

func TestCloseShowsANeighbour(t *testing.T) {
	srv := serveTabs(t)
	open(t, srv, "s1", pageA, false)
	l := open(t, srv, "s1", pageB, false)
	code, got := post(t, srv, "close", CloseRequest{Session: "s1", ID: l.Tabs[1].ID})
	if code != http.StatusOK {
		t.Fatalf("close: %d", code)
	}
	if a := addresses(got); len(a) != 1 || a[0] != pageA {
		t.Fatalf("tabs after close = %v", a)
	}
	if got.Selected != got.Tabs[0].ID {
		t.Fatalf("selected %q after closing the shown tab, want %q", got.Selected, got.Tabs[0].ID)
	}
}

func TestCloseRefusesAPinnedTab(t *testing.T) {
	srv := serveTabs(t)
	l := open(t, srv, "s1", pageA, true)
	if !l.Tabs[0].Pinned {
		t.Fatal("tab not pinned")
	}
	if code, _ := post(t, srv, "close", CloseRequest{Session: "s1", ID: l.Tabs[0].ID}); code != http.StatusConflict {
		t.Fatalf("close a pinned tab: %d, want 409", code)
	}
	if got := list(t, srv, "s1"); len(got.Tabs) != 1 {
		t.Fatal("the pinned tab was closed")
	}
}

func TestSessionsAreKeptApart(t *testing.T) {
	srv := serveTabs(t)
	open(t, srv, "s1", pageA, false)
	l2 := open(t, srv, "s2", pageB, false)
	if a := addresses(list(t, srv, "s1")); len(a) != 1 || a[0] != pageA {
		t.Fatalf("s1 = %v", a)
	}
	if a := addresses(l2); len(a) != 1 || a[0] != pageB {
		t.Fatalf("s2 = %v", a)
	}
	// A tab of one session can't be closed through another.
	if code, _ := post(t, srv, "close", CloseRequest{Session: "s1", ID: l2.Tabs[0].ID}); code != http.StatusNotFound {
		t.Fatalf("close s2's tab as s1: %d, want 404", code)
	}
}

func TestStreamSendsTheListAfterEachChange(t *testing.T) {
	srv := serveTabs(t)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, srv.URL+"/api/split/stream?session=s1", nil)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = res.Body.Close() }()
	if ct := res.Header.Get("Content-Type"); ct != "text/event-stream" {
		t.Fatalf("Content-Type %q", ct)
	}
	events := bufio.NewReader(res.Body)
	next := func() TabList {
		t.Helper()
		for {
			line, err := events.ReadString('\n')
			if err != nil {
				t.Fatal(err)
			}
			if data, ok := strings.CutPrefix(line, "data: "); ok {
				var l TabList
				if err := json.Unmarshal([]byte(data), &l); err != nil {
					t.Fatal(err)
				}
				return l
			}
		}
	}
	if l := next(); len(l.Tabs) != 0 {
		t.Fatalf("first event %+v, want the empty list", l)
	}
	l := open(t, srv, "s1", pageA, false)
	if got := next(); len(got.Tabs) != 1 || got.Selected != l.Selected {
		t.Fatalf("after open: %+v", got)
	}
	open(t, srv, "s2", pageB, false) // another session's change is not sent here
	post(t, srv, "close", CloseRequest{Session: "s1", ID: l.Tabs[0].ID})
	if got := next(); len(got.Tabs) != 0 {
		t.Fatalf("after close: %+v", got)
	}
}

// A tab opened with no title takes the title of its server's front page, read
// without the address's query, so a tool's ?t= token never reaches the label.
func TestOpenWithNoTitleTakesThePagesTitle(t *testing.T) {
	var asked string
	page := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		asked = r.URL.RequestURI()
		_, _ = w.Write([]byte("<!doctype html><html><head><title> diazo </title></head></html>"))
	}))
	defer page.Close()
	tabs := NewTabs()
	list, err := tabs.Open(OpenRequest{Session: "s", Address: page.URL + "/?t=secret&f=1"})
	if err != nil {
		t.Fatal(err)
	}
	if got := list.Tabs[0].Title; got != "diazo" {
		t.Errorf("title = %q, want diazo", got)
	}
	if asked != "/" {
		t.Errorf("asked the page for %q, want /", asked)
	}
}

// A page that gives no title is labelled by its host and port, never its query.
func TestOpenWithNoTitleFallsBackToTheHost(t *testing.T) {
	page := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer page.Close()
	list, err := NewTabs().Open(OpenRequest{Session: "s", Address: page.URL + "/?t=secret"})
	if err != nil {
		t.Fatal(err)
	}
	if got, want := list.Tabs[0].Title, strings.TrimPrefix(page.URL, "http://"); got != want {
		t.Errorf("title = %q, want %q", got, want)
	}
}

// A tool moves a tab it keeps, pinned or not, to a new address in place: the
// lesson page comes back on a new port after a restart, and stays one tab.
func TestReplaceMovesATabInPlace(t *testing.T) {
	tabs := NewTabs()
	if _, err := tabs.Open(OpenRequest{Session: "s", Address: "http://127.0.0.1:1/a", Title: "One"}); err != nil {
		t.Fatal(err)
	}
	list, _ := tabs.Open(OpenRequest{Session: "s", Address: "http://127.0.0.1:2/lesson", Title: "Lesson", Pinned: true, Types: true})
	id := list.Selected
	list, err := tabs.Replace("s", id, "http://127.0.0.1:3/lesson")
	if err != nil {
		t.Fatal(err)
	}
	if len(list.Tabs) != 2 {
		t.Fatalf("tabs %+v, want two", list.Tabs)
	}
	got := list.Tabs[1]
	if got.ID != id || got.Address != "http://127.0.0.1:3/lesson" || got.Title != "Lesson" || !got.Pinned || !got.Types {
		t.Fatalf("replaced tab %+v", got)
	}
	if list.Selected != id {
		t.Errorf("selected %q, want %q as before", list.Selected, id)
	}
	if _, err := tabs.Replace("s", id, "https://github.com/"); !errors.Is(err, ErrNotLocal) {
		t.Errorf("a non-local address: %v", err)
	}
	if _, err := tabs.Replace("s", "tab-99", "http://127.0.0.1:4/x"); !errors.Is(err, ErrNoTab) {
		t.Errorf("an unknown tab: %v", err)
	}
}
