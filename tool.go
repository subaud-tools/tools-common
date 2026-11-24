package tools

import "strings"

// The tool cast (the session manager that was called proj) is named in one
// place, so every caller reads the same name and sockets.
const (
	// CastName is the tool's command name.
	CastName = "cast"
	// CastSocketPrefix starts the name of each per-project tmux socket cast
	// creates: "cast-<project>".
	CastSocketPrefix = "cast-"
	// LegacySocketPrefix is the prefix of sockets created before the tool was
	// renamed ("proj-<project>"). Readers still accept it so sessions that were
	// running keep showing until they end; nothing creates new ones.
	LegacySocketPrefix = "proj-"
	// CastSettingsDir is the name of the tool's settings folder, under
	// ConfigDir's parent (~/.config/cast) and the same name under state.
	CastSettingsDir = "cast"
)

// CastSocketProject reports whether a tmux socket name, or a socket path (only
// its base is read), belongs to the tool under either prefix, and returns its
// project name. ok is false for any other socket and for a prefix with no
// project after it.
func CastSocketProject(socket string) (project string, ok bool) {
	base := socket
	if i := strings.LastIndexByte(base, '/'); i >= 0 {
		base = base[i+1:]
	}
	for _, p := range []string{CastSocketPrefix, LegacySocketPrefix} {
		if rest, found := strings.CutPrefix(base, p); found && rest != "" {
			return rest, true
		}
	}
	return "", false
}
