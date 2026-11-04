package pageserve

// Every family page server on the machine, for one place (proj) to list and
// control them. One rule, with no list of tool names: a folder under the
// state root holding a live/ folder is a page server named by its folder, so
// a new tool on pageserve appears by existing.

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"sort"
	"strconv"
	"strings"
	"syscall"
	"time"

	tools "github.com/subaud-tools/tools-common"
)

// Server is one tool's page server: its entry when Up, and its log.
type Server struct {
	Tool    string
	Entry   Entry // zero when down
	Up      bool
	LogPath string // StateDir(tool)/serve.log, where Start sends its output
}

// Leftover is a running serve, daemon or (pre-0.23 galley) edit process of a
// listed tool that no entry holds: a probe's serve, an old build's server.
// Listing one never stops it; StopLeftover is the caller's explicit call.
type Leftover struct {
	Tool    string
	PID     int
	Age     time.Duration
	Command string
}

// root is the state root every tool's StateDir sits under: an absolute
// $XDG_STATE_HOME, else ~/.local/state. A tool started with its own
// $<TOOL>_HOME lives elsewhere and is not listed.
func root() (string, error) {
	if b := os.Getenv("XDG_STATE_HOME"); filepath.IsAbs(b) {
		return b, nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".local", "state"), nil
}

// Servers lists every page server under the state root, sorted by tool, each
// read through Running, which removes a dead pid's entry. A tool with no
// live entry is listed down.
func Servers() ([]Server, error) {
	dir, err := root()
	if err != nil {
		return nil, err
	}
	names, err := os.ReadDir(dir)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var out []Server
	for _, n := range names {
		if st, err := os.Stat(filepath.Join(dir, n.Name(), "live")); err != nil || !st.IsDir() {
			continue
		}
		tool := n.Name()
		s := Server{Tool: tool, LogPath: filepath.Join(tools.StateDir(tool), "serve.log")}
		// Any error is down: an unreadable entry is no server to reach, and
		// one bad folder must not hide every other row. The entry is kept
		// anyway, so Leftovers never offers to kill the pid it names.
		e, err := LiveFor(tool).Running()
		s.Entry, s.Up = e, err == nil
		out = append(out, s)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Tool < out[j].Tool })
	return out, nil
}

// Leftovers lists the running processes of servers' tools that no Server
// holds.
func Leftovers(servers []Server) ([]Leftover, error) {
	out, err := exec.Command("ps", "-axo", "pid=,etime=,command=").Output()
	if err != nil {
		return nil, err
	}
	return parseLeftovers(string(out), servers), nil
}

// parseLeftovers reads ps's "pid etime command" lines: a process is left
// over when its executable's base name is a listed tool, its first argument
// is serve, daemon or an old channel's edit (one with --owner: a terminal's
// edit is a document someone has open), and no Server's entry names its pid.
func parseLeftovers(ps string, servers []Server) []Leftover {
	known := map[string]bool{}
	held := map[int]bool{}
	for _, s := range servers {
		known[s.Tool] = true
		if s.Entry.PID > 0 {
			held[s.Entry.PID] = true
		}
	}
	var out []Leftover
	for _, line := range strings.Split(ps, "\n") {
		f := strings.Fields(line)
		if len(f) < 4 {
			continue
		}
		pid, err := strconv.Atoi(f[0])
		if err != nil || held[pid] {
			continue
		}
		tool := filepath.Base(f[2])
		if !known[tool] {
			continue
		}
		switch f[3] {
		case "serve", "daemon":
		case "edit":
			if !slices.Contains(f[4:], "--owner") {
				continue
			}
		default:
			continue
		}
		out = append(out, Leftover{Tool: tool, PID: pid, Age: etime(f[1]), Command: strings.Join(f[2:], " ")})
	}
	return out
}

// etime parses ps's elapsed time, [[dd-]hh:]mm:ss; 0 when it can't.
func etime(s string) time.Duration {
	var days int
	if d, rest, ok := strings.Cut(s, "-"); ok {
		days, _ = strconv.Atoi(d)
		s = rest
	}
	var secs int
	for _, p := range strings.Split(s, ":") {
		n, err := strconv.Atoi(p)
		if err != nil {
			return 0
		}
		secs = secs*60 + n
	}
	return time.Duration(days)*24*time.Hour + time.Duration(secs)*time.Second
}

// StartTool ensures tool's serve, starting it detached from the binary on
// PATH the way every tool's channel does.
func StartTool(tool string) (Entry, error) {
	exe, err := exec.LookPath(tool)
	if err != nil {
		return Entry{}, err
	}
	// Run from the tool's state folder, not the caller's: a serve started
	// from a worktree would outlive the worktree.
	p := Process{Live: LiveFor(tool), Args: []string{"serve", "--foreground", "--no-open"}, Dir: tools.StateDir(tool)}
	return p.Ensure(exe)
}

// StopTool asks tool's serve to exit and waits for it to go.
func StopTool(ctx context.Context, tool string) error { return Stop(ctx, LiveFor(tool)) }

// RestartTool stops tool's serve, when it runs, then starts it.
func RestartTool(ctx context.Context, tool string) (Entry, error) {
	if err := StopTool(ctx, tool); err != nil && !errors.Is(err, ErrNotRunning) {
		return Entry{}, err
	}
	return StartTool(tool)
}

// StopLeftover sends pid SIGTERM, then SIGKILL when it still runs after 5 s.
func StopLeftover(pid int) error {
	// kill(2) reads 0 and below as process groups, -1 as every process.
	if pid <= 0 {
		return fmt.Errorf("pageserve: invalid pid %d", pid)
	}
	if err := syscall.Kill(pid, syscall.SIGTERM); err != nil {
		if errors.Is(err, syscall.ESRCH) {
			return nil
		}
		return err
	}
	for i := 0; i < 50; i++ {
		if !tools.PIDAlive(pid) {
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	if err := syscall.Kill(pid, syscall.SIGKILL); err != nil && !errors.Is(err, syscall.ESRCH) {
		return err
	}
	return nil
}
