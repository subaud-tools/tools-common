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

// Open asks the page server at base (http://127.0.0.1:<port>, its entry's
// Loopback even when PAGE_PUBLIC_DOMAIN is set) to open address
// as a tab in session's page, authenticating with token, and returns the
// session's tabs.
func Open(base, token, session, address, title string) (TabList, error) {
	body, err := json.Marshal(OpenRequest{Session: session, Address: address, Title: title})
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
