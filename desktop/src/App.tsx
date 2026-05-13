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

export default function App() {
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
