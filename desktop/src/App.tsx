import { useState } from 'react'
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  linkPlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'

const SAMPLE_MARKDOWN = `# Hugowriter

Markdown editor for **Hugo** writing, built on *MDXEditor* and shipped as a desktop app.

## What it does

It renders [Hugo-aware](https://gohugo.io) markdown with the editor running inline.

> Personal tool first. Dogfooded for 30 days before any wider release.

### Why a desktop wrapper

- Native window, no browser chrome.
- Direct file system access via Tauri.
- Sidecar Hugo for live preview.

\`\`\`go
package main

import "fmt"

func main() {
    fmt.Println("Hello, Hugowriter")
}
\`\`\`

End of placeholder content.
`

type Mode = 'mode1' | 'mode2' | 'mode3'

const MODES: Array<{ id: Mode; label: string }> = [
  { id: 'mode1', label: 'Mode 1 — Theme inline' },
  { id: 'mode2', label: 'Mode 2 — Hugo preview' },
  { id: 'mode3', label: 'Mode 3 — Inline Hugo render' },
]

function EditorBody() {
  return (
    <div className="editor-body">
      <MDXEditor
        markdown={SAMPLE_MARKDOWN}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          linkPlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: 'go' }),
          codeMirrorPlugin({ codeBlockLanguages: { go: 'Go', js: 'JavaScript' } }),
        ]}
      />
    </div>
  )
}

export default function App() {
  const [mode, setMode] = useState<Mode>('mode1')

  return (
    <>
      <div className="mode-toolbar" role="toolbar" aria-label="View mode">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={mode === m.id ? 'active' : ''}
            aria-pressed={mode === m.id}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode === 'mode3' ? (
        // TODO: webview parity test
        <div className="mode3-placeholder">
          Mode 3 — coming soon, revisit at 30-day dogfood checkpoint
        </div>
      ) : (
        <EditorBody />
      )}
    </>
  )
}
