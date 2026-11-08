package splitpage

import (
	"os"
	"os/exec"
	"testing"
)

// TestBuildsForWindows keeps splitpage building for Windows: a tool that ships
// there (lwc) imports it, and CI runs only on Linux, so nothing else would
// notice a unix-only import (pageserve's Setpgid, Flock, Kill) slipping in.
func TestBuildsForWindows(t *testing.T) {
	gobin, err := exec.LookPath("go")
	if err != nil {
		t.Skip("no go tool to cross-build with")
	}
	cmd := exec.Command(gobin, "build", ".")
	cmd.Env = append(os.Environ(), "GOOS=windows", "GOARCH=amd64", "CGO_ENABLED=0")
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("splitpage doesn't build for windows/amd64: %v\n%s", err, out)
	}
}
