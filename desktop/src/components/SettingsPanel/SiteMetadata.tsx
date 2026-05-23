import { useState } from 'react'
import { FieldRow } from './FieldRow'
import type { EffectiveConfig, SourceMap } from '../../api/config'

type Props = {
  effective: EffectiveConfig
  sources: SourceMap
  isDirty: (keyPath: string) => boolean
  onChange: (keyPath: string, value: unknown) => void
}

export function SiteMetadata({ effective, sources, isDirty, onChange }: Props) {
  const [pendingBaseURL, setPendingBaseURL] = useState<string | null>(null)
  const [confirmingBaseURL, setConfirmingBaseURL] = useState(false)

  return (
    <fieldset className="settings-section">
      <legend>Site metadata</legend>
      <FieldRow label="Title" source={sources['title']}>
        <input
          type="text"
          value={effective.title}
          aria-label="Title"
          onChange={(e) => onChange('title', e.target.value)}
          className={isDirty('title') ? 'dirty' : ''}
        />
      </FieldRow>
      <FieldRow label="Description" source={sources['params.description']}>
        <input
          type="text"
          value={effective.description}
          aria-label="Description"
          onChange={(e) => onChange('description', e.target.value)}
          className={isDirty('description') ? 'dirty' : ''}
        />
      </FieldRow>
      <FieldRow label="Language code" source={sources['languageCode']}>
        <input
          type="text"
          value={effective.languageCode}
          aria-label="Language code"
          onChange={(e) => onChange('languageCode', e.target.value)}
          className={isDirty('languageCode') ? 'dirty' : ''}
        />
      </FieldRow>
      <FieldRow label="Base URL" source={sources['baseURL']}>
        <input
          type="text"
          value={pendingBaseURL ?? effective.baseURL}
          aria-label="Base URL"
          onChange={(e) => setPendingBaseURL(e.target.value)}
          onBlur={() => {
            if (pendingBaseURL !== null && pendingBaseURL !== effective.baseURL) {
              setConfirmingBaseURL(true)
            }
          }}
          className={isDirty('baseURL') ? 'dirty' : ''}
        />
      </FieldRow>
      {confirmingBaseURL && pendingBaseURL !== null && (
        <div className="settings-confirm" role="dialog">
          <p>Change site URL? Affects every published page.</p>
          <div className="settings-confirm-buttons">
            <button
              type="button"
              onClick={() => {
                onChange('baseURL', pendingBaseURL)
                setPendingBaseURL(null)
                setConfirmingBaseURL(false)
              }}
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingBaseURL(null)
                setConfirmingBaseURL(false)
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </fieldset>
  )
}
