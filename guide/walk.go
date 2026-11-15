package guide

import (
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"sync"
)

//go:embed walk.md
var walkContent embed.FS

// WalkStep is one click of the getting-started walk: the control a tool's page
// lights (its data-walk hook) with a two-line note, what the agent does before
// it, and the tool event that means the click landed. Its JSON is the body
// pageserve's POST /api/kit/spotlight takes and the kit's spotlight() draws;
// Agent and Advance are for the agent and are left out of it.
type WalkStep struct {
	N       int    `json:"n"`
	Of      int    `json:"of"`
	Tool    string `json:"tool"`
	Walk    string `json:"walk"`  // the control's data-walk hook: "reply"
	Title   string `json:"title"` // the note's first line: what to press
	Note    string `json:"note"`  // its second line: why (may be empty)
	Look    string `json:"look"`  // what to look for when the control isn't on the page
	OK      bool   `json:"ok"`    // the note carries an ok button, which moves the walk on
	Agent   string `json:"-"`     // what the agent does first
	Advance string `json:"-"`     // "<tool>: <the event that means the click landed>"
}

// Selector is the step's control on the page: [data-walk="reply"].
func (s WalkStep) Selector() string { return `[data-walk="` + s.Walk + `"]` }

var walkLoaded = sync.OnceValues(func() ([]WalkStep, error) { return parseWalk(walkContent) })

// Walk returns the getting-started walk's steps, in order.
func Walk() ([]WalkStep, error) { return walkLoaded() }

var (
	walkHookRe = regexp.MustCompile(`^[a-z][a-z0-9-]*$`)
	walkHeadRe = regexp.MustCompile(`^## (\d+)\s*$`)
)

// parseWalk reads walk.md: a # title and intro, then one "## n" section per
// step, numbered from 1, each key: value lines (tool, target, press, look,
// agent, advance), a blank line and the note's one or two lines. It refuses a
// note with anything to type (a code span, a $ prompt) or a placeholder.
func parseWalk(fsys fs.FS) ([]WalkStep, error) {
	const file = "walk.md"
	b, err := fs.ReadFile(fsys, file)
	if err != nil {
		return nil, err
	}
	var steps []WalkStep
	var errs []error
	var cur []string
	flush := func() {
		if cur == nil {
			return
		}
		s, serrs := parseWalkStep(file, len(steps)+1, cur)
		errs = append(errs, serrs...)
		steps = append(steps, s)
	}
	for _, line := range strings.Split(string(b), "\n") {
		if m := walkHeadRe.FindStringSubmatch(line); m != nil {
			flush()
			cur = []string{m[1]}
			continue
		}
		if cur != nil {
			cur = append(cur, line)
		}
	}
	flush()
	if len(steps) == 0 {
		errs = append(errs, fmt.Errorf("%s: no steps", file))
	}
	for i := range steps {
		steps[i].Of = len(steps)
	}
	return steps, errors.Join(errs...)
}

func parseWalkStep(file string, want int, lines []string) (WalkStep, []error) {
	var errs []error
	bad := func(format string, a ...any) {
		errs = append(errs, fmt.Errorf("%s: step %d: "+format, append([]any{file, want}, a...)...))
	}
	s := WalkStep{N: want}
	if n, _ := strconv.Atoi(lines[0]); n != want {
		errs = append(errs, fmt.Errorf("%s: step %s comes where step %d should", file, lines[0], want))
	}
	kv := map[string]string{}
	var note []string
	inNote := false
	for _, line := range lines[1:] {
		t := strings.TrimSpace(line)
		switch {
		case t == "" && !inNote && len(kv) > 0:
			inNote = true
		case t == "":
		case inNote:
			note = append(note, t)
		default:
			k, v, ok := strings.Cut(t, ":")
			if !ok {
				bad("not a key: value line: %q", t)
				continue
			}
			kv[strings.TrimSpace(k)] = strings.TrimSpace(v)
		}
	}
	s.Tool, s.Walk, s.Look, s.Agent, s.Advance = kv["tool"], kv["target"], kv["look"], kv["agent"], kv["advance"]
	switch p := kv["press"]; p {
	case "ok":
		s.OK = true
	case "":
	default:
		bad("press is ok or nothing, not %q", p)
	}
	if !slices.Contains(Family, s.Tool) {
		bad("%q is not a family tool", s.Tool)
	}
	if !walkHookRe.MatchString(s.Walk) {
		bad("target %q is not a data-walk hook (lower-case words joined by hyphens)", s.Walk)
	}
	for _, k := range []string{"look", "agent", "advance"} {
		if kv[k] == "" {
			bad("no %s", k)
		}
	}
	if s.Advance != "" && !strings.HasPrefix(s.Advance, s.Tool+": ") {
		bad("advance %q does not start with its tool, %s: ", s.Advance, s.Tool)
	}
	switch {
	case len(note) == 0:
		bad("no note")
	case len(note) > 2:
		bad("its note has %d lines; it is two lines at most", len(note))
	default:
		s.Title = note[0]
		if len(note) == 2 {
			s.Note = note[1]
		}
	}
	text := strings.Join(note, "\n")
	if strings.ContainsAny(text, "`$") {
		bad("its note holds something for the learner to type: %q", text)
	}
	for _, e := range placeholders(file, text, true) {
		bad("%v", e)
	}
	return s, errs
}
