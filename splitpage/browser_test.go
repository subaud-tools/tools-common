package splitpage

import (
	"bufio"
	"context"
	"crypto/sha1" //nolint:gosec // G505: the websocket handshake is defined with SHA-1
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/subaud-tools/tools-common/localweb"
)

// The page is tested in the system's headless Chrome, as localweb/page's
// suites are: a localweb server serves Page, Tabs and a stand-in terminal,
// testdata/run.html frames the page and runs testdata/suite.js against it,
// and the suite posts its result back. Without Chrome the tests skip, unless
// KIT_BROWSER=required (CI), where a missing browser is a failure.

func chromePath() string {
	if p := os.Getenv("KIT_CHROME"); p != "" {
		return p
	}
	for _, name := range []string{"chrome-headless-shell", "google-chrome", "google-chrome-stable", "chromium", "chromium-browser"} {
		if p, err := exec.LookPath(name); err == nil {
			return p
		}
	}
	mac := "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
	if _, err := os.Stat(mac); err == nil {
		return mac
	}
	return ""
}

func needChrome(t *testing.T) string {
	t.Helper()
	p := chromePath()
	if p == "" {
		if os.Getenv("KIT_BROWSER") == "required" {
			t.Fatal("KIT_BROWSER=required but no Chrome found (set KIT_CHROME)")
		}
		t.Skip("no Chrome; set KIT_CHROME to run the split page's browser tests")
	}
	return p
}

// profileDir is Chrome's throwaway profile. Not t.TempDir: Chrome's child
// processes outlive the killed browser for a moment and keep writing here.
func profileDir(t *testing.T) string {
	t.Helper()
	dir, err := os.MkdirTemp("", "splitpage-chrome-")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		for range 20 {
			if os.RemoveAll(dir) == nil {
				return
			}
			time.Sleep(100 * time.Millisecond)
		}
	})
	return dir
}

func TestBrowserPage(t *testing.T)      { runSuite(t, true) }
func TestBrowserNoRestart(t *testing.T) { runSuite(t, false) }

// runSuite serves the page, offering a restart and a take or neither, and runs
// the suite.
func runSuite(t *testing.T, restart bool) {
	chrome := needChrome(t)
	t.Setenv("XDG_STATE_HOME", t.TempDir()) // localweb remembers its port there

	term := &stubTerminal{held: make(chan struct{})}
	t.Cleanup(term.closeAll)
	result := make(chan string, 1)
	api := http.NewServeMux()
	api.Handle("/api/split/", NewTabs().Handler())
	api.HandleFunc("GET /api/term", term.serve)
	if restart {
		api.HandleFunc("POST /api/split/restart", func(http.ResponseWriter, *http.Request) {})
	}
	api.HandleFunc("GET /api/test/input", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = io.WriteString(w, term.received())
	})
	api.HandleFunc("POST /api/test/release", func(http.ResponseWriter, *http.Request) { term.release() })
	api.HandleFunc("POST /api/test/stop", func(http.ResponseWriter, *http.Request) { term.closeNewest(CloseStopped) })
	api.HandleFunc("POST /api/test/replace", func(http.ResponseWriter, *http.Request) { term.closeNewest(CloseReplaced) })
	api.HandleFunc("GET /api/test/queries", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(term.queries())
	})
	api.HandleFunc("POST /api/test/result", func(_ http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		select {
		case result <- string(b):
		default:
		}
	})

	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	page := Page(Config{Title: "splitpage test", Socket: "/api/term", Session: "s1", Restart: restart, Take: restart})
	srv, err := localweb.Start(ctx, localweb.Config{Tool: "splitpage-test", Assets: withTestdata{page}, API: api})
	if err != nil {
		t.Fatal(err)
	}

	framed := func(name string) string {
		s := httptest.NewServer(http.FileServerFS(os.DirFS("testdata")))
		t.Cleanup(s.Close)
		return s.URL + "/" + name
	}
	q := url.Values{"t": {srv.Token}, "one": {framed("one.html")}, "two": {framed("two.html")}, "clip": {framed("clip.html")}}
	if restart {
		q.Set("restart", "1")
	}
	run := "http://" + srv.Addr() + "/test/run.html?" + q.Encode()

	args := []string{"--disable-gpu", "--no-first-run", "--no-default-browser-check",
		"--user-data-dir=" + profileDir(t), run}
	if !strings.Contains(filepath.Base(chrome), "headless-shell") {
		args = append([]string{"--headless=new"}, args...)
	}
	cmd := exec.Command(chrome, args...)
	cmd.WaitDelay = time.Second
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	defer func() {
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
	}()

	select {
	case res := <-result:
		if !strings.HasPrefix(res, "PASS ") {
			t.Fatalf("suite:\n%s", res)
		}
		t.Log(strings.SplitN(res, "\n", 2)[0])
	case <-time.After(90 * time.Second):
		t.Fatal("the suite posted no result in 90s")
	}
}

// withTestdata serves the page, and testdata under /test/.
type withTestdata struct{ page fs.FS }

func (w withTestdata) Open(name string) (fs.File, error) {
	if rest, ok := strings.CutPrefix(name, "test/"); ok {
		return os.DirFS("testdata").Open(rest)
	}
	return w.page.Open(name)
}

