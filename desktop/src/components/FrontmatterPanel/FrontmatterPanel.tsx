import { useState } from 'react'
import { ChipInput } from './ChipInput'
import type { FrontmatterEditor } from '../../hooks/useFrontmatterEditor'

type Props = {
  editor: FrontmatterEditor
}

export function FrontmatterPanel({ editor }: Props) {
  const [open, setOpen] = useState(true)

  if (editor.format === 'none') {
    return null
  }

  return (
    <section className="frontmatter-panel" aria-label="Frontmatter">
      <button
        type="button"
        className="fm-toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="fm-toggle-caret">{open ? '▾' : '▸'}</span>
        <span>Frontmatter ({editor.format.toUpperCase()})</span>
      </button>
      {open && (
        <div className="fm-body">
          <label className="fm-field">
            <span className="fm-field-label">Title</span>
            <input
              type="text"
              value={editor.known.title ?? ''}
              onChange={(e) => editor.setKnown('title', e.target.value)}
            />
          </label>

          <label className="fm-field">
            <span className="fm-field-label">Date</span>
            <input
              type="datetime-local"
              value={toDatetimeLocal(editor.known.date)}
              onChange={(e) => editor.setKnown('date', fromDatetimeLocal(e.target.value))}
            />
          </label>

          <label className="fm-field fm-field-toggle">
            <span className="fm-field-label">Draft</span>
            <input
              type="checkbox"
              checked={editor.known.draft ?? false}
              onChange={(e) => editor.setKnown('draft', e.target.checked)}
            />
          </label>

          <ChipInput
            label="Tags"
            value={editor.known.tags ?? []}
            onChange={(next) => editor.setKnown('tags', next)}
          />

          <ChipInput
            label="Categories"
            value={editor.known.categories ?? []}
            onChange={(next) => editor.setKnown('categories', next)}
          />

          <label className="fm-field">
            <span className="fm-field-label">Description</span>
            <input
              type="text"
              value={editor.known.description ?? ''}
              onChange={(e) => editor.setKnown('description', e.target.value)}
            />
          </label>

          <label className="fm-field">
            <span className="fm-field-label">Slug</span>
            <input
              type="text"
              value={editor.known.slug ?? ''}
              onChange={(e) => editor.setKnown('slug', e.target.value)}
            />
          </label>

          <label className="fm-field">
            <span className="fm-field-label">Weight</span>
            <input
              type="number"
              value={editor.known.weight ?? ''}
              onChange={(e) => {
                const raw = e.target.value
                editor.setKnown('weight', raw === '' ? undefined : Number(raw))
              }}
            />
          </label>

          {editor.unknown.length > 0 && (
            <>
              <h3 className="fm-section-label">Other fields</h3>
              {editor.unknown.map(([key, value]) => (
                <label key={key} className="fm-field">
                  <span className="fm-field-label">{key}</span>
                  <input
                    type="text"
                    value={typeof value === 'string' ? value : JSON.stringify(value)}
                    onChange={(e) => editor.setUnknown(key, e.target.value)}
                  />
                </label>
              ))}
            </>
          )}
        </div>
      )}
    </section>
  )
}

function toDatetimeLocal(value: string | undefined): string {
  if (!value) return ''
  // Trim seconds-and-zone if present so the native datetime-local input accepts it.
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(value)
  return m ? `${m[1]}T${m[2]}` : ''
}

function fromDatetimeLocal(value: string): string | undefined {
  if (!value) return undefined
  // Preserve the user's wall-clock by appending :00Z — Hugo treats ISO-8601 sanely.
  return `${value}:00Z`
}
