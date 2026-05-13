import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const fsMock = vi.hoisted(() => ({
  exists: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  readDir: vi.fn(),
  mkdir: vi.fn(),
}))

const dialogMock = vi.hoisted(() => ({
  open: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-fs', () => ({
  ...fsMock,
  BaseDirectory: { AppData: 1 },
}))

vi.mock('@tauri-apps/plugin-dialog', () => dialogMock)

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    setTitle: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn().mockResolvedValue('0.1.0-alpha.6-test'),
}))

vi.mock('./components/Editor', () => ({
  Editor: ({
    content,
    onChange,
  }: {
    filePath: string
    content: string
    onChange: (m: string) => void
  }) => (
    <textarea
      data-testid="editor-textarea"
      value={content}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

import App from './App'

function entry(name: string, isDirectory: boolean) {
  return { name, isDirectory, isFile: !isDirectory, isSymlink: false }
}

const FIXTURES: Record<string, ReturnType<typeof entry>[]> = {
  '/site/content': [
    entry('posts', true),
    entry('.git', true),
    entry('index.md', false),
    entry('notes.txt', false),
  ],
  '/site/content/posts': [entry('hello.md', false), entry('world.mdx', false)],
  '/site/content/.git': [entry('HEAD', false)],
}

const FILE_CONTENT: Record<string, string> = {
  '/site/content/index.md': '# Index\n\nHome page.',
  '/site/content/posts/hello.md': '# Hello world\n\nFirst post.',
  '/site/content/posts/world.mdx': '# World post\n\nSecond.',
}

beforeEach(() => {
  fsMock.readDir.mockReset()
  fsMock.readTextFile.mockReset()
  fsMock.writeTextFile.mockReset()
  fsMock.exists.mockReset()
  fsMock.mkdir.mockReset()
  dialogMock.open.mockReset()

  fsMock.exists.mockResolvedValue(false)
  fsMock.readTextFile.mockImplementation((path: string) =>
    Promise.resolve(FILE_CONTENT[path] ?? ''),
  )
  fsMock.writeTextFile.mockResolvedValue(undefined)
  fsMock.readDir.mockImplementation((path: string) =>
    Promise.resolve(FIXTURES[path] ?? []),
  )
  fsMock.mkdir.mockResolvedValue(undefined)
  dialogMock.open.mockResolvedValue(null)
})

describe('App — chrome', () => {
  it('renders the Choose folder CTA when no folder is set', async () => {
    render(<App />)
    expect(
      await screen.findByRole('button', { name: /Choose folder/i }),
    ).toBeInTheDocument()
  })

  it('renders all three mode-toggle buttons', async () => {
    render(<App />)
    expect(
      await screen.findByRole('button', { name: /Mode 1 — Theme inline/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Mode 2 — Hugo preview/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Mode 3 — Inline Hugo render/ }),
    ).toBeInTheDocument()
  })

  it('reveals the Mode 3 placeholder when Mode 3 is clicked after picking a folder', async () => {
    dialogMock.open.mockResolvedValueOnce('/site/content')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /Choose folder/i }))
    fireEvent.click(
      await screen.findByRole('button', { name: /Mode 3 — Inline Hugo render/ }),
    )
    expect(
      await screen.findByText(
        'Mode 3 — coming soon, revisit at 30-day dogfood checkpoint',
      ),
    ).toBeInTheDocument()
  })
})

describe('integration: open / edit / save / reopen round-trip', () => {
  it('renders the file tree filtered to .md and .mdx after picking a folder', async () => {
    dialogMock.open.mockResolvedValueOnce('/site/content')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /Choose folder/i }))
    expect(await screen.findByRole('button', { name: /index\.md/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /posts/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /\.git/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /notes\.txt/ })).not.toBeInTheDocument()
  })

  it('clicking a markdown file loads its content into the editor', async () => {
    dialogMock.open.mockResolvedValueOnce('/site/content')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /Choose folder/i }))
    fireEvent.click(await screen.findByRole('button', { name: /index\.md/ }))
    const textarea = await screen.findByTestId('editor-textarea')
    await waitFor(() => expect(textarea).toHaveValue('# Index\n\nHome page.'))
    expect(fsMock.readTextFile).toHaveBeenCalledWith('/site/content/index.md')
  })

  it('typing flips dirty; Cmd+S writes to disk and clears the dot', async () => {
    dialogMock.open.mockResolvedValueOnce('/site/content')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /Choose folder/i }))
    fireEvent.click(await screen.findByRole('button', { name: /index\.md/ }))
    const textarea = await screen.findByTestId('editor-textarea')
    await waitFor(() => expect(textarea).toHaveValue('# Index\n\nHome page.'))

    fireEvent.change(textarea, { target: { value: '# Index edited\n' } })
    expect(await screen.findByLabelText('Unsaved changes')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 's', metaKey: true })
    await waitFor(() =>
      expect(fsMock.writeTextFile).toHaveBeenCalledWith(
        '/site/content/index.md',
        '# Index edited\n',
      ),
    )
    await waitFor(() =>
      expect(screen.queryByLabelText('Unsaved changes')).not.toBeInTheDocument(),
    )
  })

  it('switching files while dirty auto-saves the previous file silently', async () => {
    dialogMock.open.mockResolvedValueOnce('/site/content')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /Choose folder/i }))
    fireEvent.click(await screen.findByRole('button', { name: /index\.md/ }))
    const textarea = await screen.findByTestId('editor-textarea')
    await waitFor(() => expect(textarea).toHaveValue('# Index\n\nHome page.'))

    fireEvent.change(textarea, { target: { value: '# Index modified\n' } })

    fireEvent.click(screen.getByRole('button', { name: /posts/ }))
    fireEvent.click(await screen.findByRole('button', { name: /hello\.md/ }))

    await waitFor(() =>
      expect(fsMock.writeTextFile).toHaveBeenCalledWith(
        '/site/content/index.md',
        '# Index modified\n',
      ),
    )
    await waitFor(() =>
      expect(screen.getByTestId('editor-textarea')).toHaveValue(
        '# Hello world\n\nFirst post.',
      ),
    )
  })

  it('reopens last folder and last file on subsequent launch', async () => {
    // Persisted state from a prior session.
    fsMock.exists.mockResolvedValueOnce(true)
    fsMock.readTextFile.mockImplementationOnce((path: string) => {
      if (path === 'state.json') {
        return Promise.resolve(
          JSON.stringify({
            lastFolder: '/site/content',
            lastFile: '/site/content/index.md',
            expandedDirs: [],
          }),
        )
      }
      return Promise.resolve(FILE_CONTENT[path] ?? '')
    })

    render(<App />)
    const textarea = await screen.findByTestId('editor-textarea')
    await waitFor(() => expect(textarea).toHaveValue('# Index\n\nHome page.'))
    expect(fsMock.readTextFile).toHaveBeenCalledWith('/site/content/index.md')
  })
})
