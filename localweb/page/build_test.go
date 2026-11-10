package page

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// The files a tool's build copies from build/ are tested in a scratch page
// tool, testdata/buildtool: copied into its build/ as a tool's build copies
// them, its packages installed with npm ci, then its eslint config (the base,
// imported by a relative path) and its probe (on the scaffolding) are run.
// Its record bundle (record-bundle.mjs) builds the demo's record entry with the
// kit inlined, and the file written from it opens from disk in headless Chrome.
// It needs node and the network, so it runs with the JS suites: only when
// KIT_BROWSER is set (just verify-slow, CI's browser job), and with
// KIT_BROWSER=required a missing npm fails.

func buildTool(t *testing.T) string {
	t.Helper()
	if os.Getenv("KIT_BROWSER") == "" {
		t.Skip("set KIT_BROWSER to test build/ in a scratch tool (needs npm and the network)")
	}
	if _, err := exec.LookPath("npm"); err != nil {
		if os.Getenv("KIT_BROWSER") == "required" {
			t.Fatal("KIT_BROWSER=required but no npm found")
		}
		t.Skip("no npm")
	}
	dir := filepath.Join(t.TempDir(), "tool")
	if err := os.CopyFS(dir, os.DirFS("testdata/buildtool")); err != nil {
		t.Fatal(err)
	}
	// The files a tool without diagrams copies (mermaid-entry.ts is for one
	// that builds a mermaid bundle), with record-bundle.mjs.
	if err := os.MkdirAll(filepath.Join(dir, "build"), 0o755); err != nil {
		t.Fatal(err)
	}
	for _, f := range []string{"eslint.base.mjs", "probe.mjs", "record-bundle.mjs"} {
		b, err := os.ReadFile(filepath.Join("build", f))
		if err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(dir, "build", f), b, 0o644); err != nil {
			t.Fatal(err)
		}
	}
	if out, err := runIn(t, dir, nil, "npm", "ci", "--no-audit", "--no-fund", "--ignore-scripts"); err != nil {
		t.Fatalf("npm ci: %v\n%s", err, out)
	}
	return dir
}

// runIn runs a command in dir with env added to the test's own, KIT_BROWSER
// removed so each run says what it wants.
func runIn(t *testing.T, dir string, env []string, name string, args ...string) (string, error) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Dir = dir
	for _, kv := range os.Environ() {
		if !strings.HasPrefix(kv, "KIT_BROWSER=") {
			cmd.Env = append(cmd.Env, kv)
		}
	}
	cmd.Env = append(cmd.Env, env...)
	out, err := cmd.CombinedOutput()
	return string(out), err
}

func exitCode(err error) int {
	if err == nil {
		return 0
	}
	if e := (*exec.ExitError)(nil); errors.As(err, &e) {
		return e.ExitCode()
	}
	return -1
}

