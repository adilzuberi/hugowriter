import { FieldRow } from './FieldRow'
import type { EffectiveConfig, SourceMap } from '../../api/config'

type Props = {
  effective: EffectiveConfig
  sources: SourceMap
  isDirty: (keyPath: string) => boolean
  onChange: (keyPath: string, value: unknown) => void
}

const PRESETS = ['focus-stock', 'edevanrich'] as const

export function ThemeSettings({ effective, sources, isDirty, onChange }: Props) {
  const theme = effective.params.theme
  const px = theme.basePx
  const pxWarn = px < 12 || px > 32

  return (
    <fieldset className="settings-section">
      <legend>Theme</legend>

      <FieldRow label="Preset" source={sources['theme.preset']}>
        <div role="radiogroup" aria-label="Preset">
          {PRESETS.map((p) => (
            <label key={p} className="settings-radio">
              <input
                type="radio"
                name="theme-preset"
                value={p}
                checked={theme.preset === p}
                onChange={() => onChange('theme.preset', p)}
              />
              {p}
            </label>
          ))}
        </div>
      </FieldRow>

      <FieldRow label="Base font-size (px)" source={sources['theme.basePx']}>
        <input
          type="number"
          value={px}
          min={8}
          max={48}
          aria-label="Base font-size"
          onChange={(e) => onChange('theme.basePx', Number(e.target.value))}
          className={isDirty('theme.basePx') ? 'dirty' : ''}
        />
        {pxWarn && (
          <span className="settings-field-warn">Outside impact-css range (12–32)</span>
        )}
      </FieldRow>

      <FieldRow label="Accent colour" source={sources['theme.accent']}>
        <input
          type="color"
          value={normaliseColour(theme.accent)}
          aria-label="Accent colour"
          onChange={(e) => onChange('theme.accent', e.target.value)}
          className={isDirty('theme.accent') ? 'dirty' : ''}
        />
        <span className="settings-field-hex">{theme.accent}</span>
      </FieldRow>
    </fieldset>
  )
}

function normaliseColour(hex: string): string {
  const trimmed = hex.trim()
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}
