// Package record keeps the shared record of what this user has done across
// the family: lessons finished, tools used and named features reached, each
// with the date it first happened. It is one JSON file in the shared state
// dir (StateDir("subaud")/record.json), local only and never sent anywhere.
// Every tool reads and writes it through this package; browser storage can't,
// since each tool's page is its own origin.
package record

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"time"

	tools "github.com/subaud-tools/tools-common"
)

// Mark is one thing done: when it first happened.
type Mark struct {
	Date time.Time `json:"date"`
}

// Record is everything done so far, keyed by name: a lesson's id
// ("3-plan-a-change"), a tool's command name ("diazo"), a feature's name
// ("diazo.calls").
type Record struct {
	Lessons  map[string]Mark `json:"lessons"`
	Tools    map[string]Mark `json:"tools"`
	Features map[string]Mark `json:"features"`
}

// HasLesson reports whether the lesson is finished.
func (r Record) HasLesson(name string) bool { _, ok := r.Lessons[name]; return ok }

// HasTool reports whether the tool has been used.
func (r Record) HasTool(name string) bool { _, ok := r.Tools[name]; return ok }

// HasFeature reports whether the feature has been reached.
func (r Record) HasFeature(name string) bool { _, ok := r.Features[name]; return ok }

// Path is the record's file.
func Path() string { return filepath.Join(tools.StateDir("subaud"), "record.json") }

// MarkLesson records the lesson as finished; a lesson marked before keeps its
// first date.
func MarkLesson(name string) error {
	return mark(func(r *Record) map[string]Mark { return r.Lessons }, name)
}

// MarkTool records the tool as used.
func MarkTool(name string) error {
	return mark(func(r *Record) map[string]Mark { return r.Tools }, name)
}

// MarkFeature records the feature as reached.
func MarkFeature(name string) error {
	return mark(func(r *Record) map[string]Mark { return r.Features }, name)
}

// Read returns the record; a missing file is an empty record.
func Read() (Record, error) { return read(Path()) }

// mark adds name to the map in under the lock, keeping a date already there.
// The read-modify-write holds an exclusive lock on record.json.lock, shared
// with every process on the machine, and the write is a rename, so two tools
// marking at once both land and a reader never sees half a file.
func mark(in func(*Record) map[string]Mark, name string) error {
	if name == "" {
		return errors.New("record: empty name")
	}
	p := Path()
	if err := tools.EnsureDir(filepath.Dir(p)); err != nil {
		return err
	}
	unlock, err := lock(p + ".lock")
	if err != nil {
		return err
	}
	defer unlock()
	r, err := read(p)
	if err != nil {
		return err
	}
	m := in(&r)
	if _, ok := m[name]; ok {
		return nil
	}
	m[name] = Mark{Date: time.Now().UTC().Truncate(time.Second)}
	b, err := json.MarshalIndent(r, "", "  ")
	if err != nil {
		return err
	}
	return tools.WriteFileAtomic(p, append(b, '\n'), 0o600)
}

func read(p string) (Record, error) {
	r := Record{}
	b, err := os.ReadFile(p)
	switch {
	case errors.Is(err, fs.ErrNotExist):
	case err != nil:
		return r, err
	default:
		if err := json.Unmarshal(b, &r); err != nil {
			return r, fmt.Errorf("record: reading %s: %w", p, err)
		}
	}
	for _, m := range []*map[string]Mark{&r.Lessons, &r.Tools, &r.Features} {
		if *m == nil {
			*m = map[string]Mark{}
		}
	}
	return r, nil
}
