import { useCallback, useEffect, useState } from 'react'
import { detectSiteRoot, listThemes, type ThemeDescriptor } from '../api/themes'

export type ThemeState = {
  siteRoot: string | null
  themes: ThemeDescriptor[]
  selected: string | null
}

const EMPTY: ThemeState = { siteRoot: null, themes: [], selected: null }

export function useThemes(
  folder: string | null,
  rememberedThemeByFolder: Record<string, string>,
  onSelect: (folder: string, themeId: string) => void,
) {
  const [state, setState] = useState<ThemeState>(EMPTY)

  useEffect(() => {
    if (!folder) {
      setState(EMPTY)
      return
    }
    let cancelled = false
    void (async () => {
      const siteRoot = await detectSiteRoot(folder)
      if (cancelled) return
      const themes = siteRoot ? await listThemes(siteRoot) : []
      if (cancelled) return
      const remembered = rememberedThemeByFolder[folder]
      const fallback = themes[0]?.id ?? null
      const selected = remembered && themes.some((t) => t.id === remembered) ? remembered : fallback
      setState({ siteRoot, themes, selected })
    })()
    return () => {
      cancelled = true
    }
  }, [folder, rememberedThemeByFolder])

  const selectTheme = useCallback(
    (themeId: string) => {
      if (!folder) return
      setState((s) => ({ ...s, selected: themeId }))
      onSelect(folder, themeId)
    },
    [folder, onSelect],
  )

  return { themeState: state, selectTheme }
}
