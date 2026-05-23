import { useEffect, useState } from 'react'
import './themes/impact.css'
import { useHugowriterState } from './hooks/useHugowriterState'
import { useFrontmatterEditor } from './hooks/useFrontmatterEditor'
import { useThemes } from './hooks/useThemes'
import { useHugoServer } from './hooks/useHugoServer'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'
import { TitleBar } from './components/TitleBar'
import { ThemePicker } from './components/ThemePicker'
import { HugoIframe } from './components/HugoIframe'
import { StatusBar } from './components/StatusBar'
import { FrontmatterPanel } from './components/FrontmatterPanel/FrontmatterPanel'
import { SettingsPanel } from './components/SettingsPanel/SettingsPanel'

type Mode = 'mode1' | 'mode2' | 'mode3'

const MODES: Array<{ id: Mode; label: string }> = [
  { id: 'mode1', label: 'Mode 1 — Theme inline' },
  { id: 'mode2', label: 'Mode 2 — Hugo preview' },
  { id: 'mode3', label: 'Mode 3 — Inline Hugo render' },
]

function ModeToolbar({
  mode,
  setMode,
  themePickerSlot,
  onToggleSettings,
  settingsOpen,
  settingsAvailable,
}: {
  mode: Mode
  setMode: (m: Mode) => void
  themePickerSlot?: React.ReactNode
  onToggleSettings: () => void
  settingsOpen: boolean
  settingsAvailable: boolean
}) {
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
      <div className="mode-toolbar-spacer">
        {themePickerSlot}
        {settingsAvailable && (
          <button
            type="button"
            className="settings-toggle"
            aria-pressed={settingsOpen}
            aria-label="Site settings"
            onClick={onToggleSettings}
          >
            ⚙ Site settings
          </button>
        )}
      </div>
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

function FileEditor({
  filePath,
  content,
  updateContent,
  themeId,
}: {
  filePath: string
  content: string
  updateContent: (next: string) => void
  themeId: string | null
}) {
  const editor = useFrontmatterEditor(content, updateContent)
  return (
    <>
      <FrontmatterPanel editor={editor} />
      <div className="editor-body" data-theme={themeId ?? undefined}>
        <div className="grt">
          <Editor filePath={filePath} content={editor.body} onChange={editor.setBody} />
        </div>
      </div>
    </>
  )
}

export default function App() {
  const {
    state,
    chooseFolder,
    toggleDir,
    openFile,
    openPath,
    updateContent,
    saveCurrent,
    setThemeForFolder,
  } = useHugowriterState()
  const [mode, setMode] = useState<Mode>('mode1')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { themeState, selectTheme } = useThemes(
    state.folder,
    state.themeByFolder,
    setThemeForFolder,
  )
  const { status: hugoStatus } = useHugoServer(themeState.siteRoot, mode === 'mode2')

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
      <ModeToolbar
        mode={mode}
        setMode={setMode}
        settingsAvailable={!!themeState.siteRoot}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((o) => !o)}
        themePickerSlot={
          state.folder && mode === 'mode1' ? (
            <ThemePicker
              themes={themeState.themes}
              selected={themeState.selected}
              onSelect={selectTheme}
            />
          ) : null
        }
      />
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
            recentFiles={state.recentFiles}
            onToggleDir={toggleDir}
            onFileClick={openFile}
            onOpenRecent={openPath}
            onChangeFolder={chooseFolder}
          />
          <SettingsPanel
            siteRoot={settingsOpen ? themeState.siteRoot : null}
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
          <div className="editor-pane">
            <TitleBar file={state.file} dirty={state.dirty} />
            {mode === 'mode3' ? (
              // TODO: webview parity test
              <div className="mode3-placeholder">
                Mode 3 — coming soon, revisit at 30-day dogfood checkpoint
              </div>
            ) : mode === 'mode2' ? (
              <HugoIframe
                status={hugoStatus}
                dirty={state.dirty}
                fileSavedAt={state.lastSavedAt}
              />
            ) : !state.file ? (
              <NoFileMessage />
            ) : (
              <FileEditor
                key={state.file}
                filePath={state.file}
                content={state.content}
                updateContent={updateContent}
                themeId={themeState.selected}
              />
            )}
            <StatusBar
              siteRoot={themeState.siteRoot}
              dirty={state.dirty}
              onBeforeBuild={saveCurrent}
            />
          </div>
        </div>
      )}
    </>
  )
}
