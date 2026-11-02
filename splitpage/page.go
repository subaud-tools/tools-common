package splitpage

import (
	"bytes"
	"embed"
	"html"
	"io/fs"
	"mime"
	"strconv"
	"strings"
	"time"
)

// The built page: index.html (with the slots Page fills), and split.js and
// split.css, which `npm run build` in web/ writes from the TypeScript there.
//
//go:embed assets
var assets embed.FS

// Config says what the page is for.
type Config struct {
	// Title is the page's title until the terminal's program sets one.
	Title string
	// Socket is the path of the tool's terminal websocket, under /api/ so
	// localweb's token guards it. The page adds ?session=.
	Socket string
	// Session is the session the page is for: its tabs, and its terminal.
	Session string
	// Restart says the tool serves POST /api/split/restart?session=, which
	// starts the program again: the page then offers Start it again when the
	// terminal closes with CloseStopped.
	Restart bool
	// Take says the tool's socket takes the terminal from another page when
	// asked with take=1: the page then offers Show it here when the terminal
	// closes with CloseReplaced. The first connection never asks.
	Take bool
}

// Page is the page, for a tool to serve as its localweb Assets: index.html
// with c filled in, and the built script and styles.
//
// It also sets the process's types for .js and .css to the standard ones,
// since a Windows registry can say otherwise, and a browser refuses a module
// script of the wrong type.
func Page(c Config) fs.FS {
	_ = mime.AddExtensionType(".js", "text/javascript; charset=utf-8")
	_ = mime.AddExtensionType(".css", "text/css; charset=utf-8")
	sub, err := fs.Sub(assets, "assets")
	if err != nil {
		panic(err) // the embed always has assets/
	}
	tmpl, err := fs.ReadFile(sub, "index.html")
	if err != nil {
		panic(err)
	}
	index := strings.NewReplacer(
		"__TITLE__", html.EscapeString(c.Title),
		"__SOCKET__", html.EscapeString(c.Socket),
		"__SESSION__", html.EscapeString(c.Session),
		"__RESTART__", strconv.FormatBool(c.Restart),
		"__TAKE__", strconv.FormatBool(c.Take),
	).Replace(string(tmpl))
	return pageFS{assets: sub, index: []byte(index)}
}

// pageFS is the embedded assets with index.html replaced by the filled-in one.
type pageFS struct {
	assets fs.FS
	index  []byte
}

func (p pageFS) Open(name string) (fs.File, error) {
	if name == "index.html" {
		return &memFile{Reader: bytes.NewReader(p.index), size: int64(len(p.index))}, nil
	}
	return p.assets.Open(name)
}

// memFile is the filled-in index.html: http.FileServerFS needs Stat and Seek.
type memFile struct {
	*bytes.Reader
	size int64
}

func (f *memFile) Stat() (fs.FileInfo, error) { return f, nil }
func (f *memFile) Close() error               { return nil }
func (f *memFile) Name() string               { return "index.html" }
func (f *memFile) Size() int64                { return f.size }
func (f *memFile) Mode() fs.FileMode          { return 0o444 }
func (f *memFile) ModTime() time.Time         { return time.Time{} }
func (f *memFile) IsDir() bool                { return false }
func (f *memFile) Sys() any                   { return nil }
