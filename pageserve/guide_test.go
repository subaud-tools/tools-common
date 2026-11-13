package pageserve

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/subaud-tools/tools-common/guide"
)

// Every serve answers GET /api/kit/guide with the Guide tab's data: the tool
// it serves first, and the other tools whose command is on PATH.
func TestServeAnswersTheGuide(t *testing.T) {
	was := guideInstalled
	guideInstalled = func(name string) bool { return name == "galley" }
	t.Cleanup(func() { guideInstalled = was })
	r := startRun(t, Options{})
	e, _ := LiveFor("cull").Running()
	resp := get(t, e, "/api/kit/guide")
	defer func() { _ = resp.Body.Close() }()
	var d guide.GuideData
	if err := json.NewDecoder(resp.Body).Decode(&d); err != nil || resp.StatusCode != 200 {
		t.Fatalf("%d %v", resp.StatusCode, err)
	}
	var names []string
	for _, x := range d.Tools {
		names = append(names, x.Name)
	}
	if d.Tool != "cull" || len(names) != 2 || names[0] != "galley" || names[1] != "cull" {
		t.Fatalf("tool %q, tools %v", d.Tool, names)
	}
	_ = Stop(context.Background(), LiveFor("cull"))
	wait(t, r)
}
