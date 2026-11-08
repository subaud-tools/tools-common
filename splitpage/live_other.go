//go:build !unix

package splitpage

// liveLoopback finds no live entry off unix: pageserve is unix-only, and a
// public address belongs to a hosted workspace, which runs on Linux. A public
// tab is then titled by its host.
func liveLoopback(string) (string, bool) { return "", false }
