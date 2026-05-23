import { useEffect, useRef, useState } from 'react'
import type { HugoServerStatus } from '../hooks/useHugoServer'

type Props = {
  status: HugoServerStatus
  dirty: boolean
  fileSavedAt: number | null
}

export function HugoIframe({ status, dirty, fileSavedAt }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Re-mount the iframe whenever a file save lands; Hugo's LiveReload normally
  // handles this in-page, but a hard reload covers the case where the reload
  // socket isn't connected yet.
  useEffect(() => {
    if (fileSavedAt) setReloadKey((k) => k + 1)
  }, [fileSavedAt])

  if (status.kind === 'idle' || status.kind === 'probing' || status.kind === 'starting') {
    return (
      <div className="hugo-iframe-pending" role="status">
        Starting Hugo preview…
      </div>
    )
  }

  if (status.kind === 'unavailable') {
    return (
      <div className="hugo-iframe-error" role="alert">
        <p>{status.reason}</p>
        <p className="muted">Install via Homebrew: <code>brew install hugo</code></p>
      </div>
    )
  }

  if (status.kind === 'error') {
    return (
      <div className="hugo-iframe-error" role="alert">
        Hugo preview failed: {status.reason}
      </div>
    )
  }

  const src = `http://127.0.0.1:${status.port}/?_=${reloadKey}`
  return (
    <iframe
      ref={iframeRef}
      key={reloadKey}
      title="Hugo preview"
      src={src}
      className={`hugo-iframe ${dirty ? 'hugo-iframe-dirty' : ''}`}
    />
  )
}
