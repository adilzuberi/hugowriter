import { useCallback, useEffect, useRef, useState } from 'react'
import { loadState, saveState } from '../api/state'
import { pickFolder, readFile, readTree, writeFile } from '../api/fs'
import { setWindowTitle } from '../api/window'
import type { FileNode } from '../lib/treeFilter'

function basename(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? path
}

function findFileInTree(nodes: FileNode[], path: string): FileNode | null {
  for (const node of nodes) {
    if (node.kind === 'file' && node.path === path) return node
    if (node.children) {
      const found = findFileInTree(node.children, path)
      if (found) return found
    }
  }
  return null
}

const PERSIST_DEBOUNCE_MS = 250

export type HugowriterState = {
  folder: string | null
  file: string | null
  content: string
  dirty: boolean
  expandedDirs: Set<string>
  tree: FileNode[]
  treeError: string | null
  themeByFolder: Record<string, string>
  lastSavedAt: number | null
}

const EMPTY: HugowriterState = {
  folder: null,
  file: null,
  content: '',
  dirty: false,
  expandedDirs: new Set<string>(),
  tree: [],
  treeError: null,
  themeByFolder: {},
  lastSavedAt: null,
}

export function useHugowriterState() {
  const [state, setState] = useState<HugowriterState>(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const stateRef = useRef(state)
  stateRef.current = state
  const pendingFileRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadState().then((persisted) => {
      if (cancelled) return
      pendingFileRef.current = persisted.lastFile
      setState({
        folder: persisted.lastFolder,
        file: null,
        content: '',
        dirty: false,
        expandedDirs: new Set(persisted.expandedDirs),
        tree: [],
        treeError: null,
        themeByFolder: persisted.themeByFolder,
        lastSavedAt: null,
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

  const writeIfDirty = useCallback(async (): Promise<void> => {
    const { file, content, dirty } = stateRef.current
    if (!file || !dirty) return
    await writeFile(file, content)
    setState((s) =>
      s.file === file && s.content === content
        ? { ...s, dirty: false, treeError: null, lastSavedAt: Date.now() }
        : s,
    )
  }, [])

  const saveCurrent = useCallback(async (): Promise<void> => {
    try {
      await writeIfDirty()
    } catch (err) {
      setState((s) => ({
        ...s,
        treeError: `Save failed: ${String(err)}`,
      }))
      throw err
    }
  }, [writeIfDirty])

  const openFile = useCallback(
    async (node: FileNode) => {
      if (node.kind !== 'file') return
      const { file: prevFile, dirty } = stateRef.current
      if (dirty && prevFile) {
        try {
          await writeIfDirty()
        } catch (err) {
          // Block the switch so no work is lost; the error toast tells the user what went wrong.
          setState((s) => ({
            ...s,
            treeError: `Could not auto-save ${basename(prevFile)}: ${String(err)}`,
          }))
          return
        }
      }
      try {
        const content = await readFile(node.path)
        setState((s) => ({
          ...s,
          file: node.path,
          content,
          dirty: false,
          treeError: null,
        }))
      } catch (err) {
        setState((s) => ({
          ...s,
          treeError: `Could not read ${node.name}: ${String(err)}`,
        }))
      }
    },
    [writeIfDirty],
  )

  useEffect(() => {
    if (!loaded) return
    const timer = setTimeout(() => {
      saveState({
        lastFolder: state.folder,
        lastFile: state.file,
        expandedDirs: Array.from(state.expandedDirs),
        themeByFolder: state.themeByFolder,
      })
    }, PERSIST_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [loaded, state.folder, state.file, state.expandedDirs, state.themeByFolder])

  const setThemeForFolder = useCallback((folder: string, themeId: string) => {
    setState((s) => ({
      ...s,
      themeByFolder: { ...s.themeByFolder, [folder]: themeId },
    }))
  }, [])

  // Reopen the last file once the tree resolves. One-shot per session.
  useEffect(() => {
    if (!loaded || !pendingFileRef.current || state.tree.length === 0) return
    const path = pendingFileRef.current
    pendingFileRef.current = null
    const node = findFileInTree(state.tree, path)
    if (node) void openFile(node)
    // openFile is intentionally omitted: we want this to run on tree resolution only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, state.tree])

  // Reflect dirty state in the OS window title so it shows in the Mission Control switcher.
  useEffect(() => {
    const filename = state.file ? basename(state.file) : 'Hugowriter'
    const title = state.dirty ? `• ${filename}` : filename
    setWindowTitle(title)
  }, [state.file, state.dirty])

  return {
    state,
    setState,
    setFolder,
    chooseFolder,
    toggleDir,
    openFile,
    updateContent,
    saveCurrent,
    setThemeForFolder,
    loaded,
  }
}
