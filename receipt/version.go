package receipt

import "strings"

// Older reports whether candidate is an older version than installed. Both
// are the family's forms, X.Y.Z or X.Y.Z-rc.N (no leading "v"); an rc is older
// than its final version.
//
// When either does not parse, Older is false: a dev build ("dev", "") must
// still be able to update, and the candidate has already passed Check, so it
// is a version the family released. The guard exists to stop a genuine older
// release being offered as the newest.
func Older(candidate, installed string) bool {
	c, ok := parseVersion(candidate)
	if !ok {
		return false
	}
	i, ok := parseVersion(installed)
	if !ok {
		return false
	}
	for n := range c {
		if c[n] != i[n] {
			return c[n] < i[n]
		}
	}
	return false
}

// finalRC ranks a final version above every rc of the same X.Y.Z.
const finalRC = 1 << 30

// parseVersion returns X, Y, Z and the rc number (finalRC for a final).
func parseVersion(v string) (p [4]int, ok bool) {
	core, rc, isRC := strings.Cut(v, "-rc.")
	parts := strings.Split(core, ".")
	if len(parts) != 3 {
		return p, false
	}
	for n, s := range parts {
		if p[n], ok = number(s); !ok {
			return p, false
		}
	}
	p[3] = finalRC
	if isRC {
		if p[3], ok = number(rc); !ok {
			return p, false
		}
	}
	return p, true
}

// number parses a short run of ASCII digits; anything else is not a number.
func number(s string) (int, bool) {
	if s == "" || len(s) > 9 {
		return 0, false
	}
	n := 0
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, false
		}
		n = n*10 + int(c-'0')
	}
	return n, true
}
