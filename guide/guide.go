// Package guide holds the family guide's text, embedded in every binary that
// builds on tools-common: one section per tool (tools/<name>.md), how the
// tools fit together (fit.md), and the getting-started walk's lessons
// (lessons/<n>-<topic>.md). The Guide tab, the walk and the agent's map all
// read it from here rather than restating it.
//
// Every ask in it is something the user says to their agent; no text tells
// the user to type a family command. load refuses content that breaks a rule,
// naming the file and the part.
package guide

import (
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"path"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"sync"
)

//go:embed fit.md tools/*.md lessons/*.md
var content embed.FS

// Family is every family tool a guide text may name, by command name, in the
// order the guide lists them.
var Family = []string{"diazo", "galley", "muda", "proj", "scratch", "creel", "muster", "kempt", "casebook", "sift", "cull"}

// Tool is one tool's section. Core tools have every part; light ones have
// a summary, When and one ask, and may leave the rest empty.
type Tool struct {
	Name     string   // command name, the file's name
	Summary  string   // what it is, in one sentence
	Core     bool     // a full section (weight: core) or a short entry (weight: light)
	Asks     []string // things to say to the agent
	When     string   // markdown: when to reach for it
	Skip     string   // markdown: when to skip it
	Where    string   // markdown: where it sits in the flow
	Pointers string   // markdown: pointers from real use
}

// LessonPage is one lesson of the walk: a title, a Goal and its steps.
type LessonPage struct {
	N     int
	Slug  string // the file's name without .md: "3-plan-a-change"
	File  string // "lessons/3-plan-a-change.md"
	Title string
	Goal  string
	// Offered says when the walk offers this lesson ("you have two sessions
	// running"); empty for the four core lessons, which run in order.
	Offered string
	Steps   []Step
	Source  string // the whole file
}

// Step does one action: why, one ask, what Claude runs, then any note and
// choices.
type Step struct {
	Title  string
	Why    string   // the plain sentence before the ask
	Ask    string   // the one line to send to Claude
	Runs   string   // what follows **Claude runs:**
	Note   string   // anything after Claude runs (what to watch for)
	Choose []Choice // a choose step's buttons, two or more
}

// Choice is one button of a choose step: its label and what it sends.
type Choice struct{ Label, Prompt string }

type set struct {
	tools   []Tool
	lessons map[int]LessonPage
	fit     string
}

var loaded = sync.OnceValues(func() (set, error) { return load(content) })

// Tools returns every tool's section, core first, each group in Family order.
func Tools() ([]Tool, error) {
	s, err := loaded()
	return s.tools, err
}

// Lesson returns lesson n of the walk.
func Lesson(n int) (LessonPage, error) {
	s, err := loaded()
	if err != nil {
		return LessonPage{}, err
	}
	l, ok := s.lessons[n]
	if !ok {
		return LessonPage{}, fmt.Errorf("guide: no lesson %d", n)
	}
	return l, nil
}

// LessonNumbers returns the lessons there are, in order.
func LessonNumbers() []int {
	s, _ := loaded()
	ns := make([]int, 0, len(s.lessons))
	for n := range s.lessons {
		ns = append(ns, n)
	}
	slices.Sort(ns)
	return ns
}

// Fit returns how the tools fit together, as markdown.
func Fit() string {
	s, _ := loaded()
	return s.fit
}

// Named returns the family tools text names, by whole word (diazo_open names
// diazo; kempts names nothing), in Family order.
func Named(text string) []string {
	var out []string
	for _, name := range Family {
		if wordRe(name).MatchString(text) {
			out = append(out, name)
		}
	}
	return out
}

func wordRe(name string) *regexp.Regexp {
	return regexp.MustCompile(`(^|[^A-Za-z0-9-])` + regexp.QuoteMeta(name) + `([^A-Za-z0-9-]|$)`)
}

