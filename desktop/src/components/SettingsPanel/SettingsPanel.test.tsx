import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const invokeMock = vi.hoisted(() => vi.fn())

vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))

import { SettingsPanel } from './SettingsPanel'

const MOCK_LOAD = {
  effective: {
    title: 'Fixture site',
    description: 'A site fixture',
    languageCode: 'en-gb',
    baseURL: 'https://example.test/',
    params: {
      theme: {
        preset: 'focus-stock' as const,
        basePx: 18,
        accent: '#1a5fb4',
      },
    },
  },
  sources: {
    title: '/site/config/_default/hugo.toml',
    'params.description': '/site/config/_default/hugo.toml',
    languageCode: '/site/config/_default/hugo.toml',
    baseURL: '/site/config/_default/hugo.toml',
    'theme.preset': '/site/config/_default/params.toml',
    'theme.basePx': '/site/config/_default/params.toml',
    'theme.accent': '/site/config/_default/params.toml',
  },
}

beforeEach(() => {
  invokeMock.mockReset()
  invokeMock.mockImplementation((cmd: string) => {
    if (cmd === 'config_load') return Promise.resolve(MOCK_LOAD)
    if (cmd === 'config_write') return Promise.resolve()
    if (cmd === 'config_touch_sentinel') return Promise.resolve()
    return Promise.resolve()
  })
})

function renderPanel() {
  return render(
    <SettingsPanel siteRoot="/site" open={true} onClose={() => undefined} />,
  )
}

describe('SettingsPanel', () => {
  it('renders all populated fields after config_load resolves', async () => {
    renderPanel()
    expect(await screen.findByDisplayValue('Fixture site')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A site fixture')).toBeInTheDocument()
    expect(screen.getByDisplayValue('en-gb')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.test/')).toBeInTheDocument()
    expect(screen.getByLabelText('Base font-size') as HTMLInputElement).toHaveValue(18)
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    const focusStock = radios.find((r) => r.value === 'focus-stock')!
    expect(focusStock.checked).toBe(true)
  })

  it('editing the title marks it dirty and Save writes via config_write once', async () => {
    renderPanel()
    const titleInput = (await screen.findByDisplayValue('Fixture site')) as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: 'Fixture site edited' } })
    expect(titleInput.className).toContain('dirty')

    const saveBtn = await screen.findByRole('button', { name: /Save 1 change/ })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      const writeCalls = invokeMock.mock.calls.filter((c) => c[0] === 'config_write')
      expect(writeCalls.length).toBe(1)
      expect(writeCalls[0][1]).toMatchObject({
        keyPath: 'title',
        value: 'Fixture site edited',
        file: '/site/config/_default/hugo.toml',
      })
    })
    await waitFor(() => {
      const sentinelCalls = invokeMock.mock.calls.filter(
        (c) => c[0] === 'config_touch_sentinel',
      )
      expect(sentinelCalls.length).toBe(1)
    })
  })

  it('accent colour change saves the hex including the leading #', async () => {
    renderPanel()
    const accent = (await screen.findByLabelText('Accent colour')) as HTMLInputElement
    fireEvent.change(accent, { target: { value: '#ba0404' } })
    const saveBtn = await screen.findByRole('button', { name: /Save 1 change/ })
    fireEvent.click(saveBtn)
    await waitFor(() => {
      const writeCalls = invokeMock.mock.calls.filter((c) => c[0] === 'config_write')
      expect(writeCalls.length).toBe(1)
      expect(writeCalls[0][1]).toMatchObject({
        keyPath: 'theme.accent',
        value: '#ba0404',
      })
    })
  })

  it('baseURL change shows the confirmation dialog; cancel skips the save', async () => {
    renderPanel()
    const baseUrl = (await screen.findByDisplayValue(
      'https://example.test/',
    )) as HTMLInputElement
    fireEvent.change(baseUrl, { target: { value: 'https://new.test/' } })
    fireEvent.blur(baseUrl)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Save 1 change/ })).not.toBeInTheDocument()
  })

  it('warns when basePx falls outside the impact-css range', async () => {
    renderPanel()
    const px = (await screen.findByLabelText('Base font-size')) as HTMLInputElement
    fireEvent.change(px, { target: { value: '50' } })
    expect(await screen.findByText(/Outside impact-css range/)).toBeInTheDocument()
  })

  it('renders the source-file hint for each field so the user knows where the write lands', async () => {
    renderPanel()
    await screen.findByDisplayValue('Fixture site')
    expect(screen.getAllByText('config/_default/hugo.toml').length).toBeGreaterThan(0)
    expect(screen.getAllByText('config/_default/params.toml').length).toBeGreaterThan(0)
  })
})
