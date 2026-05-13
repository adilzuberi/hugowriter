import { useEffect, useState } from 'react'
import './themes/impact.css'
import { useHugowriterState } from './hooks/useHugowriterState'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'
import { TitleBar } from './components/TitleBar'

type Mode = 'mode1' | 'mode2' | 'mode3'

const MODES: Array<{ id: Mode; label: string }> = [
  { id: 'mode1', label: 'Mode 1 — Theme inline' },
  { id: 'mode2', label: 'Mode 2 — Hugo preview' },
  { id: 'mode3', label: 'Mode 3 — Inline Hugo render' },
]

function ModeToolbar({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <div className="mode-toolbar" role="toolbar" aria-label="View mode">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          className={mode === m.id ? 'active' : ''}
          aria-pressed={mode === m.id}
          onClick={() => setMode(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}

function EmptyFolderState({ onChoose }: { onChoose: () => void }) {
  return (
    <div className="empty-state">
      <p>Pick a Hugo content folder to start writing.</p>
      <button type="button" className="primary" onClick={onChoose}>
        Choose folder…
      </button>
    </div>
  )
}

function NoFileMessage() {
  return (
    <div className="editor-body">
      <div className="grt">
        <p className="muted">Pick a file from the sidebar to start editing.</p>
      </div>
    </div>
  )
}

export default function App() {
  const {
    state,
    chooseFolder,
    toggleDir,
    openFile,
    updateContent,
    saveCurrent,
  } = useHugowriterState()
  const [mode, setMode] = useState<Mode>('mode1')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        e.stopPropagation()
        void saveCurrent().catch(() => undefined)
      }
    }
    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  }, [saveCurrent])

  return (
    <>
      <ModeToolbar mode={mode} setMode={setMode} />
      {!state.folder ? (
        <EmptyFolderState onChoose={chooseFolder} />
      ) : (
        <div className="workspace">
          <Sidebar
            folder={state.folder}
            tree={state.tree}
            expanded={state.expandedDirs}
            selectedPath={state.file}
            errorMessage={state.treeError}
            onToggleDir={toggleDir}
            onFileClick={openFile}
            onChangeFolder={chooseFolder}
          />
          <div className="editor-pane">
            <TitleBar file={state.file} dirty={state.dirty} />
            {mode === 'mode3' ? (
              // TODO: webview parity test
              <div className="mode3-placeholder">
                Mode 3 — coming soon, revisit at 30-day dogfood checkpoint
              </div>
            ) : !state.file ? (
              <NoFileMessage />
            ) : (
              <div className="editor-body">
                <div className="grt">
                  <Editor
                    filePath={state.file}
                    content={state.content}
                    onChange={updateContent}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