func load(fsys fs.FS) (set, error) {
	s := set{lessons: map[int]LessonPage{}}
	var errs []error
	fit, err := fs.ReadFile(fsys, "fit.md")
	if err != nil {
		return s, err
	}
	s.fit = string(fit)
	errs = append(errs, commands("fit.md", s.fit)...)
	errs = append(errs, placeholders("fit.md", s.fit, false)...)

	names, err := fs.Glob(fsys, "tools/*.md")
	if err != nil {
		return s, err
	}
	for _, f := range names {
		b, err := fs.ReadFile(fsys, f)
		if err != nil {
			return s, err
		}
		t, terrs := parseTool(f, string(b))
		errs = append(errs, terrs...)
		s.tools = append(s.tools, t)
	}
	rank := func(t Tool) int {
		r := slices.Index(Family, t.Name)
		if !t.Core {
			r += len(Family)
		}
		return r
	}
	slices.SortFunc(s.tools, func(a, b Tool) int { return rank(a) - rank(b) })

	names, err = fs.Glob(fsys, "lessons/*.md")
	if err != nil {
		return s, err
	}
	for _, f := range names {
		b, err := fs.ReadFile(fsys, f)
		if err != nil {
			return s, err
		}
		l, lerrs := parseLesson(f, string(b))
		errs = append(errs, lerrs...)
		if _, dup := s.lessons[l.N]; dup {
			errs = append(errs, fmt.Errorf("%s: a second lesson %d", f, l.N))
		}
		s.lessons[l.N] = l
	}
	return s, errors.Join(errs...)
}

// commands finds lines that tell the user to type a family command: a line in
// a fenced block, a line after a "$ " prompt, or a line opening with an inline
// code span, whose first word is a family tool.
func commands(file, text string) []error {
	var errs []error
	fenced := false
	for i, line := range strings.Split(text, "\n") {
		t := strings.TrimSpace(line)
		if strings.HasPrefix(t, "```") {
			fenced = !fenced
			continue
		}
		t = strings.TrimLeft(t, "-*+> ")
		code := fenced
		if r, ok := strings.CutPrefix(t, "$ "); ok {
			t, code = r, true
		}
		if r, ok := strings.CutPrefix(t, "`"); ok {
			t, code = r, true
		}
		if !code {
			continue
		}
		first := strings.FieldsFunc(t, func(r rune) bool { return r == ' ' || r == '`' })
		if len(first) > 0 && slices.Contains(Family, first[0]) {
			errs = append(errs, fmt.Errorf("%s:%d: a family command for the user to type: %q", file, i+1, strings.TrimSpace(line)))
		}
	}
	return errs
}

var (
	placeholderRe = regexp.MustCompile(`<[A-Za-z][^<>\n]*>`)
	inlineCodeRe  = regexp.MustCompile("`[^`\n]*`")
)

// placeholders finds placeholders written <like this> outside code: markdown
// parsers (galley's, the Guide tab's) take them for raw HTML and drop them, so
// guide text writes them ‹like this›. Inline code spans are skipped, and so
// are fenced blocks unless fences holds asks (a lesson's steps), which are
// shown as text.
func placeholders(file, text string, fences bool) []error {
	var errs []error
	fenced := false
	for i, line := range strings.Split(text, "\n") {
		if strings.HasPrefix(strings.TrimSpace(line), "```") {
			fenced = !fenced
			continue
		}
		if fenced && !fences {
			continue
		}
		if m := placeholderRe.FindString(inlineCodeRe.ReplaceAllString(line, "")); m != "" {
			errs = append(errs, fmt.Errorf("%s:%d: placeholder %s: write it ‹%s›", file, i+1, m, m[1:len(m)-1]))
		}
	}
	return errs
}

