package guide

import (
	"regexp"
	"strings"
	"testing"
	"testing/fstest"
)

// pending names the family tools whose guide files are still to be written
// (TODO-pending: PLAN1 Task 2's second half writes tackle's proj, scratch and
// creel, muster and kempt in full, and casebook, sift and cull light). Until
// then a lesson or fit.md may name them; empty this list as each file lands.
var pending = []string{"proj", "scratch", "creel", "muster", "kempt", "casebook", "sift", "cull"}

// The embedded content loads and passes every rule, and every tool that a
// lesson or fit.md names has a file.
func TestContentIsValid(t *testing.T) {
	tl, err := Tools()
	if err != nil {
		t.Fatal(err)
	}
	if len(tl) == 0 {
		t.Fatal("no tool files")
	}
	have := map[string]bool{}
	for _, x := range tl {
		have[x.Name] = true
	}
	for _, p := range pending {
		if have[p] {
			t.Errorf("%s has a file now: take it off pending", p)
		}
		have[p] = true
	}
	texts := map[string]string{"fit.md": Fit()}
	for _, n := range LessonNumbers() {
		l, err := Lesson(n)
		if err != nil {
			t.Fatal(err)
		}
		texts[l.File] = l.Source
	}
	for file, text := range texts {
		for _, name := range Named(text) {
			if !have[name] {
				t.Errorf("%s names %s, which has no file in guide/tools", file, name)
			}
		}
	}
}

const goodTool = `---
name: diazo
summary: The planning page.
weight: core
asks:
  - Plan this with diazo.
  - What waits on me in diazo?
---

## When to reach for it

A change with a real choice in it.

## When to skip it

A one-line fix.

## Where it sits

First.

## Pointers

- Answer on the page.
`

const goodLesson = "# Plan a change\n\n**Goal:** Take an idea to a plan.\n\n## Walkthrough\n\n" +
	"1. **Say the idea**\n\n   A plan starts from one line.\n\n   ```\n   Plan this with diazo: a README.\n   ```\n\n   **Claude runs:** `diazo_open`\n\n" +
	"2. **Guess what comes first**\n\n   Predict before you look.\n\n   ```\n   I think it asks me first. Am I right?\n   ```\n\n   **Claude runs:** nothing.\n\n" +
	"   **Choose:**\n\n   - **It asks me first**: I think it asks me first. Am I right?\n   - **It writes code first**: I think it writes code first. Am I right?\n"

// Each rule a file can break is caught, naming the file.
func TestValidationCatches(t *testing.T) {
	cases := []struct {
		name, file, body, want string
	}{
		{"core tool without pointers", "tools/diazo.md", strings.Replace(goodTool, "## Pointers\n\n- Answer on the page.\n", "", 1), "Pointers"},
		{"tool without when to skip", "tools/diazo.md", strings.Replace(goodTool, "## When to skip it\n\nA one-line fix.\n\n", "", 1), "When to skip it"},
		{"tool without summary", "tools/diazo.md", strings.Replace(goodTool, "summary: The planning page.\n", "", 1), "summary"},
		{"tool without asks", "tools/diazo.md", strings.Replace(goodTool, "  - Plan this with diazo.\n  - What waits on me in diazo?\n", "", 1), "asks"},
		{"user told to type a command", "tools/diazo.md", strings.Replace(goodTool, "- Answer on the page.", "```\ndiazo serve\n```", 1), "family command"},
		{"command in a lesson ask", "lessons/3-plan.md", strings.Replace(goodLesson, "Plan this with diazo: a README.", "kempt list", 1), "family command"},
		{"lesson step without an ask", "lessons/3-plan.md", strings.Replace(goodLesson, "   ```\n   Plan this with diazo: a README.\n   ```\n\n", "", 1), "ask"},
		{"lesson step without claude runs", "lessons/3-plan.md", strings.Replace(goodLesson, "   **Claude runs:** `diazo_open`\n\n", "", 1), "Claude runs"},
		{"lesson without goal", "lessons/3-plan.md", strings.Replace(goodLesson, "**Goal:** Take an idea to a plan.\n\n", "", 1), "Goal"},
		{"choose step with one choice", "lessons/3-plan.md", strings.Replace(goodLesson, "   - **It writes code first**: I think it writes code first. Am I right?\n", "", 1), "two choices"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			fsys := fstest.MapFS{
				"tools/diazo.md":    {Data: []byte(goodTool)},
				"lessons/3-plan.md": {Data: []byte(goodLesson)},
				"fit.md":            {Data: []byte("# How they fit\n")},
			}
			if _, err := load(fsys); err != nil {
				t.Fatalf("good content refused: %v", err)
			}
			fsys[c.file] = &fstest.MapFile{Data: []byte(c.body)}
			_, err := load(fsys)
			if err == nil || !strings.Contains(err.Error(), c.want) || !strings.Contains(err.Error(), c.file) {
				t.Fatalf("got %v, want an error naming %s and %q", err, c.file, c.want)
			}
		})
	}
}

// Named finds family tools by whole word, so diazo_open names diazo and
// "scratched" names nothing.
func TestNamed(t *testing.T) {
	got := strings.Join(Named("Ask diazo, then `galley_open`; scratched kempts muster."), ",")
	if !regexp.MustCompile(`^diazo,galley,muster$`).MatchString(got) {
		t.Fatalf("got %s", got)
	}
}
