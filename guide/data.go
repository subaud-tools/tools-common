package guide

import "slices"

// Family's site, linked once from the Guide tab for the whole family.
const FamilySite = "https://subaud.tools"

// publicGuides are the tools with a public guide page.
var publicGuides = map[string]string{
	"casebook": "https://casebook.tools/guide/",
	"galley":   "https://galley.tools/guide/",
	"kempt":    "https://kempt.tools/guide/",
}

// GuideData is what the Guide tab draws: the tool you're in, the installed
// tools' sections, how they fit together and the family's site.
type GuideData struct {
	Tool   string     `json:"tool"`
	Family string     `json:"family"`
	Fit    string     `json:"fit"`
	Tools  []ToolData `json:"tools"`
}

// ToolData is one tool's section as the Guide tab draws it.
type ToolData struct {
	Name     string   `json:"name"`
	Summary  string   `json:"summary"`
	Core     bool     `json:"core"`
	Asks     []string `json:"asks"`
	When     string   `json:"when"`
	Skip     string   `json:"skip,omitempty"`
	Where    string   `json:"where,omitempty"`
	Pointers string   `json:"pointers,omitempty"`
	Guide    string   `json:"guide,omitempty"` // its public guide page
}

// Data is the Guide tab's data for a page of tool: every tool installed
// says is installed, and tool itself, core first. A tool that isn't a family
// tool has no section, and Tool is empty.
func Data(tool string, installed func(name string) bool) (GuideData, error) {
	tl, err := Tools()
	if err != nil {
		return GuideData{}, err
	}
	d := GuideData{Family: FamilySite, Fit: Fit(), Tools: []ToolData{}}
	if slices.Contains(Family, tool) {
		d.Tool = tool
	}
	for _, t := range tl {
		if t.Name != d.Tool && !installed(t.Name) {
			continue
		}
		d.Tools = append(d.Tools, ToolData{Name: t.Name, Summary: t.Summary, Core: t.Core, Asks: t.Asks,
			When: t.When, Skip: t.Skip, Where: t.Where, Pointers: t.Pointers, Guide: publicGuides[t.Name]})
	}
	return d, nil
}
