import { useState } from 'react'
import './themes/impact.css'
import { useHugowriterState } from './hooks/useHugowriterState'

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

function EmptyEditorBody({ folder }: { folder: string }) {
  return (
    <div className="editor-body">
      <div className="grt">
        <p className="muted">
          Folder loaded: <code>{folder}</code>. File tree lands in the next commit.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const { state, chooseFolder, loaded } = useHugowriterState()
  const [mode, setMode] = useState<Mode>('mode1')

  if (!loaded) {
    return <div className="loading">Loading…</div>
  }

  return (
    <>
      <ModeToolbar mode={mode} setMode={setMode} />
      {!state.folder ? (
        <EmptyFolderState onChoose={chooseFolder} />
      ) : mode === 'mode3' ? (
        // TODO: webview parity test
        <div className="mode3-placeholder">
          Mode 3 — coming soon, revisit at 30-day dogfood checkpoint
        </div>
      ) : (
        <EmptyEditorBody folder={state.folder} />
      )}
    </>
  )
}
