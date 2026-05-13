import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the hard-coded H1 from the placeholder markdown', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Hugowriter' }),
    ).toBeInTheDocument()
  })

  it('renders all three mode-toggle buttons', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /Mode 1 — Theme inline/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mode 2 — Hugo preview/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mode 3 — Inline Hugo render/ })).toBeInTheDocument()
  })

  it('reveals the Mode 3 placeholder when Mode 3 is clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Mode 3 — Inline Hugo render/ }))
    expect(
      screen.getByText('Mode 3 — coming soon, revisit at 30-day dogfood checkpoint'),
    ).toBeInTheDocument()
  })
})
