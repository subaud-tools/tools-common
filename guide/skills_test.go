package guide

import (
	"bytes"
	"regexp"
	"strconv"
	"strings"
	"testing"
)

// Each front-matter value is valid YAML: pi's loader drops a skill whose
// front matter won't parse, and an unquoted value with ": " in it ("…walk:
// runs…") doesn't. A value is either double-quoted or a plain scalar with no
// ": ", no " #" and no leading indicator.
func TestSkillFrontMatterIsValidYAML(t *testing.T) {
	sk, err := Skills()
	if err != nil {
		t.Fatal(err)
	}
	for _, s := range sk {
		parts := strings.SplitN(string(s.Body), "---\n", 3)
		if len(parts) < 3 || parts[0] != "" {
			t.Fatalf("%s: no front matter", s.Name)
		}
		for _, line := range strings.Split(strings.TrimSuffix(parts[1], "\n"), "\n") {
			k, v, ok := strings.Cut(line, ": ")
			if !ok || k == "" || strings.ContainsAny(k, " \t") {
				t.Errorf("%s: not a key: value line: %q", s.Name, line)
				continue
			}
			if strings.HasPrefix(v, `"`) {
				if _, err := strconv.Unquote(v); err != nil || !strings.HasSuffix(v, `"`) {
					t.Errorf("%s: %s is a broken quoted string: %s", s.Name, k, v)
				}
				continue
			}
			if strings.Contains(v, ": ") || strings.Contains(v, " #") || strings.ContainsAny(v[:1], "!&*?|>'%@`{}[],-") {
				t.Errorf("%s: %s is not a valid plain YAML value: %s", s.Name, k, v)
			}
		}
	}
}

// Both family skills render from the guide content, family-owned, so they
// can't drift from the Guide tab.
func TestSkillsRenderFromTheContent(t *testing.T) {
	sk, err := Skills()
	if err != nil {
		t.Fatal(err)
	}
	if len(sk) != 3 || sk[0].Name != "using-the-tools" || sk[1].Name != "getting-started-with-subaud" || sk[2].Name != "laying-out-a-page" {
		t.Fatalf("skills %+v", sk)
	}
	for _, s := range sk {
		b := string(s.Body)
		for _, want := range []string{"---\nname: " + s.Name + "\n", "\nowner: family\n", "\ndescription: "} {
			if !strings.Contains(b, want) {
				t.Errorf("%s: no %q in its front matter", s.Name, want)
			}
		}
		if m := placeholderRe.FindString(inlineCodeRe.ReplaceAllString(b, "")); m != "" {
			t.Errorf("%s: placeholder %s", s.Name, m)
		}
		if strings.Contains(b, "{{") || strings.Contains(b, "<no value>") {
			t.Errorf("%s: a template field rendered empty", s.Name)
		}
	}
	tl, _ := Tools()
	using := string(sk[0].Body)
	for _, x := range tl {
		head := "### " + x.Name + "\n"
		if x.Beta {
			head = "### " + x.Name + " (beta)\n"
		}
		if !strings.Contains(using, head) || !strings.Contains(using, x.Summary) {
			t.Errorf("using-the-tools has no section %q for %s with its summary", head, x.Name)
		}
	}
	for _, want := range []string{"record.json", "How a change usually goes", "one-line fix", "say it is beta the first time you introduce it"} {
		if !strings.Contains(using, want) {
			t.Errorf("using-the-tools does not say %q", want)
		}
	}
	if strings.Contains(using, "lesson") {
		t.Error("using-the-tools still offers lessons; the walk replaced them")
	}
	walk := string(sk[1].Body)
	walks, _ := Walks()
	for _, w := range walks {
		if !strings.Contains(walk, "### "+w.Tool+"\n") || !strings.Contains(walk, w.End.Next) {
			t.Errorf("getting-started has no section for %s's walk with its end card", w.Tool)
		}
		for _, s := range w.Steps {
			for _, want := range []string{s.Selector(), s.Title, s.Agent} {
				if !strings.Contains(walk, want) {
					t.Errorf("getting-started does not carry %s step %d's %q", w.Tool, s.N, want)
				}
			}
		}
	}
	for _, want := range []string{"Get me started with subaud.", "`proj guide start`: it runs all three walks in order", "Show me around ‹tool›.", "`proj guide start ‹tool›`", "proj guide show", "never watch a tool's events", "proj guide back", "proj guide skip", "proj guide stop", "never types anything", "one short line"} {
		if !strings.Contains(walk, want) {
			t.Errorf("getting-started does not say %q", want)
		}
	}
	for _, gone := range []string{"lesson", "Lesson", "proj guide result", "Send to Claude", "Advance", "advance event"} {
		if strings.Contains(walk, gone) {
			t.Errorf("getting-started still says %q", gone)
		}
	}
	if regexp.MustCompile(`\n{3,}`).MatchString(using + walk) {
		t.Error("a skill has runs of blank lines")
	}
	again, _ := Skills()
	if !bytes.Equal(again[0].Body, sk[0].Body) || !bytes.Equal(again[1].Body, sk[1].Body) {
		t.Error("rendering is not deterministic")
	}
}

// The page layout skill is a family skill like the others, and loads whenever
// a session builds or changes a page or draws a mockup in any tool: its
// description says so, and its body carries the named places, the kit part
// for each, what never goes where, and the mockup starter.
func TestLayoutSkill(t *testing.T) {
	sk, err := Skills()
	if err != nil {
		t.Fatal(err)
	}
	var b string
	for _, s := range sk {
		if s.Name == "laying-out-a-page" {
			b = string(s.Body)
		}
	}
	if b == "" {
		t.Fatal("no laying-out-a-page skill")
	}
	parts := strings.SplitN(b, "---\n", 3)
	if len(parts) < 3 {
		t.Fatal("no front matter")
	}
	front := parts[1]
	for _, want := range []string{"name: laying-out-a-page\n", "owner: family\n"} {
		if !strings.Contains(front, want) {
			t.Errorf("front matter has no %q", want)
		}
	}
	_, desc, _ := strings.Cut(front, "description: ")
	desc, _, _ = strings.Cut(desc, "\n")
	for _, want := range []string{"builds or changes a page", "mockup", "any tool"} {
		if !strings.Contains(desc, want) {
			t.Errorf("description does not say %q: %s", want, desc)
		}
	}
	for _, want := range []string{
		"104px", "/_kit/layout/", "1100px", "16px", "24px", "288px",
		"`band`", "`sortedList`", "`frame`", "`wide`", "`narrowMode`",
		"end", "search", "underEnd", "sort", "fold",
		"Nothing goes between the band and the columns",
		"Search and sort go only through the band",
		"No tool CSS",
		"A front page has no right column",
		"PAGE-STANDARD.md",
		"the empty-state card, `emptyCard`, keeps its own padding",
		"the bar stays one 52px line", "the bar's ⋯", "`at: 'end'`", "the title stays whole",
	} {
		if !strings.Contains(b, want) {
			t.Errorf("laying-out-a-page does not say %q", want)
		}
	}
}