// frontMatter splits "---\n<front>\n---\n<body>" into its key: value pairs,
// list items gathered under the key above them, and the body.
func frontMatter(text string) (map[string][]string, string, bool) {
	rest, ok := strings.CutPrefix(text, "---\n")
	if !ok {
		return nil, text, false
	}
	front, body, ok := strings.Cut(rest, "\n---\n")
	if !ok {
		return nil, text, false
	}
	m := map[string][]string{}
	key := ""
	for _, line := range strings.Split(front, "\n") {
		if item, ok := strings.CutPrefix(strings.TrimSpace(line), "- "); ok && key != "" {
			m[key] = append(m[key], strings.TrimSpace(item))
			continue
		}
		k, v, ok := strings.Cut(line, ":")
		if !ok {
			continue
		}
		key = strings.TrimSpace(k)
		if v = strings.TrimSpace(v); v != "" {
			m[key] = append(m[key], v)
		} else if _, seen := m[key]; !seen {
			m[key] = nil
		}
	}
	return m, body, true
}

// sections splits a body on its "## " headings.
func sections(body string) map[string]string {
	m := map[string]string{}
	head := ""
	var b strings.Builder
	flush := func() {
		if head != "" {
			m[head] = strings.TrimSpace(b.String())
		}
		b.Reset()
	}
	for _, line := range strings.Split(body, "\n") {
		if h, ok := strings.CutPrefix(line, "## "); ok {
			flush()
			head = strings.TrimSpace(h)
			continue
		}
		b.WriteString(line + "\n")
	}
	flush()
	return m
}

func parseTool(file, text string) (Tool, []error) {
	var errs []error
	bad := func(format string, a ...any) {
		errs = append(errs, fmt.Errorf("%s: "+format, append([]any{file}, a...)...))
	}
	t := Tool{Name: strings.TrimSuffix(path.Base(file), ".md")}
	front, body, ok := frontMatter(text)
	if !ok {
		bad("no front matter")
		return t, errs
	}
	one := func(k string) string {
		if v := front[k]; len(v) == 1 {
			return v[0]
		}
		bad("front matter needs one %s", k)
		return ""
	}
	if n := one("name"); n != "" && n != t.Name {
		bad("name %s is not the file's name", n)
	}
	if !slices.Contains(Family, t.Name) {
		bad("%s is not a family tool", t.Name)
	}
	t.Summary = one("summary")
	errs = append(errs, placeholders(file+" summary", t.Summary, true)...)
	switch w := one("weight"); w {
	case "core":
		t.Core = true
	case "light", "":
	default:
		bad("weight is core or light, not %s", w)
	}
	t.Asks = front["asks"]
	if t.Core {
		if len(t.Asks) < 2 || len(t.Asks) > 4 {
			bad("a core tool has 2 to 4 asks, not %d", len(t.Asks))
		}
	} else if len(t.Asks) < 1 {
		bad("needs at least one of asks")
	}
	for _, a := range t.Asks {
		errs = append(errs, commands(file+" asks", "```\n"+a+"\n```")...)
		errs = append(errs, placeholders(file+" asks", a, true)...)
	}
	sec := sections(body)
	t.When, t.Skip, t.Where, t.Pointers = sec["When to reach for it"], sec["When to skip it"], sec["Where it sits"], sec["Pointers"]
	need := []struct{ head, got string }{{"When to reach for it", t.When}}
	if t.Core {
		need = append(need, struct{ head, got string }{"When to skip it", t.Skip},
			struct{ head, got string }{"Where it sits", t.Where}, struct{ head, got string }{"Pointers", t.Pointers})
	}
	for _, n := range need {
		if n.got == "" {
			bad("missing ## %s", n.head)
		}
	}
	errs = append(errs, commands(file, body)...)
	errs = append(errs, placeholders(file, body, false)...)
	return t, errs
}

var (
	stepRe   = regexp.MustCompile(`^(\d+)\. \*\*(.+)\*\*\s*$`)
	choiceRe = regexp.MustCompile(`^- \*\*(.+?)\*\*: (.+)$`)
)

