# Hugowriter desktop

The Tauri 2.x host wrapping the MDXEditor frontend for Hugowriter. v0 ships a render-only window with placeholder markdown and a three-mode toolbar toggle (Mode 3 stubbed).

See the ADR at `docs/decisions/0001-runtime.md` at the repo root for the runtime choice.

## WebView prerequisites

- macOS 11+ (WKWebView ships with the OS).
- Linux: WebKitGTK 4.1+ (`libwebkit2gtk-4.1-dev`). Cross-platform CI is deferred to the 30-day dogfood checkpoint.
- Windows 10+ with the WebView2 Runtime. Also deferred.

## Run locally

From the repo root:

```bash
pnpm install
pnpm --filter ./desktop tauri dev
```

The first `tauri dev` build compiles the Rust crate (a few minutes on a cold cache), then the window opens at 1200x800 with the placeholder markdown loaded.

## Build the app bundle

```bash
pnpm --filter ./desktop tauri build
```

The bundle config currently has `bundle.active: false` — flip it on once signing keys land in a later PR. No notarisation, no auto-update, no telemetry in v0.

## Test

```bash
pnpm --filter ./desktop test                 # Vitest, three assertions
cargo test --manifest-path src-tauri/Cargo.toml   # Rust placeholder test
```

## Package layout

- `src/` — React frontend (Vite, port 5180).
- `src-tauri/` — Rust host (Tauri 2.x).
- `src-tauri/capabilities/default.json` — main-window capability set.
- `src-tauri/tauri.conf.json` — window config (1200x800, CSP locked to `'self'`).

## Mode toolbar

- Mode 1 — Theme inline. Theme picker lists themes/ and Hugo Modules (PR 4).
- Mode 2 — Hugo preview. Iframe at `127.0.0.1:51313` driven by `hugo server` via `tauri-plugin-shell` (PR 5).
- Mode 3 — Inline Hugo render. Stubbed — revisited at the 30-day dogfood checkpoint.

## Site settings panel

The toolbar ⚙ button opens a right-side panel that reads the merged Hugo config
via `hugo config --format json`, lets you edit site metadata + theme settings
(preset, base font-size, accent colour), and writes dirty fields back through
`toml_edit` while preserving comments and key order. After a save the panel
touches `<site>/.hugowriter-sentinel` so Mode 2's Hugo server picks up the
change. Requires `hugo` on PATH — the bundled-sidecar binary lands in a
follow-up.
