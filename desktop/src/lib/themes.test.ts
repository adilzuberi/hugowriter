import { describe, it, expect } from 'vitest'
import { parseGoModRequires, deriveModuleLabel, mergeThemes } from './themes'

const SAMPLE_GOMOD = `module github.com/adilzuberi/adil-ink

go 1.22

require github.com/adilzuberi/adilzuberi-hugo-theme v0.0.16
`

const BLOCK_GOMOD = `module example.com/site

go 1.22

require (
\tgithub.com/foo/foo-hugo-theme v1.0.0
\tgithub.com/bar/some-utility v0.4.2 // indirect
)
`

describe('parseGoModRequires', () => {
  it('reads a single-line require directive', () => {
    expect(parseGoModRequires(SAMPLE_GOMOD)).toEqual([
      'github.com/adilzuberi/adilzuberi-hugo-theme',
    ])
  })

  it('reads a require block, skipping comments', () => {
    const reqs = parseGoModRequires(BLOCK_GOMOD)
    expect(reqs).toContain('github.com/foo/foo-hugo-theme')
    expect(reqs).toContain('github.com/bar/some-utility')
  })

  it('returns an empty array when no require directive is present', () => {
    expect(parseGoModRequires('module foo\n\ngo 1.22\n')).toEqual([])
  })
})

describe('deriveModuleLabel', () => {
  it('strips hugo- prefix and -theme suffix', () => {
    expect(deriveModuleLabel('github.com/adilzuberi/adilzuberi-hugo-theme')).toBe(
      'adilzuberi',
    )
    expect(deriveModuleLabel('github.com/foo/hugo-paper')).toBe('paper')
  })

  it('returns the last path segment when no prefix or suffix matches', () => {
    expect(deriveModuleLabel('github.com/foo/ananke')).toBe('ananke')
  })
})

describe('mergeThemes', () => {
  it('merges legacy directory themes with hugo module themes', () => {
    const themes = mergeThemes(
      ['hugo-coder'],
      [
        'github.com/adilzuberi/adilzuberi-hugo-theme',
        'github.com/bar/some-utility', // not a theme; filtered
      ],
    )
    expect(themes).toEqual([
      { id: 'hugo-coder', label: 'hugo-coder', source: 'legacy' },
      {
        id: 'github.com/adilzuberi/adilzuberi-hugo-theme',
        label: 'adilzuberi',
        source: 'module',
      },
    ])
  })

  it('de-duplicates entries with the same id', () => {
    const themes = mergeThemes(['paper'], ['paper'])
    expect(themes).toHaveLength(1)
  })
})
