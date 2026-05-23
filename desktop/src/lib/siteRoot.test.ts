import { describe, it, expect } from 'vitest'
import { findSiteRoot } from './siteRoot'

function lookupWith(existing: string[]) {
  const set = new Set(existing)
  return { exists: async (path: string) => set.has(path) }
}

describe('findSiteRoot', () => {
  it('returns the parent of content/ when hugo.toml lives there', async () => {
    const root = await findSiteRoot(
      '/site/content',
      lookupWith(['/site/hugo.toml']),
    )
    expect(root).toBe('/site')
  })

  it('walks up multiple levels until it finds a config', async () => {
    const root = await findSiteRoot(
      '/site/content/posts',
      lookupWith(['/site/config.toml']),
    )
    expect(root).toBe('/site')
  })

  it('detects the multi-file config layout', async () => {
    const root = await findSiteRoot(
      '/site/content',
      lookupWith(['/site/config/_default/hugo.toml']),
    )
    expect(root).toBe('/site')
  })

  it('returns null when no config is found within the walk depth', async () => {
    const root = await findSiteRoot('/site/content', lookupWith([]))
    expect(root).toBe(null)
  })

  it('strips a trailing slash from the starting folder', async () => {
    const root = await findSiteRoot(
      '/site/content/',
      lookupWith(['/site/hugo.toml']),
    )
    expect(root).toBe('/site')
  })
})
