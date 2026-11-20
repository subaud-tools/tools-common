package pageserve

import (
	"os"
	"os/exec"
	"reflect"
	"sync"
	"syscall"
	"testing"
)

// cullProcess is cull's serve process with its state in a temporary folder.
func cullProcess(t *testing.T) Process {
	t.Helper()
	t.Setenv("CULL_HOME", t.TempDir())
	p := Process{Live: LiveFor("cull"), Args: []string{"serve", "--foreground", "--no-open"}}
	if err := os.MkdirAll(p.Live.Dir, 0o700); err != nil {
		t.Fatal(err)
	}
	return p
}

func TestStartPassesDetachedFlags(t *testing.T) {
	p := cullProcess(t)
	for _, tc := range []struct {
		port int
		want []string
	}{
		{0, []string{"serve", "--foreground", "--no-open"}},
		{4321, []string{"serve", "--foreground", "--no-open", "--port", "4321"}},
	} {
		var gotExe string
		var got []string
		orig := newCommand
		newCommand = func(exe string, args ...string) *exec.Cmd {
			gotExe, got = exe, args
			// A stand-in server: advertises its own pid, then lingers.
			script := `printf '{"url":"u","base":"b","pid":%d}' $$ > "$1"; sleep 3`
			return exec.Command("sh", "-c", script, "sh", p.Live.ServePath())
		}
		e, err := p.Start("/bin/cull", tc.port)
		newCommand = orig
		if err != nil {
			t.Fatal(err)
		}
		if gotExe != "/bin/cull" || !reflect.DeepEqual(got, tc.want) {
			t.Errorf("port %d: exe %q args %v, want %v", tc.port, gotExe, got, tc.want)
		}
		if pr, _ := os.FindProcess(e.PID); pr != nil {
			_ = pr.Kill()
		}
		_ = os.Remove(p.Live.ServePath())
	}
}

// A serve started from a session's channel must hold no controlling terminal:
// it leads a session of its own, so it neither keeps the session's terminal
// (an interactive shell it runs can then take one) nor gets its SIGHUP.
func TestStartRunsServeInItsOwnSession(t *testing.T) {
	p := cullProcess(t)
	orig := newCommand
	defer func() { newCommand = orig }()
	newCommand = func(string, ...string) *exec.Cmd {
		script := `printf '{"url":"u","base":"b","pid":%d}' $$ > "$1"; sleep 3`
		return exec.Command("sh", "-c", script, "sh", p.Live.ServePath())
	}
	e, err := p.Start("/bin/cull", 0)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if pr, _ := os.FindProcess(e.PID); pr != nil {
			_ = pr.Kill()
		}
	}()
	sid, err := syscall.Getsid(e.PID)
	if err != nil {
		t.Fatal(err)
	}
	if sid != e.PID {
		mine, _ := syscall.Getsid(0)
		t.Errorf("serve (pid %d) is in session %d (the test's is %d), want a session of its own", e.PID, sid, mine)
	}
}

func TestConcurrentStartsShareRunningServe(t *testing.T) {
	p := cullProcess(t)
	orig := newCommand
	defer func() { newCommand = orig }()
	// Like serve: the first to claim the advert wins; later ones exit.
	script := `if mkdir "$1.lock" 2>/dev/null; then printf '{"url":"u","base":"b","pid":%d}' $$ > "$1"; sleep 5; else sleep 0.3; exit 1; fi`
	newCommand = func(string, ...string) *exec.Cmd {
		return exec.Command("sh", "-c", script, "sh", p.Live.ServePath())
	}
	var wg sync.WaitGroup
	es := make([]Entry, 2)
	errs := make([]error, 2)
	for i := range es {
		wg.Add(1)
		go func() { defer wg.Done(); es[i], errs[i] = p.Start("/bin/cull", 0) }()
	}
	wg.Wait()
	defer func() {
		if pr, _ := os.FindProcess(es[0].PID); pr != nil {
			_ = pr.Kill()
		}
	}()
	for i := range errs {
		if errs[i] != nil {
			t.Fatalf("start %d: %v", i, errs[i])
		}
	}
	if es[0].PID != es[1].PID || es[0].PID == 0 {
		t.Errorf("pids differ: %d vs %d", es[0].PID, es[1].PID)
	}
}
