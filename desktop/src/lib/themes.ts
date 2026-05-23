export type ThemeSource = 'legacy' | 'module'

export type ThemeDescriptor = {
  id: string // stable identifier the picker uses; theme dir name or module path
  label: string // human-readable
  source: ThemeSource
}

const MODULE_REQUIRE = /require\s+([A-Za-z0-9._/-]+)(?:\s+v[^\s]+)?/g

export function parseGoModRequires(goMod: string): string[] {
  const requires: string[] = []
  const blockMatch = /require\s*\(\s*([\s\S]*?)\)/m.exec(goMod)
  if (blockMatch) {
    const lines = blockMatch[1]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('//'))
    for (const line of lines) {
      const m = /^([A-Za-z0-9._/-]+)(?:\s+v[^\s]+)?/.exec(line)
      if (m) requires.push(m[1])
    }
  }
  // Single-line require directives outside the block.
  MODULE_REQUIRE.lastIndex = 0
  for (const m of goMod.matchAll(MODULE_REQUIRE)) {
    if (!requires.includes(m[1])) requires.push(m[1])
  }
  return requires
}

export function deriveModuleLabel(modulePath: string): string {
  const last = modulePath.split('/').pop() ?? modulePath
  return last
    .replace(/-hugo-theme$/, '')
    .replace(/-theme$/, '')
    .replace(/^hugo-/, '')
}

export function mergeThemes(
  legacyDirs: string[],
  moduleRequires: string[],
): ThemeDescriptor[] {
  const out: ThemeDescriptor[] = []
  for (const dir of legacyDirs) {
    out.push({ id: dir, label: dir, source: 'legacy' })
  }
  for (const mod of moduleRequires) {
    // Skip non-theme modules: most theme modules contain "theme" in the path.
    if (!/theme/i.test(mod)) continue
    out.push({ id: mod, label: deriveModuleLabel(mod), source: 'module' })
  }
  return dedupeById(out)
}

function dedupeById(themes: ThemeDescriptor[]): ThemeDescriptor[] {
  const seen = new Set<string>()
  const out: ThemeDescriptor[] = []
  for (const t of themes) {
    if (seen.has(t.id)) continue
    seen.add(t.id)
    out.push(t)
  }
  return out
}
