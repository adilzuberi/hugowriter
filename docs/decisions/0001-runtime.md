# ADR 0001 — Tauri as the desktop runtime

Status: accepted
Date: 2026-05-13

## Context

Hugowriter is a Hugo-themed markdown editor, forked from `mdx-editor/editor`. It needs a desktop shell to spawn the user's `hugo` binary as a sidecar, render the React frontend, and ship as a small signed app on macOS first.

The two candidate runtimes were Tauri 2.x and Electron. The full trade-off memo lives at `docs/decisions/0001-runtime-tradeoff.md` in the project notes vault.

## Decision

Hugowriter ships on Tauri 2.x. The choice trades larger compile time and three-engine webview variance for a ~10 MB signed binary, ~30–80 MB idle RAM, a first-class sidecar config for the user's `hugo` binary, and a smaller telemetry surface to lock down for the no-network-calls rule. Project frame is personal-tool-first: I dogfood Hugowriter on my own Hugo writing for 30 days before deciding on an OSS release, a commercial release, or staying personal. v0 ships Modes 1 and 2 of the view-mode switcher (Shadow DOM theme injection; iframe Hugo preview) working end-to-end; Mode 3 (inline Hugo render with editable HTML, Lexical on `contentEditable`) ships as a stubbed toggle, deferred to a later PR after the 30-day checkpoint. CI runs macOS only for v0; Linux and Windows jobs are re-enabled if the 30-day checkpoint pushes toward an OSS release. The runtime decision is revisited if a reproducible Lexical bug on WKWebView blocks Mode 3 without a workaround.

## Consequences

- Rust toolchain is now a prerequisite for desktop work.
- Webview parity between WKWebView, WebKitGTK, and WebView2 is on me to verify once cross-platform CI re-enables.
- Sidecar shipping for the `hugo` binary is straightforward via `tauri-plugin-shell` and the sidecar config block in `tauri.conf.json`.
- No telemetry, no auto-update, no crash reporter in v0. Each is its own decision when the time comes.
