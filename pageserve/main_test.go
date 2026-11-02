package pageserve

import (
	"fmt"
	"os"
	"testing"
)

// TestMain gives the package's tests a home of their own. A channel refreshes
// its skill in every harness installed under $HOME (skills.Refresh), so a test
// run on a machine with the tool's skill installed rewrote the real Claude
// Code and Codex copies with the test's stub.
func TestMain(m *testing.M) {
	home, err := os.MkdirTemp("", "pageserve-home-")
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	for _, k := range []string{"HOME", "CLAUDE_CONFIG_DIR", "CODEX_HOME", "PI_CODING_AGENT_DIR"} {
		_ = os.Unsetenv(k)
	}
	_ = os.Setenv("HOME", home)
	code := m.Run()
	_ = os.RemoveAll(home)
	os.Exit(code)
}
