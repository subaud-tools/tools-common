package splitpage

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/subaud-tools/tools-common/localweb"
	"github.com/subaud-tools/tools-common/pageserve"
)

const planPage = "https://diazo.ws.example.com/plan/x"

// On a hosted workspace a tab holds a tool's public page.
func TestOpenTakesAPublicAddressWithTheSetting(t *testing.T) {
	t.Setenv(localweb.PublicDomainEnv, "ws.example.com")
	tabs := NewTabs()
	l, err := tabs.Open(OpenRequest{Session: "s", Address: planPage, Title: "Plan"})
	if err != nil {
		t.Fatal(err)
	}
	if l.Tabs[0].Address != planPage {
		t.Fatalf("tab %+v", l.Tabs[0])
	}
	if _, err := tabs.Open(OpenRequest{Session: "s", Address: "http://127.0.0.1:4001/", Title: "Local"}); err != nil {
		t.Fatalf("a loopback address beside it: %v", err)
	}
	if _, err := tabs.Replace("s", l.Tabs[0].ID, "https://proj.ws.example.com/term"); err != nil {
		t.Fatalf("replace with a public address: %v", err)
	}
}

func TestOpenRefusesAnyOtherPublicAddress(t *testing.T) {
	t.Setenv(localweb.PublicDomainEnv, "ws.example.com")
	srv := serveTabs(t)
	for _, addr := range []string{
		"https://diazo.other.example.com/",
		"https://diazo.xws.example.com/",
		"https://diazo.ws.example.com.evil.com/",
		"https://a.diazo.ws.example.com/",
		"https://ws.example.com/",
		"https://diazo.ws.example.com:8443/",
		"http://diazo.ws.example.com/",
		"https://u@diazo.ws.example.com/",
	} {
		if code, _ := post(t, srv, "open", OpenRequest{Session: "s1", Address: addr, Title: "x"}); code != http.StatusBadRequest {
			t.Errorf("open %q: %d, want 400", addr, code)
		}
	}
}

func TestOpenRefusesAPublicAddressWithTheSettingUnset(t *testing.T) {
	t.Setenv(localweb.PublicDomainEnv, "")
	if _, err := NewTabs().Open(OpenRequest{Session: "s", Address: planPage, Title: "Plan"}); !errors.Is(err, ErrNotLocal) {
		t.Fatalf("open: %v, want ErrNotLocal", err)
	}
}

// A public tab opened with no title is named from its tool's loopback server,
// found through the tool's live entry: its public address answers only
// through the proxy.
func TestAPublicTabTakesItsTitleFromTheLoopbackServer(t *testing.T) {
	t.Setenv(localweb.PublicDomainEnv, "ws.example.com")
	t.Setenv("DIAZO_HOME", t.TempDir())
	var asked string
	page := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		asked = r.URL.RequestURI()
		_, _ = w.Write([]byte("<title>diazo</title>"))
	}))
	defer page.Close()
	e := pageserve.Entry{URL: "https://diazo.ws.example.com/?t=x", Base: "https://diazo.ws.example.com", Local: page.URL, Token: "x", PID: os.Getpid()}
	if err := pageserve.LiveFor("diazo").Advertise(e); err != nil {
		t.Fatal(err)
	}
	l, err := NewTabs().Open(OpenRequest{Session: "s", Address: planPage + "?t=secret"})
	if err != nil {
		t.Fatal(err)
	}
	if got := l.Tabs[0].Title; got != "diazo" {
		t.Errorf("title = %q, want diazo", got)
	}
	if asked != "/" {
		t.Errorf("asked the page for %q, want /", asked)
	}
}

// With PAGE_PUBLIC_HOME set, a tab on the bare domain is the home tool's page:
// accepted, and titled from that tool's loopback server.
func TestATabOnTheHomeToolsBareDomain(t *testing.T) {
	t.Setenv(localweb.PublicDomainEnv, "ws.example.com")
	t.Setenv(localweb.PublicHomeEnv, "diazo")
	t.Setenv("DIAZO_HOME", t.TempDir())
	page := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("<title>diazo</title>"))
	}))
	defer page.Close()
	e := pageserve.Entry{URL: "https://ws.example.com/?t=x", Base: "https://ws.example.com", Local: page.URL, Token: "x", PID: os.Getpid()}
	if err := pageserve.LiveFor("diazo").Advertise(e); err != nil {
		t.Fatal(err)
	}
	l, err := NewTabs().Open(OpenRequest{Session: "s", Address: "https://ws.example.com/plan/x"})
	if err != nil {
		t.Fatal(err)
	}
	if got := l.Tabs[0].Title; got != "diazo" {
		t.Errorf("title = %q, want diazo", got)
	}
}
