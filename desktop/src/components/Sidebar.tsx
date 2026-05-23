import type { FileNode } from '../lib/treeFilter'
import { FileTree } from './FileTree'

type Props = {
  folder: string
  tree: FileNode[]
  expanded: Set<string>
  selectedPath: string | null
  errorMessage: string | null
  recentFiles: string[]
  onToggleDir: (path: string) => void
  onFileClick: (node: FileNode) => void
  onOpenRecent: (path: string) => void
  onChangeFolder: () => void
}

function basename(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? path
}

export function Sidebar({
  folder,
  tree,
  expanded,
  selectedPath,
  errorMessage,
  recentFiles,
  onToggleDir,
  onFileClick,
  onOpenRecent,
  onChangeFolder,
}: Props) {
  const inFolderRecent = recentFiles.filter((p) => p.startsWith(folder + '/'))
  return (
    <aside className="sidebar" aria-label="File tree">
      <header className="sidebar-header">
        <span className="folder-name" title={folder}>
          {basename(folder)}
        </span>
        <button type="button" className="link" onClick={onChangeFolder}>
          Change
        </button>
      </header>
      {inFolderRecent.length > 0 && (
        <details className="sidebar-recent" open>
          <summary>Recent</summary>
          <ul className="sidebar-recent-list">
            {inFolderRecent.map((path) => (
              <li key={path}>
                <button
                  type="button"
                  className="sidebar-recent-item"
                  title={path}
                  onClick={() => onOpenRecent(path)}
                >
                  {basename(path)}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {errorMessage && (
        <div className="sidebar-error" role="alert">
          {errorMessage}
        </div>
      )}
      <div className="sidebar-body">
        {tree.length === 0 ? (
          <p className="muted empty-tree">
            No markdown files in this folder. Try a different folder.
          </p>
        ) : (
          <FileTree
            nodes={tree}
            expanded={expanded}
            selectedPath={selectedPath}
            onToggle={onToggleDir}
            onFileClick={onFileClick}
          />
        )}
      </div>
    </aside>
  )
}
