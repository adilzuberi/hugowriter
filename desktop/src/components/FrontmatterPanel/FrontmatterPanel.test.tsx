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

vi.mock('../Editor', () => ({
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

import App from '../../App'

function entry(name: string, isDirectory: boolean) {
  return { name, isDirectory, isFile: !isDirectory, isSymlink: false }
}

const FIXTURES: Record<string, ReturnType<typeof entry>[]> = {
  '/site/content': [
    entry('post-with-fm.md', false),
    entry('plain.md', false),
    entry('toml-fm.md', false),
  ],
}

const YAML_BODY = `---
title: Welcome
date: 2026-05-23T10:00:00Z
draft: false
tags:
  - hugo
  - notes
custom: keepme
---
# Body

Body paragraph.
`

const TOML_BODY = `+++
title = "TOML post"
draft = true
+++
# Toml body
`

const FILE_CONTENT: Record<string, string> = {
  '/site/content/post-with-fm.md': YAML_BODY,
  '/site/content/plain.md': '# Plain\n\nNo frontmatter here.\n',
  '/site/content/toml-fm.md': TOML_BODY,
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

async function openFile(fileLabel: RegExp) {
  dialogMock.open.mockResolvedValueOnce('/site/content')
  render(<App />)
  fireEvent.click(await screen.findByRole('button', { name: /Choose folder/i }))
  fireEvent.click(await screen.findByRole('button', { name: fileLabel }))
}

describe('FrontmatterPanel', () => {
  it('shows the panel for a YAML-frontmatter file with known fields populated', async () => {
    await openFile(/post-with-fm\.md/)
    expect(await screen.findByText('Frontmatter (YAML)')).toBeInTheDocument()
    const titleInput = screen.getByDisplayValue('Welcome') as HTMLInputElement
    expect(titleInput.type).toBe('text')
    expect(screen.getByLabelText('Draft')).not.toBeChecked()
    expect(screen.getByText('hugo')).toBeInTheDocument()
    expect(screen.getByText('notes')).toBeInTheDocument()
  })

  it('lists unknown fields under Other fields', async () => {
    await openFile(/post-with-fm\.md/)
    expect(await screen.findByText('Other fields')).toBeInTheDocument()
    expect(screen.getByDisplayValue('keepme')).toBeInTheDocument()
  })

  it('passes only the body to the editor — not the frontmatter block', async () => {
    await openFile(/post-with-fm\.md/)
    const textarea = (await screen.findByTestId('editor-textarea')) as HTMLTextAreaElement
    expect(textarea.value).toBe('# Body\n\nBody paragraph.\n')
    expect(textarea.value).not.toContain('---')
    expect(textarea.value).not.toContain('title:')
  })

  it('omits the panel for files with no frontmatter', async () => {
    await openFile(/plain\.md/)
    await screen.findByTestId('editor-textarea')
    expect(screen.queryByText(/^Frontmatter \(/)).not.toBeInTheDocument()
  })

  it('editing the title via the panel marks the file dirty and Cmd+S writes recombined content', async () => {
    await openFile(/post-with-fm\.md/)
    const titleInput = (await screen.findByDisplayValue('Welcome')) as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: 'Welcome edited' } })
    expect(await screen.findByLabelText('Unsaved changes')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 's', metaKey: true })
    await waitFor(() => expect(fsMock.writeTextFile).toHaveBeenCalled())
    const writtenContent = fsMock.writeTextFile.mock.calls[0][1] as string
    expect(writtenContent).toContain('title: Welcome edited')
    expect(writtenContent).toContain('# Body')
    expect(writtenContent).toContain('Body paragraph.')
  })

  it('detects TOML frontmatter and labels the panel', async () => {
    await openFile(/toml-fm\.md/)
    expect(await screen.findByText('Frontmatter (TOML)')).toBeInTheDocument()
    expect(screen.getByDisplayValue('TOML post')).toBeInTheDocument()
    expect(screen.getByLabelText('Draft')).toBeChecked()
  })

  it('body-only edits leave frontmatter byte-identical', async () => {
    await openFile(/post-with-fm\.md/)
    const textarea = (await screen.findByTestId('editor-textarea')) as HTMLTextAreaElement
    await waitFor(() => expect(textarea.value).toBe('# Body\n\nBody paragraph.\n'))
    fireEvent.change(textarea, { target: { value: '# Body edited\n' } })
    fireEvent.keyDown(window, { key: 's', metaKey: true })
    await waitFor(() => expect(fsMock.writeTextFile).toHaveBeenCalled())
    const writtenContent = fsMock.writeTextFile.mock.calls[0][1] as string
    expect(writtenContent.startsWith(YAML_BODY.split('---\n').slice(0, 2).join('---\n') + '---\n')).toBe(
      true,
    )
    expect(writtenContent.endsWith('# Body edited\n')).toBe(true)
  })
})
