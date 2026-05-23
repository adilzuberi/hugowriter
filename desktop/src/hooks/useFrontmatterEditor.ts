import { useCallback, useMemo, useRef } from 'react'
import {
  splitFrontmatter,
  parseFrontmatter,
  recombine,
  type FrontmatterFormat,
  type KnownFields,
  type ParsedFrontmatter,
} from '../lib/frontmatter'

export type FrontmatterEditor = {
  format: FrontmatterFormat
  known: KnownFields
  unknown: Array<[string, unknown]>
  body: string
  setKnown: <K extends keyof KnownFields>(key: K, value: KnownFields[K]) => void
  setUnknown: (key: string, value: string) => void
  setBody: (body: string) => void
}

type DerivedState = {
  format: FrontmatterFormat
  raw: string
  body: string
  parsed: ParsedFrontmatter
}

function derive(content: string): DerivedState {
  const { format, raw, body } = splitFrontmatter(content)
  const parsed = parseFrontmatter(raw, format)
  return { format, raw, body, parsed }
}

export function useFrontmatterEditor(
  content: string,
  onContentChange: (next: string) => void,
): FrontmatterEditor {
  const derived = useMemo(() => derive(content), [content])
  // Track whether the user has touched the frontmatter panel for this file. The hook
  // resets this when the underlying content arrives clean from disk; updates set it true.
  const fmDirtyRef = useRef(false)
  const lastRawRef = useRef(derived.raw)
  if (lastRawRef.current !== derived.raw && !fmDirtyRef.current) {
    lastRawRef.current = derived.raw
  }

  const commit = useCallback(
    (next: ParsedFrontmatter, nextBody?: string) => {
      fmDirtyRef.current = true
      const out = recombine({
        format: derived.format,
        rawOriginal: derived.raw,
        body: nextBody ?? derived.body,
        parsed: next,
        dirty: true,
      })
      onContentChange(out)
    },
    [derived.format, derived.raw, derived.body, onContentChange],
  )

  const setKnown = useCallback(
    <K extends keyof KnownFields>(key: K, value: KnownFields[K]) => {
      const nextKnown: KnownFields = { ...derived.parsed.known }
      if (value === undefined) {
        delete nextKnown[key]
      } else {
        nextKnown[key] = value
      }
      const keyOrder = derived.parsed.keyOrder.includes(key as string)
        ? derived.parsed.keyOrder
        : [...derived.parsed.keyOrder, key as string]
      commit({ known: nextKnown, unknown: derived.parsed.unknown, keyOrder })
    },
    [derived.parsed, commit],
  )

  const setUnknown = useCallback(
    (key: string, value: string) => {
      const idx = derived.parsed.unknown.findIndex(([k]) => k === key)
      const nextUnknown: Array<[string, unknown]> =
        idx >= 0
          ? derived.parsed.unknown.map(([k, v], i) => (i === idx ? [k, value] : [k, v]))
          : [...derived.parsed.unknown, [key, value]]
      const keyOrder = derived.parsed.keyOrder.includes(key)
        ? derived.parsed.keyOrder
        : [...derived.parsed.keyOrder, key]
      commit({ known: derived.parsed.known, unknown: nextUnknown, keyOrder })
    },
    [derived.parsed, commit],
  )

  const setBody = useCallback(
    (nextBody: string) => {
      if (derived.format === 'none') {
        onContentChange(nextBody)
        return
      }
      // Body-only edits should not mark the frontmatter dirty — preserve the original raw block.
      const out = recombine({
        format: derived.format,
        rawOriginal: derived.raw,
        body: nextBody,
        parsed: derived.parsed,
        dirty: fmDirtyRef.current,
      })
      onContentChange(out)
    },
    [derived.format, derived.raw, derived.parsed, onContentChange],
  )

  return {
    format: derived.format,
    known: derived.parsed.known,
    unknown: derived.parsed.unknown,
    body: derived.body,
    setKnown,
    setUnknown,
    setBody,
  }
}
