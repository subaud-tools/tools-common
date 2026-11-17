package localweb

import (
	"net"
	"os/exec"
	"runtime"
)

// OpenBrowser opens url in the default browser: `open` on darwin, `xdg-open`
// on linux, and nothing elsewhere. It does not wait for the browser; failing
// to launch returns the error for the caller to ignore or report (from galley).
func OpenBrowser(url string) error {
	var cmd *exec.Cmd
	// G702: no shell; url is one argument. gosec traces /signin's request into
	// Config.Open, a func value it can't resolve, so it suspects every
	// func(string) here; /signin passes only http://<Host><path>.
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url) //nolint:gosec // G702: see above
	case "linux":
		cmd = exec.Command("xdg-open", url) //nolint:gosec // G702: see above
	default:
		return nil
	}
	return cmd.Start()
}

// FreePort asks the kernel for a free loopback TCP port.
func FreePort() (int, error) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer func() { _ = ln.Close() }()
	return ln.Addr().(*net.TCPAddr).Port, nil
}
