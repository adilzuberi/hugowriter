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
  frontmatterPlugin,
  toolbarPlugin,
  KitchenSinkToolbar,
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'

type Props = {
  filePath: string
  content: string
  onChange: (markdown: string) => void
}

export function Editor({ filePath, content, onChange }: Props) {
  return (
    <MDXEditor
      key={filePath}
      markdown={content}
      onChange={onChange}
      plugins={[
        toolbarPlugin({ toolbarContents: () => <KitchenSinkToolbar /> }),
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        linkPlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
        codeMirrorPlugin({
          codeBlockLanguages: { '': 'Plain text', go: 'Go', js: 'JavaScript', ts: 'TypeScript', sh: 'Shell' },
        }),
        frontmatterPlugin(),
      ]}
    />
  )
}
