# Hugowriter desktop

The Tauri 2.x host wrapping the MDXEditor frontend for Hugowriter. v0 ships a render-only window with placeholder markdown and a three-mode toolbar toggle (Mode 3 stubbed).

See the ADR at `docs/decisions/0001-runtime.md` at the repo root for the runtime choice.

## Boot screenshot

`docs/screenshots/scaffold-boot.png` — captured manually after `pnpm --filter ./desktop tauri dev` brings up the window. CLI agents can't grab the screen, so the file is dropped in by hand.

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

- Mode 1 — Theme inline (Shadow DOM theme injection, deferred to PR 4).
- Mode 2 — Hugo preview (iframe Hugo sidecar, deferred to PR 5).
- Mode 3 — Inline Hugo render (Lexical on `contentEditable`, deferred to PR 6+, revisited at the 30-day dogfood checkpoint).

Modes 1 and 2 currently render the same placeholder body. Mode 3 renders only its placeholder text.
