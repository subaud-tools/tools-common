package tools

import (
	"flag"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// The proof on real release files. It runs update exactly as a tool built
// from this commit does (the shipped keys, the real signer check, nothing
// swapped) against a local copy of a /dl tree, so a release candidate's files
// can be offered as they are, tampered with, or as an older version, without
// touching a bucket:
//
//	<dl-root>/<tool>/latest
//	<dl-root>/<tool>/<version>/<tool>_<os>_<arch>.tar.gz  (+ .sha256, .receipt, .receipt.sig)
//
//	go test . -run TestUpdateFromARealRelease -v -dl-root DIR -dl-tool kempt \
//	    [-dl-installed 0.1.0] [-dl-want 'update refused: ...']
var (
	dlRoot      = flag.String("dl-root", "", "a local copy of a /dl tree to run update against with the shipped keys")
	dlTool      = flag.String("dl-tool", "kempt", "the tool to update from -dl-root")
	dlInstalled = flag.String("dl-installed", "0.0.1", "the version the updating tool reports")
	dlWant      = flag.String("dl-want", "", "the whole error update must return; empty: it must install")
)

func TestUpdateFromARealRelease(t *testing.T) {
	if *dlRoot == "" {
		t.Skip("no -dl-root: nothing real to update from")
	}
	srv := httptest.NewServer(http.StripPrefix("/dl/", http.FileServer(http.Dir(*dlRoot))))
	defer srv.Close()
	dir := t.TempDir()
	exe := filepath.Join(dir, *dlTool)
	if err := os.WriteFile(exe, []byte("old"), 0o755); err != nil {
		t.Fatal(err)
	}
	a := New(Config{Name: *dlTool, Domain: *dlTool + ".tools", Version: Version{Number: *dlInstalled}})
	a.setDLHost(srv.URL)
	a.exePath = func() (string, error) { return exe, nil }

	updated, version, err := a.SelfUpdate(io.Discard, io.Discard)

	onDisk, _ := os.ReadFile(exe)
	entries, _ := os.ReadDir(dir)
	if *dlWant == "" {
		if err != nil || !updated || string(onDisk) == "old" || len(entries) != 1 {
			t.Fatalf("updated %v, err %v, %d files", updated, err, len(entries))
		}
		t.Logf("installed %s %s (%d bytes)", *dlTool, version, len(onDisk))
		return
	}
	if err == nil || strings.ReplaceAll(err.Error(), srv.URL, "SERVER") != *dlWant {
		t.Fatalf("err = %v\nwant  %s", err, *dlWant)
	}
	if updated || string(onDisk) != "old" || len(entries) != 1 {
		t.Fatalf("updated %v, on disk %d bytes, %d files: a refusal must leave the binary", updated, len(onDisk), len(entries))
	}
	t.Logf("refused: %v", err)
}
