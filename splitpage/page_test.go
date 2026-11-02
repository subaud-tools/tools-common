package splitpage

import (
	"io"
	"mime"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// get serves Page the way localweb serves a tool's Assets.
func get(t *testing.T, c Config, path string) (int, http.Header, string) {
	t.Helper()
	srv := httptest.NewServer(http.FileServerFS(Page(c)))
	defer srv.Close()
	res, err := http.Get(srv.URL + path)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = res.Body.Close() }()
	b, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}
	return res.StatusCode, res.Header, string(b)
}

func TestPageCarriesTheConfig(t *testing.T) {
	code, _, body := get(t, Config{Title: `proj <s1>`, Socket: "/api/term", Session: `s"1`, Restart: true, Take: true, Script: `first"run.js`}, "/")
	if code != http.StatusOK {
		t.Fatalf("GET /: %d", code)
	}
	for _, want := range []string{
		`<title>proj &lt;s1&gt;</title>`,
		`data-socket="/api/term"`,
		`data-session="s&#34;1"`,
		`data-restart="true"`,
		`data-take="true"`,
		`data-script="first&#34;run.js"`,
		`src="split.js"`,
	} {
		if !strings.Contains(body, want) {
			t.Errorf("page lacks %s:\n%s", want, body)
		}
	}
	if _, _, body := get(t, Config{Socket: "/api/term"}, "/"); !strings.Contains(body, `data-restart="false"`) || !strings.Contains(body, `data-take="false"`) || !strings.Contains(body, `data-script=""`) {
		t.Errorf("a page with no restart, take or script says otherwise:\n%s", body)
	}
}

// A Windows registry can map .js to text/plain, and a browser refuses a module
// script of the wrong type; Page puts the right types back.
func TestPageAssetTypes(t *testing.T) {
	if err := mime.AddExtensionType(".js", "text/plain"); err != nil {
		t.Fatal(err)
	}
	if err := mime.AddExtensionType(".css", "text/plain"); err != nil {
		t.Fatal(err)
	}
	for path, want := range map[string]string{
		"/split.js":  "text/javascript; charset=utf-8",
		"/split.css": "text/css; charset=utf-8",
	} {
		code, header, body := get(t, Config{}, path)
		if code != http.StatusOK || body == "" {
			t.Fatalf("GET %s: %d, %d bytes", path, code, len(body))
		}
		if got := header.Get("Content-Type"); got != want {
			t.Errorf("GET %s: Content-Type %q, want %q", path, got, want)
		}
	}
}
