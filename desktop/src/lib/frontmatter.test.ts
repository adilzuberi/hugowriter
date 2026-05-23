import { describe, it, expect } from 'vitest'
import {
  splitFrontmatter,
  parseFrontmatter,
  recombine,
  serializeFrontmatter,
} from './frontmatter'

const YAML_FILE = `---
title: Hello world
date: 2026-05-23T10:00:00Z
draft: false
tags:
  - alpha
  - beta
description: A first post
slug: hello
weight: 10
custom: foo
---
# Body heading

Body paragraph.
`

const TOML_FILE = `+++
title = "Hello"
date = "2026-05-23T10:00:00Z"
draft = false
tags = ["alpha", "beta"]
+++
# Body
`

describe('splitFrontmatter', () => {
  it('splits a YAML file into delimiters + body', () => {
    const { format, raw, body } = splitFrontmatter(YAML_FILE)
    expect(format).toBe('yaml')
    expect(raw.startsWith('---\n')).toBe(true)
    expect(raw.endsWith('---\n')).toBe(true)
    expect(body.startsWith('# Body heading')).toBe(true)
  })

  it('splits a TOML file into delimiters + body', () => {
    const { format, raw, body } = splitFrontmatter(TOML_FILE)
    expect(format).toBe('toml')
    expect(raw.startsWith('+++\n')).toBe(true)
    expect(raw.endsWith('+++\n')).toBe(true)
    expect(body.startsWith('# Body')).toBe(true)
  })

  it('returns format none for plain markdown', () => {
    const text = '# Just a heading\n\nNo frontmatter.\n'
    const { format, raw, body } = splitFrontmatter(text)
    expect(format).toBe('none')
    expect(raw).toBe('')
    expect(body).toBe(text)
  })

  it('treats unterminated frontmatter as none, preserving the whole file', () => {
    const text = '---\ntitle: oops\n\nno closing delimiter\n'
    const { format, body } = splitFrontmatter(text)
    expect(format).toBe('none')
    expect(body).toBe(text)
  })
})

describe('parseFrontmatter', () => {
  it('separates known YAML fields from unknown', () => {
    const { raw, format } = splitFrontmatter(YAML_FILE)
    const parsed = parseFrontmatter(raw, format)
    expect(parsed.known.title).toBe('Hello world')
    expect(parsed.known.draft).toBe(false)
    expect(parsed.known.tags).toEqual(['alpha', 'beta'])
    expect(parsed.known.weight).toBe(10)
    expect(parsed.unknown).toEqual([['custom', 'foo']])
    expect(parsed.keyOrder).toContain('custom')
  })

  it('parses TOML frontmatter', () => {
    const { raw, format } = splitFrontmatter(TOML_FILE)
    const parsed = parseFrontmatter(raw, format)
    expect(parsed.known.title).toBe('Hello')
    expect(parsed.known.draft).toBe(false)
    expect(parsed.known.tags).toEqual(['alpha', 'beta'])
  })
})

describe('recombine', () => {
  it('round-trips byte-identically when nothing is dirty', () => {
    const { format, raw, body } = splitFrontmatter(YAML_FILE)
    const parsed = parseFrontmatter(raw, format)
    const out = recombine({ format, rawOriginal: raw, body, parsed, dirty: false })
    expect(out).toBe(YAML_FILE)
  })

  it('re-serialises when dirty, preserving body verbatim', () => {
    const { format, raw, body } = splitFrontmatter(YAML_FILE)
    const parsed = parseFrontmatter(raw, format)
    parsed.known.title = 'Hello edited'
    const out = recombine({ format, rawOriginal: raw, body, parsed, dirty: true })
    expect(out).toContain('title: Hello edited')
    expect(out.endsWith(body)).toBe(true)
  })
})

describe('serializeFrontmatter', () => {
  it('keeps unknown keys in their original position', () => {
    const { raw, format } = splitFrontmatter(YAML_FILE)
    const parsed = parseFrontmatter(raw, format)
    const out = serializeFrontmatter(format, parsed)
    const titlePos = out.indexOf('title:')
    const customPos = out.indexOf('custom:')
    expect(titlePos).toBeGreaterThan(-1)
    expect(customPos).toBeGreaterThan(titlePos)
  })

  it('emits empty string when format is none', () => {
    expect(serializeFrontmatter('none', { known: {}, unknown: [], keyOrder: [] })).toBe('')
  })
})
