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

vi.mock('./Editor', () => ({
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

import App from '../App'

function entry(name: string, isDirectory: boolean) {
  return { name, isDirectory, isFile: !isDirectory, isSymlink: false }
}

const TREE: Record<string, ReturnType<typeof entry>[]> = {
  '/site/content': [entry('post.md', false)],
  '/site/themes': [entry('legacy-paper', true)],
}

const SITE_FILES: Record<string, string> = {
  '/site/go.mod':
    'module github.com/foo/site\n\ngo 1.22\n\nrequire github.com/foo/foo-hugo-theme v0.0.1\n',
  '/site/content/post.md': '# Hello\n',
}

const EXISTS = new Set<string>([
  '/site/hugo.toml',
  '/site/themes',
  '/site/go.mod',
])

beforeEach(() => {
  fsMock.readDir.mockReset()
  fsMock.readTextFile.mockReset()
  fsMock.writeTextFile.mockReset()
  fsMock.exists.mockReset()
  fsMock.mkdir.mockReset()
  dialogMock.open.mockReset()

  fsMock.exists.mockImplementation((path: string) => Promise.resolve(EXISTS.has(path)))
  fsMock.readTextFile.mockImplementation((path: string) =>
    Promise.resolve(SITE_FILES[path] ?? ''),
  )
  fsMock.writeTextFile.mockResolvedValue(undefined)
  fsMock.readDir.mockImplementation((path: string) =>
    Promise.resolve(TREE[path] ?? []),
  )
  fsMock.mkdir.mockResolvedValue(undefined)
  dialogMock.open.mockResolvedValue(null)
})

describe('ThemePicker integration', () => {
  it('shows themes from both the themes/ directory and go.mod', async () => {
    dialogMock.open.mockResolvedValueOnce('/site/content')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /Choose folder/i }))
    const picker = (await screen.findByRole('combobox', {
      name: 'Theme',
    })) as HTMLSelectElement
    await waitFor(() => expect(picker.options.length).toBeGreaterThan(1))
    const labels = Array.from(picker.options).map((o) => o.textContent ?? '')
    expect(labels.some((l) => l.includes('legacy-paper'))).toBe(true)
    expect(labels.some((l) => l.includes('foo') && l.includes('module'))).toBe(true)
  })

  it('persists the selected theme per folder', async () => {
    dialogMock.open.mockResolvedValueOnce('/site/content')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /Choose folder/i }))
    const picker = (await screen.findByRole('combobox', {
      name: 'Theme',
    })) as HTMLSelectElement
    await waitFor(() => expect(picker.options.length).toBeGreaterThan(1))
    const moduleOption = Array.from(picker.options).find((o) =>
      o.value.includes('foo-hugo-theme'),
    )!
    fireEvent.change(picker, { target: { value: moduleOption.value } })
    await waitFor(() => {
      const writes = fsMock.writeTextFile.mock.calls.filter(
        (call) => call[0] === 'state.json',
      )
      expect(writes.length).toBeGreaterThan(0)
      const latest = writes[writes.length - 1][1] as string
      expect(latest).toContain('themeByFolder')
      expect(latest).toContain('foo-hugo-theme')
    })
  })

  it('applies the selected theme as a data-theme attribute on the editor body', async () => {
    dialogMock.open.mockResolvedValueOnce('/site/content')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /Choose folder/i }))
    fireEvent.click(await screen.findByRole('button', { name: /post\.md/ }))
    const textarea = await screen.findByTestId('editor-textarea')
    const editorBody = textarea.closest('.editor-body') as HTMLElement
    await waitFor(() => expect(editorBody.getAttribute('data-theme')).toBeTruthy())
  })

  it('hides the theme picker when the user switches off Mode 1', async () => {
    dialogMock.open.mockResolvedValueOnce('/site/content')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /Choose folder/i }))
    await screen.findByRole('combobox', { name: 'Theme' })
    fireEvent.click(screen.getByRole('button', { name: /Mode 2 — Hugo preview/ }))
    await waitFor(() =>
      expect(screen.queryByRole('combobox', { name: 'Theme' })).not.toBeInTheDocument(),
    )
  })
})
