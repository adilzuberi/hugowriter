import { useState, type KeyboardEvent } from 'react'

type Props = {
  label: string
  value: string[]
  onChange: (next: string[]) => void
}

export function ChipInput({ label, value, onChange }: Props) {
  const [draft, setDraft] = useState('')

  const commit = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    if (value.includes(trimmed)) {
      setDraft('')
      return
    }
    onChange([...value, trimmed])
    setDraft('')
  }

  const remove = (chip: string) => {
    onChange(value.filter((v) => v !== chip))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      e.preventDefault()
      onChange(value.slice(0, -1))
    }
  }

  return (
    <label className="fm-field fm-chip-field">
      <span className="fm-field-label">{label}</span>
      <div className="fm-chips">
        {value.map((chip) => (
          <span key={chip} className="fm-chip">
            {chip}
            <button
              type="button"
              className="fm-chip-remove"
              aria-label={`Remove ${chip}`}
              onClick={() => remove(chip)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          className="fm-chip-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          placeholder={value.length === 0 ? 'Add a tag…' : ''}
        />
      </div>
    </label>
  )
}
