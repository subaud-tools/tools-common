package pageserve

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/subaud-tools/tools-common/guide"
	"github.com/subaud-tools/tools-common/localweb"
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

// On a hosted machine (PAGE_PUBLIC_DOMAIN set) the guide answer names the
// machine's place, which the kit's bar draws as the workspace link and the
// diazo | proj | galley switch; on a device it has no place at all. It asks
// the handler a serve mounts at /api/kit/guide, for a serve of diazo.
func TestTheGuideNamesTheMachinesPlaceOnlyWhenHosted(t *testing.T) {
	was := guideInstalled
	guideInstalled = func(string) bool { return false }
	t.Cleanup(func() { guideInstalled = was })
	ask := func() map[string]json.RawMessage {
		t.Helper()
		rec := httptest.NewRecorder()
		guideHandler("diazo")(rec, httptest.NewRequest("GET", "/api/kit/guide", nil))
		var body map[string]json.RawMessage
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || rec.Code != 200 {
			t.Fatalf("%d %v %s", rec.Code, err, rec.Body)
		}
		return body
	}

	t.Setenv(localweb.PublicDomainEnv, "")
	if p, ok := ask()["place"]; ok {
		t.Fatalf("a device's guide has a place: %s", p)
	}

	t.Setenv(localweb.PublicDomainEnv, "luminarymeridian.billet.subaud.io")
	want := `{"workspace":"luminarymeridian","home":"https://billet.subaud.io/?w=luminarymeridian","tools":[{"name":"diazo","href":"https://diazo.luminarymeridian.billet.subaud.io/","current":true},{"name":"proj","href":"https://proj.luminarymeridian.billet.subaud.io/"},{"name":"galley","href":"https://galley.luminarymeridian.billet.subaud.io/"}]}`
	if got := string(ask()["place"]); got != want {
		t.Fatalf("place\n got %s\nwant %s", got, want)
	}
}
