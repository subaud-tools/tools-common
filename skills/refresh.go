package skills

import (
	"bytes"
	"errors"
	"fmt"
	"io/fs"
	"path/filepath"
)

// Refresh rewrites, for each harness whose home directory exists, the
// installed <skills dir>/<name>/SKILL.md that is the tool's own and differs
// from body, and returns the paths it rewrote. It never creates a skill
// that is not installed, and skips one that is not the tool's own (another
// name:, or a symlink beneath the skills directory). A harness it cannot
// read or write is reported in the error, and the rest are still refreshed.
func Refresh(name string, body []byte) ([]string, error) {
	return RefreshFiles(name, map[string][]byte{skillFile: body})
}

// RefreshFiles is Refresh for a skill made of several files (files as
// InstallFiles takes them): in each installed skill whose SKILL.md is the
// tool's own, it rewrites every file in files that differs or is missing,
// SKILL.md last, and returns each path it rewrote. A file not in files is
// left as it is. An extra file it may not write (a symlink) is reported in
// the error, and that harness's SKILL.md is left as it was.
func RefreshFiles(name string, files map[string][]byte) ([]string, error) {
	if err := oneComponent(name); err != nil {
		return nil, err
	}
	if err := checkFiles(files); err != nil {
		return nil, err
	}
	var (
		rewrote []string
		errs    []error
	)
	for _, h := range harnesses {
		if !h.installed() {
			continue
		}
		paths, err := refreshOne(h, name, files)
		rewrote = append(rewrote, paths...)
		if err != nil {
			errs = append(errs, fmt.Errorf("%s: %w", h.Label, err))
		}
	}
	return rewrote, errors.Join(errs...)
}

// refreshOne rewrites each file of the harness's copy of the skill that
// differs from files, returning the paths it rewrote. A skill that is not
// installed or not the tool's own is skipped with no error.
func refreshOne(h harness, name string, files map[string][]byte) ([]string, error) {
	home, err := h.dir()
	if err != nil {
		return nil, err
	}
	s, err := openSkill(filepath.Join(home, "skills"), name, false)
	var notOwn *notOwnError
	switch {
	case errors.Is(err, fs.ErrNotExist) || errors.As(err, &notOwn):
		return nil, nil
	case err != nil:
		return nil, err
	}
	defer s.close()
	body := files[skillFile]
	if err := s.familyGuard(name, body); err != nil {
		return nil, nil
	}
	var rewrote []string
	for _, f := range extraFiles(files) {
		old, info, err := s.readFile(name, f)
		if err != nil {
			return rewrote, err
		}
		if info != nil && bytes.Equal(old, files[f]) {
			continue
		}
		if err := s.write(f, files[f], info); err != nil {
			return rewrote, err
		}
		rewrote = append(rewrote, s.path(f))
	}
	if bytes.Equal(s.old, body) {
		return rewrote, nil
	}
	if err := s.write(skillFile, body, s.info); err != nil {
		return rewrote, err
	}
	return append(rewrote, s.dest), nil
}
