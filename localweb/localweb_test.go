package localweb

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/cookiejar"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"testing"
	"testing/fstest"
)

func start(t *testing.T, port int) (*Server, context.CancelFunc) {
	t.Helper()
	t.Setenv("XDG_STATE_HOME", t.TempDir())
	t.Setenv("LWTEST_HOME", "")
	api := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = fmt.Fprint(w, "api:"+r.Method) })
	ctx, cancel := context.WithCancel(context.Background())
	s, err := Start(ctx, Config{Tool: "lwtest", Assets: fstest.MapFS{"index.html": {Data: []byte("page")}}, API: api, Port: port})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { cancel(); _ = s.Wait() })
	return s, cancel
}

var noRedirect = &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}

// result is do's view of a response: it reads and closes the body, so callers
// (and bodyclose) never leak a connection.
type result struct {
	Status  int
	Header  http.Header
	Cookies []*http.Cookie
	Body    string
}

func do(t *testing.T, s *Server, method, path string, mut func(*http.Request)) result {
	t.Helper()
	req, _ := http.NewRequest(method, "http://"+s.Addr()+path, nil)
	if mut != nil {
		mut(req)
	}
	resp, err := noRedirect.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = resp.Body.Close() }()
	b, _ := io.ReadAll(resp.Body)
	return result{Status: resp.StatusCode, Header: resp.Header, Cookies: resp.Cookies(), Body: string(b)}
}

func TestBindsLoopbackOnly(t *testing.T) {
	s, _ := start(t, 0)
	host, _, _ := net.SplitHostPort(s.Addr())
	if host != "127.0.0.1" || !strings.HasPrefix(s.URL, "http://127.0.0.1:") || !strings.Contains(s.URL, "?t="+s.Token) {
		t.Fatalf("addr %s url %s", s.Addr(), s.URL)
	}
}

func TestServesAssetsWithoutToken(t *testing.T) {
	s, _ := start(t, 0)
	r := do(t, s, "GET", "/", nil)
	if r.Status != 200 || r.Body != "page" {
		t.Fatalf("%d %q", r.Status, r.Body)
	}
}

func TestAPIRequiresToken(t *testing.T) {
	s, _ := start(t, 0)
	if r := do(t, s, "GET", "/api/x", nil); r.Status != 401 {
		t.Fatalf("no token: %d", r.Status)
	}
	r := do(t, s, "POST", "/api/x", func(q *http.Request) { q.Header.Set(TokenHeader, s.Token) })
	if r.Status != 200 || r.Body != "api:POST" {
		t.Fatalf("header token: %d %q", r.Status, r.Body)
	}
}

func TestTokenQueryRedirectsAndSetsCookie(t *testing.T) {
	s, _ := start(t, 0)
	r := do(t, s, "GET", "/board?t="+s.Token, nil)
	if r.Status != http.StatusSeeOther || r.Header.Get("Location") != "/board" {
		t.Fatalf("status %d location %q", r.Status, r.Header.Get("Location"))
	}
	var ck *http.Cookie
	for _, c := range r.Cookies {
		if c.Name == "lwtest_token_"+port(t, s) {
			ck = c
		}
	}
	if ck == nil || ck.Value != s.Token || !ck.HttpOnly || ck.SameSite != http.SameSiteStrictMode {
		t.Fatalf("cookie %+v", ck)
	}
	// The sign-in outlives the browser: a cookie with no expiry is gone when
	// Chrome quits, and a bookmarked page then loads with every call refused.
	if ck.MaxAge != 365*24*60*60 {
		t.Fatalf("cookie Max-Age = %d, want one year", ck.MaxAge)
	}
	if r := do(t, s, "GET", "/board?t=wrong", nil); r.Status == http.StatusSeeOther {
		t.Fatal("wrong token must not set a cookie")
	}
}

func port(t *testing.T, s *Server) string {
	t.Helper()
	_, p, err := net.SplitHostPort(s.Addr())
	if err != nil {
		t.Fatal(err)
	}
	return p
}

