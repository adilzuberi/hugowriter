import { useCallback, useState } from 'react'
import { SiteMetadata } from './SiteMetadata'
import { ThemeSettings } from './ThemeSettings'
import { useSiteConfig, type SiteConfigStatus } from '../../hooks/useSiteConfig'

type Props = {
  siteRoot: string | null
  open: boolean
  onClose: () => void
}

export function SettingsPanel({ siteRoot, open, onClose }: Props) {
  const { status, setField, save } = useSiteConfig(siteRoot)
  const [saving, setSaving] = useState(false)
  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await save()
    } finally {
      setSaving(false)
    }
  }, [save])

  if (!open) return null
  return (
    <aside className="settings-panel" aria-label="Site settings">
      <header className="settings-header">
        <h2>Site settings</h2>
        <button
          type="button"
          className="settings-close"
          aria-label="Close site settings"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <Body status={status} setField={setField} onSave={handleSave} saving={saving} />
    </aside>
  )
}

function Body({
  status,
  setField,
  onSave,
  saving,
}: {
  status: SiteConfigStatus
  setField: (keyPath: string, value: unknown) => void
  onSave: () => void
  saving: boolean
}) {
  if (status.kind === 'idle') {
    return <p className="muted settings-message">Open a Hugo site to see its settings.</p>
  }
  if (status.kind === 'loading') {
    return <p className="muted settings-message">Loading…</p>
  }
  if (status.kind === 'error') {
    return (
      <p className="settings-error" role="alert">
        Hugo sidecar not available — settings cannot be read. {status.reason}
      </p>
    )
  }
  const dirtyKeys = new Set(Object.keys(status.dirty))
  const isDirty = (key: string) => dirtyKeys.has(key)
  const hasDirty = dirtyKeys.size > 0
  return (
    <div className="settings-body">
      <SiteMetadata
        effective={status.data.effective}
        sources={status.data.sources}
        isDirty={isDirty}
        onChange={setField}
      />
      <ThemeSettings
        effective={status.data.effective}
        sources={status.data.sources}
        isDirty={isDirty}
        onChange={setField}
      />
      <div className="settings-footer">
        <button
          type="button"
          className="settings-save"
          disabled={!hasDirty || saving}
          onClick={onSave}
        >
          {saving ? 'Saving…' : `Save ${dirtyKeys.size} change${dirtyKeys.size === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  )
}
