package receipt

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"errors"
	"fmt"
	"io"
	"path"
)

// Extract returns the binary bin from a release's .tar.gz. A release holds
// it as one regular file under its own name, and only that is taken: a
// regular file whose cleaned path is exactly bin (a leading "./" allowed).
// A file of that name inside a directory, a link or any other kind of entry
// is passed over, and an empty file is refused, so a wrongly packed release
// is never installed over a working binary.
func Extract(tarGz []byte, bin string) ([]byte, error) {
	notTar := errors.New("the download is not a gzip tar file")
	gz, err := gzip.NewReader(bytes.NewReader(tarGz))
	if err != nil {
		return nil, notTar
	}
	defer func() { _ = gz.Close() }()
	tr := tar.NewReader(gz)
	for {
		hdr, err := tr.Next()
		if errors.Is(err, io.EOF) {
			return nil, fmt.Errorf("the download holds no regular file named %q", bin)
		}
		if err != nil {
			return nil, notTar
		}
		if hdr.Typeflag != tar.TypeReg || path.Clean(hdr.Name) != bin {
			continue
		}
		data, err := io.ReadAll(tr)
		if err != nil {
			return nil, notTar
		}
		if len(data) == 0 {
			return nil, fmt.Errorf("the file %q in the download is empty", bin)
		}
		return data, nil
	}
}