// Browsers keep cookies per host, not per port: two serves of one tool on
// 127.0.0.1 share a cookie jar, and each must keep its own sign-in.
func TestTwoServesOnOneHostKeepTheirOwnSignIn(t *testing.T) {
	a, _ := start(t, 0)
	b, _ := start(t, 0)
	jar, _ := cookiejar.New(nil)
	c := &http.Client{Jar: jar}
	get := func(s *Server, path string) int {
		t.Helper()
		resp, err := c.Get("http://" + s.Addr() + path)
		if err != nil {
			t.Fatal(err)
		}
		_ = resp.Body.Close()
		return resp.StatusCode
	}
	get(a, "/?t="+a.Token)
	get(b, "/?t="+b.Token)
	if st := get(a, "/api/x"); st != http.StatusOK {
		t.Errorf("first serve after the second signed in: %d", st)
	}
	if st := get(b, "/api/x"); st != http.StatusOK {
		t.Errorf("second serve: %d", st)
	}
}

func TestCookieAuthNeedsSameOriginForWrites(t *testing.T) {
	s, _ := start(t, 0)
	withCookie := func(q *http.Request) { q.AddCookie(&http.Cookie{Name: "lwtest_token_" + port(t, s), Value: s.Token}) }
	if r := do(t, s, "GET", "/api/x", withCookie); r.Status != 200 {
		t.Fatalf("cookie GET: %d", r.Status)
	}
	if r := do(t, s, "POST", "/api/x", withCookie); r.Status != 403 {
		t.Fatalf("cookie POST without Origin: %d", r.Status)
	}
	bad := func(q *http.Request) { withCookie(q); q.Header.Set("Origin", "http://evil.example") }
	if r := do(t, s, "POST", "/api/x", bad); r.Status != 403 {
		t.Fatalf("cross-origin POST: %d", r.Status)
	}
	good := func(q *http.Request) { withCookie(q); q.Header.Set("Origin", "http://"+s.Addr()) }
	if r := do(t, s, "POST", "/api/x", good); r.Status != 200 {
		t.Fatalf("same-origin POST: %d", r.Status)
	}
}

func TestRejectsForeignHost(t *testing.T) {
	s, _ := start(t, 0)
	_, port, _ := net.SplitHostPort(s.Addr())
	r := do(t, s, "GET", "/api/x", func(q *http.Request) {
		q.Host = "evil.example:" + port
		q.Header.Set(TokenHeader, s.Token)
	})
	if r.Status != 403 {
		t.Fatalf("rebinding host: %d", r.Status)
	}
	r = do(t, s, "GET", "/", func(q *http.Request) { q.Host = "localhost:" + port })
	if r.Status != 200 {
		t.Fatalf("localhost host: %d", r.Status)
	}
}

func TestPortIsRememberedAndReused(t *testing.T) {
	t.Setenv("XDG_STATE_HOME", t.TempDir())
	ctx, cancel := context.WithCancel(context.Background())
	s1, err := Start(ctx, Config{Tool: "lwtest", Assets: fstest.MapFS{}})
	if err != nil {
		t.Fatal(err)
	}
	addr := s1.Addr()
	cancel()
	_ = s1.Wait()
	ctx2, cancel2 := context.WithCancel(context.Background())
	defer cancel2()
	s2, err := Start(ctx2, Config{Tool: "lwtest", Assets: fstest.MapFS{}})
	if err != nil {
		t.Fatal(err)
	}
	defer func() { cancel2(); _ = s2.Wait() }()
	if s2.Addr() != addr {
		t.Fatalf("port not reused: %s then %s", addr, s2.Addr())
	}
}

