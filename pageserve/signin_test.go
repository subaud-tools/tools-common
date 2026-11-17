package pageserve

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
)

// signIn posts the page's /signin as its own tab would.
func signIn(t *testing.T, e Entry) int {
	t.Helper()
	req, _ := http.NewRequest("POST", e.Local+"/signin", strings.NewReader(`{"page":"/"}`))
	req.Header.Set("Origin", e.Local)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	_ = resp.Body.Close()
	return resp.StatusCode
}

func liveEntry(t *testing.T) Entry {
	t.Helper()
	e, err := LiveFor("cull").Running()
	if err != nil {
		t.Fatal(err)
	}
	return e
}

// Sign in again opens with the tool's own opener when it has one.
func TestRunSignsInWithTheToolsOpener(t *testing.T) {
	sys := false
	old := openBrowser
	openBrowser = func(string) error { sys = true; return nil }
	t.Cleanup(func() { openBrowser = old })
	var opened string
	startRun(t, Options{Open: func(u string) error { opened = u; return nil }})
	e := liveEntry(t)
	if st := signIn(t, e); st != http.StatusNoContent {
		t.Fatalf("status %d", st)
	}
	if want := e.Local + "/?t=" + e.Token; opened != want || sys {
		t.Fatalf("opened %q (system opener %v), want %q", opened, sys, want)
	}
}

// With no opener of the tool's, Sign in again uses the system opener, as
// `<tool> serve` does.
func TestRunSignsInWithTheSystemOpener(t *testing.T) {
	var opened string
	old := openBrowser
	openBrowser = func(u string) error { opened = u; return nil }
	t.Cleanup(func() { openBrowser = old })
	startRun(t, Options{})
	e := liveEntry(t)
	if st := signIn(t, e); st != http.StatusNoContent {
		t.Fatalf("status %d", st)
	}
	if want := e.Local + "/?t=" + e.Token; opened != want {
		t.Fatalf("opened %q, want %q", opened, want)
	}
}

// `<tool> serve --foreground` hands Commands.Open to the Run its Serve calls,
// so a tool's own opener (casebook's switch) covers Sign in again with no
// change to the tool.
func TestServeHandsTheToolsOpenerToRun(t *testing.T) {
	c := cullCommands(t)
	called := ""
	c.Open = func(u string) error { called = u; return nil }
	var got func(string) error
	c.Serve = func(ctx context.Context, _ int, _ io.Writer) error { got = openerFrom(ctx); return nil }
	if err := c.ServeCommand(Help{}).Run([]string{"--foreground"}, io.Discard, io.Discard); err != nil {
		t.Fatal(err)
	}
	if got == nil {
		t.Fatal("Serve's context carries no opener")
	}
	_ = got("u")
	if called != "u" {
		t.Fatalf("the opener in Serve's context is not Commands.Open")
	}
}
