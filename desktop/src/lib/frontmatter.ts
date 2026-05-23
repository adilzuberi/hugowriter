import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'

export type FrontmatterFormat = 'yaml' | 'toml' | 'none'

export type FrontmatterSplit = {
  format: FrontmatterFormat
  raw: string // the frontmatter block including delimiters and trailing newline, or '' when format === 'none'
  body: string // everything after the frontmatter block
}

export type KnownFields = {
  title?: string
  date?: string
  draft?: boolean
  tags?: string[]
  categories?: string[]
  description?: string
  slug?: string
  weight?: number
}

export type ParsedFrontmatter = {
  known: KnownFields
  unknown: Array<[string, unknown]>
  keyOrder: string[]
}

const KNOWN_KEYS = new Set([
  'title',
  'date',
  'draft',
  'tags',
  'categories',
  'description',
  'slug',
  'weight',
])

const YAML_DELIM = /^---\s*\r?\n/
const TOML_DELIM = /^\+\+\+\s*\r?\n/

export function splitFrontmatter(text: string): FrontmatterSplit {
  if (YAML_DELIM.test(text)) {
    return splitWith(text, '---')
  }
  if (TOML_DELIM.test(text)) {
    return splitWith(text, '+++')
  }
  return { format: 'none', raw: '', body: text }
}

function splitWith(text: string, marker: string): FrontmatterSplit {
  const format: FrontmatterFormat = marker === '---' ? 'yaml' : 'toml'
  // Skip the opening delimiter line.
  const afterFirst = text.indexOf('\n') + 1
  const rest = text.slice(afterFirst)
  // Find the closing delimiter on its own line.
  const closeRegex = new RegExp(`(^|\\n)${escape(marker)}\\s*(\\r?\\n|$)`)
  const match = closeRegex.exec(rest)
  if (!match) {
    // Unterminated frontmatter — treat as no frontmatter so the file isn't lost.
    return { format: 'none', raw: '', body: text }
  }
  const closeStart = match.index + (match[1] === '\n' ? 1 : 0)
  const closeEnd = match.index + match[0].length
  const raw = text.slice(0, afterFirst + closeEnd)
  const body = text.slice(afterFirst + closeEnd)
  return { format, raw, body }
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function parseFrontmatter(raw: string, format: FrontmatterFormat): ParsedFrontmatter {
  if (format === 'none' || !raw) {
    return { known: {}, unknown: [], keyOrder: [] }
  }
  const inner = stripDelimiters(raw, format)
  const parsed = format === 'yaml' ? parseYaml(inner) ?? {} : parseToml(inner)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { known: {}, unknown: [], keyOrder: [] }
  }
  const obj = parsed as Record<string, unknown>
  const keyOrder = Object.keys(obj)
  const known: KnownFields = {}
  const unknown: Array<[string, unknown]> = []
  for (const key of keyOrder) {
    const value = obj[key]
    if (KNOWN_KEYS.has(key)) {
      assignKnown(known, key, value)
    } else {
      unknown.push([key, value])
    }
  }
  return { known, unknown, keyOrder }
}

function stripDelimiters(raw: string, format: FrontmatterFormat): string {
  const delim = format === 'yaml' ? '---' : '+++'
  const afterFirst = raw.indexOf('\n') + 1
  const rest = raw.slice(afterFirst)
  const closeRegex = new RegExp(`(^|\\n)${escape(delim)}\\s*(\\r?\\n|$)`)
  const match = closeRegex.exec(rest)
  if (!match) return rest
  const closeStart = match.index + (match[1] === '\n' ? 1 : 0)
  return rest.slice(0, closeStart)
}

function assignKnown(known: KnownFields, key: string, value: unknown): void {
  switch (key) {
    case 'title':
    case 'description':
    case 'slug':
      if (typeof value === 'string') known[key] = value
      break
    case 'date':
      if (typeof value === 'string') known.date = value
      else if (value instanceof Date) known.date = value.toISOString()
      break
    case 'draft':
      if (typeof value === 'boolean') known.draft = value
      break
    case 'weight':
      if (typeof value === 'number') known.weight = value
      break
    case 'tags':
    case 'categories':
      if (Array.isArray(value)) {
        known[key] = value.filter((v) => typeof v === 'string') as string[]
      }
      break
  }
}

export function serializeFrontmatter(
  format: FrontmatterFormat,
  parsed: ParsedFrontmatter,
): string {
  if (format === 'none') return ''
  const obj: Record<string, unknown> = {}
  for (const key of parsed.keyOrder) {
    if (KNOWN_KEYS.has(key)) {
      if (key in parsed.known && (parsed.known as Record<string, unknown>)[key] !== undefined) {
        obj[key] = (parsed.known as Record<string, unknown>)[key]
      }
    } else {
      const pair = parsed.unknown.find(([k]) => k === key)
      if (pair) obj[key] = pair[1]
    }
  }
  // Include known keys that weren't in the original keyOrder (newly added).
  for (const [k, v] of Object.entries(parsed.known)) {
    if (!(k in obj) && v !== undefined) obj[k] = v
  }
  // Include unknown keys that weren't in the original keyOrder.
  for (const [k, v] of parsed.unknown) {
    if (!(k in obj)) obj[k] = v
  }
  const inner = format === 'yaml' ? stringifyYaml(obj) : stringifyToml(obj) + '\n'
  const delim = format === 'yaml' ? '---' : '+++'
  return `${delim}\n${inner}${delim}\n`
}

export type RecombineInput = {
  format: FrontmatterFormat
  rawOriginal: string
  body: string
  parsed: ParsedFrontmatter
  dirty: boolean
}

export function recombine(input: RecombineInput): string {
  if (input.format === 'none') return input.body
  const raw = input.dirty ? serializeFrontmatter(input.format, input.parsed) : input.rawOriginal
  return raw + input.body
}
