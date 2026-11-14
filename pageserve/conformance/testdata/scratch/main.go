// Command scratch is a server built only from pageserve, with none of its own
// code for the server rules, which conformance must pass. SCRATCH_BREAK names
// a rule to break, the one thing it does beyond that, which conformance must
// fail: that is what proves the check can fail. Its channel (`scratch watch`)
// takes Sends with Spec.Stream, and its serve wires pageserve.Delivery, with
// POST /api/conformance-send to record one.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"slices"
	"strconv"
	"sync"
	"syscall"
	"testing/fstest"
	"time"

	tools "github.com/subaud-tools/tools-common"
	"github.com/subaud-tools/tools-common/localweb"
	"github.com/subaud-tools/tools-common/pageserve"
)

const tool = "scratch"

var assets = fstest.MapFS{"index.html": {Data: []byte("<!doctype html><title>scratch</title>")}}

func main() {
	broke := os.Getenv("SCRATCH_BREAK")
	var err error
	switch {
	case len(os.Args) > 1 && os.Args[1] == "serve":
		ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
		defer stop()
		err = serve(ctx, broke)
	case len(os.Args) > 1 && os.Args[1] == "watch":
		c := pageserve.Commands{Spec: spec, Process: pageserve.Process{Live: pageserve.LiveFor(tool)}}
		err = c.WatchCommand(pageserve.Help{}).Run(os.Args[2:], os.Stdout, os.Stderr)
	case len(os.Args) > 1 && os.Args[1] == "skills" && broke != "skills":
		// SCRATCH_SKILL names the skill apart from the tool.
		name := os.Getenv("SCRATCH_SKILL")
		if name == "" {
			name = tool
		}
		skill := func() ([]byte, error) { return []byte("---\nname: " + name + "\n---\nA skill.\n"), nil }
		c := pageserve.Commands{Spec: pageserve.Spec{Tool: tool}, Skill: skill, SkillName: name}
		err = c.SkillsCommand().Run(os.Args[2:], os.Stdout, os.Stderr)
	default:
		err = fmt.Errorf("unknown command: %v", os.Args[1:])
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func serve(ctx context.Context, broke string) error {
	state := tools.StateDir(tool)
	if err := os.MkdirAll(state, 0o700); err != nil {
		return err
	}
	o := pageserve.Options{Live: pageserve.LiveFor(tool), Assets: assets, Version: "1.2.3", Events: pageserve.NewEvents()}
	o.API = deliveryAPI(o.Events, broke == "delivers")
	switch broke {
	case "token": // a tool that makes a new token each start
		_ = os.Remove(filepath.Join(state, "token"))
	case "idle": // a tool with its own idle exit
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, 500*time.Millisecond)
		defer cancel()
	case "stale": // a tool that runs its own server and never watches its binary
		return handRolled(ctx, o)
	case "tabs": // a list that can't be kept
		if err := os.Mkdir(filepath.Join(state, "tabs.json"), 0o700); err != nil {
			return err
		}
	case "stop": // a tool whose own server takes the stop with the cookie
		return cookieStop(ctx, o)
	case "build": // a tool route that answers without the header
		o.API = http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Del(pageserve.BuildHeader)
			w.WriteHeader(http.StatusNotFound)
		})
	}
	return pageserve.Run(ctx, o)
}

// cookieStop serves and advertises itself with a stop route anything signed in
// can reach.
func cookieStop(ctx context.Context, o pageserve.Options) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/stop", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
		go cancel()
	})
	srv, err := localweb.Start(ctx, localweb.Config{Tool: tool, Assets: o.Assets, API: mux})
	if err != nil {
		return err
	}
	e := pageserve.Entry{URL: srv.URL, Base: "http://" + srv.Addr(), Token: srv.Token, PID: os.Getpid()}
	if err := o.Live.Advertise(e); err != nil {
		return err
	}
	defer o.Live.Withdraw(e.PID)
	return srv.Wait()
}

