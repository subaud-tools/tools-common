package page

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

// TestDemoLoads runs demo/ (the review page that rebuilds the approved mock on
// the kit) in headless Chrome: it must render both views without an error.
func TestDemoLoads(t *testing.T) {
	srv := httptest.NewServer(http.FileServerFS(With(os.DirFS("."))))
	defer srv.Close()
	for _, view := range []string{"attention", "label", "parts", "tabs", "decision", "record", "sendshort", "sendlong", "page", "page&open=repos"} {
		dom, err := dumpDOM(t, srv.URL+"/demo/?view="+view)
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(dom, `data-ok="1"`) || strings.Contains(dom, "data-err=") {
			t.Fatalf("demo %s did not load cleanly:\n%s", view, dom)
		}
		if strings.Contains(view, "open=repos") && (!strings.Contains(dom, "kit-sheet-wide") || !strings.Contains(dom, "kit-repo-pick")) {
			t.Fatalf("demo %s did not open the repo picker in a wide sheet:\n%s", view, dom)
		}
	}
}
