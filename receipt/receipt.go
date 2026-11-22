// Package receipt checks that a downloaded release file is one the family
// published: every release signs, per file, a receipt naming the tool, the
// version, the file and its SHA-256, and an update is installed only when
// that receipt verifies against a key trusted here. Standard library only.
package receipt

import (
	"bytes"
	"crypto/ed25519"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
)

// The trusted public keys: base64 of the DER SubjectPublicKeyInfo. Both are
// public. A receipt signed by either is valid.
const (
	// releaseKey is held in AWS KMS; every release signs with it.
	releaseKey = "MCowBQYDK2VwAyEAaN1TOmmpTUaNCysz+ZwpXmt3rROHJP4q5ar7d7KUb9I="
	// backupKey is held offline by the owner, for when the release key is lost.
	backupKey = "MCowBQYDK2VwAyEApbxDuFvXnvBWQ4uBGVXDRaM09cfZJqy6pUsfQGB441Q="
)

// Keys is a list of public keys; a signature by any one of them is accepted.
type Keys []ed25519.PublicKey

// trusted is what Verify and Check accept. It is a variable only so this
// package's tests can prove the functions below against a key they hold.
var trusted = Keys{mustKey(releaseKey), mustKey(backupKey)}

// mustKey parses a key constant. It panics on a malformed one: a build with a
// bad key must not ship, and init runs in every test and every binary.
func mustKey(b64 string) ed25519.PublicKey {
	der, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		panic("receipt: trusted key is not base64: " + err.Error())
	}
	pub, err := x509.ParsePKIXPublicKey(der)
	if err != nil {
		panic("receipt: trusted key is not a public key: " + err.Error())
	}
	key, ok := pub.(ed25519.PublicKey)
	if !ok {
		panic("receipt: trusted key is not Ed25519")
	}
	return key
}

// Verify reports whether sig (base64, surrounding whitespace ignored) is an
// Ed25519 signature over exactly the bytes of receipt by a trusted key.
func Verify(receipt, sig []byte) error { return trusted.Verify(receipt, sig) }

// Check is the whole test a downloaded file must pass before it is installed:
// the receipt's signature verifies (checked first, so nothing unsigned is
// parsed), and the receipt names this tool, this version, this file name and
// the SHA-256 of file.
func Check(receipt, sig, file []byte, tool, version, fileName string) error {
	return trusted.Check(receipt, sig, file, tool, version, fileName)
}

// Verify is the package's Verify against these keys.
func (k Keys) Verify(receipt, sig []byte) error {
	raw, err := base64.StdEncoding.DecodeString(string(bytes.TrimSpace(sig)))
	if err != nil || len(raw) != ed25519.SignatureSize {
		return errors.New("the receipt's signature is not valid")
	}
	for _, key := range k {
		if ed25519.Verify(key, receipt, raw) {
			return nil
		}
	}
	return errors.New("the receipt's signature is not valid")
}

// Check is the package's Check against these keys.
func (k Keys) Check(receipt, sig, file []byte, tool, version, fileName string) error {
	if err := k.Verify(receipt, sig); err != nil {
		return err
	}
	r, err := parse(receipt)
	if err != nil {
		return err
	}
	if r["tool"] != tool {
		return fmt.Errorf("the receipt is for tool %q, not %q", r["tool"], tool)
	}
	if r["version"] != version {
		return fmt.Errorf("the receipt is for version %q, not %q", r["version"], version)
	}
	if r["file"] != fileName {
		return fmt.Errorf("the receipt is for file name %q, not %q", r["file"], fileName)
	}
	sum := sha256.Sum256(file)
	if r["sha256"] != hex.EncodeToString(sum[:]) {
		return fmt.Errorf("the checksum of %q does not match its receipt", fileName)
	}
	return nil
}

// fields are the receipt's four members; each is a string and appears once.
var fields = []string{"tool", "version", "file", "sha256"}

// parse reads a receipt strictly: one JSON object holding exactly the four
// fields, each once and each a string, and nothing after it but whitespace.
func parse(receipt []byte) (map[string]string, error) {
	bad := errors.New("the receipt is not in the expected form")
	dec := json.NewDecoder(bytes.NewReader(receipt))
	if t, err := dec.Token(); err != nil || t != json.Delim('{') {
		return nil, bad
	}
	r := map[string]string{}
	for dec.More() {
		k, err := dec.Token()
		if err != nil {
			return nil, bad
		}
		v, err := dec.Token()
		if err != nil {
			return nil, bad
		}
		key, _ := k.(string)
		val, isString := v.(string)
		_, seen := r[key]
		if !isString || seen || !known(key) {
			return nil, bad
		}
		r[key] = val
	}
	if t, err := dec.Token(); err != nil || t != json.Delim('}') {
		return nil, bad
	}
	if _, err := dec.Token(); err != io.EOF {
		return nil, bad
	}
	if len(r) != len(fields) {
		return nil, bad
	}
	return r, nil
}

func known(key string) bool {
	for _, f := range fields {
		if f == key {
			return true
		}
	}
	return false
}
