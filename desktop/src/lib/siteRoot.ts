// Walk up from a content folder to find the Hugo site root. The site root is
// the directory containing hugo.toml, config.toml, or config/_default/. We
// stop walking at the filesystem root or after a sensible depth so we don't
// scan the whole disk.

export type SiteRootLookup = {
  readonly exists: (path: string) => Promise<boolean>
}

const MAX_WALK_DEPTH = 8

export async function findSiteRoot(
  contentFolder: string,
  lookup: SiteRootLookup,
): Promise<string | null> {
  let current = stripTrailingSlash(contentFolder)
  for (let i = 0; i < MAX_WALK_DEPTH; i++) {
    if (await isSiteRoot(current, lookup)) return current
    const parent = parentOf(current)
    if (parent === current) return null
    current = parent
  }
  return null
}

async function isSiteRoot(dir: string, lookup: SiteRootLookup): Promise<boolean> {
  return (
    (await lookup.exists(`${dir}/hugo.toml`)) ||
    (await lookup.exists(`${dir}/config.toml`)) ||
    (await lookup.exists(`${dir}/config/_default/hugo.toml`)) ||
    (await lookup.exists(`${dir}/config/_default/config.toml`)) ||
    (await lookup.exists(`${dir}/hugo.yaml`)) ||
    (await lookup.exists(`${dir}/config.yaml`))
  )
}

function parentOf(dir: string): string {
  const idx = dir.lastIndexOf('/')
  if (idx <= 0) return '/'
  return dir.slice(0, idx)
}

function stripTrailingSlash(dir: string): string {
  if (dir.length > 1 && dir.endsWith('/')) return dir.slice(0, -1)
  return dir
}
