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

//go:embed walks/*.md
var walkContent embed.FS

// WalkTools are the tools with a getting-started walk, in the order
// "Get me started with subaud." runs them; walks/<tool>.md holds each.
var WalkTools = []string{"proj", "diazo", "galley"}

// Walk is one tool's getting-started walk: its clicks, then the end card.
type Walk struct {
	Tool  string
	Steps []WalkStep
	End   EndCard
}

// WalkStep is one click of a walk: the control a tool's page lights (its
// data-walk hook) with two notes and what the agent does before it. Prepare
// shows while the agent is still getting the step ready (empty when there is
// nothing to prepare); Title and Note show once the control is there, or once
// the Ready element is when the control appears only after the learner acts
// (galley's Add instruction, after a selection). The
// learner's click on the control moves the walk on (the page posts
// kit:spotlight-done to proj's split page), so a step names no tool event.
// Its JSON is the body pageserve's POST /api/kit/spotlight takes and the
// kit's spotlight() draws; Agent is for the agent and is left out of it.
// N and Of count within the step's walk.
type WalkStep struct {
	N       int    `json:"n"`
	Of      int    `json:"of"`
	Tool    string `json:"tool"`
	Target  string `json:"walk"`              // the control's data-walk hook: "reply"
	Ready   string `json:"ready,omitempty"`   // a hook on the page once the step is ready, for a control that appears later
	Press   string `json:"press,omitempty"`   // "ok": the note's ok button is the step's click
	Look    string `json:"look"`              // the control in words, for the agent when the learner can't find it
	Prepare string `json:"prepare,omitempty"` // the note while the agent prepares the step
	Title   string `json:"title"`             // the note's first line: what to press
	Note    string `json:"note"`              // the rest: what is happening
	OK      bool   `json:"ok,omitempty"`      // Press is ok
	Agent   string `json:"-"`                 // what the agent does first
}

// EndCard closes a walk: what the learner learned and what comes next.
// NextTool names the next walk's tool, empty after the last.
type EndCard struct {
	Tool     string   `json:"tool"`
	Learned  []string `json:"learned"`
	Next     string   `json:"next"`
	NextTool string   `json:"next_tool"`
}

// Selector is the step's control on the page: [data-walk="reply"].
func (s WalkStep) Selector() string { return `[data-walk="` + s.Target + `"]` }

var walksLoaded = sync.OnceValues(func() ([]Walk, error) {
	var out []Walk
	var errs []error
	for _, t := range WalkTools {
		w, err := parseWalk(walkContent, t)
		errs = append(errs, err)
		out = append(out, w)
	}
	return out, errors.Join(errs...)
})

// Walks returns the getting-started walks: proj, diazo, galley, in that order.
func Walks() ([]Walk, error) { return walksLoaded() }

// WalkFor returns one tool's walk.
func WalkFor(tool string) (Walk, error) {
	ws, err := Walks()
	if err != nil {
		return Walk{}, err
	}
	for _, w := range ws {
		if w.Tool == tool {
			return w, nil
		}
	}
	return Walk{}, fmt.Errorf("no walk for %q: the walks are %s", tool, strings.Join(WalkTools, ", "))
}

var (
	walkHookRe = regexp.MustCompile(`^[a-z][a-z0-9-]*$`)
	walkHeadRe = regexp.MustCompile(`^## (\d+|end)\s*$`)
)

// nothingToPrepare is a step's prepare line when it has nothing to prepare.
const nothingToPrepare = "Nothing to prepare."

