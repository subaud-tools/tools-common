// Package auth holds a machine's sign-in to its subaud.tools account, one
// for every family tool on it. The setup line from the account page (Add or
// sign in a machine) writes the machine's token to ConfigDir("subaud")/token
// with mode 600; Token is what the downloaders send, and Logout removes it.
//
// stdlib-only, and it doesn't import tools-common's root package, which
// registers login and logout from here.
package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// DefaultAPI is the access service.
const DefaultAPI = "https://api.subaud.tools"

// TokenEnv names the environment variable whose token wins over the file,
// for CI runners.
const TokenEnv = "SUBAUD_TOKEN" //nolint:gosec // a variable's name, not a credential

// SetupLine says where a machine gets signed in: the setup line on the
// account page, pasted in a terminal on the machine.
const SetupLine = "Get your setup line at https://subaud.tools/account/ (Set up a machine) and paste it in a terminal on this machine."

// ErrNotSignedIn is returned by Token when there is no token, and by every
// tool's login.
var ErrNotSignedIn = errors.New("This machine isn't signed in to subaud.tools. " + SetupLine) //nolint:staticcheck // ST1005: shown to the person as it is

// ErrSignInRefused is returned by Link when the service refuses the token:
// the machine was removed on the account page, or the token is wrong.
var ErrSignInRefused = errors.New("subaud.tools refused this machine's sign-in. " + SetupLine) //nolint:staticcheck // ST1005: shown to the person as it is

// DefaultAccount is the account page, for a refusal that names none.
const DefaultAccount = "https://subaud.tools/account/"

// NotOwnedError is returned by Link when the account doesn't own the
// product; Account is the page to buy it on.
type NotOwnedError struct {
	Product string
	Account string
}

func (e *NotOwnedError) Error() string {
	return fmt.Sprintf("this machine's subaud.tools account doesn't own %s: get it at %s", e.Product, e.Account)
}

// TokenPath is ConfigDir("subaud")/token, by the same rules as
// tools.ConfigDir: an absolute $SUBAUD_HOME/config, else an absolute
// $XDG_CONFIG_HOME/subaud, else ~/.config/subaud.
func TokenPath() string {
	if h := os.Getenv("SUBAUD_HOME"); filepath.IsAbs(h) {
		return filepath.Join(h, "config", "token")
	}
	if b := os.Getenv("XDG_CONFIG_HOME"); filepath.IsAbs(b) {
		return filepath.Join(b, "subaud", "token")
	}
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return filepath.Join(os.TempDir(), "subaud", "config", "token")
	}
	return filepath.Join(home, ".config", "subaud", "token")
}

// Token returns $SUBAUD_TOKEN if set, else the token file's;
// ErrNotSignedIn when there is neither.
func Token() (string, error) { return (&Client{}).token() }

// SignedIn reports whether this machine keeps a token ($SUBAUD_TOKEN or the
// token file). It doesn't ask the service whether the token still works.
func (c *Client) SignedIn() bool { _, err := c.token(); return err == nil }

func (c *Client) token() (string, error) {
	if t := os.Getenv(TokenEnv); t != "" {
		return t, nil
	}
	return readToken(c.path())
}

func readToken(path string) (string, error) {
	b, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return "", ErrNotSignedIn
	}
	if err != nil {
		return "", err
	}
	t := strings.TrimSpace(string(b))
	if t == "" {
		return "", ErrNotSignedIn
	}
	return t, nil
}

// Client talks to the access service. The zero value is ready to use.
type Client struct {
	API  string       // "" → DefaultAPI
	HTTP *http.Client // nil → a client with a 30s timeout
	Path string       // the token file; "" → TokenPath()
}

func (c *Client) api() string {
	if c.API != "" {
		return strings.TrimRight(c.API, "/")
	}
	return DefaultAPI
}

func (c *Client) http() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return &http.Client{Timeout: 30 * time.Second}
}

func (c *Client) path() string {
	if c.Path != "" {
		return c.Path
	}
	return TokenPath()
}

// Link asks the access service for a five-minute signed URL of path (e.g.
// "hail/latest" or "hail/0.4.0/hail_darwin_arm64.tar.gz") in product's
// downloads, with this machine's token, using the default Client.
func Link(ctx context.Context, product, path string) (string, error) {
	return (&Client{}).Link(ctx, product, path)
}

// Link asks the access service for a signed URL of path in product's
// downloads. With no token it asks nothing and returns ErrNotSignedIn; a
// refused token is ErrSignInRefused and a product the account doesn't own a
// *NotOwnedError.
func (c *Client) Link(ctx context.Context, product, path string) (string, error) {
	token, err := c.token()
	if err != nil {
		return "", err
	}
	var r struct {
		URL string `json:"url"`
	}
	err = c.call(ctx, http.MethodPost, "/links", token, map[string]string{"product": product, "path": path}, &r)
	var refused *apiError
	if errors.As(err, &refused) {
		switch refused.status {
		case http.StatusUnauthorized:
			return "", ErrSignInRefused
		case http.StatusForbidden:
			account := refused.account
			if account == "" {
				account = DefaultAccount
			}
			return "", &NotOwnedError{Product: product, Account: account}
		}
	}
	if err != nil {
		return "", err
	}
	if r.URL == "" {
		return "", errors.New("the access service sent no link")
	}
	return r.URL, nil
}

// Logout removes this machine from its account and deletes the token file.
func (c *Client) Logout(ctx context.Context, out io.Writer) error {
	token, err := readToken(c.path())
	if errors.Is(err, ErrNotSignedIn) {
		_, _ = fmt.Fprintln(out, "This machine is not signed in.")
		return nil
	}
	if err != nil {
		return err
	}
	err = c.call(ctx, http.MethodDelete, "/machine/self", token, nil, nil)
	var refused *apiError
	alreadyRemoved := errors.As(err, &refused) && refused.status == http.StatusUnauthorized // on the account page
	if err != nil && !alreadyRemoved {
		return err
	}
	if err := os.Remove(c.path()); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	_, _ = fmt.Fprintln(out, "Signed out.")
	return nil
}

// apiError is a non-200 answer of the access service.
type apiError struct {
	status  int
	code    string
	account string
}

func (e *apiError) Error() string {
	if e.code != "" {
		return fmt.Sprintf("the access service answered %d %s", e.status, e.code)
	}
	return fmt.Sprintf("the access service answered %d", e.status)
}

func (c *Client) call(ctx context.Context, method, path, token string, in, out any) error {
	var body io.Reader
	if in != nil {
		b, err := json.Marshal(in)
		if err != nil {
			return err
		}
		body = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.api()+path, body)
	if err != nil {
		return err
	}
	if in != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := c.http().Do(req)
	if err != nil {
		return fmt.Errorf("reaching the access service: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	b, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return fmt.Errorf("reading the access service's answer: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		var e struct {
			Error   string `json:"error"`
			Account string `json:"account"`
		}
		_ = json.Unmarshal(b, &e)
		return &apiError{status: resp.StatusCode, code: e.Error, account: e.Account}
	}
	if out == nil {
		return nil
	}
	if err := json.Unmarshal(b, out); err != nil {
		return fmt.Errorf("reading the access service's answer: %w", err)
	}
	return nil
}
