import { useCallback, useEffect, useRef, useState } from 'react'
import {
  HUGO_PORT,
  startHugoServer,
  stopHugoServer,
  probeHugoAvailable,
  type HugoServerHandle,
} from '../api/hugoServer'

export type HugoServerStatus =
  | { kind: 'idle' }
  | { kind: 'probing' }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'starting' }
  | { kind: 'running'; port: number }
  | { kind: 'error'; reason: string }

export function useHugoServer(siteRoot: string | null, active: boolean) {
  const [status, setStatus] = useState<HugoServerStatus>({ kind: 'idle' })
  const handleRef = useRef<HugoServerHandle | null>(null)
  const generationRef = useRef(0)

  const stop = useCallback(async () => {
    const handle = handleRef.current
    handleRef.current = null
    if (handle) await stopHugoServer(handle)
  }, [])

  useEffect(() => {
    if (!active || !siteRoot) {
      void stop().then(() => setStatus({ kind: 'idle' }))
      return
    }
    const gen = ++generationRef.current
    let cancelled = false

    const run = async () => {
      setStatus({ kind: 'probing' })
      const ok = await probeHugoAvailable()
      if (cancelled || gen !== generationRef.current) return
      if (!ok) {
        setStatus({
          kind: 'unavailable',
          reason: 'Hugo not found on PATH. Install Hugo to enable Mode 2.',
        })
        return
      }
      setStatus({ kind: 'starting' })
      try {
        const handle = await startHugoServer(siteRoot)
        if (cancelled || gen !== generationRef.current) {
          await stopHugoServer(handle)
          return
        }
        handleRef.current = handle
        setStatus({ kind: 'running', port: handle.port })
      } catch (err) {
        if (cancelled || gen !== generationRef.current) return
        setStatus({ kind: 'error', reason: String(err) })
      }
    }

    void run()
    return () => {
      cancelled = true
      void stop()
    }
  }, [siteRoot, active, stop])

  // Clean up the child if the window unloads.
  useEffect(() => {
    const handler = () => {
      const h = handleRef.current
      if (h) void stopHugoServer(h)
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  return { status, port: HUGO_PORT }
}
