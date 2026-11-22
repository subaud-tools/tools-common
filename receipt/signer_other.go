//go:build !darwin

package receipt

// CheckSigner reports whether the binary at path carries a valid Apple
// signature by the family's Developer ID team. Only macOS has such a
// signature: here it checks nothing.
func CheckSigner(string) error { return nil }
