package pageserve

import (
	"encoding/json"
	"net/http"
	"os/exec"

	"github.com/subaud-tools/tools-common/guide"
)

// guideInstalled reports whether a tool is installed: its command is on PATH.
var guideInstalled = func(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}

// guideHandler answers GET /api/kit/guide, the data the kit's Guide tab
// (/_kit/guide.js) draws: tool's section first among the installed tools'.
// On a hosted machine it carries the machine's place too (place.go), which
// the kit's bar draws; on a device it has no place key.
func guideHandler(tool string) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		d, err := guide.Data(tool, guideInstalled)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(struct {
			guide.GuideData
			Place *Place `json:"place,omitempty"`
		}{d, place(tool)})
	}
}
