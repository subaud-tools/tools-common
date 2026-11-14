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
	if len(sk) != 2 || sk[0].Name != "using-the-tools" || sk[1].Name != "getting-started-with-subaud" {
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
		if !strings.Contains(using, "### "+x.Name+"\n") || !strings.Contains(using, x.Summary) {
			t.Errorf("using-the-tools has no section for %s with its summary", x.Name)
		}
	}
	for _, want := range []string{"record.json", "Sessions talk", "you have two sessions running", "Find waste with muda", "How a change usually goes", "one-line fix"} {
		if !strings.Contains(using, want) {
			t.Errorf("using-the-tools does not say %q", want)
		}
	}
	walk := string(sk[1].Body)
	for _, n := range LessonNumbers() {
		l, _ := Lesson(n)
		if !strings.Contains(walk, l.Title) || !strings.Contains(walk, l.Steps[0].Ask) {
			t.Errorf("getting-started does not carry lesson %d", n)
		}
	}
	for _, want := range []string{"proj guide start", "proj guide result --lesson", "--ran", "--happened", "--means", "proj guide done --lesson"} {
		if !strings.Contains(walk, want) {
			t.Errorf("getting-started does not say %q", want)
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