func TestPortHintFallback(t *testing.T) {
	state := t.TempDir()
	t.Setenv("XDG_STATE_HOME", state)
	hint := filepath.Join(state, "lwtest", "port")
	_ = os.MkdirAll(filepath.Dir(hint), 0o700)

	_ = os.WriteFile(hint, []byte("not-a-port"), 0o600)
	ctx, cancel := context.WithCancel(context.Background())
	s, err := Start(ctx, Config{Tool: "lwtest", Assets: fstest.MapFS{}})
	if err != nil {
		t.Fatalf("garbage hint: %v", err)
	}
	cancel()
	_ = s.Wait()

	busy, _ := net.Listen("tcp", "127.0.0.1:0")
	defer func() { _ = busy.Close() }()
	_ = os.WriteFile(hint, []byte(strconv.Itoa(busy.Addr().(*net.TCPAddr).Port)), 0o600)
	ctx2, cancel2 := context.WithCancel(context.Background())
	s2, err := Start(ctx2, Config{Tool: "lwtest", Assets: fstest.MapFS{}})
	if err != nil {
		t.Fatalf("busy hint: %v", err)
	}
	if s2.Addr() == busy.Addr().String() {
		t.Fatal("reused a busy port")
	}
	cancel2()
	_ = s2.Wait()
}

func TestExplicitBusyPortErrors(t *testing.T) {
	t.Setenv("XDG_STATE_HOME", t.TempDir())
	busy, _ := net.Listen("tcp", "127.0.0.1:0")
	defer func() { _ = busy.Close() }()
	_, err := Start(context.Background(), Config{Tool: "lwtest", Assets: fstest.MapFS{}, Port: busy.Addr().(*net.TCPAddr).Port})
	if err == nil {
		t.Fatal("explicit busy port must error")
	}
}

func TestFreePort(t *testing.T) {
	p, err := FreePort()
	if err != nil || p <= 0 {
		t.Fatalf("%d %v", p, err)
	}
}

func TestNilAssetsServe404(t *testing.T) {
	t.Setenv("XDG_STATE_HOME", t.TempDir())
	t.Setenv("LWTEST_HOME", "")
	ctx, cancel := context.WithCancel(context.Background())
	s, err := Start(ctx, Config{Tool: "lwtest"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { cancel(); _ = s.Wait() })
	_, port, _ := net.SplitHostPort(s.Addr())
	req, _ := http.NewRequest("GET", "http://"+s.Addr()+"/", nil)
	req.Host = "127.0.0.1:" + port
	resp, err := noRedirect.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("nil Assets: got %d, want 404", resp.StatusCode)
	}
}

// A tool that keeps its token across restarts hands it in; open tabs keep
// working against the new server.
func TestAGivenTokenIsUsedInsteadOfANewOne(t *testing.T) {
	const kept = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	s, err := Start(ctx, Config{Tool: "lwtest", Assets: fstest.MapFS{}, API: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = io.WriteString(w, "ok") }), Token: kept})
	if err != nil {
		t.Fatal(err)
	}
	if s.Token != kept || !strings.HasSuffix(s.URL, "?t="+kept) {
		t.Fatalf("token %q, url %q", s.Token, s.URL)
	}
	if r := do(t, s, "GET", "/api/x", func(q *http.Request) { q.Header.Set(TokenHeader, kept) }); r.Status != 200 {
		t.Fatalf("kept token refused: %d", r.Status)
	}
	if _, err := Start(ctx, Config{Tool: "lwtest", Assets: fstest.MapFS{}, Token: "short"}); err == nil {
		t.Fatal("a weak token was accepted")
	}
}

// opener records the URLs /signin asked it to open.
type opener struct {
	mu   sync.Mutex
	urls []string
}

func (o *opener) open(u string) error {
	o.mu.Lock()
	defer o.mu.Unlock()
	o.urls = append(o.urls, u)
	return nil
}

func (o *opener) opened() []string {
	o.mu.Lock()
	defer o.mu.Unlock()
	return append([]string(nil), o.urls...)
}

func startWithOpener(t *testing.T, open func(string) error) *Server {
	t.Helper()
	t.Setenv("XDG_STATE_HOME", t.TempDir())
	ctx, cancel := context.WithCancel(context.Background())
	s, err := Start(ctx, Config{Tool: "lwtest", Assets: fstest.MapFS{"index.html": {Data: []byte("page")}}, Open: open})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { cancel(); _ = s.Wait() })
	return s
}

