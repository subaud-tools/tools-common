package splitpage

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
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
