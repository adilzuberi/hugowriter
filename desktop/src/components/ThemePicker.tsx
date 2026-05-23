import type { ThemeDescriptor } from '../api/themes'

type Props = {
  themes: ThemeDescriptor[]
  selected: string | null
  onSelect: (themeId: string) => void
}

export function ThemePicker({ themes, selected, onSelect }: Props) {
  if (themes.length === 0) {
    return (
      <span className="theme-picker theme-picker-empty" aria-label="Theme">
        No themes detected
      </span>
    )
  }
  return (
    <label className="theme-picker">
      <span className="theme-picker-label">Theme</span>
      <select
        value={selected ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        aria-label="Theme"
      >
        {themes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label} {t.source === 'module' ? '(module)' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}
