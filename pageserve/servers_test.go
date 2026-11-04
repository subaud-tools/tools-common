package pageserve

import (
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"testing"
	"time"

	tools "github.com/subaud-tools/tools-common"
)

// stateRoot points every tool's state folder at a temporary root.
func stateRoot(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	t.Setenv("XDG_STATE_HOME", root)
	return root
}

// server is the one listed for tool, failing the test when none is.
func server(t *testing.T, tool string) Server {
	t.Helper()
	got, err := Servers()
	if err != nil {
		t.Fatal(err)
	}
	for _, s := range got {
		if s.Tool == tool {
			return s
		}
	}
	t.Fatalf("%s not listed in %+v", tool, got)
	return Server{}
}

func TestServersListsALiveEntryUp(t *testing.T) {
	root := stateRoot(t)
	if err := LiveFor("diazo").Advertise(Entry{PID: os.Getpid(), Base: "http://127.0.0.1:1", Token: "x"}); err != nil {
		t.Fatal(err)
	}
	s := server(t, "diazo")
	if !s.Up || s.Entry.PID != os.Getpid() || s.Entry.Base != "http://127.0.0.1:1" {
		t.Errorf("%+v", s)
	}
	if want := filepath.Join(root, "diazo", "serve.log"); s.LogPath != want {
		t.Errorf("log %q, want %q", s.LogPath, want)
	}
}

func TestServersListsAnEmptyLiveFolderDown(t *testing.T) {
	root := stateRoot(t)
	if err := os.MkdirAll(filepath.Join(root, "cull", "live"), 0o700); err != nil {
		t.Fatal(err)
	}
	if s := server(t, "cull"); s.Up {
		t.Errorf("listed up: %+v", s)
	}
}

func TestServersSkipsAFolderWithNoLiveFolder(t *testing.T) {
	root := stateRoot(t)
	if err := os.MkdirAll(filepath.Join(root, "nvim"), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(root, "sift", "live"), 0o700); err != nil {
		t.Fatal(err)
	}
	got, err := Servers()
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0].Tool != "sift" {
		t.Fatalf("%+v", got)
	}
}

func TestServersListsADeadPIDDownAndRemovesItsEntry(t *testing.T) {
	stateRoot(t)
	l := LiveFor("muda")
	if err := l.Advertise(Entry{PID: 1 << 30, Token: "x"}); err != nil {
		t.Fatal(err)
	}
	if s := server(t, "muda"); s.Up {
		t.Errorf("listed up: %+v", s)
	}
	if _, err := os.Stat(l.ServePath()); !os.IsNotExist(err) {
		t.Errorf("dead entry kept: %v", err)
	}
}

func TestLeftoversFromPS(t *testing.T) {
	servers := []Server{
		{Tool: "diazo", Up: true, Entry: Entry{PID: 200}},
		{Tool: "galley", Up: true, Entry: Entry{PID: 300}},
		{Tool: "cull"},
		// down, but its entry still names a pid: not a leftover
		{Tool: "muda", Entry: Entry{PID: 700}},
	}
	ps := `    1 06-07:56:53 /sbin/launchd
  200 01:02:03 /Users/me/.local/bin/diazo serve --foreground --no-open
 3692 03-16:49:03 /private/var/folders/T/diazo-probe-bin-kmNA0C/diazo serve
 8102 06-04:45:43 /Users/me/.local/bin/galley edit /doc.md --owner abc
 8200 10:00 /Users/me/.local/bin/galley edit /mine.md
  700 10:00 /Users/me/.local/bin/muda serve --foreground --no-open
  401 00:42 /Users/me/.local/bin/cull daemon
  402 12:00 /Users/me/.local/bin/cull channel
  500 05:00 /opt/homebrew/bin/llama-server serve
  600 05:00 /usr/sbin/cfprefsd daemon
`
	got := parseLeftovers(ps, servers)
	want := []Leftover{
		{Tool: "diazo", PID: 3692, Age: 3*24*time.Hour + 16*time.Hour + 49*time.Minute + 3*time.Second,
			Command: "/private/var/folders/T/diazo-probe-bin-kmNA0C/diazo serve"},
		{Tool: "galley", PID: 8102, Age: 6*24*time.Hour + 4*time.Hour + 45*time.Minute + 43*time.Second,
			Command: "/Users/me/.local/bin/galley edit /doc.md --owner abc"},
		{Tool: "cull", PID: 401, Age: 42 * time.Second, Command: "/Users/me/.local/bin/cull daemon"},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %+v\nwant %+v", got, want)
	}
}

func TestStartToolRunsItsServeFromPATH(t *testing.T) {
	stateRoot(t)
	bin := t.TempDir()
	// A stand-in tool: refuses anything but the detached serve, then
	// advertises its own pid and lingers.
	script := `#!/bin/sh
[ "$*" = "serve --foreground --no-open" ] || exit 2
mkdir -p "$XDG_STATE_HOME/faketool/live"
printf '{"url":"u","base":"b","pid":%d}' $$ > "$XDG_STATE_HOME/faketool/live/serve.json"
exec sleep 5
`
	if err := os.WriteFile(filepath.Join(bin, "faketool"), []byte(script), 0o755); err != nil {
		t.Fatal(err)
	}
	t.Setenv("PATH", bin+string(os.PathListSeparator)+os.Getenv("PATH"))
	e, err := StartTool("faketool")
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if p, _ := os.FindProcess(e.PID); p != nil {
			_ = p.Kill()
		}
	}()
	if s := server(t, "faketool"); !s.Up || s.Entry.PID != e.PID || e.PID == 0 {
		t.Errorf("entry %+v, listed %+v", e, s)
	}
}

func TestStopLeftoverEndsTheProcess(t *testing.T) {
	cmd := exec.Command("sleep", "30")
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	// Reaped as it exits, so its pid stops answering, as an orphan's does.
	go func() { _ = cmd.Wait() }()
	start := time.Now()
	if err := StopLeftover(cmd.Process.Pid); err != nil {
		t.Fatal(err)
	}
	if d := time.Since(start); d > 4*time.Second {
		t.Errorf("took %v: TERM not sent first", d)
	}
	if tools.PIDAlive(cmd.Process.Pid) {
		t.Error("still running")
	}
}
