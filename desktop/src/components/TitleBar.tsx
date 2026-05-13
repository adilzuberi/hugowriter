type Props = {
  file: string | null
  dirty: boolean
}

function basename(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? path
}

export function TitleBar({ file, dirty }: Props) {
  if (!file) return null
  return (
    <div className="title-bar" role="status" aria-live="polite">
      <span className={dirty ? 'dirty-dot' : 'dirty-dot hidden'} aria-label={dirty ? 'Unsaved changes' : ''}>
        •
      </span>
      <span className="filename">{basename(file)}</span>
    </div>
  )
}