// stubTerminal is a terminal websocket that keeps the wire's contract: its
// first frame is TerminalReset, which the first connection holds until the
// suite releases it, then it echoes what the page sends. Standard library
// only, as the root module must be.
type stubTerminal struct {
	mu       sync.Mutex
	input    strings.Builder
	conns    []*wsConn
	query    []string // each connection's raw query, in order
	held     chan struct{}
	released bool
}

func (s *stubTerminal) received() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.input.String()
}

func (s *stubTerminal) release() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.released {
		s.released = true
		close(s.held)
	}
}

func (s *stubTerminal) queries() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]string{}, s.query...)
}

// closeNewest closes the newest connection with code.
func (s *stubTerminal) closeNewest(code uint16) {
	s.mu.Lock()
	var c *wsConn
	if n := len(s.conns); n > 0 {
		c = s.conns[n-1]
	}
	s.mu.Unlock()
	if c != nil {
		_ = c.close(code, "closed by the test")
	}
}

func (s *stubTerminal) closeAll() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, c := range s.conns {
		_ = c.conn.Close()
	}
}

func (s *stubTerminal) serve(w http.ResponseWriter, r *http.Request) {
	c, err := accept(w, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	defer func() { _ = c.conn.Close() }()
	s.mu.Lock()
	s.conns = append(s.conns, c)
	s.query = append(s.query, r.URL.RawQuery)
	s.mu.Unlock()
	<-s.held
	if c.write(opBinary, []byte(TerminalReset)) != nil {
		return
	}
	for {
		op, data, err := c.read()
		if err != nil {
			return
		}
		switch op {
		case opText: // a resize: the stub has no size to keep
		case opBinary:
			s.mu.Lock()
			s.input.Write(data)
			s.mu.Unlock()
			if c.write(opBinary, data) != nil {
				return
			}
		case opClose:
			c.answerClose(data)
			return
		case opPing:
			_ = c.write(opPong, data)
		}
	}
}

const (
	opText   = 0x1
	opBinary = 0x2
	opClose  = 0x8
	opPing   = 0x9
	opPong   = 0xA
)

// wsConn is the server end of one websocket: unfragmented frames, which is
// all a page's small messages are.
type wsConn struct {
	conn   net.Conn
	rw     *bufio.ReadWriter
	wmu    sync.Mutex
	closed bool // a close frame was sent
}

func accept(w http.ResponseWriter, r *http.Request) (*wsConn, error) {
	key := r.Header.Get("Sec-WebSocket-Key")
	if !strings.EqualFold(r.Header.Get("Upgrade"), "websocket") || key == "" {
		return nil, errors.New("not a websocket request")
	}
	sum := sha1.Sum([]byte(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")) //nolint:gosec // G401: the handshake's hash
	conn, rw, err := http.NewResponseController(w).Hijack()
	if err != nil {
		return nil, err
	}
	_, _ = rw.WriteString("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n" +
		"Sec-WebSocket-Accept: " + base64.StdEncoding.EncodeToString(sum[:]) + "\r\n\r\n")
	if err := rw.Flush(); err != nil {
		_ = conn.Close()
		return nil, err
	}
	return &wsConn{conn: conn, rw: rw}, nil
}

func (c *wsConn) read() (byte, []byte, error) {
	var head [2]byte
	if _, err := io.ReadFull(c.rw, head[:]); err != nil {
		return 0, nil, err
	}
	n := uint64(head[1] & 0x7f)
	switch n {
	case 126:
		var b [2]byte
		if _, err := io.ReadFull(c.rw, b[:]); err != nil {
			return 0, nil, err
		}
		n = uint64(binary.BigEndian.Uint16(b[:]))
	case 127:
		var b [8]byte
		if _, err := io.ReadFull(c.rw, b[:]); err != nil {
			return 0, nil, err
		}
		n = binary.BigEndian.Uint64(b[:])
	}
	if n > 1<<20 {
		return 0, nil, errors.New("frame too large")
	}
	var mask [4]byte
	if head[1]&0x80 != 0 {
		if _, err := io.ReadFull(c.rw, mask[:]); err != nil {
			return 0, nil, err
		}
	}
	data := make([]byte, n)
	if _, err := io.ReadFull(c.rw, data); err != nil {
		return 0, nil, err
	}
	for i := range data {
		data[i] ^= mask[i%4]
	}
	return head[0] & 0x0f, data, nil
}

func (c *wsConn) write(op byte, data []byte) error {
	c.wmu.Lock()
	defer c.wmu.Unlock()
	if c.closed {
		return net.ErrClosed
	}
	c.closed = op == opClose
	head := []byte{0x80 | op}
	switch n := len(data); {
	case n < 126:
		head = append(head, byte(n))
	case n < 1<<16:
		head = append(head, 126)
		head = binary.BigEndian.AppendUint16(head, uint16(n))
	default:
		head = append(head, 127)
		head = binary.BigEndian.AppendUint64(head, uint64(n))
	}
	if _, err := c.rw.Write(append(head, data...)); err != nil {
		return err
	}
	return c.rw.Flush()
}

// answerClose echoes the page's close frame, unless this end closed first.
func (c *wsConn) answerClose(data []byte) { _ = c.write(opClose, data) }

func (c *wsConn) close(code uint16, reason string) error {
	return c.write(opClose, append(binary.BigEndian.AppendUint16(nil, code), reason...))
}
