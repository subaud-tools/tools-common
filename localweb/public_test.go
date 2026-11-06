package localweb

import "testing"

func TestPublicDomainIsUnsetByDefault(t *testing.T) {
	t.Setenv(PublicDomainEnv, "")
	if d := PublicDomain(); d != "" {
		t.Fatalf("PublicDomain() = %q with the setting unset", d)
	}
	if o := PublicOrigin("diazo"); o != "" {
		t.Fatalf("PublicOrigin() = %q with the setting unset", o)
	}
}

func TestPublicDomainTakesOnlyADomain(t *testing.T) {
	for _, tc := range []struct{ in, want string }{
		{"tools.subaud.dev", "tools.subaud.dev"},
		{" Tools.Subaud.DEV\n", "tools.subaud.dev"},
		{"tools.subaud.dev:443", ""},
		{"https://tools.dev", ""},
		{"tools/subaud.dev", ""},
		{".subaud.dev", ""},
		{"tools..dev", ""},
		{"-tools.dev", ""},
		{"tools.dev.", ""},
		{"*.tools.dev", ""},
	} {
		in, want := tc.in, tc.want
		t.Setenv(PublicDomainEnv, in)
		if got := PublicDomain(); got != want {
			t.Errorf("PublicDomain() with %q = %q, want %q", in, got, want)
		}
	}
}

func TestPublicOriginIsTheToolsHostOnTheDomain(t *testing.T) {
	t.Setenv(PublicDomainEnv, "tools.subaud.dev")
	if got := PublicOrigin("diazo"); got != "https://diazo.tools.subaud.dev" {
		t.Fatalf("PublicOrigin(diazo) = %q", got)
	}
	for _, tool := range []string{"", "a.b", "a/b", "Diazo", "-x"} {
		if got := PublicOrigin(tool); got != "" {
			t.Errorf("PublicOrigin(%q) = %q, want none", tool, got)
		}
	}
}

func TestPublicToolAcceptsOnlyOneLabelOnTheDomain(t *testing.T) {
	t.Setenv(PublicDomainEnv, "tools.subaud.dev")
	if tool, ok := PublicTool("https://diazo.tools.subaud.dev/plan/x?f=1#a"); !ok || tool != "diazo" {
		t.Fatalf("PublicTool = %q %v, want diazo", tool, ok)
	}
	if tool, ok := PublicTool("https://proj.tools.subaud.dev"); !ok || tool != "proj" {
		t.Fatalf("PublicTool = %q %v, want proj", tool, ok)
	}
	for _, addr := range []string{
		"http://diazo.tools.subaud.dev/",
		"https://diazo.tools.subaud.dev:443/",
		"https://diazo.tools.subaud.dev:8443/",
		"https://a.diazo.tools.subaud.dev/",
		"https://tools.subaud.dev/",
		"https://diazo.xtools.subaud.dev/",
		"https://diazo.tools.subaud.dev.evil.com/",
		"https://diazo.other.subaud.dev/",
		"https://user@diazo.tools.subaud.dev/",
		"https://-x.tools.subaud.dev/",
		"http://127.0.0.1:4001/",
		"javascript:alert(1)",
	} {
		if tool, ok := PublicTool(addr); ok {
			t.Errorf("PublicTool(%q) = %q, want refused", addr, tool)
		}
	}
	t.Setenv(PublicDomainEnv, "")
	if _, ok := PublicTool("https://diazo.tools.subaud.dev/"); ok {
		t.Fatal("PublicTool accepted a public address with the setting unset")
	}
}

// With PAGE_PUBLIC_HOME naming a tool, that tool's page is the domain itself;
// every other tool keeps its own host.
func TestTheHomeToolIsTheBareDomain(t *testing.T) {
	t.Setenv(PublicDomainEnv, "tools.subaud.dev")
	t.Setenv(PublicHomeEnv, "diazo")
	if got := PublicOrigin("diazo"); got != "https://tools.subaud.dev" {
		t.Fatalf("PublicOrigin(diazo) = %q, want the bare domain", got)
	}
	if got := PublicOrigin("proj"); got != "https://proj.tools.subaud.dev" {
		t.Fatalf("PublicOrigin(proj) = %q", got)
	}
	if tool, ok := PublicTool("https://tools.subaud.dev/plan/x?f=1"); !ok || tool != "diazo" {
		t.Fatalf("PublicTool(bare) = %q %v, want diazo", tool, ok)
	}
	if tool, ok := PublicTool("https://proj.tools.subaud.dev/term"); !ok || tool != "proj" {
		t.Fatalf("PublicTool(proj) = %q %v, want proj", tool, ok)
	}
	for _, addr := range []string{"http://tools.subaud.dev/", "https://tools.subaud.dev:8443/", "https://u@tools.subaud.dev/", "https://xtools.subaud.dev/"} {
		if tool, ok := PublicTool(addr); ok {
			t.Errorf("PublicTool(%q) = %q, want refused", addr, tool)
		}
	}
}

// Without both settings, or with a home that is not one DNS label, the bare
// domain is nobody's page.
func TestTheHomeNeedsBothSettings(t *testing.T) {
	for _, tc := range []struct{ domain, home string }{
		{"", "diazo"},
		{"tools.subaud.dev", ""},
		{"tools.subaud.dev", "a.b"},
	} {
		t.Setenv(PublicDomainEnv, tc.domain)
		t.Setenv(PublicHomeEnv, tc.home)
		if tc.domain != "" {
			if got := PublicOrigin("diazo"); got != "https://diazo.tools.subaud.dev" {
				t.Errorf("%+v: PublicOrigin(diazo) = %q", tc, got)
			}
		}
		if tool, ok := PublicTool("https://tools.subaud.dev/"); ok {
			t.Errorf("%+v: PublicTool(bare) = %q, want refused", tc, tool)
		}
	}
}
