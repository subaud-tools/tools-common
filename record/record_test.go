package record

import (
	"fmt"
	"sync"
	"testing"
)

// home points the shared state dir at a fresh temp dir.
func home(t *testing.T) {
	t.Setenv("SUBAUD_HOME", t.TempDir())
}

func TestMarkIsReadBack(t *testing.T) {
	home(t)
	if err := MarkLesson("3-plan-a-change"); err != nil {
		t.Fatal(err)
	}
	if err := MarkTool("diazo"); err != nil {
		t.Fatal(err)
	}
	if err := MarkFeature("diazo.calls"); err != nil {
		t.Fatal(err)
	}
	r, err := Read()
	if err != nil {
		t.Fatal(err)
	}
	for kind, m := range map[string]map[string]Mark{"lesson": r.Lessons, "tool": r.Tools, "feature": r.Features} {
		if len(m) != 1 {
			t.Errorf("%s: got %v, want one mark", kind, m)
		}
		for name, mk := range m {
			if mk.Date.IsZero() {
				t.Errorf("%s %s has no date", kind, name)
			}
		}
	}
	if !r.HasLesson("3-plan-a-change") || !r.HasTool("diazo") || !r.HasFeature("diazo.calls") {
		t.Errorf("marks not read back: %+v", r)
	}
}

func TestConcurrentMarksBothLand(t *testing.T) {
	home(t)
	const n = 20
	var wg sync.WaitGroup
	errs := make(chan error, n)
	for i := range n {
		wg.Add(1)
		go func() {
			defer wg.Done()
			errs <- MarkTool(fmt.Sprintf("tool-%d", i))
		}()
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
	r, err := Read()
	if err != nil {
		t.Fatal(err)
	}
	if len(r.Tools) != n {
		t.Fatalf("got %d tools, want %d: %v", len(r.Tools), n, r.Tools)
	}
}

func TestMissingFileReadsEmpty(t *testing.T) {
	home(t)
	r, err := Read()
	if err != nil {
		t.Fatal(err)
	}
	if len(r.Lessons)+len(r.Tools)+len(r.Features) != 0 || r.HasTool("diazo") {
		t.Fatalf("want empty, got %+v", r)
	}
}
