package guide

import (
	"regexp"
	"strings"
	"testing"
	"testing/fstest"
)

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
	for _, name := range Family {
		if !have[name] {
			t.Errorf("%s has no file in guide/tools", name)
		}
	}
	title, body := Intro()
	if title == "" || body == "" || strings.Contains(body, "# "+title) {
		t.Errorf("Intro() = %q, %d bytes of body; want a title and the body without it", title, len(body))
	}
	texts := map[string]string{"fit.md": Fit(), "intro.md": body}
	for _, n := range LessonNumbers() {
		l, err := Lesson(n)
		if err != nil {
			t.Fatal(err)
		}
		texts[l.File] = l.Source
		// The walk is six core lessons; the rest are offered when relevant.
		if core := n <= 6; core != (l.Offered == "") {
			t.Errorf("%s: lessons 1 to 6 are the core walk with no **Offered when:**, later ones have one (got %q)", l.File, l.Offered)
		}
	}
	if got := LessonNumbers(); len(got) != 8 {
		t.Errorf("lessons %v, want the six core and the two offered", got)
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
	"2. **Confirm the understanding**\n\n   The agent says back what it understood.\n\n   ```\n   Show me the understanding on the page.\n   ```\n\n   **Claude runs:** `diazo_status`\n"

const goodIntro = "# Getting started\n\n## What you'll make\n\nA practice repo with a README.\n\n## The lessons\n\n3. **Plan a change.** An idea to a plan.\n"

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
		{"angle-bracket placeholder in prose", "tools/diazo.md", strings.Replace(goodTool, "A one-line fix.", "A fix to <file>.", 1), "placeholder"},
		{"angle-bracket placeholder in an ask", "tools/diazo.md", strings.Replace(goodTool, "Plan this with diazo.", "Plan this with diazo: <idea>.", 1), "placeholder"},
		{"angle-bracket placeholder in a lesson ask", "lessons/3-plan.md", strings.Replace(goodLesson, "a README.", "<idea>.", 1), "placeholder"},
		{"angle-bracket placeholder in fit", "fit.md", "# How they fit\n\nAsk about <topic>.\n", "placeholder"},
		{"intro without a title", "intro.md", strings.Replace(goodIntro, "# Getting started\n", "", 1), "title"},
		{"intro lists a lesson by the wrong title", "intro.md", strings.Replace(goodIntro, "**Plan a change.**", "**Plan with diazo.**", 1), "lesson 3"},
		{"intro lists a lesson there isn't", "intro.md", strings.Replace(goodIntro, "3. **Plan a change.**", "9. **Plan a change.**", 1), "lesson 9"},
		{"angle-bracket placeholder in the intro", "intro.md", strings.Replace(goodIntro, "a README.", "<thing>.", 1), "placeholder"},
		{"user told to type a command in the intro", "intro.md", goodIntro + "\n```\nproj guide start\n```\n", "family command"},
		{"choose step", "lessons/3-plan.md", goodLesson + "\n   **Choose:**\n\n   - **It asks me first**: I think it asks me first. Am I right?\n   - **It writes code first**: I think it writes code first. Am I right?\n", "Choose"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			fsys := fstest.MapFS{
				"tools/diazo.md":    {Data: []byte(goodTool)},
				"lessons/3-plan.md": {Data: []byte(goodLesson)},
				"fit.md":            {Data: []byte("# How they fit\n")},
				"intro.md":          {Data: []byte(goodIntro)},
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

// Placeholders written ‹like this›, and <tags> inside code, pass.
func TestPlaceholdersInCodePass(t *testing.T) {
	fsys := fstest.MapFS{
		"tools/diazo.md":    {Data: []byte(strings.Replace(goodTool, "A one-line fix.", "A fix to ‹file›, or `<file>` in code.", 1))},
		"lessons/3-plan.md": {Data: []byte(goodLesson)},
		"fit.md":            {Data: []byte("# How they fit\n\n```\n<b>tag</b>\n```\n")},
		"intro.md":          {Data: []byte(goodIntro)},
	}
	if _, err := load(fsys); err != nil {
		t.Fatal(err)
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
