package pageserve

// Every family page server on the machine, for one place (proj) to list and
// control them. One rule, with no list of tool names: a folder under the
// state root holding a live/ folder is a page server named by its folder, so
// a new tool on pageserve appears by existing.

import (
	"errors"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
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
		// one bad folder must not hide every other row.
		if e, err := LiveFor(tool).Running(); err == nil {
			s.Entry, s.Up = e, true
		}
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
// is serve, daemon or edit, and no up Server holds its pid.
func parseLeftovers(ps string, servers []Server) []Leftover {
	known := map[string]bool{}
	held := map[int]bool{}
	for _, s := range servers {
		known[s.Tool] = true
		if s.Up {
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
		case "serve", "daemon", "edit":
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
