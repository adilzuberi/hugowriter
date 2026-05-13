import { open } from '@tauri-apps/plugin-dialog'
import { readDir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { filterTree, type FileNode } from '../lib/treeFilter'

export type { FileNode } from '../lib/treeFilter'

export async function pickFolder(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false })
  if (typeof selected === 'string') return selected
  return null
}

function joinPath(dir: string, name: string): string {
  return dir.endsWith('/') ? dir + name : dir + '/' + name
}

async function readRawChildren(dir: string): Promise<FileNode[]> {
  const entries = await readDir(dir)
  const nodes: FileNode[] = []
  for (const entry of entries) {
    if (!entry.name) continue
    const fullPath = joinPath(dir, entry.name)
    if (entry.isDirectory) {
      const children = await readRawChildren(fullPath).catch(() => [])
      nodes.push({ name: entry.name, path: fullPath, kind: 'dir', children })
    } else {
      nodes.push({ name: entry.name, path: fullPath, kind: 'file' })
    }
  }
  return nodes
}

export async function readTree(root: string): Promise<FileNode[]> {
  const raw = await readRawChildren(root)
  return filterTree(raw)
}

export async function readFile(path: string): Promise<string> {
  return readTextFile(path)
}

export async function writeFile(path: string, content: string): Promise<void> {
  await writeTextFile(path, content)
}