func parseLesson(file, text string) (LessonPage, []error) {
	var errs []error
	bad := func(format string, a ...any) {
		errs = append(errs, fmt.Errorf("%s: "+format, append([]any{file}, a...)...))
	}
	l := LessonPage{File: file, Source: text, Slug: strings.TrimSuffix(path.Base(file), ".md")}
	num, _, _ := strings.Cut(l.Slug, "-")
	n, err := strconv.Atoi(num)
	if err != nil || n < 1 {
		bad("the file's name starts with the lesson's number")
	}
	l.N = n
	errs = append(errs, commands(file, text)...)
	errs = append(errs, placeholders(file, text, true)...)

	lines := strings.Split(text, "\n")
	walk := -1
	for i, line := range lines {
		switch {
		case strings.HasPrefix(line, "# ") && l.Title == "":
			l.Title = strings.TrimSpace(line[2:])
		case strings.HasPrefix(line, "**Goal:**"):
			l.Goal = strings.TrimSpace(strings.TrimPrefix(line, "**Goal:**"))
		case strings.HasPrefix(line, "**Offered when:**"):
			l.Offered = strings.TrimSpace(strings.TrimPrefix(line, "**Offered when:**"))
		case strings.TrimSpace(line) == "## Walkthrough":
			walk = i
		}
	}
	if l.Title == "" {
		bad("no # title")
	}
	if l.Goal == "" {
		bad("no **Goal:** line")
	}
	if walk < 0 {
		bad("no ## Walkthrough")
		return l, errs
	}
	var cur []string
	flush := func() {
		if cur != nil {
			l.Steps = append(l.Steps, parseStep(cur, func(format string, a ...any) {
				bad("step %d: "+format, append([]any{len(l.Steps) + 1}, a...)...)
			}))
		}
	}
	for _, line := range lines[walk+1:] {
		if m := stepRe.FindStringSubmatch(line); m != nil {
			flush()
			cur = []string{m[2]}
			continue
		}
		if cur != nil {
			cur = append(cur, strings.TrimPrefix(line, "   "))
		}
	}
	flush()
	if len(l.Steps) == 0 {
		bad("no steps")
	}
	return l, errs
}

// parseStep reads one step: its title, then paragraphs, the fenced ask, the
// **Claude runs:** line, any note and a **Choose:** list.
func parseStep(lines []string, bad func(string, ...any)) Step {
	s := Step{Title: lines[0]}
	var paras []string
	var para, fence []string
	fenced, asks, choosing := false, 0, false
	end := func() {
		if len(para) > 0 {
			paras = append(paras, strings.Join(para, " "))
		}
		para = nil
	}
	for _, line := range lines[1:] {
		t := strings.TrimSpace(line)
		switch {
		case strings.HasPrefix(t, "```"):
			if fenced {
				asks++
				if len(fence) != 1 {
					bad("its ask is one line, not %d", len(fence))
				} else {
					s.Ask = fence[0]
				}
			}
			end()
			fenced, fence = !fenced, nil
		case fenced:
			if t != "" {
				fence = append(fence, t)
			}
		case strings.HasPrefix(t, "**Claude runs:**"):
			end()
			s.Runs = strings.TrimSpace(strings.TrimPrefix(t, "**Claude runs:**"))
		case t == "**Choose:**":
			end()
			choosing = true
		case choosing && choiceRe.MatchString(t):
			m := choiceRe.FindStringSubmatch(t)
			s.Choose = append(s.Choose, Choice{Label: m[1], Prompt: m[2]})
		case t == "":
			end()
		default:
			para = append(para, t)
		}
	}
	end()
	switch {
	case asks == 0:
		bad("no ask (a fenced block)")
	case asks > 1:
		bad("%d asks; a step has one", asks)
	}
	if s.Runs == "" {
		bad("no **Claude runs:** line")
	}
	if len(paras) == 0 {
		bad("no plain sentence before the ask")
	} else {
		s.Why = paras[0]
		s.Note = strings.Join(paras[1:], "\n\n")
	}
	if choosing && len(s.Choose) < 2 {
		bad("a choose step needs two choices or more, not %d", len(s.Choose))
	}
	return s
}
