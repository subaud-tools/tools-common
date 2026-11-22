package tools

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"crypto/ed25519"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

// tarOf is a .tar.gz holding one entry.
func tarOf(t *testing.T, hdr tar.Header, body string) []byte {
	t.Helper()
	var buf bytes.Buffer
	gw := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gw)
	hdr.Mode, hdr.Size = 0o755, int64(len(body))
	if err := tw.WriteHeader(&hdr); err != nil {
		t.Fatal(err)
	}
	if _, err := tw.Write([]byte(body)); err != nil {
		t.Fatal(err)
	}
	if err := tw.Close(); err != nil {
		t.Fatal(err)
	}
	if err := gw.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

// filesServer serves files (path under /dl → body); anything else is a 404.
func filesServer(t *testing.T, files map[string][]byte) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, ok := files[r.URL.Path]
		if !ok {
			http.NotFound(w, r)
			return
		}
		_, _ = w.Write(body)
	}))
	t.Cleanup(srv.Close)
	return srv
}

// Every case offers kempt a release and says what update must do with it.
// After a refusal the binary on disk is what it was and nothing is left
// beside it.
func TestUpdateInstallsOnlyWhatItsReceiptCovers(t *testing.T) {
	_, stranger, _ := ed25519.GenerateKey(nil)
	asset := assetName("kempt")
	tarball := makeTarGz(t, "kempt", []byte("new binary"))
	other := makeTarGz(t, "kempt", []byte("another binary"))
	refuseSigner := func(string) error {
		return errors.New("the binary is not signed by the subaud tools' Apple Developer ID")
	}

	for _, c := range []struct {
		what      string
		installed string             // the running version; "" → 0.1.0
		latest    string             // what /latest says; "" → 0.2.0
		file      []byte             // the tarball served; nil → tarball
		receipt   []byte             // nil → a good receipt for the release offered
		key       ed25519.PrivateKey // signs the receipt; nil → the test release key
		absent    string             // a suffix of the asset that is a 404
		signer    func(string) error // nil → accepts
		want      string             // the whole error; "" → installs
		noop      bool               // neither installs nor refuses
	}{
		{what: "a good receipt installs"},
		{what: "a receipt signed by the backup key installs", key: testBackupKey},
		{what: "a dev build updates", installed: "dev"},
		{what: "a build with no version updates", installed: "-"},
		{what: "an rc updates to its final version", installed: "0.2.0-rc.1"},
		{what: "the same version is no update", latest: "0.1.0", noop: true},

		{what: "a receipt signed by another key", key: stranger,
			want: "update refused: the receipt's signature is not valid"},
		{what: "a receipt for another tool", receipt: receiptFor("muster", "0.2.0", asset, tarball),
			want: `update refused: the receipt is for tool "muster", not "kempt"`},
		{what: "a receipt for another version", receipt: receiptFor("kempt", "0.1.5", asset, tarball),
			want: `update refused: the receipt is for version "0.1.5", not "0.2.0"`},
		{what: "a receipt for another platform's file", receipt: receiptFor("kempt", "0.2.0", "kempt_plan9_mips.tar.gz", tarball),
			want: fmt.Sprintf(`update refused: the receipt is for file name "kempt_plan9_mips.tar.gz", not %q`, asset)},
		// The sidecar is the served file's own, as whoever can write the
		// bucket would make it; only the receipt tells.
		{what: "a file its receipt does not cover", file: other, receipt: receiptFor("kempt", "0.2.0", asset, tarball),
			want: fmt.Sprintf(`update refused: the checksum of %q does not match its receipt`, asset)},
		{what: "a receipt with an extra field", receipt: append(bytes.TrimSuffix(receiptFor("kempt", "0.2.0", asset, tarball), []byte("}\n")), `,"note":"x"}`...),
			want: "update refused: the receipt is not in the expected form"},
		{what: "no receipt", absent: ".receipt",
			want: fmt.Sprintf("update refused: no receipt for %s: GET SERVER/dl/kempt/0.2.0/%s.receipt: 404 Not Found", asset, asset)},
		{what: "no signature", absent: ".receipt.sig",
			want: fmt.Sprintf("update refused: no receipt signature for %s: GET SERVER/dl/kempt/0.2.0/%s.receipt.sig: 404 Not Found", asset, asset)},
		// Validly receipted, wrongly packed: never installed over the binary.
		{what: "a release with the binary only in a directory", file: tarOf(t, tar.Header{Name: "docs/kempt", Typeflag: tar.TypeReg}, "notes"),
			want: `update refused: the download holds no regular file named "kempt"`},
		{what: "a release whose binary is a link", file: tarOf(t, tar.Header{Name: "kempt", Typeflag: tar.TypeSymlink, Linkname: "/bin/sh"}, ""),
			want: `update refused: the download holds no regular file named "kempt"`},
		{what: "a release whose binary is empty", file: tarOf(t, tar.Header{Name: "kempt", Typeflag: tar.TypeReg}, ""),
			want: `update refused: the file "kempt" in the download is empty`},
		{what: "a binary the signer check refuses", signer: refuseSigner,
			want: "update refused: the binary is not signed by the subaud tools' Apple Developer ID"},
	} {
		t.Run(c.what, func(t *testing.T) {
			installed, latest, file, key := c.installed, c.latest, c.file, c.key
			if installed == "" {
				installed = "0.1.0"
			}
			if installed == "-" {
				installed = ""
			}
			if latest == "" {
				latest = "0.2.0"
			}
			if file == nil {
				file = tarball
			}
			if key == nil {
				key = testReleaseKey
			}
			rcpt := c.receipt
			if rcpt == nil {
				rcpt = receiptFor("kempt", latest, asset, file)
			}
			base := "/dl/kempt/" + latest + "/" + asset
			files := map[string][]byte{
				"/dl/kempt/latest":    []byte(latest + "\n"),
				base:                  file,
				base + ".sha256":      []byte(sidecarFor("kempt", file)),
				base + ".receipt":     rcpt,
				base + ".receipt.sig": signReceipt(key, rcpt),
			}
			if c.absent != "" {
				delete(files, base+c.absent)
			}
			srv := filesServer(t, files)
			dir := t.TempDir()
			exe := filepath.Join(dir, "kempt")
			if err := os.WriteFile(exe, []byte("old"), 0o755); err != nil {
				t.Fatal(err)
			}
			a := newUpdateApp(t, srv, installed, exe)
			if c.signer != nil {
				a.checkSigner = c.signer
			}

			updated, _, err := a.SelfUpdate(io.Discard, io.Discard)

			onDisk, _ := os.ReadFile(exe)
			entries, _ := os.ReadDir(dir)
			if len(entries) != 1 {
				t.Errorf("%d files beside the binary, want only it", len(entries))
			}
			if c.want == "" {
				if err != nil {
					t.Fatalf("refused: %v", err)
				}
				if c.noop != !updated || (c.noop && string(onDisk) != "old") || (!c.noop && string(onDisk) != "new binary") {
					t.Fatalf("updated %v, on disk %q", updated, onDisk)
				}
				return
			}
			want := bytes.ReplaceAll([]byte(c.want), []byte("SERVER"), []byte(srv.URL))
			if err == nil || err.Error() != string(want) {
				t.Fatalf("err = %v\nwant  %s", err, want)
			}
			if updated || string(onDisk) != "old" {
				t.Fatalf("updated %v, on disk %q: a refusal must leave the binary", updated, onDisk)
			}
		})
	}
}