func TestBuildFilesInAScratchTool(t *testing.T) {
	dir := buildTool(t)

	t.Run("eslint passes with the base", func(t *testing.T) {
		if out, err := runIn(t, dir, nil, "npx", "eslint", ".", "--max-warnings", "0"); err != nil {
			t.Fatalf("eslint: %v\n%s", err, out)
		}
	})

	t.Run("eslint fails on a defect", func(t *testing.T) {
		bad := filepath.Join(dir, "bad.mjs")
		if err := os.WriteFile(bad, []byte("let x = 0;\nif ((x = 1)) console.log(x);\n"), 0o644); err != nil {
			t.Fatal(err)
		}
		defer func() { _ = os.Remove(bad) }()
		out, err := runIn(t, dir, nil, "npx", "eslint", ".", "--max-warnings", "0")
		if exitCode(err) != 1 || !strings.Contains(out, "no-cond-assign") {
			t.Fatalf("eslint on a defect: %v, want exit 1 naming no-cond-assign\n%s", err, out)
		}
	})

	// What casebook and galley differ in: the test-file count, no default
	// project at all, and no ambient globals.
	t.Run("the base's options", func(t *testing.T) {
		const script = `import base from './build/eslint.base.mjs';
const ts = (c) => c.find((b) => b.languageOptions?.parserOptions);
const cb = ts(base({ root: '/r', maxTestFiles: 24, ambientGlobals: false, ignores: ['x.js'] }));
const g = ts(base({ root: '/r', testFiles: [] }));
console.log(JSON.stringify([
  cb.languageOptions.parserOptions,
  cb.rules['no-undef'],
  g.languageOptions.parserOptions.projectService,
  g.rules['no-undef'],
  base({ root: '/r', ignores: ['x.js'] })[0].ignores,
]));
try { base(); } catch (e) { console.log(e.message); }
try { base({ root: '/r', testFiles: [], maxTestFiles: 24 }); } catch (e) { console.log(e.message); }`
		out, err := runIn(t, dir, nil, "node", "--input-type=module", "-e", script)
		if err != nil {
			t.Fatalf("node: %v\n%s", err, out)
		}
		want := `[{"projectService":{"allowDefaultProject":["*.test.ts"],"maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING":24},"tsconfigRootDir":"/r"},"error",true,"off",["node_modules/","x.js"]]` + "\n" +
			"eslint.base.mjs: pass root: import.meta.dirname\n" +
			"eslint.base.mjs: maxTestFiles caps how many files match testFiles, and testFiles is []\n"
		if out != want {
			t.Fatalf("got\n%s\nwant\n%s", out, want)
		}
	})

	// No chromium: playwright-core looks only in an empty browsers folder.
	none := []string{"PLAYWRIGHT_BROWSERS_PATH=" + t.TempDir()}

	t.Run("probe skips with no chromium", func(t *testing.T) {
		out, err := runIn(t, dir, none, "node", "probe.mjs")
		if err != nil || !strings.Contains(out, "probe: no chromium; skipped") || !strings.Contains(out, "probe: 10 passed, 0 failed") {
			t.Fatalf("probe: %v, want exit 0, skipped, 10 passed\n%s", err, out)
		}
		if !strings.Contains(out, "✓ cleanups ran in the order added") {
			t.Fatalf("the after hook did not check the cleanup order\n%s", out)
		}
	})

	t.Run("probe fails with no chromium under KIT_BROWSER=required", func(t *testing.T) {
		out, err := runIn(t, dir, append(none, "KIT_BROWSER=required"), "node", "probe.mjs")
		if exitCode(err) != 1 || !strings.Contains(out, "probe: no chromium, and one is required") || !strings.Contains(out, "1 failed") {
			t.Fatalf("probe: %v, want exit 1 saying a chromium is required\n%s", err, out)
		}
	})

	// casebook's rule: CI requires a browser too, passed as required.
	t.Run("probe fails with no chromium when the tool requires one", func(t *testing.T) {
		out, err := runIn(t, dir, append(none, "SCRATCH_CI=1"), "node", "probe.mjs")
		if exitCode(err) != 1 || !strings.Contains(out, "probe: no chromium, and one is required") {
			t.Fatalf("probe: %v, want exit 1 saying a chromium is required\n%s", err, out)
		}
	})

	// casebook's floor: the after hook adds a failure the exit code carries.
	t.Run("the after hook can fail a run", func(t *testing.T) {
		out, err := runIn(t, dir, append(none, "PROBE_MIN_CHECKS=999"), "node", "probe.mjs")
		if exitCode(err) != 1 || !strings.Contains(out, "✗ at least 999 checks passed — 10") || !strings.Contains(out, "probe: 10 passed, 1 failed") {
			t.Fatalf("probe: %v, want exit 1 with the floor failed\n%s", err, out)
		}
	})

	// With a chromium on the default path: the browser closes before the
	// serve fixture stops. Skipped where playwright has none installed.
	t.Run("probe with chromium", func(t *testing.T) {
		out, err := runIn(t, dir, nil, "node", "probe.mjs")
		if strings.Contains(out, "probe: no chromium; skipped") {
			t.Skip("no chromium on playwright's default path")
		}
		if err != nil || !strings.Contains(out, "✓ a page draws in chromium") || !strings.Contains(out, "✓ cleanups ran in the order added") || !strings.Contains(out, "0 failed") {
			t.Fatalf("probe: %v\n%s", err, out)
		}
	})
}

