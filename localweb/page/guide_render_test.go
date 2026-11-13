package page

import (
	"encoding/json"
	"html"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"github.com/subaud-tools/tools-common/guide"
)

// guideServer serves testdata with the kit, and GET /api/kit/guide as a
// serve answers it for diazo's page with every tool installed.
func guideServer(t *testing.T) *httptest.Server {
	t.Helper()
	d, err := guide.Data("diazo", func(string) bool { return true })
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/kit/guide", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(d)
	})
	mux.Handle("/", http.FileServerFS(With(os.DirFS("testdata"))))
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

// The Guide renders at desktop (1280) and phone (390) width with no console
// errors and nothing wider than the window: the side list beside the main
// pane on a desktop, above it on a phone. Headless Chrome won't open a
// window under 500px, so the phone width runs in a 390px iframe
// (testdata/phone.html). With KIT_GUIDE_SHOTS set to a directory, it also
// saves a screenshot of /_kit/guide/ at each width there.
func TestGuideRendersAtDesktopAndPhone(t *testing.T) {
	srv := guideServer(t)
	for _, c := range []struct {
		w, h   int
		layout string
	}{{1280, 900, "beside"}, {390, 844, "above"}} {
		t.Run(strconv.Itoa(c.w), func(t *testing.T) {
			size := "--window-size=" + strconv.Itoa(c.w) + "," + strconv.Itoa(c.h)
			page := srv.URL + "/guiderender.html"
			shotURL := srv.URL + "/_kit/guide/"
			if c.w < 500 {
				phone := "/phone.html?w=" + strconv.Itoa(c.w) + "&h=" + strconv.Itoa(c.h) + "&src="
				page, shotURL = srv.URL+phone+"/guiderender.html", srv.URL+phone+"/_kit/guide/"
				size = "--window-size=500," + strconv.Itoa(c.h)
			}
			dom, err := dumpDOM(t, page, size)
			if err != nil {
				t.Fatal(err)
			}
			m := resultRE.FindStringSubmatch(dom)
			if m == nil {
				t.Fatalf("no result:\n%s", dom)
			}
			var got struct {
				Width    int
				Overflow bool
				Layout   string
				Tool     string
				Asks     int
				Errors   []string
			}
			if err := json.Unmarshal([]byte(html.UnescapeString(m[1])), &got); err != nil {
				t.Fatalf("%v: %s", err, m[1])
			}
			if len(got.Errors) > 0 || got.Overflow || got.Layout != c.layout || got.Width != c.w || got.Tool != "diazo" || got.Asks == 0 {
				t.Fatalf("at %d: %+v", c.w, got)
			}
			if dir := os.Getenv("KIT_GUIDE_SHOTS"); dir != "" {
				shot(t, shotURL, filepath.Join(dir, "guide-"+strconv.Itoa(c.w)+".png"), size)
			}
		})
	}
}

// shot saves a screenshot of url at the window size given.
func shot(t *testing.T, url, path, size string) {
	t.Helper()
	chrome := needChrome(t)
	args := []string{"--disable-gpu", "--no-first-run", "--hide-scrollbars", "--user-data-dir=" + profileDir(t),
		"--virtual-time-budget=5000", size, "--screenshot=" + path, url}
	if !strings.Contains(filepath.Base(chrome), "headless-shell") {
		args = append([]string{"--headless=new"}, args...)
	}
	if out, err := exec.Command(chrome, args...).CombinedOutput(); err != nil {
		t.Fatalf("screenshot: %v: %s", err, out)
	}
}
