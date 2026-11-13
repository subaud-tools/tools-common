//go:build !unix

package record

import "sync"

// mu stands in for the file lock where flock is missing: marks within one
// process still don't race; the write is still a rename.
var mu sync.Mutex

func lock(string) (unlock func(), err error) {
	mu.Lock()
	return mu.Unlock, nil
}
