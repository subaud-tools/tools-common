package tools

import (
	"io"
	"os"
	"path/filepath"
	"testing"
)

// On a Mac, update's own signer check is codesign against the family's
// Developer ID: a validly receipted binary that is not signed by it is
// refused and the running binary stays.
func TestUpdateRefusesABinaryWithoutTheFamilysAppleSignature(t *testing.T) {
	tarball := makeTarGz(t, "kempt", []byte("new binary"))
	srv := dlServer(t, "kempt", "0.2.0", tarball, sidecarFor("kempt", tarball))
	defer srv.Close()
	dir := t.TempDir()
	exe := filepath.Join(dir, "kempt")
	_ = os.WriteFile(exe, []byte("old"), 0o755)
	a := New(Config{Name: "kempt", Domain: "kempt.tools", Version: Version{Number: "0.1.0"}})
	a.setDLHost(srv.URL)
	a.exePath = func() (string, error) { return exe, nil }
	a.checkReceipt = testKeys.Check // the signer check stays the one New set

	_, _, err := a.SelfUpdate(io.Discard, io.Discard)
	if err == nil || err.Error() != "update refused: the binary is not signed by the subaud tools' Apple Developer ID" {
		t.Fatalf("err = %v", err)
	}
	if b, _ := os.ReadFile(exe); string(b) != "old" {
		t.Fatalf("on disk %q", b)
	}
	if entries, _ := os.ReadDir(dir); len(entries) != 1 {
		t.Fatalf("%d files beside the binary, want only it", len(entries))
	}
}
