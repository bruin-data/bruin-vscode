# Local panel performance checks

Requires Node.js 22+, the Bruin CLI, and VS Code. Run these commands from the repository root after installing the root and webview dependencies:

```sh
npm run compile
npm run build:webview
node tools/performance/generate-pipelines.cjs
code --extensions-dir .context/perf/extensions --install-extension redhat.vscode-yaml
node tools/performance/launch.cjs
```

The generator creates 100-, 500-, and 1,500-asset pipelines under `.context/perf`. Each is a layered DAG with 25 assets per layer, three upstream dependencies, and 20 columns per asset. It requires `bruin validate` to pass and saves validation logs alongside the fixtures. It does not execute SQL or require a warehouse. Pass sizes as positional arguments to generate other fixtures.

The launcher opens an isolated VS Code profile with this checkout's extension, the right panel, and lineage. You can open assets or `pipeline.yml` from the generated folders to test manually. After rebuilding, close this extension host and launch it again.

In another terminal, run:

```sh
node tools/performance/benchmark.cjs
node tools/performance/check-layout.cjs
node tools/performance/check-view-switches.cjs
```

The benchmark measures time from the file request to matching details and a visible graph with no loading overlay, main-thread tasks over 50 ms, mounted DOM counts, CLI calls, and message sizes. Pipeline DOM counts describe mounted nodes after viewport culling, not the total number of assets. Cold pipeline cases clear the parse cache; each case must switch the active file. JSON results and screenshots are saved under the performance directory.

The layout check covers panel resizing and manual pan/zoom. The switch check samples every animation frame and requires one visible geometry with no blank frames after reveal. Run it after a fresh launch to exercise uncached column loading. To test full-pipeline reveal and switching on the large fixture:

```sh
PERF_SIZE=1500 PERF_LABEL=large-switches \
  PERF_SWITCHES='["pipeline","direct","pipeline","direct",{"mode":"direct","via":"pipeline"}]' \
  node tools/performance/check-view-switches.cjs
```

| Variable | Purpose | Default |
| --- | --- | --- |
| `PERF_DIR` | Fixtures, isolated profile, logs, and results; use the same value for all scripts | `.context/perf` |
| `PERF_PORT` | Local DevTools port; use the same value for launcher and checks | `9333` |
| `CODE_BIN` | VS Code executable, not the CLI shell wrapper | macOS application executable |
| `BRUIN_BIN` | CLI used to validate generated fixtures | `bruin` |
| `PERF_LABEL` | Result filename prefix for benchmark or switch checks | Timestamp for benchmark; `view-switches` for switches |
| `PERF_CASES` | Benchmark cases as JSON, e.g. `[{"n":1500,"type":"pipeline"}]` | Asset and pipeline cases at all three sizes |
| `PERF_SIZE` | Fixture size for switch checks; use at least 75 assets for the expected neighborhood | `100` |
| `PERF_SWITCHES` | Switch cases as JSON; modes are `direct`, `all`, `pipeline`, and `column`; `via` interrupts a transition | Ten cases including interruption checks |
| `PERF_RECORD_ONLY` | Set to `1` to record switch geometry without assertions | Unset |