// handRolled serves and advertises itself without pageserve.Run.
func handRolled(ctx context.Context, o pageserve.Options) error {
	srv, err := localweb.Start(ctx, localweb.Config{Tool: tool, Assets: o.Assets})
	if err != nil {
		return err
	}
	e := pageserve.Entry{URL: srv.URL, Base: "http://" + srv.Addr(), Token: srv.Token, PID: os.Getpid()}
	if err := o.Live.Advertise(e); err != nil {
		return err
	}
	defer o.Live.Withdraw(e.PID)
	return srv.Wait()
}

// spec is scratch's channel: no tools, its folder as its scope, and a Send's
// text pushed as is.
var spec = pageserve.Spec{Tool: tool, Version: "1.2.3", Answers: "the sends", Stream: true,
	Scope: func(cwd string) string { return cwd },
	Wake: func(body json.RawMessage) (string, map[string]string, bool) {
		var got struct {
			ID   int64  `json:"id"`
			Text string `json:"text"`
		}
		if json.Unmarshal(body, &got) != nil || got.ID == 0 {
			return "", nil, false
		}
		return got.Text, map[string]string{"source": tool, "send_id": strconv.FormatInt(got.ID, 10)}, true
	}}

// presenceTTL is scratch's own short test clock.
const presenceTTL = 2 * time.Second

// deliveryAPI is scratch's agent routes over an in-memory queue per folder.
// The last session to claim from a folder owns it, and while its owner is
// present nobody else claims there. twice (SCRATCH_BREAK=delivers) hands
// each Send to every session that claims, as a claim that isn't exclusive
// would.
func deliveryAPI(ev *pageserve.Events, twice bool) http.Handler {
	var mu sync.Mutex
	var next int64
	queued, owner := map[string][]int64{}, map[string]string{}
	taken := map[string]map[int64]bool{} // with twice: session -> the Sends it took
	d := &pageserve.Delivery{Events: ev, TTL: presenceTTL,
		Covered: func(_ context.Context, root string) ([]string, error) { return []string{realPath(root)}, nil },
		Claim: func(_ context.Context, session string, covered, present []string) (any, bool, error) {
			mu.Lock()
			defer mu.Unlock()
			for _, f := range covered {
				if twice {
					for _, id := range queued[f] {
						if !taken[session][id] {
							if taken[session] == nil {
								taken[session] = map[int64]bool{}
							}
							taken[session][id] = true
							return map[string]any{"id": id, "text": "send " + strconv.FormatInt(id, 10)}, true, nil
						}
					}
					continue
				}
				if o := owner[f]; o != "" && o != session && slices.Contains(present, o) {
					continue
				}
				if q := queued[f]; len(q) > 0 {
					queued[f], owner[f] = q[1:], session
					return map[string]any{"id": q[0], "text": "send " + strconv.FormatInt(q[0], 10)}, true, nil
				}
			}
			return nil, false, nil
		}}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/agent/presence", func(w http.ResponseWriter, r *http.Request) {
		var b struct {
			Session string `json:"session"`
		}
		if json.NewDecoder(r.Body).Decode(&b) != nil || b.Session == "" {
			http.Error(w, "session is required", http.StatusBadRequest)
			return
		}
		d.Touch(b.Session)
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("POST /api/agent/claim", d.ServeClaim)
	mux.HandleFunc("POST /api/conformance-send", func(w http.ResponseWriter, r *http.Request) {
		f := realPath(r.URL.Query().Get("folder"))
		mu.Lock()
		next++
		queued[f] = append(queued[f], next)
		mu.Unlock()
		d.Deliver()
		w.WriteHeader(http.StatusNoContent)
	})
	return mux
}

// realPath resolves symlinks (macOS's /var is /private/var), or returns p.
func realPath(p string) string {
	if r, err := filepath.EvalSymlinks(p); err == nil {
		return r
	}
	return filepath.Clean(p)
}
