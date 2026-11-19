package localweb

import (
	"fmt"
	"os"
	"testing"
)

// TestMain keeps every test's state under a temp folder, so no test can
// write the real ~/.local/state.
func TestMain(m *testing.M) {
	dir, err := os.MkdirTemp("", "localweb-state-")
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	if err := os.Setenv("XDG_STATE_HOME", dir); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	code := m.Run()
	_ = os.RemoveAll(dir)
	os.Exit(code)
}
