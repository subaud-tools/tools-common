package pageserve

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"
)

// waitResult is one WaitOne's answer.
type waitResult struct {
	body json.RawMessage
	err  error
}

func startWaitOne(f *fakeServe, w Wait) <-chan waitResult {
	got := make(chan waitResult, 1)
	go func() {
		body, err := WaitOne(context.Background(), f.client(), w)
		got <- waitResult{body, err}
	}()
	return got
}

func sendText(t *testing.T, body json.RawMessage) string {
	t.Helper()
	var b struct {
		Text string `json:"text"`
	}
	if err := json.Unmarshal(body, &b); err != nil {
		t.Fatalf("body %s: %v", body, err)
	}
	return b.Text
}

// WaitOne registers presence, listens, and returns the first Send recorded
// while it does.
func TestWaitOneReturnsASendRecordedWhileItListens(t *testing.T) {
	f := newFakeServe(t)
	root := t.TempDir()
	got := startWaitOne(f, Wait{Session: "wait:1", Harness: "wait", Label: "cull wait · x", Root: root})
	awaitCount(t, f, "POST /api/agent/claim", 1)
	f.send(root, "the answers")
	select {
	case r := <-got:
		if r.err != nil || sendText(t, r.body) != "the answers" {
			t.Fatalf("%s %v", r.body, r.err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("WaitOne never returned the Send")
	}
	p := f.presences()
	if len(p) == 0 || p[0]["session"] != "wait:1" || p[0]["harness"] != "wait" || p[0]["label"] != "cull wait · x" || p[0]["root"] != root {
		t.Fatalf("presence %v", p)
	}
}

// A Send recorded before WaitOne connected is claimed on connect.
func TestWaitOneClaimsASendRecordedBeforeItConnected(t *testing.T) {
	f := newFakeServe(t)
	root := t.TempDir()
	f.queue(root, "sent earlier", "sent later")
	select {
	case r := <-startWaitOne(f, Wait{Session: "wait:1", Harness: "wait", Label: "l", Root: root}):
		if r.err != nil || sendText(t, r.body) != "sent earlier" {
			t.Fatalf("%s %v", r.body, r.err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("WaitOne never returned the Send")
	}
	// One Send only: the next stays for whoever claims it.
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.queued[root]) != 1 {
		t.Fatalf("queued %v, want the second Send left", f.queued[root])
	}
}

// At its deadline WaitOne gives up with ErrNothingSent.
func TestWaitOneGivesUpAtItsDeadline(t *testing.T) {
	f := newFakeServe(t)
	start := time.Now()
	r := <-startWaitOne(f, Wait{Session: "wait:1", Harness: "wait", Label: "l", Deadline: start.Add(300 * time.Millisecond)})
	if !errors.Is(r.err, ErrNothingSent) || r.body != nil {
		t.Fatalf("%s %v, want ErrNothingSent", r.body, r.err)
	}
	if d := time.Since(start); d < 300*time.Millisecond || d > 3*time.Second {
		t.Fatalf("gave up after %v", d)
	}
}
