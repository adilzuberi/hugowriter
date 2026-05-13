export type FileNode = {
  name: string
  path: string
  kind: 'file' | 'dir'
  children?: FileNode[]
}

const ALLOWED_FILE_EXTS = ['.md', '.mdx']
const EXTRA_BLOCKED_NAMES = new Set(['node_modules'])

export function isHiddenName(name: string): boolean {
  if (name.startsWith('.')) return true
  if (EXTRA_BLOCKED_NAMES.has(name)) return true
  return false
}

export function isMarkdownFile(name: string): boolean {
  const lower = name.toLowerCase()
  return ALLOWED_FILE_EXTS.some((ext) => lower.endsWith(ext))
}

export function filterTree(nodes: FileNode[]): FileNode[] {
  const kept: FileNode[] = []
  for (const node of nodes) {
    if (isHiddenName(node.name)) continue
    if (node.kind === 'dir') {
      const children = filterTree(node.children ?? [])
      if (children.length === 0) continue
      kept.push({ ...node, children })
    } else if (isMarkdownFile(node.name)) {
      kept.push(node)
    }
  }
  kept.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return kept
}
