package splitpage

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/subaud-tools/tools-common/localweb"
)

// tokenGate stands in for localweb's API auth: the header or nothing.
func tokenGate(token string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get(localweb.TokenHeader) != token {
			http.Error(w, "token required", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func TestOpenClientSendsTheToken(t *testing.T) {
	tabs := NewTabs()
	srv := httptest.NewServer(tokenGate("secret", tabs.Handler()))
	defer srv.Close()
	l, err := Open(srv.URL, "secret", "s1", pageA, "diazo")
	if err != nil {
		t.Fatal(err)
	}
	if len(l.Tabs) != 1 || l.Tabs[0].Address != pageA || l.Tabs[0].Title != "diazo" || l.Selected != l.Tabs[0].ID {
		t.Fatalf("Open = %+v", l)
	}
	if got := tabs.List("s1"); len(got.Tabs) != 1 {
		t.Fatalf("server list = %+v", got)
	}
}

func TestOpenClientWithoutTheTokenFails(t *testing.T) {
	srv := httptest.NewServer(tokenGate("secret", NewTabs().Handler()))
	defer srv.Close()
	_, err := Open(srv.URL, "", "s1", pageA, "diazo")
	if err == nil || !strings.Contains(err.Error(), "401") {
		t.Fatalf("Open without the token: %v, want a 401 error", err)
	}
}

func TestOpenClientBehindKeepsTheShownTab(t *testing.T) {
	tabs := NewTabs()
	srv := httptest.NewServer(tokenGate("secret", tabs.Handler()))
	defer srv.Close()
	first, err := Open(srv.URL, "secret", "s1", pageA, "Lesson")
	if err != nil {
		t.Fatal(err)
	}
	l, err := Open(srv.URL, "secret", "s1", pageB, "File", Behind())
	if err != nil {
		t.Fatal(err)
	}
	if len(l.Tabs) != 2 || l.Selected != first.Selected || !l.Tabs[1].New {
		t.Fatalf("Open behind = %+v", l)
	}
}
