package receipt

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"testing"
)

type entry struct {
	name string
	kind byte
	body string
	link string
}

func tarGz(t *testing.T, entries ...entry) []byte {
	t.Helper()
	var buf bytes.Buffer
	gw := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gw)
	for _, e := range entries {
		h := &tar.Header{Name: e.name, Typeflag: e.kind, Mode: 0o755, Linkname: e.link}
		if e.kind == tar.TypeReg {
			h.Size = int64(len(e.body))
		}
		if err := tw.WriteHeader(h); err != nil {
			t.Fatal(err)
		}
		if _, err := tw.Write([]byte(e.body)); err != nil && e.kind == tar.TypeReg {
			t.Fatal(err)
		}
	}
	if err := tw.Close(); err != nil {
		t.Fatal(err)
	}
	if err := gw.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

// A release's tarball holds the binary as one regular file under its own
// name. Extract takes that and nothing else: not a file of that name in a
// directory, not a link, not an empty file.
func TestExtract(t *testing.T) {
	const missing = `the download holds no regular file named "kempt"`
	for _, c := range []struct {
		what    string
		entries []entry
		want    string // the bytes taken
		err     string
	}{
		{what: "the binary, as releases publish it", entries: []entry{{name: "kempt", kind: tar.TypeReg, body: "binary"}}, want: "binary"},
		{what: "the binary under ./", entries: []entry{{name: "./kempt", kind: tar.TypeReg, body: "binary"}}, want: "binary"},
		{what: "a file of that name in a directory comes first", entries: []entry{{name: "docs/kempt", kind: tar.TypeReg, body: "notes"}, {name: "kempt", kind: tar.TypeReg, body: "binary"}}, want: "binary"},
		{what: "a link of that name comes first", entries: []entry{{name: "kempt", kind: tar.TypeSymlink, link: "/bin/sh"}, {name: "kempt", kind: tar.TypeReg, body: "binary"}}, want: "binary"},
		{what: "only a file of that name in a directory", entries: []entry{{name: "docs/kempt", kind: tar.TypeReg, body: "notes"}}, err: missing},
		{what: "only under a parent path", entries: []entry{{name: "../kempt", kind: tar.TypeReg, body: "x"}}, err: missing},
		{what: "a symlink", entries: []entry{{name: "kempt", kind: tar.TypeSymlink, link: "/bin/sh"}}, err: missing},
		{what: "a hard link", entries: []entry{{name: "other", kind: tar.TypeReg, body: "x"}, {name: "kempt", kind: tar.TypeLink, link: "other"}}, err: missing},
		{what: "a directory", entries: []entry{{name: "kempt/", kind: tar.TypeDir}}, err: missing},
		{what: "another file", entries: []entry{{name: "muster", kind: tar.TypeReg, body: "x"}}, err: missing},
		{what: "nothing", err: missing},
		{what: "an empty file", entries: []entry{{name: "kempt", kind: tar.TypeReg}}, err: `the file "kempt" in the download is empty`},
	} {
		t.Run(c.what, func(t *testing.T) {
			got, err := Extract(tarGz(t, c.entries...), "kempt")
			if c.err != "" {
				if err == nil || err.Error() != c.err {
					t.Fatalf("got %q, err %v; want err %q", got, err, c.err)
				}
				return
			}
			if err != nil || string(got) != c.want {
				t.Fatalf("got %q, err %v", got, err)
			}
		})
	}
	if _, err := Extract([]byte("not a tarball"), "kempt"); err == nil || err.Error() != "the download is not a gzip tar file" {
		t.Fatalf("err = %v", err)
	}
}
