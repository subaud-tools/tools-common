package conformance

// The delivers rule: a tool whose channel takes Sends with Spec.Stream hands
// each Send to exactly one session, all of several queued, a killed owner's
// project to another session, and nothing is lost across a serve restart.
// The sessions are the tool's own `<tool> watch`, each Send one JSON line.

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"os/exec"
	"sync"
	"testing"
	"time"

	"github.com/subaud-tools/tools-common/pageserve"
)

// arriveWait is how long a Send may take to reach a session; settleWait how long
// the rule watches for a second copy.
const (
	arriveWait = 5 * time.Second
	settleWait = time.Second
)

// watcher is one session: the tool's `watch` running in the project's folder,
// and the Sends it printed.
type watcher struct {
	session string
	cmd     *exec.Cmd
	exited  chan struct{}
	mu      sync.Mutex
	got     []string // each Send's content
	stderr  *process // its log, for a failure
}

func (w *watcher) count() int {
	w.mu.Lock()
	defer w.mu.Unlock()
	return len(w.got)
}

// watch starts `<tool> watch` as session, in folder, as a pi session would.
func (c *scratch) watch(t *testing.T, session, folder string) (*watcher, error) {
	t.Helper()
	cmd := exec.Command(c.exe, "watch")
	cmd.Dir = folder
	cmd.Env = append(c.env(), "AGENT_SESSION_ID="+session, "AGENT_SESSION_CHILD=", "CLAUDE_CODE_SESSION_ID=", "PWD="+folder)
	out, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	w := &watcher{session: session, cmd: cmd, exited: make(chan struct{}), stderr: &process{}}
	cmd.Stderr = w.stderr
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	read := make(chan struct{})
	go func() {
		defer close(read)
		sc := bufio.NewScanner(out)
		sc.Buffer(make([]byte, 64<<10), 8<<20)
		for sc.Scan() {
			var line struct {
				Content string `json:"content"`
			}
			if json.Unmarshal(sc.Bytes(), &line) == nil && line.Content != "" {
				w.mu.Lock()
				w.got = append(w.got, line.Content)
				w.mu.Unlock()
			}
		}
	}()
	go func() { <-read; _ = cmd.Wait(); close(w.exited) }()
	t.Cleanup(w.kill)
	return w, nil
}

// kill ends the session as a crash does, and waits for it.
func (w *watcher) kill() {
	_ = w.cmd.Process.Kill()
	<-w.exited
}

// arrived waits until the watchers together printed want Sends, then for
// settleWait more, and says what went wrong: too few, or more (a Send twice).
func arrived(ws []*watcher, want int, within time.Duration, what string) error {
	total := func() int {
		n := 0
		for _, w := range ws {
			n += w.count()
		}
		return n
	}
	deadline := time.Now().Add(within)
	for total() < want {
		if time.Now().After(deadline) {
			return fmt.Errorf("%s: %d of %d Sends never arrived in %v (%s)", what, want-total(), want, within, logs(ws))
		}
		time.Sleep(20 * time.Millisecond)
	}
	time.Sleep(settleWait)
	if n := total(); n != want {
		return fmt.Errorf("%s: %d Sends printed for %d recorded: a Send reached more than one session", what, n, want)
	}
	return nil
}

func logs(ws []*watcher) string {
	s := ""
	for _, w := range ws {
		s += fmt.Sprintf("%s: %q; ", w.session, w.stderr.log())
	}
	return s
}

// delivers: Sends recorded before any session listens all arrive once the
// sessions connect; a Send reaches exactly one session; once the session that
// took it is killed, the next Send reaches the other within the presence TTL
// and 5s; and a Send recorded just after a serve restart arrives.
func delivers(t *testing.T, c *scratch) error {
	if !c.s.Delivery {
		return nil
	}
	if c.s.Send == nil {
		return errors.New("Server.Delivery is set without Server.Send to record a Send with")
	}
	folder := t.TempDir()
	if c.s.Folder != nil {
		folder = c.s.Folder(t)
	}
	e, err := c.start()
	if err != nil {
		return err
	}
	for range 3 {
		if err := c.s.Send(e, folder); err != nil {
			return fmt.Errorf("recording a Send: %w", err)
		}
	}
	var ws []*watcher
	for _, id := range []string{"conformance-a", "conformance-b"} {
		w, err := c.watch(t, id, folder)
		if err != nil {
			return err
		}
		ws = append(ws, w)
	}
	if err := arrived(ws, 3, arriveWait, "three Sends queued before the sessions connected"); err != nil {
		return err
	}
	before := []int{ws[0].count(), ws[1].count()}
	if err := c.s.Send(e, folder); err != nil {
		return fmt.Errorf("recording a Send: %w", err)
	}
	if err := arrived(ws, 4, arriveWait, "a Send with both sessions listening"); err != nil {
		return err
	}
	owner, other := ws[0], ws[1]
	if ws[1].count() > before[1] {
		owner, other = ws[1], ws[0]
	}
	owner.kill()
	ttl := c.s.PresenceTTL
	if ttl <= 0 {
		ttl = pageserve.DefaultPresenceTTL
	}
	had := other.count()
	if err := c.s.Send(e, folder); err != nil {
		return fmt.Errorf("recording a Send: %w", err)
	}
	if err := arrived([]*watcher{other}, had+1, ttl+5*time.Second, "a Send after the session that took the last one was killed"); err != nil {
		return err
	}
	if err := c.stop(); err != nil {
		return err
	}
	if e, err = c.start(); err != nil {
		return err
	}
	if err := c.s.Send(e, folder); err != nil {
		return fmt.Errorf("recording a Send after a restart: %w", err)
	}
	// The session finds the new serve and claims on connect.
	if err := arrived([]*watcher{other}, had+2, arriveWait+5*time.Second, "a Send recorded as serve restarted"); err != nil {
		return err
	}
	return c.stop()
}
