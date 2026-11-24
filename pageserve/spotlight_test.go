package pageserve

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/subaud-tools/tools-common/localweb"
)

func postSpot(t *testing.T, e Entry, body string, token bool) int {
	t.Helper()
	req, _ := http.NewRequest("POST", e.Base+"/api/kit/spotlight", strings.NewReader(body))
	if token {
		req.Header.Set(localweb.TokenHeader, e.Token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	_ = resp.Body.Close()
	return resp.StatusCode
}

// POST /api/kit/spotlight sends a step of the walk to the page's open tabs as a
// spotlight event, naming the tab to bring forward; the page draws it, a page
// opened later reads it back from GET, and an empty body clears it.
func TestServeSendsTheSpotlight(t *testing.T) {
	ev := NewEvents()
	r := startRun(t, Options{Events: ev})
	e, _ := LiveFor("cull").Running()
	ev.Tabs.Seen("tab1", "")

	step := `{"n":2,"of":10,"tool":"cull","walk":"reply","title":"Press Reply.","note":"Why.","look":"Reply"}`
	if code := postSpot(t, e, step, false); code < 400 {
		t.Fatalf("without the token header: %d", code)
	}
	if code := postSpot(t, e, `{"n":1,"walk":"Not A Hook","title":"x"}`, true); code != http.StatusBadRequest {
		t.Fatalf("a bad hook: %d", code)
	}
	if code := postSpot(t, e, step, true); code != http.StatusOK {
		t.Fatalf("post: %d", code)
	}
	evs, _, _ := ev.after(0)
	if len(evs) != 1 || evs[0].Type != "spotlight" {
		t.Fatalf("events %+v", evs)
	}
	var got map[string]any
	_ = json.Unmarshal(evs[0].Data, &got)
	if got["walk"] != "reply" || got["title"] != "Press Reply." || got["n"] != 2.0 || got["forward"] != "tab1" {
		t.Fatalf("spotlight %v", got)
	}
	resp := get(t, e, "/api/kit/spotlight")
	b, _ := io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if resp.StatusCode != 200 || !strings.Contains(string(b), `"walk":"reply"`) {
		t.Fatalf("get: %d %s", resp.StatusCode, b)
	}

	if code := postSpot(t, e, "", true); code != http.StatusOK {
		t.Fatalf("clear: %d", code)
	}
	evs, _, _ = ev.after(evs[0].Cursor)
	if len(evs) != 1 || evs[0].Type != "spotlight" || string(evs[0].Data) != "{}" {
		t.Fatalf("clear events %+v", evs)
	}
	resp = get(t, e, "/api/kit/spotlight")
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("get after clear: %d", resp.StatusCode)
	}
	_ = Stop(context.Background(), LiveFor("cull"))
	wait(t, r)
}

// A step carries its preparing note, ready hook and press through to the page, and an end
// card ({"end": {...}}) is a body of its own: no hook, no title.
func TestServeSendsThePrepareNoteAndTheEndCard(t *testing.T) {
	ev := NewEvents()
	r := startRun(t, Options{Events: ev})
	e, _ := LiveFor("cull").Running()

	step := `{"n":2,"of":6,"tool":"cull","walk":"cast-tab","ready":"select-passage","press":"ok","ok":true,"prepare":"Your agent is opening it.","title":"Press the tab.","note":"Why."}`
	if code := postSpot(t, e, step, true); code != http.StatusOK {
		t.Fatalf("step: %d", code)
	}
	end := `{"end":{"tool":"cull","learned":["One.","Two."],"next":"Plan it.","next_tool":"diazo"}}`
	if code := postSpot(t, e, end, true); code != http.StatusOK {
		t.Fatalf("end card: %d", code)
	}
	if code := postSpot(t, e, `{"end":{"tool":"cull","learned":[],"next":"x"}}`, true); code != http.StatusBadRequest {
		t.Fatalf("an end card with nothing learned: %d", code)
	}
	evs, _, _ := ev.after(0)
	if len(evs) != 2 {
		t.Fatalf("events %+v", evs)
	}
	var got map[string]any
	_ = json.Unmarshal(evs[0].Data, &got)
	if got["prepare"] != "Your agent is opening it." || got["press"] != "ok" || got["ready"] != "select-passage" || got["end"] != nil {
		t.Fatalf("step %s", evs[0].Data)
	}
	got = nil
	_ = json.Unmarshal(evs[1].Data, &got)
	card, _ := got["end"].(map[string]any)
	if card["next_tool"] != "diazo" || card["next"] != "Plan it." || len(card["learned"].([]any)) != 2 || got["walk"] != nil || got["title"] != nil {
		t.Fatalf("end card %s", evs[1].Data)
	}
	resp := get(t, e, "/api/kit/spotlight")
	b, _ := io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if resp.StatusCode != 200 || !strings.Contains(string(b), `"next_tool":"diazo"`) {
		t.Fatalf("get: %d %s", resp.StatusCode, b)
	}
	_ = Stop(context.Background(), LiveFor("cull"))
	wait(t, r)
}
