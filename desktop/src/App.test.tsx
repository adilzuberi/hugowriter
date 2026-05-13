import { vi, describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: vi.fn().mockResolvedValue(false),
  readTextFile: vi.fn().mockResolvedValue(''),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
  readDir: vi.fn().mockResolvedValue([]),
  mkdir: vi.fn().mockResolvedValue(undefined),
  BaseDirectory: { AppData: 1 },
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn().mockResolvedValue(null),
}))

import App from './App'

describe('App', () => {
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
    const { open } = await import('@tauri-apps/plugin-dialog')
    ;(open as ReturnType<typeof vi.fn>).mockResolvedValueOnce('/tmp/test-folder')
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
