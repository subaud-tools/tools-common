package pageserve

// WaitOne: the channel's listen and claim for one Send, for a tool's `wait`
// command (`cull wait`, `sift wait`), which serves a session with no channel.

import (
	"context"
	"encoding/json"
	"errors"
	"time"
)

// ErrNothingSent is WaitOne's answer when its deadline passes with no Send.
var ErrNothingSent = errors.New("nothing sent")

// Wait is the session WaitOne waits for.
type Wait struct {
	Session string // the session id presence and the claim name, e.g. "wait:<pid>"
	Harness string // presence's harness, e.g. "wait"
	Label   string // presence's label, e.g. "cull wait · <root>"
	// Root is the folder the session's Sends come from, named on presence and
	// the claim. "": the tool has no project, and they name no root.
	Root string
	// Deadline is when WaitOne gives up with ErrNothingSent. Zero: never.
	Deadline time.Time
}

// WaitOne waits through c for one Send for w and returns its body: the 200
// answer of POST /api/agent/claim, as a channel's Spec.Wake reads it. It posts
// presence ({session, harness, label, root}, root left out when "") and keeps
// it fresh every 30s, listens on serve's GET /api/events, and claims once the
// stream is open and on every deliver event, so a Send recorded before it
// connected is claimed at once. It claims one Send only; the rest stay for
// whoever claims next. c starts serve if it does and isn't running.
//
// It returns ErrNothingSent at w.Deadline, ctx's error when ctx ends, and any
// other failure as it is: a refused call, or a stream that ends (serve went
// away). It does not retry.
func WaitOne(ctx context.Context, c *Client, w Wait) (json.RawMessage, error) {
	if w.Session == "" {
		return nil, errors.New("WaitOne needs a session")
	}
	parent := ctx
	if !w.Deadline.IsZero() {
		var cancel context.CancelFunc
		ctx, cancel = context.WithDeadline(ctx, w.Deadline)
		defer cancel()
	}
	root := w.Root
	ch := New(Spec{Tool: c.Tool, Scope: func(string) string { return root }},
		Identity{Session: w.Session, Harness: w.Harness, Label: w.Label}, c)
	var got json.RawMessage
	ch.take = func(body json.RawMessage) bool { got = body; return true }
	err := ch.Announce(ctx, c)
	if err == nil {
		last := time.Now()
		err = ch.listen(ctx, c, &last, func() {})
	}
	switch {
	case errors.Is(err, errTaken):
		return got, nil
	case parent.Err() != nil:
		return nil, parent.Err()
	case ctx.Err() != nil:
		return nil, ErrNothingSent
	}
	return nil, err
}
