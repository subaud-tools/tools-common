package pageserve

// The serve side of stream-and-claim delivery: a channel with Spec.Stream set
// listens on GET /api/events and claims with POST /api/agent/claim on each
// deliver event and once each time it connects. serve emits deliver when there
// may be a Send for someone to take: the tool calls Deliver when it records a
// Send or takes a delivery back, and one timer, set to the next moment any
// session's presence lapses, calls it so a gone owner's project can be taken
// over. Nothing ticks per session, and a session's projects are found once.

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"path/filepath"
	"slices"
	"sync"
	"time"
)

// DeliverEvent is the event type Delivery emits when a channel should claim.
const DeliverEvent = "deliver"

// DefaultPresenceTTL is how long a session counts as present after its last
// check-in when Delivery.TTL is 0: three of the channel's 30s check-ins.
const DefaultPresenceTTL = 90 * time.Second

// Delivery is a tool's serve side of delivery: the claim route, the sessions
// present, and the deliver events. Set Events, Claim and Covered; the zero
// value of the rest is ready to use.
type Delivery struct {
	// Events is the log the deliver events go on: the one serve streams
	// (Options.Events).
	Events *Events
	// TTL is how long a session counts as present after its last check-in
	// (0: DefaultPresenceTTL).
	TTL time.Duration
	// Covered is every scope a session whose folder is root covers, found once
	// per session (cull runs git for it) and kept until the session lapses or
	// Forget. nil: the session covers root alone.
	Covered func(ctx context.Context, root string) ([]string, error)
	// Claim takes one Send for session from covered, present being the
	// sessions present now; body is what the claim route answers with, ok
	// false when there is nothing.
	Claim func(ctx context.Context, session string, covered, present []string) (body any, ok bool, err error)

	mu      sync.Mutex
	seen    map[string]time.Time // session -> its last check-in
	covered map[string]*covers   // session -> what it covers
	timer   *time.Timer          // the next lapse; nil while no session is present
	wake    chan struct{}        // closed and replaced on every Deliver
}

// covers is one session's covered scopes, found once: a claim that finds it
// being found waits on ready.
type covers struct {
	root   string
	ready  chan struct{}
	scopes []string
	err    error
}

func (d *Delivery) ttl() time.Duration {
	if d.TTL > 0 {
		return d.TTL
	}
	return DefaultPresenceTTL
}

// Touch registers or refreshes session's presence and moves the lapse timer.
func (d *Delivery) Touch(session string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.seen == nil {
		d.seen = map[string]time.Time{}
	}
	d.seen[session] = time.Now()
	d.arm()
}

// Present reports whether session checked in within the TTL.
func (d *Delivery) Present(session string) bool {
	d.mu.Lock()
	defer d.mu.Unlock()
	seen, ok := d.seen[session]
	return ok && time.Now().Before(seen.Add(d.ttl()))
}

// Sessions lists the sessions present now, sorted.
func (d *Delivery) Sessions() []string {
	d.mu.Lock()
	defer d.mu.Unlock()
	now, out := time.Now(), []string{}
	for id, seen := range d.seen {
		if now.Before(seen.Add(d.ttl())) {
			out = append(out, id)
		}
	}
	slices.Sort(out)
	return out
}

// arm sets the one timer to the next lapse of a present session, or stops it
// when none is present. d.mu is held.
func (d *Delivery) arm() {
	if d.timer != nil {
		d.timer.Stop()
		d.timer = nil
	}
	now := time.Now()
	var next time.Time
	for _, seen := range d.seen {
		if at := seen.Add(d.ttl()); at.After(now) && (next.IsZero() || at.Before(next)) {
			next = at
		}
	}
	if !next.IsZero() {
		d.timer = time.AfterFunc(next.Sub(now), d.lapse)
	}
}

// lapse forgets the sessions whose presence has lapsed and, when any did, emits
// one deliver event, so a gone owner's project can be taken over, and one more
// a TTL later: the store holds a gone owner's project while it touched a
// delivery within the TTL, which it can have done after its last check-in.
func (d *Delivery) lapse() {
	d.mu.Lock()
	now, gone := time.Now(), false
	for id, seen := range d.seen {
		if !now.Before(seen.Add(d.ttl())) {
			delete(d.seen, id)
			delete(d.covered, id)
			gone = true
		}
	}
	d.arm()
	d.mu.Unlock()
	if gone {
		d.Deliver()
		time.AfterFunc(d.ttl(), d.Deliver)
	}
}

// Deliver tells every listening channel to claim: the tool calls it when it
// records a Send or takes a delivery back.
func (d *Delivery) Deliver() {
	if d.Events != nil {
		d.Events.Emit(DeliverEvent, struct{}{})
	}
	d.mu.Lock()
	if d.wake != nil {
		close(d.wake)
	}
	d.wake = make(chan struct{})
	d.mu.Unlock()
}

// Wake returns a channel that closes at the next Deliver (or lapse): what a
// tool's long poll, kept for channels from before the stream, waits on.
func (d *Delivery) Wake() <-chan struct{} {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.wake == nil {
		d.wake = make(chan struct{})
	}
	return d.wake
}

// Forget drops every session's covered scopes, found again at its next claim:
// the tool calls it when the scopes it knows change (a new project).
func (d *Delivery) Forget() {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.covered = nil
}

// scopes is what session, whose folder is root, covers: found once, then kept.
func (d *Delivery) scopes(ctx context.Context, session, root string) ([]string, error) {
	if d.Covered == nil {
		return []string{root}, nil
	}
	d.mu.Lock()
	if d.covered == nil {
		d.covered = map[string]*covers{}
	}
	c := d.covered[session]
	if c != nil && c.root == root {
		d.mu.Unlock()
		select {
		case <-c.ready:
		case <-ctx.Done():
			return nil, ctx.Err()
		}
		return c.scopes, c.err
	}
	c = &covers{root: root, ready: make(chan struct{})}
	d.covered[session] = c
	d.mu.Unlock()
	c.scopes, c.err = d.Covered(ctx, root)
	if c.err != nil { // found again at the next claim
		d.mu.Lock()
		if d.covered[session] == c {
			delete(d.covered, session)
		}
		d.mu.Unlock()
	}
	close(c.ready)
	return c.scopes, c.err
}

// Take is one claim for session, whose folder is root: it touches the
// session (a claiming session is a live one) and runs Claim once over what the
// session covers. The claim route answers with it; a tool's own long poll can
// call it on each Wake.
func (d *Delivery) Take(ctx context.Context, session, root string) (any, bool, error) {
	d.Touch(session)
	covered, err := d.scopes(ctx, session, root)
	if err != nil {
		return nil, false, err
	}
	return d.Claim(ctx, session, covered, d.Sessions())
}

// ServeClaim is POST /api/agent/claim, body {session, root}: one claim,
// answering the tool's claim body with 200, or 204 when there is nothing.
func (d *Delivery) ServeClaim(w http.ResponseWriter, r *http.Request) {
	var b struct {
		Session string `json:"session"`
		Root    string `json:"root"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&b); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if b.Session == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "session is required"})
		return
	}
	// "": a tool with no project names no root.
	if b.Root != "" && !filepath.IsAbs(b.Root) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "root must be an absolute path"})
		return
	}
	body, ok, err := d.Take(r.Context(), b.Session, b.Root)
	switch {
	case err != nil:
		if r.Context().Err() != nil {
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
	case !ok:
		w.WriteHeader(http.StatusNoContent)
	default:
		writeJSON(w, http.StatusOK, body)
	}
}
