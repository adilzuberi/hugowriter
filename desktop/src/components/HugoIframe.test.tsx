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

const shellMock = vi.hoisted(() => {
  const spawn = vi.fn()
  const execute = vi.fn()
  const kill = vi.fn().mockResolvedValue(undefined)
  let lastArgs: string[] = []
  const Command = {
    create: (name: string, args: string[]) => {
      lastArgs = args
      return {
        name,
        args,
        spawn: () => spawn().then((res: unknown) => res ?? { pid: 999, kill }),
        execute: () => execute(),
      }
    },
  }
  return { Command, spawn, execute, kill, getLastArgs: () => lastArgs }
})

vi.mock('@tauri-apps/plugin-fs', () => ({
  ...fsMock,
  BaseDirectory: { AppData: 1 },
}))

vi.mock('@tauri-apps/plugin-dialog', () => dialogMock)

vi.mock('@tauri-apps/plugin-shell', () => ({
  Command: shellMock.Command,
}))

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
}

const SITE_FILES: Record<string, string> = {
  '/site/content/post.md': '# Hello\n',
}

const EXISTS = new Set<string>(['/site/hugo.toml'])

beforeEach(() => {
  fsMock.readDir.mockReset()
  fsMock.readTextFile.mockReset()
  fsMock.writeTextFile.mockReset()
  fsMock.exists.mockReset()
  fsMock.mkdir.mockReset()
  dialogMock.open.mockReset()
  shellMock.spawn.mockReset()
  shellMock.execute.mockReset()
  shellMock.kill.mockClear()

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

async function bootInMode2() {
  dialogMock.open.mockResolvedValueOnce('/site/content')
  render(<App />)
  fireEvent.click(await screen.findByRole('button', { name: /Choose folder/i }))
  fireEvent.click(await screen.findByRole('button', { name: /Mode 2 — Hugo preview/ }))
}

describe('Mode 2 — Hugo iframe', () => {
  it('shows an unavailable message when hugo is not on PATH', async () => {
    shellMock.execute.mockResolvedValueOnce({ code: 127, stderr: 'not found', stdout: '' })
    await bootInMode2()
    expect(await screen.findByRole('alert')).toHaveTextContent(/Hugo not found on PATH/)
  })

  it('spawns hugo server with the detected site root when hugo is available', async () => {
    shellMock.execute.mockResolvedValueOnce({ code: 0, stdout: 'hugo v0.161.1', stderr: '' })
    shellMock.spawn.mockResolvedValueOnce({ pid: 42, kill: shellMock.kill })
    await bootInMode2()
    const iframe = (await screen.findByTitle('Hugo preview')) as HTMLIFrameElement
    expect(iframe.src).toContain('127.0.0.1:51313')
    const args = shellMock.getLastArgs()
    expect(args).toContain('--source')
    expect(args).toContain('/site')
    expect(args).toContain('--port')
    expect(args).toContain('51313')
  })

  it('kills the spawned hugo when switching away from Mode 2', async () => {
    shellMock.execute.mockResolvedValueOnce({ code: 0, stdout: 'hugo v0.161.1', stderr: '' })
    shellMock.spawn.mockResolvedValueOnce({ pid: 42, kill: shellMock.kill })
    await bootInMode2()
    await screen.findByTitle('Hugo preview')
    fireEvent.click(screen.getByRole('button', { name: /Mode 1 — Theme inline/ }))
    await waitFor(() => expect(shellMock.kill).toHaveBeenCalled())
  })
})
