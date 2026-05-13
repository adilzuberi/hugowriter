import { describe, it, expect } from 'vitest'
import { isHiddenName, isMarkdownFile, filterTree, type FileNode } from './treeFilter'

describe('isHiddenName', () => {
  it('excludes any dot-prefixed name', () => {
    expect(isHiddenName('.git')).toBe(true)
    expect(isHiddenName('.hugo_build.lock')).toBe(true)
    expect(isHiddenName('.DS_Store')).toBe(true)
  })

  it('excludes node_modules', () => {
    expect(isHiddenName('node_modules')).toBe(true)
  })

  it('keeps ordinary names', () => {
    expect(isHiddenName('content')).toBe(false)
    expect(isHiddenName('post.md')).toBe(false)
  })
})

describe('isMarkdownFile', () => {
  it('includes .md and .mdx (case-insensitive)', () => {
    expect(isMarkdownFile('post.md')).toBe(true)
    expect(isMarkdownFile('post.MD')).toBe(true)
    expect(isMarkdownFile('post.mdx')).toBe(true)
    expect(isMarkdownFile('post.MDX')).toBe(true)
  })

  it('excludes other extensions and bare names', () => {
    expect(isMarkdownFile('post.txt')).toBe(false)
    expect(isMarkdownFile('index.html')).toBe(false)
    expect(isMarkdownFile('config')).toBe(false)
    expect(isMarkdownFile('post.markdown')).toBe(false)
  })
})

const F = (name: string, path: string): FileNode => ({ name, path, kind: 'file' })
const D = (name: string, path: string, children: FileNode[]): FileNode => ({
  name,
  path,
  kind: 'dir',
  children,
})

describe('filterTree', () => {
  it('drops hidden files and folders', () => {
    const tree: FileNode[] = [
      F('.DS_Store', '/x/.DS_Store'),
      D('.git', '/x/.git', [F('HEAD', '/x/.git/HEAD')]),
      F('post.md', '/x/post.md'),
    ]
    expect(filterTree(tree)).toEqual([F('post.md', '/x/post.md')])
  })

  it('drops node_modules at any level', () => {
    const tree: FileNode[] = [
      D('node_modules', '/x/node_modules', [F('x.md', '/x/node_modules/x.md')]),
      F('post.md', '/x/post.md'),
    ]
    expect(filterTree(tree)).toEqual([F('post.md', '/x/post.md')])
  })

  it('keeps .md and .mdx files, drops others', () => {
    const tree: FileNode[] = [
      F('post.md', '/x/post.md'),
      F('page.mdx', '/x/page.mdx'),
      F('readme.txt', '/x/readme.txt'),
      F('script.html', '/x/script.html'),
    ]
    expect(filterTree(tree).map((n) => n.name)).toEqual(['page.mdx', 'post.md'])
  })

  it('prunes directories that have no markdown descendants', () => {
    const tree: FileNode[] = [
      D('empty', '/x/empty', []),
      D('text-only', '/x/text-only', [F('a.txt', '/x/text-only/a.txt')]),
      D('keeper', '/x/keeper', [F('a.md', '/x/keeper/a.md')]),
    ]
    expect(filterTree(tree).map((n) => n.name)).toEqual(['keeper'])
  })

  it('preserves nested structure with markdown descendants', () => {
    const tree: FileNode[] = [
      D('content', '/x/content', [
        D('posts', '/x/content/posts', [
          F('2026-05-13.md', '/x/content/posts/2026-05-13.md'),
        ]),
        F('about.md', '/x/content/about.md'),
      ]),
    ]
    const filtered = filterTree(tree)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]!.name).toBe('content')
    expect(filtered[0]!.children).toHaveLength(2)
    const posts = filtered[0]!.children!.find((n) => n.name === 'posts')!
    expect(posts.children).toHaveLength(1)
    expect(posts.children![0]!.name).toBe('2026-05-13.md')
  })

  it('sorts directories before files; alphabetical within each group', () => {
    const tree: FileNode[] = [
      F('zeta.md', '/x/zeta.md'),
      F('alpha.md', '/x/alpha.md'),
      D('zz', '/x/zz', [F('z.md', '/x/zz/z.md')]),
      D('aa', '/x/aa', [F('a.md', '/x/aa/a.md')]),
    ]
    expect(filterTree(tree).map((n) => n.name)).toEqual(['aa', 'zz', 'alpha.md', 'zeta.md'])
  })
})
