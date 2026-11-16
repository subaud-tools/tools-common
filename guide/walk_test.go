package guide

import (
	"encoding/json"
	"regexp"
	"slices"
	"strings"
	"testing"
	"testing/fstest"
)

// The walks are proj's, diazo's and galley's, in that order, each its clicks
// on hooks the tools put on their pages under these exact names, and each
// ending on a card that leads to the next walk (galley's leads nowhere).
func TestWalksAreProjDiazoGalley(t *testing.T) {
	ws, err := Walks()
	if err != nil {
		t.Fatal(err)
	}
	want := []struct {
		tool, next string
		targets    []string
	}{
		{"proj", "diazo", []string{"split", "proj-tab", "sessions-tab", "open-ghostty", "folders-tab", "saved-tab"}},
		{"diazo", "galley", []string{"reply", "direction", "choose", "approve-spec", "approve-plan"}},
		{"galley", "", []string{"add-instruction", "revise", "approve", "share"}},
	}
	if len(ws) != len(want) {
		t.Fatalf("%d walks, want %d", len(ws), len(want))
	}
	placeholder := regexp.MustCompile(`<[A-Za-z][^>]*>`)
	for i, w := range ws {
		wt := want[i]
		if w.Tool != wt.tool {
			t.Fatalf("walk %d is %s, want %s", i+1, w.Tool, wt.tool)
		}
		if one, err := WalkFor(wt.tool); err != nil || one.Tool != wt.tool || len(one.Steps) != len(w.Steps) {
			t.Errorf("WalkFor(%s) = %s with %d steps, %v", wt.tool, one.Tool, len(one.Steps), err)
		}
		if len(w.Steps) != len(wt.targets) {
			t.Fatalf("%s: %d steps, want %d", w.Tool, len(w.Steps), len(wt.targets))
		}
		for j, s := range w.Steps {
			if s.N != j+1 || s.Of != len(wt.targets) || s.Tool != wt.tool || s.Target != wt.targets[j] {
				t.Errorf("%s step %d is %d of %d %s/%s, want %s/%s", w.Tool, j+1, s.N, s.Of, s.Tool, s.Target, wt.tool, wt.targets[j])
			}
			if s.Title == "" || s.Note == "" || s.Look == "" || s.Agent == "" {
				t.Errorf("%s step %d: a part is empty: %+v", w.Tool, s.N, s)
			}
			if !strings.HasPrefix(s.Title, "Press ") && !strings.HasPrefix(s.Title, "Type ") && !strings.HasPrefix(s.Title, "Select ") && !strings.HasPrefix(s.Title, "Read ") {
				t.Errorf("%s step %d: its title is not what to do: %q", w.Tool, s.N, s.Title)
			}
			text := s.Prepare + s.Title + s.Note
			if strings.ContainsAny(text, "`$") || placeholder.MatchString(text) {
				t.Errorf("%s step %d: a note holds something to type or a placeholder: %q", w.Tool, s.N, text)
			}
			if got := s.Selector(); got != `[data-walk="`+wt.targets[j]+`"]` {
				t.Errorf("%s step %d: selector %s", w.Tool, s.N, got)
			}
			if s.OK != (s.Press == "ok") {
				t.Errorf("%s step %d: ok %v but press %q", w.Tool, s.N, s.OK, s.Press)
			}
		}
		if w.End.Tool != wt.tool || len(w.End.Learned) == 0 || w.End.Next == "" || w.End.NextTool != wt.next {
			t.Errorf("%s: end card %+v, want next_tool %q", w.Tool, w.End, wt.next)
		}
	}
	proj, diazo, galley := ws[0].Steps, ws[1].Steps, ws[2].Steps
	if !proj[0].OK || !proj[3].OK || slices.ContainsFunc(append(append(append([]WalkStep{}, proj[1:3]...), proj[4:]...), append(diazo, galley...)...), func(s WalkStep) bool { return s.OK }) {
		t.Error("only proj's split page and ghostty notes carry an ok button")
	}
	// "Nothing to prepare." in the file is a step with nothing to prepare.
	if proj[0].Prepare != "" || !strings.Contains(proj[1].Prepare, "opening proj's own page") || diazo[0].Prepare == "" {
		t.Errorf("prepare lines: %q / %q / %q", proj[0].Prepare, proj[1].Prepare, diazo[0].Prepare)
	}
	if proj[0].Title != "Press OK." || !strings.HasPrefix(proj[0].Note, "This window is a session") {
		t.Errorf("the note's first line is its title: %q / %q", proj[0].Title, proj[0].Note)
	}
	all := append(append(append([]WalkStep{}, proj...), diazo...), galley...)
	if slices.ContainsFunc(all, func(s WalkStep) bool { return strings.Contains(s.Agent, "scratch place") }) {
		t.Error("an agent line points at the scratch place; the plan folder and the practice README are separate paths (diazo writes its own README.md in a plan's folder)")
	}
	if !strings.Contains(diazo[0].Agent, "practice plan's folder") || !strings.Contains(galley[0].Agent, "practice README") {
		t.Errorf("diazo's and galley's first steps name the paths proj guide start prints: %q / %q", diazo[0].Agent, galley[0].Agent)
	}
	// galley's first control appears only once a passage is selected; the
	// editor being there is when the step is ready.
	if galley[0].Ready != "select-passage" || slices.ContainsFunc(append(append([]WalkStep{}, proj...), diazo...), func(s WalkStep) bool { return s.Ready != "" }) {
		t.Errorf("only galley's first step carries ready: %q", galley[0].Ready)
	}
	if b, _ := json.Marshal(galley[0]); !strings.Contains(string(b), `"ready":"select-passage"`) {
		t.Errorf("galley step 1 JSON has no ready: %s", b)
	}
	if b, _ := json.Marshal(proj[1]); strings.Contains(string(b), `"ready"`) {
		t.Errorf("a step with no ready has one in its JSON: %s", b)
	}
	// diazo cites decisions only (and, in a spec, the agent's calls): the
	// spec's and plan's agent lines say to cite the tone decision, not DIRN.
	if !strings.Contains(diazo[3].Agent, `"Rests on: DCSN1"`) || !strings.Contains(diazo[4].Agent, `"**Serves:** DCSN1"`) {
		t.Errorf("diazo steps 4 and 5 say what to cite: %q / %q", diazo[3].Agent, diazo[4].Agent)
	}
	if _, err := WalkFor("muster"); err == nil {
		t.Error("WalkFor(muster) found a walk")
	}
}

