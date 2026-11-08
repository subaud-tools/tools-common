//go:build unix

package splitpage

import "github.com/subaud-tools/tools-common/pageserve"

// liveLoopback is the loopback server of tool's running page, from its live
// entry.
func liveLoopback(tool string) (string, bool) {
	e, err := pageserve.LiveFor(tool).Running()
	if err != nil {
		return "", false
	}
	return e.Loopback(), true
}
