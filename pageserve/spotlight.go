package pageserve

import (
	"bytes"
	"crypto/subtle"
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"sync"

	"github.com/subaud-tools/tools-common/localweb"
)

// Spotlight is one step of the getting-started walk as POST /api/kit/spotlight
// takes it and the spotlight event carries it to the page (the kit's
// spotlight.js draws it): guide.WalkStep's JSON, plus page, the tool's name for
// the page the step is on ("" for any), and forward, the tab serve asks to come
// forward, which serve fills in.
type Spotlight struct {
	N       int    `json:"n"`
	Of      int    `json:"of"`
	Tool    string `json:"tool,omitempty"`
	Walk    string `json:"walk"`
	Title   string `json:"title"`
	Note    string `json:"note,omitempty"`
	Look    string `json:"look,omitempty"`
	OK      bool   `json:"ok,omitempty"`
	Page    string `json:"page,omitempty"`
	Forward string `json:"forward,omitempty"`
}

var spotHookRe = regexp.MustCompile(`^[a-z][a-z0-9-]*$`)

// spotlights holds the step a serve shows now, so a page opened after it was
// sent draws it too (GET /api/kit/spotlight).
type spotlights struct {
	mu  sync.Mutex
	now *Spotlight
}

// post answers POST /api/kit/spotlight, which takes only the token header (a
// page holds the cookie and must not light its own steps). A step goes to the
// page's open tabs as a spotlight event; the tab showing its page, else the
// front-page tab moved to it, is named forward. An empty body clears it: the
// event's data is {}. It answers {"forward": tab}, empty when no tab is open
// (the caller opens the page; it draws the step when it loads).
func (s *spotlights) post(token string, events *Events) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if subtle.ConstantTimeCompare([]byte(r.Header.Get(localweb.TokenHeader)), []byte(token)) != 1 {
			http.Error(w, "spotlight takes the token header", http.StatusForbidden)
			return
		}
		b, err := io.ReadAll(io.LimitReader(r.Body, 1<<16))
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if len(bytes.TrimSpace(b)) == 0 {
			s.mu.Lock()
			s.now = nil
			s.mu.Unlock()
			events.Emit("spotlight", struct{}{})
			writeJSON(w, http.StatusOK, map[string]string{"forward": ""})
			return
		}
		var sp Spotlight
		if err := json.Unmarshal(b, &sp); err != nil {
			http.Error(w, "spotlight: "+err.Error(), http.StatusBadRequest)
			return
		}
		if !spotHookRe.MatchString(sp.Walk) || sp.Title == "" {
			http.Error(w, "spotlight needs walk (a data-walk hook: lower-case words joined by hyphens) and title", http.StatusBadRequest)
			return
		}
		sp.Forward = ""
		if events.Tabs != nil {
			switch c := events.Tabs.Pick(sp.Page); c.Kind {
			case localweb.TabHere:
				sp.Forward = c.Tab
			case localweb.TabMove:
				events.Tabs.Moved(c.Tab, sp.Page)
				events.Emit("show", map[string]string{"tab": c.Tab, "page": sp.Page})
				sp.Forward = c.Tab
			}
		}
		s.mu.Lock()
		s.now = &sp
		s.mu.Unlock()
		events.Emit("spotlight", sp)
		writeJSON(w, http.StatusOK, map[string]string{"forward": sp.Forward})
	}
}

// get answers GET /api/kit/spotlight: the step shown now, or 204.
func (s *spotlights) get(w http.ResponseWriter, _ *http.Request) {
	s.mu.Lock()
	sp := s.now
	s.mu.Unlock()
	if sp == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	writeJSON(w, http.StatusOK, sp)
}