// Each walk opens on an intro card, in the words approved with PLAN6: what
// the tool is for and what the learner will do in it. Its button is the
// kit's Start.
func TestEachWalkOpensOnItsIntroCard(t *testing.T) {
	want := map[string]WalkIntro{
		"proj": {Tool: "proj", Title: "proj: your sessions.",
			Text: "proj keeps your work in sessions: one terminal for each piece of work, in its project. In six clicks you'll see your session's split page and the tabs beside it, proj's lists of your sessions and projects, and how a session comes back after a restart."},
		"diazo": {Tool: "diazo", Title: "diazo: plan before you build.",
			Text: "diazo is where you and your agent agree on a change before anything is built. Your agent is opening a small practice plan for a ten-line README. In five clicks you'll answer its take, make a decision, and approve a spec and a plan."},
		"galley": {Tool: "galley", Title: "galley: edit with your agent.",
			Text: "galley is where you and your agent revise a document together. Your agent is writing the README your plan asked for. In four clicks you'll ask for a change, send it, approve the result, and see how to share it."},
	}
	ws, err := Walks()
	if err != nil {
		t.Fatal(err)
	}
	for _, w := range ws {
		if w.Intro != want[w.Tool] {
			t.Errorf("%s's intro card:\n got %+v\nwant %+v", w.Tool, w.Intro, want[w.Tool])
		}
	}
	// diazo's and galley's end cards close on how to start the tool yourself:
	// a request to the agent, quoted, with ‹›-marked parts the learner fills.
	lastLearned := map[string]string{
		"diazo":  `To plan your own change, tell your agent: "Start a new planning session in diazo for ‹your idea›."`,
		"galley": `To work on any document with your agent, tell it: "Edit ‹file› in galley."`,
	}
	for _, w := range ws {
		if want, ok := lastLearned[w.Tool]; ok && w.End.Learned[len(w.End.Learned)-1] != want {
			t.Errorf("%s's end card's last learned line is %q, want %q", w.Tool, w.End.Learned[len(w.End.Learned)-1], want)
		}
	}
	b, _ := json.Marshal(map[string]WalkIntro{"intro": ws[0].Intro})
	if !strings.HasPrefix(string(b), `{"intro":{"tool":"proj","title":"proj: your sessions.","text":"proj keeps`) {
		t.Errorf("intro card JSON: %s", b)
	}
}