// parseWalk reads walks/<tool>.md: a # title and intro, then one "## n"
// section per step, numbered from 1, each key: value lines (tool, target,
// press, look, agent, prepare), a blank line and the note (its first line the
// title, the rest the explanation); then "## end", the end card's learned:
// lines, next: and next_tool:. It refuses a note with anything to type (a
// code span, a $ prompt) or a placeholder.
func parseWalk(fsys fs.FS, tool string) (Walk, error) {
	file := "walks/" + tool + ".md"
	w := Walk{Tool: tool}
	b, err := fs.ReadFile(fsys, file)
	if err != nil {
		return w, err
	}
	var errs []error
	var cur []string
	ended := false
	flush := func() {
		switch {
		case cur == nil:
		case cur[0] == "end":
			w.End, errs = parseEndCard(file, tool, cur[1:], errs)
			ended = true
		default:
			if ended {
				errs = append(errs, fmt.Errorf("%s: step %s comes after the end card", file, cur[0]))
			}
			s, serrs := parseWalkStep(file, tool, len(w.Steps)+1, cur)
			errs = append(errs, serrs...)
			w.Steps = append(w.Steps, s)
		}
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
	if len(w.Steps) == 0 {
		errs = append(errs, fmt.Errorf("%s: no steps", file))
	}
	if !ended {
		errs = append(errs, fmt.Errorf("%s: no end card (## end)", file))
	}
	for i := range w.Steps {
		w.Steps[i].Of = len(w.Steps)
	}
	return w, errors.Join(errs...)
}

// keyValues reads key: value lines up to the first blank line after them,
// gathering a repeated key's values in order, and returns the lines after.
func keyValues(lines []string, bad func(string, ...any)) (map[string][]string, []string) {
	kv := map[string][]string{}
	for i, line := range lines {
		t := strings.TrimSpace(line)
		if t == "" {
			if len(kv) > 0 {
				return kv, lines[i+1:]
			}
			continue
		}
		k, v, ok := strings.Cut(t, ":")
		if !ok {
			bad("not a key: value line: %q", t)
			continue
		}
		k = strings.TrimSpace(k)
		kv[k] = append(kv[k], strings.TrimSpace(v))
	}
	return kv, nil
}

func parseEndCard(file, tool string, lines []string, errs []error) (EndCard, []error) {
	bad := func(format string, a ...any) {
		errs = append(errs, fmt.Errorf("%s: end card: "+format, append([]any{file}, a...)...))
	}
	kv, _ := keyValues(lines, bad)
	first := func(k string) string {
		if len(kv[k]) == 0 {
			return ""
		}
		return kv[k][0]
	}
	e := EndCard{Tool: tool, Learned: kv["learned"], Next: first("next"), NextTool: first("next_tool")}
	if len(e.Learned) == 0 {
		bad("no learned: lines")
	}
	if e.Next == "" {
		bad("no next")
	}
	if _, ok := kv["next_tool"]; !ok {
		bad("no next_tool: (empty after the last walk)")
	} else if e.NextTool != "" && (!slices.Contains(WalkTools, e.NextTool) || e.NextTool == tool) {
		bad("next_tool %q is not another walk (%s)", e.NextTool, strings.Join(WalkTools, ", "))
	}
	for _, l := range append(slices.Clone(e.Learned), e.Next) {
		if strings.ContainsAny(l, "`$") {
			bad("holds something for the learner to type: %q", l)
		}
		for _, pe := range placeholders(file, l, true) {
			bad("%v", pe)
		}
	}
	return e, errs
}

func parseWalkStep(file, tool string, want int, lines []string) (WalkStep, []error) {
	var errs []error
	bad := func(format string, a ...any) {
		errs = append(errs, fmt.Errorf("%s: step %d: "+format, append([]any{file, want}, a...)...))
	}
	s := WalkStep{N: want}
	if n, _ := strconv.Atoi(lines[0]); n != want {
		errs = append(errs, fmt.Errorf("%s: step %s comes where step %d should", file, lines[0], want))
	}
	kvs, rest := keyValues(lines[1:], bad)
	kv := map[string]string{}
	for k, v := range kvs {
		kv[k] = v[0]
	}
	var note []string
	for _, line := range rest {
		if t := strings.TrimSpace(line); t != "" {
			note = append(note, t)
		}
	}
	s.Tool, s.Target, s.Look, s.Agent, s.Press = kv["tool"], kv["target"], kv["look"], kv["agent"], kv["press"]
	s.Ready = kv["ready"]
	switch s.Press {
	case "ok":
		s.OK = true
	case "":
	default:
		bad("press is ok or nothing, not %q", s.Press)
	}
	switch {
	case !slices.Contains(Family, s.Tool):
		bad("%q is not a family tool", s.Tool)
	case s.Tool != tool:
		bad("its tool is %s, but this walk is %s's", s.Tool, tool)
	}
	if !walkHookRe.MatchString(s.Target) {
		bad("target %q is not a data-walk hook (lower-case words joined by hyphens)", s.Target)
	}
	if s.Ready != "" && !walkHookRe.MatchString(s.Ready) {
		bad("ready %q is not a data-walk hook (lower-case words joined by hyphens)", s.Ready)
	}
	for _, k := range []string{"look", "agent", "prepare"} {
		if kv[k] == "" {
			bad("no %s (a step with nothing to prepare says prepare: %s)", k, nothingToPrepare)
		}
	}
	if p := kv["prepare"]; p != nothingToPrepare {
		s.Prepare = p
	}
	if _, ok := kv["advance"]; ok {
		bad("has an advance; the click moves the walk on, so a step names no tool event")
	}
	switch len(note) {
	case 0:
		bad("no note")
	case 1:
		bad("its note is only a title; it needs an explanation after it")
		s.Title = note[0]
	default:
		s.Title, s.Note = note[0], strings.Join(note[1:], " ")
	}
	text := strings.Join(append(note, s.Prepare), "\n")
	if strings.ContainsAny(text, "`$") {
		bad("its note holds something for the learner to type: %q", text)
	}
	for _, e := range placeholders(file, text, true) {
		bad("%v", e)
	}
	return s, errs
}
