package receipt

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

// builtBinary is a Go binary built in a temp dir: the linker signs it ad hoc
// on arm64, and it is signed ad hoc again here so that holds on Intel too.
func builtBinary(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "main.go"), []byte("package main\n\nfunc main() {}\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "go.mod"), []byte("module adhoc\n\ngo 1.26\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	bin := filepath.Join(dir, "adhoc")
	build := exec.Command("go", "build", "-o", bin, ".")
	build.Dir = dir
	if out, err := build.CombinedOutput(); err != nil {
		t.Fatalf("go build: %v\n%s", err, out)
	}
	if out, err := exec.Command(codesign, "-s", "-", "-f", bin).CombinedOutput(); err != nil {
		t.Fatalf("codesign -s -: %v\n%s", err, out)
	}
	return bin
}

func TestCheckSignerRefusesAnAdHocSignedBinary(t *testing.T) {
	if err := CheckSigner(builtBinary(t)); err == nil || err.Error() != "the binary is not signed by the subaud tools' Apple Developer ID" {
		t.Fatalf("err = %v", err)
	}
}

func TestCheckSignerRefusesAFileThatIsNotSigned(t *testing.T) {
	f := filepath.Join(t.TempDir(), "kempt")
	if err := os.WriteFile(f, []byte("not a binary"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := CheckSigner(f); err == nil {
		t.Fatal("accepted")
	}
	if err := CheckSigner(filepath.Join(t.TempDir(), "absent")); err == nil {
		t.Fatal("accepted a file that is not there")
	}
}

func TestCheckSignerAcceptsTheInstalledKempt(t *testing.T) {
	kempt, err := exec.LookPath("kempt")
	if err != nil {
		home, _ := os.UserHomeDir()
		kempt = filepath.Join(home, ".local", "bin", "kempt")
		if _, err := os.Stat(kempt); err != nil {
			t.Skip("no released kempt on this machine (not on PATH, not in ~/.local/bin): the accepting case is not proven here")
		}
	}
	// The staged copy has another name and place, as an update's has.
	b, err := os.ReadFile(kempt)
	if err != nil {
		t.Fatal(err)
	}
	staged := filepath.Join(t.TempDir(), ".kempt.new.1")
	if err := os.WriteFile(staged, b, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := CheckSigner(staged); err != nil {
		t.Fatalf("%s: %v", kempt, err)
	}
}
