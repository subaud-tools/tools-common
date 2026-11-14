package conformance

import (
	"net/http"
	"net/url"
	"regexp"
	"testing"
	"time"

	"github.com/subaud-tools/tools-common/localweb"
	"github.com/subaud-tools/tools-common/pageserve"
)

func scratchServer(t *testing.T) Server {
	t.Helper()
	return Server{Tool: "scratch", Binary: Build(t, "./testdata/scratch"), Args: []string{"serve"}, Channel: true, Quiet: time.Second,
		Delivery: true, Send: scratchSend, PresenceTTL: scratchTTL}
}

// scratchTTL is scratch's presence TTL (its own short test clock).
const scratchTTL = 2 * time.Second

// scratchSend records a Send for folder the way scratch's page would.
func scratchSend(e pageserve.Entry, folder string) error {
	req, err := http.NewRequest(http.MethodPost, e.Loopback()+"/api/conformance-send?folder="+url.QueryEscape(folder), nil)
	if err != nil {
		return err
	}
	req.Header.Set(localweb.TokenHeader, e.Token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	_ = resp.Body.Close()
	if resp.StatusCode >= 300 {
		return &pageserve.StatusError{Tool: "scratch", Code: resp.StatusCode}
	}
	return nil
}

// A server built only from pageserve passes, with no code of its own for the
// rules.
func TestAServerBuiltOnlyFromPageservePasses(t *testing.T) {
	Check(t, scratchServer(t))
}

// With PAGE_PUBLIC_DOMAIN set the entry advertises a public address no test
// can reach, and every rule still reaches the server on its loopback address.
func TestAServerOnAPublicDomainPasses(t *testing.T) {
	t.Setenv(localweb.PublicDomainEnv, "ws.example.com")
	Check(t, scratchServer(t))
}

// Each rule fails on a server that breaks it, which proves the check can fail.
func TestEachRuleFailsOnAServerThatBreaksIt(t *testing.T) {
	was := staleWait
	staleWait = 2 * time.Second
	t.Cleanup(func() { staleWait = was })
	s := scratchServer(t)
	for _, tc := range []struct {
		rule string
		want string // in the failure
	}{
		{"token", "changed across a restart"},
		{"idle", "exited"},
		{"stale", "never marked stale"},
		{"tabs", "tabs.json"},
		{"build", "X-Tool-Build"},
		{"skills", "skills install"},
		{"stop", "cookie alone"},
		{"delivers", "more than one session"},
	} {
		t.Run(tc.rule, func(t *testing.T) {
			broken := s
			broken.Env = []string{"SCRATCH_BREAK=" + tc.rule}
			err := runRule(t, broken, tc.rule)
			if err == nil {
				t.Fatal("the rule passed on a server that breaks it")
			}
			if !regexp.MustCompile(tc.want).MatchString(err.Error()) {
				t.Fatalf("failed for another reason: %v", err)
			}
		})
	}
}

// A tool with no channel has no skill to ship.
func TestAToolWithNoChannelNeedsNoSkillsCommand(t *testing.T) {
	s := scratchServer(t)
	s.Channel = false
	s.Env = []string{"SCRATCH_BREAK=skills"}
	if err := runRule(t, s, "skills"); err != nil {
		t.Fatal(err)
	}
}

// A skill named apart from its tool is found under its own name, and only there.
func TestASkillNamedApartIsCheckedUnderItsName(t *testing.T) {
	s := scratchServer(t)
	s.Env = []string{"SCRATCH_SKILL=reviewing-a-document"}
	s.SkillName = "reviewing-a-document"
	if err := runRule(t, s, "skills"); err != nil {
		t.Fatal(err)
	}
	s.SkillName = ""
	err := runRule(t, s, "skills")
	if err == nil || !regexp.MustCompile("no scratch/SKILL.md").MatchString(err.Error()) {
		t.Fatalf("%v", err)
	}
}

// A tool whose channel still long-polls has no delivers rule to pass.
func TestAToolWithoutDeliveryIsNotCheckedForIt(t *testing.T) {
	s := scratchServer(t)
	s.Delivery = false
	s.Env = []string{"SCRATCH_BREAK=delivers"}
	if err := runRule(t, s, "delivers"); err != nil {
		t.Fatal(err)
	}
}
