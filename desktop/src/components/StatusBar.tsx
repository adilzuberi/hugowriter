import { useCallback, useState } from 'react'
import { runHugoBuild, type HugoBuildResult } from '../api/hugoBuild'

type Props = {
  siteRoot: string | null
  dirty: boolean
  onBeforeBuild?: () => Promise<void>
}

type BuildStatus =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'success'; at: number }
  | { kind: 'failure'; result: HugoBuildResult }

export function StatusBar({ siteRoot, dirty, onBeforeBuild }: Props) {
  const [status, setStatus] = useState<BuildStatus>({ kind: 'idle' })

  const handleBuild = useCallback(async () => {
    if (!siteRoot) return
    setStatus({ kind: 'running' })
    try {
      if (onBeforeBuild) await onBeforeBuild()
      const result = await runHugoBuild(siteRoot)
      setStatus(
        result.ok
          ? { kind: 'success', at: Date.now() }
          : { kind: 'failure', result },
      )
    } catch (err) {
      setStatus({
        kind: 'failure',
        result: { ok: false, code: -1, stdout: '', stderr: String(err) },
      })
    }
  }, [siteRoot, onBeforeBuild])

  return (
    <div className="status-bar">
      <span className="status-bar-state">{describe(status, dirty)}</span>
      <button
        type="button"
        className="status-bar-build"
        disabled={!siteRoot || status.kind === 'running'}
        onClick={handleBuild}
      >
        {status.kind === 'running' ? 'Building…' : 'Save + Hugo build'}
      </button>
    </div>
  )
}

function describe(status: BuildStatus, dirty: boolean): string {
  if (status.kind === 'running') return 'Running hugo…'
  if (status.kind === 'failure') {
    const tail = status.result.stderr.trim().split('\n').slice(-1)[0]
    return `Build failed: ${tail || `exit ${status.result.code}`}`
  }
  if (status.kind === 'success') {
    return `Build OK — ${new Date(status.at).toLocaleTimeString()}`
  }
  return dirty ? 'Unsaved changes' : 'Ready'
}
