package guide

import (
	"bytes"
	"embed"
	"regexp"
	"strconv"
	"strings"
	"text/template"
)

//go:embed templates/*.md.tmpl
var templates embed.FS

// Skill is a family skill rendered from the guide: written by any tool
// (its front matter says owner: family), so every tool installs the same one.
type Skill struct {
	Name string
	Body []byte
}

// skillNames are the family skills, in the order Skills returns them; each
// renders templates/<name>.md.tmpl.
var skillNames = []string{"using-the-tools", "getting-started-with-subaud"}

type skillData struct {
	Tools         []Tool
	Fit           string
	Lessons       []LessonPage
	Core, Offered []LessonPage
}

var blankRuns = regexp.MustCompile(`\n{3,}`)

// Skills renders the two family skills from the guide content: the agent's
// map (using-the-tools) and the walk (getting-started-with-subaud).
func Skills() ([]Skill, error) {
	s, err := loaded()
	if err != nil {
		return nil, err
	}
	d := skillData{Tools: s.tools, Fit: s.fit}
	for _, n := range LessonNumbers() {
		l := s.lessons[n]
		d.Lessons = append(d.Lessons, l)
		if l.Offered == "" {
			d.Core = append(d.Core, l)
		} else {
			d.Offered = append(d.Offered, l)
		}
	}
	funcs := template.FuncMap{"demote": demote, "inc": func(i int) int { return i + 1 }, "yamlquote": yamlQuote, "toolNames": toolNames}
	var out []Skill
	for _, name := range skillNames {
		t, err := template.New(name+".md.tmpl").Funcs(funcs).ParseFS(templates, "templates/"+name+".md.tmpl")
		if err != nil {
			return nil, err
		}
		var b bytes.Buffer
		if err := t.Execute(&b, d); err != nil {
			return nil, err
		}
		body := blankRuns.ReplaceAllString(b.String(), "\n\n")
		out = append(out, Skill{Name: name, Body: []byte(strings.TrimSpace(body) + "\n")})
	}
	return out, nil
}

// demote drops a markdown text's # title and pushes each heading down a
// level, so fit.md sits under a skill's ## heading.
func demote(md string) string {
	var b strings.Builder
	for _, line := range strings.Split(md, "\n") {
		switch {
		case strings.HasPrefix(line, "# "):
			continue
		case strings.HasPrefix(line, "#"):
			line = "#" + line
		}
		b.WriteString(line + "\n")
	}
	return strings.TrimSpace(b.String())
}

// yamlQuote writes s as a YAML double-quoted scalar, so a front-matter value
// may hold ": " or "#" (a plain scalar with ": " in it doesn't parse, and pi
// then drops the skill). strconv's escapes are a subset of YAML's.
func yamlQuote(s string) string { return strconv.Quote(s) }

// toolNames joins the tools' names with commas, for a skill's description.
func toolNames(ts []Tool) string {
	n := make([]string, len(ts))
	for i, x := range ts {
		n[i] = x.Name
	}
	return strings.Join(n, ", ")
}
