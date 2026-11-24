package tools

import "testing"

func TestCastNames(t *testing.T) {
	if CastName != "cast" || CastSocketPrefix != "cast-" || LegacySocketPrefix != "proj-" || CastSettingsDir != "cast" {
		t.Fatalf("names: %q %q %q %q", CastName, CastSocketPrefix, LegacySocketPrefix, CastSettingsDir)
	}
}

func TestCastSocketProject(t *testing.T) {
	for _, c := range []struct {
		in      string
		project string
		ok      bool
	}{
		{"cast-tools-common", "tools-common", true},
		{"proj-tools-common", "tools-common", true},
		{"/private/tmp/tmux-501/cast-foo", "foo", true},
		{"/private/tmp/tmux-501/proj-foo", "foo", true},
		{"default", "", false},
		{"cast-", "", false},
		{"proj-", "", false},
		{"forecast-x", "", false},
		{"", "", false},
	} {
		p, ok := CastSocketProject(c.in)
		if p != c.project || ok != c.ok {
			t.Errorf("CastSocketProject(%q) = %q, %v; want %q, %v", c.in, p, ok, c.project, c.ok)
		}
	}
}
