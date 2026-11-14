package pageserve

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"
)

// claimFixture is a Delivery over a fake claim: queued Sends per scope, handed
// out one per claim, and a count of Covered calls per root.
type claimFixture struct {
	d       *Delivery
	mu      sync.Mutex
	queued  map[string][]string // scope -> Send texts
	covers  map[string]int      // root -> Covered calls
	present [][]string          // the present list each claim got
}

func newClaimFixture(ttl time.Duration) *claimFixture {
	f := &claimFixture{queued: map[string][]string{}, covers: map[string]int{}}
	f.d = &Delivery{Events: NewEvents(), TTL: ttl,
		Covered: func(_ context.Context, root string) ([]string, error) {
			f.mu.Lock()
			defer f.mu.Unlock()
			f.covers[root]++
			return []string{root}, nil
		},
		Claim: func(_ context.Context, session string, covered, present []string) (any, bool, error) {
			f.mu.Lock()
			defer f.mu.Unlock()
			f.present = append(f.present, present)
			for _, sc := range covered {
				if q := f.queued[sc]; len(q) > 0 {
					f.queued[sc] = q[1:]
					return map[string]string{"session": session, "text": q[0]}, true, nil
				}
			}
			return nil, false, nil
		}}
	return f
}

func (f *claimFixture) claim(t *testing.T, session, root string) *httptest.ResponseRecorder {
	t.Helper()
	b, _ := json.Marshal(map[string]string{"session": session, "root": root})
	w := httptest.NewRecorder()
	f.d.ServeClaim(w, httptest.NewRequest(http.MethodPost, "/api/agent/claim", strings.NewReader(string(b))))
	return w
}

// delivers counts the deliver events on f's log.
func (f *claimFixture) delivers() int {
	evs, _, _ := f.d.Events.after(0)
	n := 0
	for _, e := range evs {
		if e.Type == DeliverEvent {
			n++
		}
	}
	return n
}

func TestAClaimWithNothingWaitingAnswers204(t *testing.T) {
	f := newClaimFixture(time.Minute)
	if w := f.claim(t, "s-1", "/repo"); w.Code != http.StatusNoContent || w.Body.Len() != 0 {
		t.Fatalf("got %d %q, want 204", w.Code, w.Body.String())
	}
}

// A claim answers the tool's own body, and the tool's claim sees the claimer
// among the present sessions.
func TestAClaimAnswersTheToolsBody(t *testing.T) {
	f := newClaimFixture(time.Minute)
	f.queued["/repo"] = []string{"Court sent his answers"}
	w := f.claim(t, "s-1", "/repo")
	var got map[string]string
	if w.Code != http.StatusOK || json.Unmarshal(w.Body.Bytes(), &got) != nil || got["text"] != "Court sent his answers" || got["session"] != "s-1" {
		t.Fatalf("got %d %q", w.Code, w.Body.String())
	}
	if len(f.present) != 1 || !slices.Contains(f.present[0], "s-1") {
		t.Fatalf("present = %v, want the claimer in it", f.present)
	}
	if w := f.claim(t, "s-1", "/repo"); w.Code != http.StatusNoContent {
		t.Fatalf("second claim got %d, want 204", w.Code)
	}
}

func TestAClaimNeedsASessionAndAnAbsoluteRoot(t *testing.T) {
	f := newClaimFixture(time.Minute)
	for _, tc := range []struct{ session, root string }{{"", "/repo"}, {"s-1", "repo"}} {
		if w := f.claim(t, tc.session, tc.root); w.Code != http.StatusBadRequest {
			t.Errorf("%+v: got %d, want 400", tc, w.Code)
		}
	}
}

func TestDeliverEmitsExactlyOneDeliverEvent(t *testing.T) {
	f := newClaimFixture(time.Minute)
	wake := f.d.Wake()
	f.d.Deliver()
	if n := f.delivers(); n != 1 {
		t.Fatalf("%d deliver events, want 1", n)
	}
	select {
	case <-wake:
	default:
		t.Fatal("Deliver did not wake a waiter")
	}
}

// A session's covered projects are found once (cull runs git for them), not on
// every claim.
func TestCoveredRunsOncePerSessionAcrossManyClaims(t *testing.T) {
	f := newClaimFixture(time.Minute)
	for range 5 {
		f.claim(t, "s-1", "/a")
		f.claim(t, "s-2", "/b")
	}
	if f.covers["/a"] != 1 || f.covers["/b"] != 1 {
		t.Fatalf("Covered calls = %v, want one per session", f.covers)
	}
	// The tool's projects changed: the next claim finds them again.
	f.d.Forget()
	f.claim(t, "s-1", "/a")
	if f.covers["/a"] != 2 {
		t.Fatalf("Covered calls after Forget = %v, want another for /a", f.covers)
	}
}

// A session whose presence lapses causes one deliver event at the lapse, so a
// gone owner's project can be taken over; nothing ticks before or after it.
func TestALapsedSessionCausesOneDeliverEvent(t *testing.T) {
	f := newClaimFixture(100 * time.Millisecond)
	f.d.Touch("s-1")
	if !f.d.Present("s-1") {
		t.Fatal("a session just touched is not present")
	}
	time.Sleep(50 * time.Millisecond)
	if n := f.delivers(); n != 0 {
		t.Fatalf("%d deliver events before the lapse", n)
	}
	time.Sleep(350 * time.Millisecond)
	if n := f.delivers(); n != 1 {
		t.Fatalf("%d deliver events after the lapse, want 1", n)
	}
	if f.d.Present("s-1") || len(f.d.Sessions()) != 0 {
		t.Fatalf("s-1 still present after its lapse: %v", f.d.Sessions())
	}
}

// Each touch moves the lapse on: a session that keeps checking in never lapses.
func TestATouchedSessionDoesNotLapse(t *testing.T) {
	f := newClaimFixture(100 * time.Millisecond)
	for range 6 {
		f.d.Touch("s-1")
		time.Sleep(40 * time.Millisecond)
	}
	if n := f.delivers(); n != 0 {
		t.Fatalf("%d deliver events for a session that kept checking in", n)
	}
}

func TestNoTimerFiresWhileNoSessionIsPresent(t *testing.T) {
	f := newClaimFixture(10 * time.Millisecond)
	time.Sleep(150 * time.Millisecond)
	if n := f.delivers(); n != 0 {
		t.Fatalf("%d deliver events with no session", n)
	}
	f.d.mu.Lock()
	armed := f.d.timer != nil
	f.d.mu.Unlock()
	if armed {
		t.Fatal("a timer is armed with no session present")
	}
}
