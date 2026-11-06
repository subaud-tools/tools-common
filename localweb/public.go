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

// PublicHomeEnv names the tool whose page is the public domain itself,
// https://<PAGE_PUBLIC_DOMAIN>, rather than a host of its own: on a hosted
// workspace, the page the workspace's own address opens. Every other tool
// keeps https://<tool>.<PAGE_PUBLIC_DOMAIN>. It counts only beside
// PAGE_PUBLIC_DOMAIN, and only when it is one DNS label.
const PublicHomeEnv = "PAGE_PUBLIC_HOME"

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

// PublicHome is the tool PAGE_PUBLIC_HOME names, lower-cased, when it is one
// DNS label and PAGE_PUBLIC_DOMAIN is set; "" otherwise.
func PublicHome() string {
	h := strings.ToLower(strings.TrimSpace(os.Getenv(PublicHomeEnv)))
	if PublicDomain() == "" || !label.MatchString(h) {
		return ""
	}
	return h
}

// PublicOrigin is tool's public page origin, https://<tool>.<PublicDomain()>,
// or https://<PublicDomain()> for the tool PublicHome names; "" when the
// setting is unset or tool is not a single DNS label.
func PublicOrigin(tool string) string {
	d := PublicDomain()
	if d == "" || !label.MatchString(tool) {
		return ""
	}
	if tool == PublicHome() {
		return "https://" + d
	}
	return "https://" + tool + "." + d
}

// PublicTool names the tool whose public page address holds: https on
// <tool>.<PublicDomain()>, the tool a single DNS label, or on the bare domain
// for the tool PublicHome names, with no port and no credentials. Anything
// else, and every address while the setting is unset, is not one (ok false).
func PublicTool(address string) (tool string, ok bool) {
	d := PublicDomain()
	if d == "" {
		return "", false
	}
	u, err := url.Parse(address)
	if err != nil || u.Scheme != "https" || u.User != nil || u.Port() != "" || strings.HasSuffix(u.Host, ":") {
		return "", false
	}
	host := strings.ToLower(u.Hostname())
	if host == d {
		home := PublicHome()
		return home, home != ""
	}
	name, found := strings.CutSuffix(host, "."+d)
	if !found || !label.MatchString(name) {
		return "", false
	}
	return name, true
}