func signin(t *testing.T, s *Server, method, origin, body string) result {
	t.Helper()
	return do(t, s, method, "/signin", func(q *http.Request) {
		if origin != "" {
			q.Header.Set("Origin", origin)
		}
		if body != "" {
			q.Body = io.NopCloser(strings.NewReader(body))
			q.ContentLength = int64(len(body))
			q.Header.Set("Content-Type", "application/json")
		}
	})
}

// A signed-out page asks for a signed-in tab of itself: the server opens the
// page with t= in the browser, and the token never goes back to the caller.
func TestSignInOpensThePageWithTheToken(t *testing.T) {
	var o opener
	s := startWithOpener(t, o.open)
	r := signin(t, s, "POST", "http://"+s.Addr(), `{"page":"/p/3?x=1#/a"}`)
	if r.Status != http.StatusNoContent {
		t.Fatalf("status %d %q", r.Status, r.Body)
	}
	if strings.Contains(r.Body, s.Token) {
		t.Fatal("the token is in the response body")
	}
	if r.Header.Get("Set-Cookie") != "" || len(r.Cookies) != 0 {
		t.Fatalf("a cookie was set: %v", r.Header["Set-Cookie"])
	}
	want := "http://" + s.Addr() + "/p/3?x=1&t=" + s.Token + "#/a"
	if got := o.opened(); len(got) != 1 || got[0] != want {
		t.Fatalf("opened %q, want [%q]", got, want)
	}
}

func TestSignInRefusesAnotherOrigin(t *testing.T) {
	var o opener
	s := startWithOpener(t, o.open)
	for _, origin := range []string{"", "http://evil.example", "http://localhost:" + port(t, s), "https://" + s.Addr(), "null"} {
		if r := signin(t, s, "POST", origin, `{"page":"/"}`); r.Status != http.StatusForbidden {
			t.Errorf("origin %q: status %d", origin, r.Status)
		}
	}
	if got := o.opened(); len(got) != 0 {
		t.Fatalf("opened %q", got)
	}
}

func TestSignInRefusesAPageOffThisServer(t *testing.T) {
	var o opener
	s := startWithOpener(t, o.open)
	for _, body := range []string{`{"page":"p/3"}`, `{"page":"//evil.example/"}`, `{"page":"/\\evil.example"}`, `{"page":""}`, `{"page":"http://evil.example/"}`, `not json`, ``} {
		if r := signin(t, s, "POST", "http://"+s.Addr(), body); r.Status != http.StatusBadRequest {
			t.Errorf("body %q: status %d", body, r.Status)
		}
	}
	if got := o.opened(); len(got) != 0 {
		t.Fatalf("opened %q", got)
	}
}

func TestSignInGetOpensNothing(t *testing.T) {
	var o opener
	s := startWithOpener(t, o.open)
	if r := signin(t, s, "GET", "http://"+s.Addr(), ""); r.Status == http.StatusNoContent {
		t.Fatalf("GET status %d", r.Status)
	}
	if got := o.opened(); len(got) != 0 {
		t.Fatalf("opened %q", got)
	}
}

// With no opener of the tool's, Sign in again uses the system opener, so a
// tool that calls Start itself (diazo, casebook) gets it with no change.
func TestSignInWithNoOpenerUsesTheSystemOpener(t *testing.T) {
	var o opener
	old := openBrowser
	openBrowser = o.open
	t.Cleanup(func() { openBrowser = old })
	s := startWithOpener(t, nil)
	if r := signin(t, s, "POST", "http://"+s.Addr(), `{"page":"/"}`); r.Status != http.StatusNoContent {
		t.Fatalf("status %d", r.Status)
	}
	if got, want := o.opened(), "http://"+s.Addr()+"/?t="+s.Token; len(got) != 1 || got[0] != want {
		t.Fatalf("opened %q, want [%q]", got, want)
	}
}
