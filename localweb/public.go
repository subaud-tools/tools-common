package localweb

import (
	"net/url"
	"os"
	"regexp"
	"strings"
)

// PublicDomainEnv names the setting that puts a machine's pages on public
// addresses: on a hosted workspace it is the workspace's own domain
// (<ws>.<domain>), and each tool's page is https://<tool>.<that domain>,
// reached through a proxy that forwards to the tool's loopback server. Unset,
// as on every Mac, nothing changes: pages are on 127.0.0.1 only.
const PublicDomainEnv = "PAGE_PUBLIC_DOMAIN"

// label is one DNS label as a tool's host is named: lower-case letters,
// digits and inner hyphens.
var label = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`)

// PublicDomain is PAGE_PUBLIC_DOMAIN, lower-cased, when it holds a domain
// (dot-separated labels, no scheme, port or path); "" when it is unset or
// holds anything else. It reads the environment on each call.
func PublicDomain() string {
	d := strings.ToLower(strings.TrimSpace(os.Getenv(PublicDomainEnv)))
	if d == "" || len(d) > 253 {
		return ""
	}
	for _, l := range strings.Split(d, ".") {
		if !label.MatchString(l) {
			return ""
		}
	}
	return d
}

// PublicOrigin is tool's public page origin, https://<tool>.<PublicDomain()>,
// or "" when the setting is unset or tool is not a single DNS label.
func PublicOrigin(tool string) string {
	d := PublicDomain()
	if d == "" || !label.MatchString(tool) {
		return ""
	}
	return "https://" + tool + "." + d
}

// PublicTool names the tool whose public page address holds: https on
// <tool>.<PublicDomain()>, the tool a single DNS label, with no port and no
// credentials. Anything else, and every address while the setting is unset,
// is not one (ok false).
func PublicTool(address string) (tool string, ok bool) {
	d := PublicDomain()
	if d == "" {
		return "", false
	}
	u, err := url.Parse(address)
	if err != nil || u.Scheme != "https" || u.User != nil || u.Port() != "" || strings.HasSuffix(u.Host, ":") {
		return "", false
	}
	name, found := strings.CutSuffix(strings.ToLower(u.Hostname()), "."+d)
	if !found || !label.MatchString(name) {
		return "", false
	}
	return name, true
}