// What the user sees: one line on stderr, exit 1.
func TestUpdatePrintsARefusalAsOneLine(t *testing.T) {
	_, stranger, _ := ed25519.GenerateKey(nil)
	asset := assetName("kempt")
	tarball := makeTarGz(t, "kempt", []byte("new binary"))
	rcpt := receiptFor("kempt", "0.2.0", asset, tarball)
	base := "/dl/kempt/0.2.0/" + asset
	srv := filesServer(t, map[string][]byte{
		"/dl/kempt/latest": []byte("0.2.0\n"), base: tarball, base + ".sha256": []byte(sidecarFor("kempt", tarball)),
		base + ".receipt": rcpt, base + ".receipt.sig": signReceipt(stranger, rcpt),
	})
	exe := filepath.Join(t.TempDir(), "kempt")
	_ = os.WriteFile(exe, []byte("old"), 0o755)
	a := newUpdateApp(t, srv, "0.1.0", exe)
	var out, errw bytes.Buffer
	if code := a.Dispatch([]string{"update"}, &out, &errw); code != 1 {
		t.Fatalf("exit %d", code)
	}
	if errw.String() != "kempt update: update refused: the receipt's signature is not valid\n" || out.Len() != 0 {
		t.Fatalf("errw %q, out %q", errw.String(), out.String())
	}
}

