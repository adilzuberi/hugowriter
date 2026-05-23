import { exists, readDir, readTextFile } from '@tauri-apps/plugin-fs'
import { findSiteRoot } from '../lib/siteRoot'
import { mergeThemes, parseGoModRequires, type ThemeDescriptor } from '../lib/themes'

export type { ThemeDescriptor } from '../lib/themes'

export async function detectSiteRoot(contentFolder: string): Promise<string | null> {
  return findSiteRoot(contentFolder, { exists })
}

export async function listThemes(siteRoot: string): Promise<ThemeDescriptor[]> {
  const legacyDirs = await listLegacyThemes(siteRoot)
  const moduleRequires = await readModuleRequires(siteRoot)
  return mergeThemes(legacyDirs, moduleRequires)
}

async function listLegacyThemes(siteRoot: string): Promise<string[]> {
  const themesDir = `${siteRoot}/themes`
  try {
    if (!(await exists(themesDir))) return []
    const entries = await readDir(themesDir)
    return entries
      .filter((e) => e.isDirectory && e.name && !e.name.startsWith('.'))
      .map((e) => e.name!)
  } catch {
    return []
  }
}

async function readModuleRequires(siteRoot: string): Promise<string[]> {
  const goModPath = `${siteRoot}/go.mod`
  try {
    if (!(await exists(goModPath))) return []
    const content = await readTextFile(goModPath)
    return parseGoModRequires(content)
  } catch {
    return []
  }
}
