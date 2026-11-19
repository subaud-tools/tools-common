package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const testToken = "sbt_6BJIVEOXHYYRWEJUT6PJNAR7SJNZANJUJQS5ISSFCMQOITF6SUHQ"

// The setup line pointer every sign-in message ends with.
const pointer = "Get your setup line at https://subaud.tools/account/ (Set up a machine) and paste it in a terminal on this machine."

func TestTheSignInErrorsPointToTheSetupLine(t *testing.T) {
	if got, want := ErrNotSignedIn.Error(), "This machine isn't signed in to subaud.tools. "+pointer; got != want {
		t.Fatalf("ErrNotSignedIn = %q, want %q", got, want)
	}
	if got, want := ErrSignInRefused.Error(), "subaud.tools refused this machine's sign-in. "+pointer; got != want {
		t.Fatalf("ErrSignInRefused = %q, want %q", got, want)
	}
}

func TestLogoutRemovesTheMachineAndTheFile(t *testing.T) {
	var removed []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete || r.URL.Path != "/machine/self" {
			t.Errorf("%s %s", r.Method, r.URL.Path)
		}
		removed = append(removed, strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
		_ = json.NewEncoder(w).Encode(map[string]string{"removed": "m1"})
	}))
	t.Cleanup(srv.Close)
	c := &Client{API: srv.URL, HTTP: srv.Client(), Path: filepath.Join(t.TempDir(), "subaud", "token")}
	signIn(t, c)
	if err := c.Logout(context.Background(), &bytes.Buffer{}); err != nil {
		t.Fatal(err)
	}
	if len(removed) != 1 || removed[0] != testToken {
		t.Fatalf("removed = %v", removed)
	}
	if _, err := os.Stat(c.Path); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("token file: %v", err)
	}
}

func TestTheEnvironmentTokenWinsOverTheFile(t *testing.T) {
	t.Setenv("SUBAUD_HOME", t.TempDir())
	if err := os.MkdirAll(filepath.Dir(TokenPath()), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(TokenPath(), []byte("sbt_FROMFILE\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv(TokenEnv, "")
	if got, err := Token(); err != nil || got != "sbt_FROMFILE" {
		t.Fatalf("Token() = %q, %v", got, err)
	}
	t.Setenv(TokenEnv, "sbt_FROMENV")
	if got, err := Token(); err != nil || got != "sbt_FROMENV" {
		t.Fatalf("Token() = %q, %v", got, err)
	}
}

// linksAPI answers POST /links with status: 200 a URL for the path, else
// the access service's error body for it.
func linksAPI(t *testing.T, status int) (*Client, *[]map[string]string) {
	t.Helper()
	t.Setenv(TokenEnv, "")
	var asked []map[string]string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/links" {
			t.Errorf("%s %s", r.Method, r.URL.Path)
		}
		var in map[string]string
		_ = json.NewDecoder(r.Body).Decode(&in)
		in["bearer"] = strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		asked = append(asked, in)
		w.WriteHeader(status)
		switch status {
		case http.StatusOK:
			_ = json.NewEncoder(w).Encode(map[string]string{"url": "https://hail.tools/dl/" + in["path"] + "?Signature=S"})
		case http.StatusUnauthorized:
			_, _ = w.Write([]byte(`{"error": "sign_in", "account": "https://subaud.tools/account/"}`))
		case http.StatusForbidden:
			_, _ = w.Write([]byte(`{"error": "not_owned", "account": "https://subaud.tools/account/"}`))
		}
	}))
	t.Cleanup(srv.Close)
	c := &Client{API: srv.URL, HTTP: srv.Client(), Path: filepath.Join(t.TempDir(), "subaud", "token")}
	return c, &asked
}

func signIn(t *testing.T, c *Client) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(c.Path), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(c.Path, []byte(testToken+"\n"), 0o600); err != nil {
		t.Fatal(err)
	}
}

func TestLinkAsksWithTheMachinesToken(t *testing.T) {
	c, asked := linksAPI(t, http.StatusOK)
	signIn(t, c)
	url, err := c.Link(context.Background(), "hail", "hail/latest")
	if err != nil {
		t.Fatal(err)
	}
	if url != "https://hail.tools/dl/hail/latest?Signature=S" {
		t.Fatalf("url = %q", url)
	}
	if len(*asked) != 1 || (*asked)[0]["product"] != "hail" || (*asked)[0]["path"] != "hail/latest" || (*asked)[0]["bearer"] != testToken {
		t.Fatalf("asked = %v", *asked)
	}
}

func TestLinkWithNoTokenPointsToTheSetupLineAndAsksNothing(t *testing.T) {
	c, asked := linksAPI(t, http.StatusOK)
	_, err := c.Link(context.Background(), "hail", "hail/latest")
	if !errors.Is(err, ErrNotSignedIn) || !strings.HasSuffix(err.Error(), pointer) || len(*asked) != 0 {
		t.Fatalf("err = %v, asked %v", err, *asked)
	}
}

func TestARefusedTokenPointsToTheSetupLine(t *testing.T) {
	c, _ := linksAPI(t, http.StatusUnauthorized)
	signIn(t, c)
	_, err := c.Link(context.Background(), "hail", "hail/latest")
	if !errors.Is(err, ErrSignInRefused) || !strings.HasSuffix(err.Error(), pointer) {
		t.Fatalf("err = %v", err)
	}
}

func TestAProductNotOwnedNamesTheAccountPage(t *testing.T) {
	c, _ := linksAPI(t, http.StatusForbidden)
	signIn(t, c)
	_, err := c.Link(context.Background(), "diazo", "diazo/latest")
	var notOwned *NotOwnedError
	if !errors.As(err, &notOwned) || notOwned.Account != "https://subaud.tools/account/" ||
		!strings.Contains(err.Error(), "diazo") || !strings.Contains(err.Error(), "https://subaud.tools/account/") {
		t.Fatalf("err = %v", err)
	}
}
