package receipt

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"strings"
	"testing"
)

// testKeys swaps the trusted list for two fresh keys, standing for the
// release key and the backup key, and returns their private halves.
func testKeys(t *testing.T) (release, backup ed25519.PrivateKey) {
	t.Helper()
	rPub, rPriv, _ := ed25519.GenerateKey(nil)
	bPub, bPriv, _ := ed25519.GenerateKey(nil)
	old := trusted
	trusted = Keys{rPub, bPub}
	t.Cleanup(func() { trusted = old })
	return rPriv, bPriv
}

func sign(key ed25519.PrivateKey, receipt []byte) []byte {
	return []byte(base64.StdEncoding.EncodeToString(ed25519.Sign(key, receipt)) + "\n")
}

func sum(file []byte) string {
	s := sha256.Sum256(file)
	return hex.EncodeToString(s[:])
}

// as a release writes it: go-release/sign-receipts.sh's printf.
func receiptFor(tool, version, name string, file []byte) []byte {
	return fmt.Appendf(nil, `{"tool":"%s","version":"%s","file":"%s","sha256":"%s"}`+"\n", tool, version, name, sum(file))
}

func TestTheShippedKeysAreTwoDistinctEd25519Keys(t *testing.T) {
	if len(trusted) != 2 || len(trusted[0]) != ed25519.PublicKeySize || len(trusted[1]) != ed25519.PublicKeySize || trusted[0].Equal(trusted[1]) {
		t.Fatalf("trusted = %v", trusted)
	}
}

func TestAMalformedKeyConstantPanics(t *testing.T) {
	for _, bad := range []string{"", "not base64!", "AAAA", "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEEVs/o5+uQbTjL3chynL4wXgUg2R9q9UU8I5mEovUf86QZ7kOBIjJwqnzD1omageEHWwHdBO6B+dFabmdT9POxg=="} {
		func() {
			defer func() {
				if recover() == nil {
					t.Errorf("mustKey(%q) did not panic", bad)
				}
			}()
			mustKey(bad)
		}()
	}
}

func TestCheck(t *testing.T) {
	release, backup := testKeys(t)
	_, stranger, _ := ed25519.GenerateKey(nil)
	file := []byte("the tarball")
	const tool, version, name = "kempt", "1.4.0", "kempt_darwin_arm64.tar.gz"
	good := receiptFor(tool, version, name, file)
	h := sum(file)

	for _, c := range []struct {
		what    string
		receipt []byte
		key     ed25519.PrivateKey
		sig     []byte // when set, used instead of signing receipt with key
		file    []byte
		want    string // "" passes
	}{
		{what: "signed by the release key", receipt: good, key: release, file: file},
		{what: "signed by the backup key", receipt: good, key: backup, file: file},
		{what: "signed by a key not trusted", receipt: good, key: stranger, file: file, want: "the receipt's signature is not valid"},
		{what: "a signature over other bytes", receipt: good, sig: sign(release, []byte("other")), file: file, want: "the receipt's signature is not valid"},
		{what: "a signature that is not base64", receipt: good, sig: []byte("!!\n"), file: file, want: "the receipt's signature is not valid"},
		{what: "an empty signature", receipt: good, sig: []byte{}, file: file, want: "the receipt's signature is not valid"},
		{what: "a short signature", receipt: good, sig: []byte("AAAA"), file: file, want: "the receipt's signature is not valid"},
		{what: "another tool", receipt: receiptFor("muster", version, name, file), key: release, file: file, want: `the receipt is for tool "muster", not "kempt"`},
		{what: "another version", receipt: receiptFor(tool, "1.3.0", name, file), key: release, file: file, want: `the receipt is for version "1.3.0", not "1.4.0"`},
		{what: "another file name", receipt: receiptFor(tool, version, "kempt_linux_amd64.tar.gz", file), key: release, file: file, want: `the receipt is for file name "kempt_linux_amd64.tar.gz", not "kempt_darwin_arm64.tar.gz"`},
		{what: "another file's bytes", receipt: good, key: release, file: []byte("tampered"), want: `the checksum of "kempt_darwin_arm64.tar.gz" does not match its receipt`},
		{what: "an upper-case checksum", receipt: []byte(strings.Replace(string(good), h, strings.ToUpper(h), 1)), key: release, file: file, want: `the checksum of "kempt_darwin_arm64.tar.gz" does not match its receipt`},
		{what: "an extra field", receipt: []byte(`{"tool":"kempt","version":"1.4.0","file":"` + name + `","sha256":"` + h + `","note":"x"}`), key: release, file: file, want: "the receipt is not in the expected form"},
		{what: "a field twice", receipt: []byte(`{"tool":"muster","tool":"kempt","version":"1.4.0","file":"` + name + `","sha256":"` + h + `"}`), key: release, file: file, want: "the receipt is not in the expected form"},
		{what: "a field missing", receipt: []byte(`{"tool":"kempt","version":"1.4.0","file":"` + name + `"}`), key: release, file: file, want: "the receipt is not in the expected form"},
		{what: "a field in another case", receipt: []byte(`{"Tool":"kempt","version":"1.4.0","file":"` + name + `","sha256":"` + h + `"}`), key: release, file: file, want: "the receipt is not in the expected form"},
		{what: "a value that is not a string", receipt: []byte(`{"tool":["kempt"],"version":"1.4.0","file":"` + name + `","sha256":"` + h + `"}`), key: release, file: file, want: "the receipt is not in the expected form"},
		{what: "data after the object", receipt: append(append([]byte{}, good...), `{"tool":"x"}`...), key: release, file: file, want: "the receipt is not in the expected form"},
		{what: "not an object", receipt: []byte(`["kempt"]`), key: release, file: file, want: "the receipt is not in the expected form"},
		{what: "not JSON", receipt: []byte("kempt 1.4.0"), key: release, file: file, want: "the receipt is not in the expected form"},
		{what: "empty", receipt: []byte{}, key: release, file: file, want: "the receipt is not in the expected form"},
	} {
		t.Run(c.what, func(t *testing.T) {
			sig := c.sig
			if sig == nil {
				sig = sign(c.key, c.receipt)
			}
			err := Check(c.receipt, sig, c.file, tool, version, name)
			if c.want == "" {
				if err != nil {
					t.Fatalf("refused: %v", err)
				}
				return
			}
			if err == nil || err.Error() != c.want {
				t.Fatalf("err = %v, want %q", err, c.want)
			}
		})
	}
}

