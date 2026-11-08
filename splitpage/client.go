package splitpage

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/subaud-tools/tools-common/localweb"
)

// clientTimeout bounds one call to a page server on this machine.
const clientTimeout = 10 * time.Second

// OpenOption changes how Open opens its tab.
type OpenOption func(*OpenRequest)

// Behind opens the tab without showing it (OpenRequest.Behind): the tab that
// shows keeps showing, and the new tab is marked until it is first shown.
func Behind() OpenOption { return func(r *OpenRequest) { r.Behind = true } }

// Open asks the page server at base (http://127.0.0.1:<port>, its entry's
// Loopback even when PAGE_PUBLIC_DOMAIN is set) to open address
// as a tab in session's page, authenticating with token, and returns the
// session's tabs. With no options the tab shows.
func Open(base, token, session, address, title string, opts ...OpenOption) (TabList, error) {
	r := OpenRequest{Session: session, Address: address, Title: title}
	for _, o := range opts {
		o(&r)
	}
	body, err := json.Marshal(r)
	if err != nil {
		return TabList{}, err
	}
	req, err := http.NewRequest(http.MethodPost, strings.TrimSuffix(base, "/")+"/api/split/open", bytes.NewReader(body))
	if err != nil {
		return TabList{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(localweb.TokenHeader, token)
	res, err := (&http.Client{Timeout: clientTimeout}).Do(req)
	if err != nil {
		return TabList{}, fmt.Errorf("splitpage: open a tab: %w", err)
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(res.Body, 1<<10))
		return TabList{}, fmt.Errorf("splitpage: open a tab: %s: %s", res.Status, strings.TrimSpace(string(msg)))
	}
	var l TabList
	if err := json.NewDecoder(res.Body).Decode(&l); err != nil {
		return TabList{}, fmt.Errorf("splitpage: open a tab: %w", err)
	}
	return l, nil
}