// An App as a tool builds it trusts only the family's keys: a release signed
// by the tests' key is refused. Nothing but this package's tests can change
// either check.
func TestAnAppTrustsOnlyTheFamilysKeys(t *testing.T) {
	tarball := makeTarGz(t, "kempt", []byte("new binary"))
	srv := dlServer(t, "kempt", "0.2.0", tarball, sidecarFor("kempt", tarball))
	defer srv.Close()
	exe := filepath.Join(t.TempDir(), "kempt")
	_ = os.WriteFile(exe, []byte("old"), 0o755)
	a := New(Config{Name: "kempt", Domain: "kempt.tools", Version: Version{Number: "0.1.0"}})
	a.setDLHost(srv.URL)
	a.exePath = func() (string, error) { return exe, nil }

	_, _, err := a.SelfUpdate(io.Discard, io.Discard)
	if err == nil || err.Error() != "update refused: the receipt's signature is not valid" {
		t.Fatalf("err = %v", err)
	}
	if b, _ := os.ReadFile(exe); string(b) != "old" {
		t.Fatalf("on disk %q", b)
	}
}

// A build newer than the latest release (an rc, a local build, or a machine
// offered an old release as the latest) is left alone: update asks for
// nothing but latest, replaces nothing, says so in one line and exits 0.
func TestUpdateLeavesABuildNewerThanTheLatestRelease(t *testing.T) {
	for _, c := range []struct{ installed, latest string }{
		{"0.3.0", "0.2.0"},
		{"0.2.0", "0.2.0-rc.3"},
		{"0.120.0-rc.1", "0.119.3"},
	} {
		t.Run(c.installed+" offered "+c.latest, func(t *testing.T) {
			var asked []string
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				asked = append(asked, r.URL.Path)
				if r.URL.Path != "/dl/kempt/latest" {
					http.NotFound(w, r)
					return
				}
				_, _ = io.WriteString(w, c.latest+"\n")
			}))
			defer srv.Close()
			dir := t.TempDir()
			exe := filepath.Join(dir, "kempt")
			_ = os.WriteFile(exe, []byte("old"), 0o755)
			// The App is as New built it: no check is swapped.
			a := New(Config{Name: "kempt", Domain: "kempt.tools", Version: Version{Number: c.installed}})
			a.setDLHost(srv.URL)
			a.exePath = func() (string, error) { return exe, nil }

			var out, errw bytes.Buffer
			if code := a.Dispatch([]string{"update"}, &out, &errw); code != 0 {
				t.Fatalf("exit %d: %s", code, errw.String())
			}
			if want := "kempt " + c.installed + " is newer than the latest release " + c.latest + "; nothing to do\n"; out.String() != want || errw.Len() != 0 {
				t.Fatalf("out %q, errw %q, want %q", out.String(), errw.String(), want)
			}
			if b, _ := os.ReadFile(exe); string(b) != "old" {
				t.Fatalf("on disk %q", b)
			}
			if entries, _ := os.ReadDir(dir); len(entries) != 1 {
				t.Fatalf("%d files beside the binary", len(entries))
			}
			if fmt.Sprint(asked) != "[/dl/kempt/latest /notice.txt]" {
				t.Fatalf("asked for %v, want only latest and the notice", asked)
			}

			updated, version, err := a.SelfUpdate(io.Discard, io.Discard)
			if updated || version != c.latest || err != nil {
				t.Fatalf("SelfUpdate = %v, %q, %v; want false, the latest release, nil", updated, version, err)
			}
		})
	}
}
