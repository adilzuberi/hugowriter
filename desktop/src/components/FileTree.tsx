import type { FileNode } from '../lib/treeFilter'

type Props = {
  nodes: FileNode[]
  expanded: Set<string>
  selectedPath: string | null
  onToggle: (path: string) => void
  onFileClick: (node: FileNode) => void
}

export function FileTree({ nodes, expanded, selectedPath, onToggle, onFileClick }: Props) {
  return (
    <ul className="file-tree" role="tree">
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          expanded={expanded}
          selectedPath={selectedPath}
          onToggle={onToggle}
          onFileClick={onFileClick}
        />
      ))}
    </ul>
  )
}

type NodeProps = {
  node: FileNode
  depth: number
  expanded: Set<string>
  selectedPath: string | null
  onToggle: (path: string) => void
  onFileClick: (node: FileNode) => void
}

function TreeNode({
  node,
  depth,
  expanded,
  selectedPath,
  onToggle,
  onFileClick,
}: NodeProps) {
  const isDir = node.kind === 'dir'
  const isOpen = expanded.has(node.path)
  const isSelected = selectedPath === node.path
  const indent = { paddingLeft: `${0.5 + depth * 0.75}rem` }

  if (isDir) {
    return (
      <li role="treeitem" aria-expanded={isOpen}>
        <button
          type="button"
          className="tree-row dir"
          style={indent}
          onClick={() => onToggle(node.path)}
        >
          <span className="caret" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
          <span className="name">{node.name}</span>
        </button>
        {isOpen && node.children && node.children.length > 0 && (
          <ul role="group">
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                selectedPath={selectedPath}
                onToggle={onToggle}
                onFileClick={onFileClick}
              />
            ))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <li role="treeitem" aria-selected={isSelected}>
      <button
        type="button"
        className={`tree-row file${isSelected ? ' selected' : ''}`}
        style={indent}
        onClick={() => onFileClick(node)}
      >
        <span className="caret" aria-hidden="true">·</span>
        <span className="name">{node.name}</span>
      </button>
    </li>
  )
}