// recordData is what the record file carries: not the demo page's own data,
// so the page drawn says it read the file.
const recordData = `{"title":"read from the file","summary":"F2 came from disk.","cards":[{"id":"F2","state":"decided","question":"Should galley pin its Node version?","example":"Cold installs: **14 minutes**.","options":[{"id":"A","title":"Pin Node 22","pullsIn":"One file.","recommended":true,"chosen":true}],"since":[{"at":"2026-11-05","text":"Merged </script> safely"}],"recommendation":{"option":"A","why":"Saves time."},"calls":[{"name":"Which version","took":"Node 22","instead":"Node 20","why":"Last green run.","reversed":true}],"messages":[{"id":1,"from":"user","at":"2026-11-02T10:00:00Z","text":"Why 22?"}]}]}`

// TestRecordFileFromDisk builds the demo's record entry with record-bundle.mjs
// in the scratch tool, writes one HTML file with the bundle and the data
// inlined, as a tool does, and opens it from disk: no server, no /_kit/.
func TestRecordFileFromDisk(t *testing.T) {
	dir := buildTool(t)
	assets, err := filepath.Abs("assets")
	if err != nil {
		t.Fatal(err)
	}
	entry, err := filepath.Abs(filepath.Join("demo", "record-entry.js"))
	if err != nil {
		t.Fatal(err)
	}
	const script = `import { recordBundle } from './build/record-bundle.mjs';
const [entry, kitDir] = process.argv.slice(1);
const out = await recordBundle({ entry, outdir: 'out', kitDir });
console.log(JSON.stringify(out));`
	if out, err := runIn(t, dir, nil, "node", "--input-type=module", "-e", script, entry, assets); err != nil {
		t.Fatalf("record-bundle.mjs: %v\n%s", err, out)
	}
	js, err := os.ReadFile(filepath.Join(dir, "out", "record.js"))
	if err != nil {
		t.Fatal(err)
	}
	css, err := os.ReadFile(filepath.Join(dir, "out", "record.css"))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(js), "/_kit/") {
		t.Fatal("record.js still loads from /_kit/; the kit should be inlined")
	}
	if !strings.Contains(string(css), ".kit-rec-tab") || !strings.Contains(string(css), "--kit-bg") {
		t.Fatal("record.css lacks the kit's stylesheet")
	}
	inline := strings.NewReplacer("</script", `<\/script`)
	page := "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><title>record</title><style>" + string(css) + "</style></head><body>" +
		"<div class=\"kit-page\" id=\"app\"></div>" +
		"<script>addEventListener('error', e => { document.body.dataset.err = String(e.message); });</script>" +
		"<script type=\"application/json\" id=\"kit-record\">" + strings.ReplaceAll(recordData, "<", `\u003c`) + "</script>" +
		"<script type=\"module\">" + inline.Replace(string(js)) + "</script></body></html>\n"
	file := filepath.Join(dir, "record.html")
	if err := os.WriteFile(file, []byte(page), 0o644); err != nil {
		t.Fatal(err)
	}
	dom, err := dumpDOM(t, "file://"+file)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{`data-ok="1"`, "read from the file", `class="kit-rec-tab`, "Should galley pin its Node version?", "Merged &lt;/script&gt; safely", "Why 22?", ">reversed<"} {
		if !strings.Contains(dom, want) {
			t.Errorf("the record file from disk lacks %q", want)
		}
	}
	if strings.Contains(dom, "data-err=") {
		t.Errorf("the record file threw:\n%s", dom)
	}
}
