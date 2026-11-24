package pageserve

import (
	"net/url"
	"strings"

	tools "github.com/subaud-tools/tools-common"
	"github.com/subaud-tools/tools-common/localweb"
)

// Place is where a hosted machine's page sits, as GET /api/kit/guide answers
// it beside the guide: the workspace, billet's start page for it, and the
// tools of the bar's switch. The kit's bar draws it as the workspace link and
// the diazo | cast | galley switch. A device has none.
type Place struct {
	Workspace string      `json:"workspace"`
	Home      string      `json:"home"`
	Tools     []PlaceTool `json:"tools"`
}

// PlaceTool is one tool of the switch: its name, its page on the machine, and
// whether it is the page's own tool.
type PlaceTool struct {
	Name    string `json:"name"`
	Href    string `json:"href"`
	Current bool   `json:"current,omitempty"`
}

// switchTools is the one list of the tools in a hosted page's switch, in the
// order the bar draws them. Their addresses come from localweb.PublicOrigin,
// as every tool's own public address does.
var switchTools = []string{"diazo", tools.CastName, "galley"}

// place is the machine's place for a page of tool (the serve's Live.Tool),
// from PAGE_PUBLIC_DOMAIN (<ws>.<domain>): nil when it is unset or holds no
// workspace before a domain.
func place(tool string) *Place {
	ws, domain, ok := strings.Cut(localweb.PublicDomain(), ".")
	if !ok {
		return nil
	}
	p := &Place{Workspace: ws, Home: "https://" + domain + "/?w=" + url.QueryEscape(ws)}
	for _, name := range switchTools {
		p.Tools = append(p.Tools, PlaceTool{Name: name, Href: localweb.PublicOrigin(name) + "/", Current: name == tool})
	}
	return p
}