// A step's JSON is the spotlight body interface.md names; the agent's line
// stays out of it.
func TestWalkStepJSONIsTheSpotlightBody(t *testing.T) {
	w, err := WalkFor("proj")
	if err != nil {
		t.Fatal(err)
	}
	b, _ := json.Marshal(w.Steps[1])
	var m map[string]any
	_ = json.Unmarshal(b, &m)
	for _, k := range []string{"n", "of", "tool", "walk", "look", "prepare", "title", "note"} {
		if _, ok := m[k]; !ok {
			t.Errorf("step JSON has no %s: %s", k, b)
		}
	}
	if m["walk"] != "proj-tab" || m["agent"] != nil || m["target"] != nil {
		t.Errorf("step JSON: %s", b)
	}
	b, _ = json.Marshal(w.Steps[0])
	if !strings.Contains(string(b), `"press":"ok"`) || !strings.Contains(string(b), `"ok":true`) {
		t.Errorf("ok step JSON: %s", b)
	}
	b, _ = json.Marshal(w.End)
	for _, k := range []string{`"tool":"proj"`, `"learned":[`, `"next":"Plan`, `"next_tool":"diazo"`} {
		if !strings.Contains(string(b), k) {
			t.Errorf("end card JSON has no %s: %s", k, b)
		}
	}
}

func TestWalkValidationCatches(t *testing.T) {
	const end = "## end\nlearned: x\nnext: y\nnext_tool:\n"
	step := func(head, extra, note string) string {
		return head + "\ntool: diazo\ntarget: a\nlook: x\nagent: x\n" + extra + "\n\n" + note + "\n\n"
	}
	ok := "## intro\ntitle: T.\ntext: Why.\n\n" + step("## 1", "prepare: Nothing to prepare.", "Press a.\nWhy.")
	for name, tc := range map[string]struct{ body, want string }{
		"unknown tool":    {strings.Replace(ok, "diazo", "nope", 1) + end, "not a family tool"},
		"other tool":      {strings.Replace(ok, "diazo", "galley", 1) + end, "walk is diazo's"},
		"a command":       {step("## 1", "prepare: x", "Run `diazo open`.\nWhy.") + end, "to type"},
		"a placeholder":   {step("## 1", "prepare: x", "Press <button>.\nWhy.") + end, "placeholder"},
		"prep command":    {step("## 1", "prepare: Run $ x", "Press a.\nWhy.") + end, "to type"},
		"bad hook":        {strings.Replace(ok, "target: a", "target: A b", 1) + end, "hook"},
		"bad ready":       {step("## 1", "prepare: x\nready: Not A hook", "Press a.\nWhy.") + end, "ready"},
		"no agent":        {strings.Replace(ok, "agent: x\n", "", 1) + end, "agent"},
		"no prepare":      {step("## 1", "", "Press a.\nWhy.") + end, "prepare"},
		"no note":         {step("## 1", "prepare: x", "Press a.") + end, "explanation"},
		"an advance":      {step("## 1", "prepare: x\nadvance: diazo: x", "Press a.\nWhy.") + end, "the click moves the walk on"},
		"out of order":    {"## intro\ntitle: T.\ntext: Why.\n\n" + step("## 2", "prepare: x", "Press a.\nWhy.") + end, "step 2"},
		"no end card":     {ok, "no end card"},
		"no intro":        {strings.Replace(ok, "## intro\ntitle: T.\ntext: Why.\n\n", "", 1) + end, "no intro card"},
		"intro no title":  {strings.Replace(ok, "title: T.\n", "", 1) + end, "intro card: no title"},
		"intro no text":   {strings.Replace(ok, "text: Why.\n", "", 1) + end, "intro card: no text"},
		"intro to type":   {strings.Replace(ok, "text: Why.", "text: Run `x`.", 1) + end, "intro card: holds something"},
		"intro after":     {step("## 1", "prepare: x", "Press a.\nWhy.") + "## intro\ntitle: T.\ntext: Why.\n\n" + end, "intro card comes after"},
		"nothing learned": {ok + "## end\nnext: y\nnext_tool:\n", "learned"},
		"no next":         {ok + "## end\nlearned: x\nnext_tool:\n", "next"},
		"bad next tool":   {ok + "## end\nlearned: x\nnext: y\nnext_tool: nope\n", "next_tool"},
		"step after end":  {ok + end + step("## 2", "prepare: x", "Press a.\nWhy."), "after the end card"},
	} {
		_, err := parseWalk(fstest.MapFS{"walks/diazo.md": {Data: []byte("# Walk\n\nIntro.\n\n" + tc.body)}}, "diazo")
		if err == nil || !strings.Contains(err.Error(), tc.want) {
			t.Errorf("%s: err %v, want %q", name, err, tc.want)
		}
	}
	if _, err := parseWalk(fstest.MapFS{"walks/diazo.md": {Data: []byte("# Walk\n\n" + ok + end)}}, "diazo"); err != nil {
		t.Errorf("a good walk: %v", err)
	}
}
