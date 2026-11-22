package receipt

import (
	"errors"
	"os"
	"os/exec"
)

const codesign = "/usr/bin/codesign"

// signerRequirement holds for a binary signed with a Developer ID
// Application certificate of the family's Apple team, and for no other.
const signerRequirement = `anchor apple generic and certificate 1[field.1.2.840.113635.100.6.2.6] exists and certificate leaf[field.1.2.840.113635.100.6.1.13] exists and certificate leaf[subject.OU] = "9JA73SU683"`

// CheckSigner reports whether the binary at path carries a valid Apple
// signature by the family's Developer ID team. It refuses when codesign,
// which ships with macOS, is missing. On other systems it checks nothing.
func CheckSigner(path string) error {
	if _, err := os.Stat(codesign); err != nil {
		return errors.New("the Apple signature could not be checked: " + codesign + " is missing")
	}
	if err := exec.Command(codesign, "--verify", "--strict", "-R="+signerRequirement, path).Run(); err != nil {
		return errors.New("the binary is not signed by the subaud tools' Apple Developer ID")
	}
	return nil
}
