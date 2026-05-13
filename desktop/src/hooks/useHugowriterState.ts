import { useCallback, useEffect, useState } from 'react'
import { loadState, saveState } from '../api/state'
import { pickFolder } from '../api/fs'

export type HugowriterState = {
  folder: string | null
  file: string | null
  content: string
  dirty: boolean
  expandedDirs: Set<string>
}

const EMPTY: HugowriterState = {
  folder: null,
  file: null,
  content: '',
  dirty: false,
  expandedDirs: new Set<string>(),
}

export function useHugowriterState() {
  const [state, setState] = useState<HugowriterState>(EMPTY)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadState().then((persisted) => {
      if (cancelled) return
      setState({
        folder: persisted.lastFolder,
        file: null,
        content: '',
        dirty: false,
        expandedDirs: new Set(persisted.expandedDirs),
      })
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const setFolder = useCallback((folder: string | null) => {
    setState((s) => ({
      ...s,
      folder,
      file: null,
      content: '',
      dirty: false,
    }))
  }, [])

  const chooseFolder = useCallback(async () => {
    const next = await pickFolder()
    if (next) setFolder(next)
  }, [setFolder])

  useEffect(() => {
    if (!loaded) return
    saveState({
      lastFolder: state.folder,
      lastFile: state.file,
      expandedDirs: Array.from(state.expandedDirs),
    })
  }, [loaded, state.folder, state.file, state.expandedDirs])

  return { state, setState, setFolder, chooseFolder, loaded }
}
