package guide

import "testing"

// The Guide tab's data lists only installed tools, always with the tool
// you're in, core first, each with its public guide page where one exists.
func TestDataListsInstalledTools(t *testing.T) {
	installed := map[string]bool{"galley": true, "kempt": true, "sift": true}
	d, err := Data("diazo", func(name string) bool { return installed[name] })
	if err != nil {
		t.Fatal(err)
	}
	var got []string
	for _, x := range d.Tools {
		got = append(got, x.Name)
	}
	if want := []string{"diazo", "galley", "kempt", "sift"}; len(got) != len(want) || got[0] != want[0] || got[1] != want[1] || got[2] != want[2] || got[3] != want[3] {
		t.Fatalf("tools %v, want %v", got, want)
	}
	if d.Tool != "diazo" || d.Family != "https://subaud.tools" || d.Fit == "" {
		t.Fatalf("%+v", d)
	}
	if d.Tools[1].Guide != "https://galley.tools/guide/" || d.Tools[0].Guide != "" {
		t.Errorf("guide pages: %q %q", d.Tools[1].Guide, d.Tools[0].Guide)
	}
	if !d.Tools[0].Core || d.Tools[3].Core || len(d.Tools[0].Asks) == 0 || d.Tools[0].Pointers == "" {
		t.Errorf("sections: %+v", d.Tools)
	}
	if d, _ := Data("not-a-tool", func(string) bool { return false }); len(d.Tools) != 0 || d.Tool != "" {
		t.Errorf("an unknown tool: %+v", d)
	}
}