// The signature is checked before the receipt is read: a receipt nobody
// trusted signed never has its text put in an error.
func TestAnUnsignedReceiptsTextIsNeverReported(t *testing.T) {
	testKeys(t)
	_, stranger, _ := ed25519.GenerateKey(nil)
	evil := receiptFor("\x1b[31mEVIL", "1.4.0", "f", nil)
	err := Check(evil, sign(stranger, evil), nil, "kempt", "1.4.0", "f")
	if err == nil || err.Error() != "the receipt's signature is not valid" {
		t.Fatalf("err = %v", err)
	}
}

func TestVerifyIsOverTheExactBytes(t *testing.T) {
	release, _ := testKeys(t)
	r := receiptFor("kempt", "1.4.0", "f", nil)
	sig := sign(release, r)
	if err := Verify(r, sig); err != nil {
		t.Fatal(err)
	}
	if err := Verify(r[:len(r)-1], sig); err == nil {
		t.Fatal("the receipt without its newline verified")
	}
}

// One receipt and signature made the way a release makes them (the bytes of
// go-release's printf, signed with an Ed25519 key and base64 with a trailing
// newline) verifies against that key in the DER form the constants use.
func TestAKeyInTheConstantsFormVerifies(t *testing.T) {
	const pub = "MCowBQYDK2VwAyEAI7xUkSwebpLEqGglyGfif/3FVb/71CRPF6Jqv//ull0="
	key := ed25519.NewKeyFromSeed([]byte("0123456789abcdef0123456789abcdef"))
	if !mustKey(pub).Equal(key.Public()) {
		t.Fatal("the fixture key does not match its seed")
	}
	r := receiptFor("kempt", "1.4.0", "f", nil)
	if err := (Keys{mustKey(pub)}).Verify(r, sign(key, r)); err != nil {
		t.Fatal(err)
	}
}

func TestOlder(t *testing.T) {
	for _, c := range []struct {
		candidate, installed string
		want                 bool
	}{
		{"1.3.9", "1.4.0", true},
		{"1.4.0", "1.4.0", false},
		{"1.4.1", "1.4.0", false},
		{"0.9.0", "0.10.0", true},
		{"0.10.0", "0.9.0", false},
		{"1.99.99", "2.0.0", true},
		{"1.4.0-rc.1", "1.4.0", true},
		{"1.4.0", "1.4.0-rc.1", false},
		{"1.4.0-rc.1", "1.4.0-rc.2", true},
		{"1.4.0-rc.10", "1.4.0-rc.9", false},
		{"1.4.0-rc.2", "1.4.0-rc.2", false},
		{"1.4.0-rc.1", "1.3.9", false},
		{"1.3.9", "1.4.0-rc.1", true},
		// A dev build, or anything else that is not a version, never blocks.
		{"1.4.0", "dev", false},
		{"1.4.0", "", false},
		{"1.4.0", "1.5", false},
		{"1.4.0", "1.5.0-beta.1", false},
		{"1.4.0", "v1.5.0", false},
		{"1.4.0", "1.5.0-rc.", false},
		{"1.4.0", "1.+5.0", false},
		{"latest", "1.5.0", false},
		{"1.4", "1.5.0", false},
	} {
		if got := Older(c.candidate, c.installed); got != c.want {
			t.Errorf("Older(%q, %q) = %v, want %v", c.candidate, c.installed, got, c.want)
		}
	}
}

// A real receipt and its signature, as published for kempt 0.119.3 by the
// release key in AWS KMS: the shipped constants verify it. If this fails, the
// release key constant is wrong and no installed tool could update.
func TestTheShippedReleaseKeyVerifiesAPublishedReceipt(t *testing.T) {
	receipt := []byte(`{"tool":"kempt","version":"0.119.3","file":"kempt_linux_amd64.tar.gz","sha256":"eb17bfa34241242837cedd42fe615f39610fb881296ac0e365dea3a647b33af8"}` + "\n")
	sig := []byte("zpywoOt9udgZUBnD4huz7ipnWwdYVHGqIlPLkxYEm2wW4INrXGMKuynrRzNq7BGsHqJy+DrrwBOCmJZi4xVPCQ==\n")
	if err := Verify(receipt, sig); err != nil {
		t.Fatal(err)
	}
	if err := (Keys{trusted[0]}).Verify(receipt, sig); err != nil {
		t.Fatal("the release key is not the first trusted key")
	}
	if err := (Keys{trusted[1]}).Verify(receipt, sig); err == nil {
		t.Fatal("the backup key verified a release's receipt")
	}
}
