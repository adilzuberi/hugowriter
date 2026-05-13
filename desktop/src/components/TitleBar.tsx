import { useEffect, useState } from 'react'
import { getVersion } from '@tauri-apps/api/app'

type Props = {
  file: string | null
  dirty: boolean
}

function basename(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? path
}

export function TitleBar({ file, dirty }: Props) {
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => undefined)
  }, [])

  return (
    <div className="title-bar">
      <span className="filename">
        {dirty && <span aria-label="Unsaved changes">• </span>}
        {file ? basename(file) : 'Hugowriter'}
      </span>
      {version && <span className="version-pill">v{version}</span>}
    </div>
  )
}
