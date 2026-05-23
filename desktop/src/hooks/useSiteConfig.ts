import { useCallback, useEffect, useRef, useState } from 'react'
import {
  configLoad,
  configWrite,
  configTouchSentinel,
  type ConfigLoadResult,
  type EffectiveConfig,
  type ThemeSettings,
} from '../api/config'

export type SiteConfigStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'loaded'; data: ConfigLoadResult; dirty: DirtyState }
  | { kind: 'error'; reason: string }

export type DirtyState = {
  [keyPath: string]: { value: unknown; file: string }
}

export function useSiteConfig(siteRoot: string | null) {
  const [status, setStatus] = useState<SiteConfigStatus>({ kind: 'idle' })
  const statusRef = useRef(status)
  statusRef.current = status

  useEffect(() => {
    if (!siteRoot) {
      setStatus({ kind: 'idle' })
      return
    }
    let cancelled = false
    setStatus({ kind: 'loading' })
    configLoad(siteRoot)
      .then((data) => {
        if (cancelled) return
        setStatus({ kind: 'loaded', data, dirty: {} })
      })
      .catch((err) => {
        if (cancelled) return
        setStatus({ kind: 'error', reason: String(err) })
      })
    return () => {
      cancelled = true
    }
  }, [siteRoot])

  const setField = useCallback((keyPath: string, value: unknown) => {
    setStatus((s) => {
      if (s.kind !== 'loaded') return s
      const file =
        s.data.sources[keyPath] ??
        s.data.sources[parentKey(keyPath)] ??
        firstSource(s.data.sources, keyPath)
      if (!file) return s
      const next = cloneEffective(s.data.effective)
      applyToEffective(next, keyPath, value)
      return {
        kind: 'loaded',
        data: { ...s.data, effective: next },
        dirty: { ...s.dirty, [keyPath]: { value, file } },
      }
    })
  }, [])

  const save = useCallback(async () => {
    if (!siteRoot) return
    const snapshot = statusRef.current
    if (snapshot.kind !== 'loaded') return
    const writes = Object.entries(snapshot.dirty)
    if (writes.length === 0) return
    for (const [keyPath, payload] of writes) {
      await configWrite(payload.file, keyPath, payload.value)
    }
    await configTouchSentinel(siteRoot)
    const next = await configLoad(siteRoot)
    setStatus({ kind: 'loaded', data: next, dirty: {} })
  }, [siteRoot])

  return { status, setField, save }
}

function parentKey(keyPath: string): string {
  const idx = keyPath.lastIndexOf('.')
  return idx === -1 ? '' : keyPath.slice(0, idx)
}

function firstSource(sources: Record<string, string>, keyPath: string): string | undefined {
  const top = keyPath.split('.')[0]
  for (const [k, v] of Object.entries(sources)) {
    if (k === top || k.startsWith(top + '.')) return v
  }
  return Object.values(sources)[0]
}

function cloneEffective(eff: EffectiveConfig): EffectiveConfig {
  return {
    ...eff,
    params: { theme: { ...eff.params.theme } },
  }
}

function applyToEffective(eff: EffectiveConfig, keyPath: string, value: unknown): void {
  switch (keyPath) {
    case 'title':
      eff.title = String(value)
      return
    case 'description':
      eff.description = String(value)
      return
    case 'languageCode':
      eff.languageCode = String(value)
      return
    case 'baseURL':
      eff.baseURL = String(value)
      return
    case 'theme.preset':
      eff.params.theme.preset = value as ThemeSettings['preset']
      return
    case 'theme.basePx':
      eff.params.theme.basePx = Number(value)
      return
    case 'theme.accent':
      eff.params.theme.accent = String(value)
      return
  }
}
