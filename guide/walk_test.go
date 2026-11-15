package guide

import (
	"slices"
	"strings"
	"testing"
	"testing/fstest"
)

// The walk is the ten clicks the getting-started skill runs, each on a hook
// diazo, galley and proj put on their pages under these exact names.
func TestWalkIsTheTenClicks(t *testing.T) {
	w, err := Walk()
	if err != nil {
		t.Fatal(err)
	}
	want := []struct{ tool, target string }{
		{"proj", "split"}, {"diazo", "reply"}, {"diazo", "direction"}, {"diazo", "choose"},
		{"diazo", "approve-spec"}, {"diazo", "approve-plan"}, {"galley", "add-instruction"},
		{"galley", "revise"}, {"galley", "history"}, {"galley", "approve"},
	}
	if len(w) != len(want) {
		t.Fatalf("%d steps, want %d", len(w), len(want))
	}
	for i, s := range w {
		if s.N != i+1 || s.Of != len(want) || s.Tool != want[i].tool || s.Walk != want[i].target {
			t.Errorf("step %d is %d of %d %s/%s, want %s/%s", i+1, s.N, s.Of, s.Tool, s.Walk, want[i].tool, want[i].target)
		}
		if !slices.Contains(Family, s.Tool) {
			t.Errorf("step %d: %s is not a family tool", s.N, s.Tool)
		}
		if s.Title == "" || s.Look == "" || s.Agent == "" {
			t.Errorf("step %d: a part is empty: %+v", s.N, s)
		}
		if strings.ContainsAny(s.Title+s.Note, "`<>$") {
			t.Errorf("step %d: its note holds something to type or a placeholder: %q / %q", s.N, s.Title, s.Note)
		}
		if got := s.Selector(); got != `[data-walk="`+want[i].target+`"]` {
			t.Errorf("step %d: selector %s", s.N, got)
		}
	}
	if !w[0].OK || slices.ContainsFunc(w[1:], func(s WalkStep) bool { return s.OK }) {
		t.Error("only the split page's note carries an ok button")
	}
}

func TestWalkValidationCatches(t *testing.T) {
	for name, tc := range map[string]struct{ body, want string }{
		"unknown tool":  {"## 1\ntool: nope\ntarget: a\nlook: x\nagent: x\n\nPress a.\n", "not a family tool"},
		"three lines":   {"## 1\ntool: diazo\ntarget: a\nlook: x\nagent: x\n\nOne.\nTwo.\nThree.\n", "two lines at most"},
		"a command":     {"## 1\ntool: diazo\ntarget: a\nlook: x\nagent: x\n\nRun `diazo open`.\n", "to type"},
		"a placeholder": {"## 1\ntool: diazo\ntarget: a\nlook: x\nagent: x\n\nPress <button>.\n", "placeholder"},
		"bad hook":      {"## 1\ntool: diazo\ntarget: A b\nlook: x\nagent: x\n\nPress a.\n", "hook"},
		"no agent":      {"## 1\ntool: diazo\ntarget: a\nlook: x\n\nPress a.\n", "agent"},
		"an advance":    {"## 1\ntool: diazo\ntarget: a\nlook: x\nagent: x\nadvance: diazo: x\n\nPress a.\n", "the click moves the walk on"},
		"out of order":  {"## 2\ntool: diazo\ntarget: a\nlook: x\nagent: x\n\nPress a.\n", "step 2"},
	} {
		_, err := parseWalk(fstest.MapFS{"walk.md": {Data: []byte("# Walk\n\nIntro.\n\n" + tc.body)}})
		if err == nil || !strings.Contains(err.Error(), tc.want) {
			t.Errorf("%s: err %v, want %q", name, err, tc.want)
		}
	}
}
