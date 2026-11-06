package pageserve

import (
	"context"
	"net/http"
	"regexp"
	"strings"
	"testing"

	"github.com/subaud-tools/tools-common/localweb"
)

var loopback = regexp.MustCompile(`^http://127\.0\.0\.1:[0-9]+$`)

// With the setting unset the entry is as before, and local names the same
// loopback server as base.
func TestTheEntryKeepsALoopbackAddress(t *testing.T) {
	t.Setenv(localweb.PublicDomainEnv, "")
	startRun(t, Options{})
	e, err := LiveFor("cull").Running()
	if err != nil {
		t.Fatal(err)
	}
	if !loopback.MatchString(e.Local) || e.Base != e.Local {
		t.Fatalf("local %q, base %q: want one loopback address", e.Local, e.Base)
	}
	if !strings.HasPrefix(e.URL, e.Base+"/?t=") {
		t.Fatalf("url %q is not on base %q", e.URL, e.Base)
	}
}

// With PAGE_PUBLIC_DOMAIN set the entry advertises the tool's public page,
// token and all, and keeps its loopback server in local.
func TestTheEntryIsPublicWithTheSetting(t *testing.T) {
	t.Setenv(localweb.PublicDomainEnv, "ws.example.com")
	startRun(t, Options{})
	e, err := LiveFor("cull").Running()
	if err != nil {
		t.Fatal(err)
	}
	if e.Base != "https://cull.ws.example.com" {
		t.Fatalf("base %q, want https://cull.ws.example.com", e.Base)
	}
	if e.URL != "https://cull.ws.example.com/?t="+e.Token {
		t.Fatalf("url %q, want the public page with the token", e.URL)
	}
	if !loopback.MatchString(e.Local) {
		t.Fatalf("local %q, want the loopback server", e.Local)
	}
}

// Every caller on the machine reaches the server through local, never the
// public base: a client call and Stop both work with the setting set.
func TestCallersReachThePublicServerOnLoopback(t *testing.T) {
	t.Setenv(localweb.PublicDomainEnv, "ws.example.com")
	r := startRun(t, Options{})
	live := LiveFor("cull")
	cl := NewClient(live, nil)
	if code, err := cl.Do(context.Background(), http.MethodGet, "/api/ping", nil, nil); err != nil || code != http.StatusOK {
		t.Fatalf("client call: %d %v", code, err)
	}
	if err := Stop(context.Background(), live); err != nil {
		t.Fatalf("stop: %v", err)
	}
	wait(t, r)
}
