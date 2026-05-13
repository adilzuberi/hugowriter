import { useCallback, useEffect, useState } from 'react'
import { loadState, saveState } from '../api/state'
import { pickFolder, readFile, readTree } from '../api/fs'
import type { FileNode } from '../lib/treeFilter'

export type HugowriterState = {
  folder: string | null
  file: string | null
  content: string
  dirty: boolean
  expandedDirs: Set<string>
  tree: FileNode[]
  treeError: string | null
}

const EMPTY: HugowriterState = {
  folder: null,
  file: null,
  content: '',
  dirty: false,
  expandedDirs: new Set<string>(),
  tree: [],
  treeError: null,
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
        tree: [],
        treeError: null,
      })
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Refresh the tree whenever the folder changes.
  useEffect(() => {
    if (!loaded) return
    if (!state.folder) {
      setState((s) => ({ ...s, tree: [], treeError: null }))
      return
    }
    let cancelled = false
    readTree(state.folder)
      .then((tree) => {
        if (cancelled) return
        setState((s) => ({ ...s, tree, treeError: null }))
      })
      .catch(() => {
        if (cancelled) return
        // Last folder gone (deleted, unmounted, permission revoked). Fall back to the picker silently.
        setState((s) => ({ ...s, folder: null, tree: [], treeError: null, file: null, content: '', dirty: false }))
      })
    return () => {
      cancelled = true
    }
  }, [loaded, state.folder])

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

  const toggleDir = useCallback((path: string) => {
    setState((s) => {
      const next = new Set(s.expandedDirs)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return { ...s, expandedDirs: next }
    })
  }, [])

  const updateContent = useCallback((markdown: string) => {
    setState((s) => {
      if (s.content === markdown) return s
      return { ...s, content: markdown, dirty: true }
    })
  }, [])

  const openFile = useCallback(async (node: FileNode) => {
    if (node.kind !== 'file') return
    try {
      const content = await readFile(node.path)
      setState((s) => ({ ...s, file: node.path, content, dirty: false, treeError: null }))
    } catch (err) {
      setState((s) => ({
        ...s,
        treeError: `Could not read ${node.name}: ${String(err)}`,
      }))
    }
  }, [])

  useEffect(() => {
    if (!loaded) return
    saveState({
      lastFolder: state.folder,
      lastFile: state.file,
      expandedDirs: Array.from(state.expandedDirs),
    })
  }, [loaded, state.folder, state.file, state.expandedDirs])

  return {
    state,
    setState,
    setFolder,
    chooseFolder,
    toggleDir,
    openFile,
    updateContent,
    loaded,
  }
}
