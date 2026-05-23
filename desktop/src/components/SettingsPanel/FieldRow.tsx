import type { ReactNode } from 'react'

type Props = {
  label: string
  source?: string
  children: ReactNode
}

export function FieldRow({ label, source, children }: Props) {
  return (
    <label className="settings-field">
      <span className="settings-field-label">{label}</span>
      <span className="settings-field-control">{children}</span>
      {source && (
        <span className="settings-field-source" title={source}>
          {short(source)}
        </span>
      )}
    </label>
  )
}

function short(file: string): string {
  const m = /(config\/[^\/]+\/[^\/]+\.toml|[^\/]+\.toml)$/.exec(file)
  return m ? m[1] : file
}
