import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const shellMock = vi.hoisted(() => {
  const execute = vi.fn()
  const Command = {
    create: (name: string, args: string[]) => ({
      name,
      args,
      execute: () => execute(),
    }),
  }
  return { Command, execute }
})

vi.mock('@tauri-apps/plugin-shell', () => ({ Command: shellMock.Command }))

import { StatusBar } from './StatusBar'

beforeEach(() => {
  shellMock.execute.mockReset()
})

describe('StatusBar', () => {
  it('shows "Unsaved changes" when dirty and no build has run', () => {
    render(<StatusBar siteRoot="/site" dirty={true} />)
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
  })

  it('runs hugo on click and shows a success line', async () => {
    shellMock.execute.mockResolvedValueOnce({ code: 0, stdout: 'OK', stderr: '' })
    const beforeBuild = vi.fn().mockResolvedValue(undefined)
    render(<StatusBar siteRoot="/site" dirty={false} onBeforeBuild={beforeBuild} />)
    fireEvent.click(screen.getByRole('button', { name: /Save \+ Hugo build/ }))
    await waitFor(() => expect(beforeBuild).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText(/Build OK/)).toBeInTheDocument())
  })

  it('surfaces the last stderr line on failure', async () => {
    shellMock.execute.mockResolvedValueOnce({
      code: 1,
      stdout: '',
      stderr: 'ERROR: layout not found\n',
    })
    render(<StatusBar siteRoot="/site" dirty={false} />)
    fireEvent.click(screen.getByRole('button', { name: /Save \+ Hugo build/ }))
    await waitFor(() =>
      expect(screen.getByText(/Build failed: ERROR: layout not found/)).toBeInTheDocument(),
    )
  })

  it('disables the build button when no site root is known', () => {
    render(<StatusBar siteRoot={null} dirty={false} />)
    expect(screen.getByRole('button', { name: /Save \+ Hugo build/ })).toBeDisabled()
  })
})
