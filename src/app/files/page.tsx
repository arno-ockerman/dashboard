'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  FolderOpen,
  Folder,
  FileText,
  File,
  ChevronRight,
  ChevronDown,
  Search,
  Edit3,
  Eye,
  Save,
  X,
  Clock,
  Pin,
  BookOpen,
  BarChart2,
  RefreshCw,
  Menu,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileInfo {
  name: string
  path: string
  isDir: boolean
  size: number
  modified: string
  exists?: boolean
}

interface TreeNode extends FileInfo {
  children?: TreeNode[]
  expanded?: boolean
  loaded?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileIcon(name: string, isDir: boolean, expanded?: boolean) {
  if (isDir) {
    return expanded
      ? <FolderOpen className="w-4 h-4 text-brand-amber flex-shrink-0" />
      : <Folder className="w-4 h-4 text-brand-amber flex-shrink-0" />
  }
  if (name.endsWith('.md')) return <FileText className="w-4 h-4 text-brand-green flex-shrink-0" />
  return <File className="w-4 h-4 text-zinc-500 flex-shrink-0" />
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  if (!iso) return 'Unknown'
  const d = new Date(iso)
  return d.toLocaleString('nl-BE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function isReadOnly(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  return !['md'].includes(ext)
}

// ─── Root folders to show ─────────────────────────────────────────────────────

const ROOT_FOLDERS = [
  'memory',
  'life',
  'projects',
  'scripts',
  'skills',
  'brand',
  'missions',
]

// ─── Components ───────────────────────────────────────────────────────────────

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
  onToggle,
  searchQuery,
}: {
  node: TreeNode
  depth: number
  selectedPath: string | null
  onSelect: (node: TreeNode) => void
  onToggle: (node: TreeNode) => void
  searchQuery: string
}) {
  const isSelected = selectedPath === node.path
  const matchesSearch = searchQuery
    ? node.name.toLowerCase().includes(searchQuery.toLowerCase())
    : true

  if (!matchesSearch && !node.isDir) return null

  return (
    <div>
      <button
        onClick={() => node.isDir ? onToggle(node) : onSelect(node)}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left text-sm transition-all duration-150 group ${
          isSelected
            ? 'bg-brand-burgundy/20 border border-brand-burgundy/30 text-white'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {node.isDir ? (
          <span className="flex-shrink-0">
            {node.expanded
              ? <ChevronDown className="w-3 h-3 text-zinc-500" />
              : <ChevronRight className="w-3 h-3 text-zinc-500" />
            }
          </span>
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}
        {getFileIcon(node.name, node.isDir, node.expanded)}
        <span className="truncate text-xs leading-none">{node.name}</span>
      </button>

      {node.isDir && node.expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onToggle={onToggle}
              searchQuery={searchQuery}
            />
          ))}
          {node.children.length === 0 && (
            <div
              className="text-zinc-600 text-xs py-1"
              style={{ paddingLeft: `${8 + (depth + 1) * 16 + 20}px` }}
            >
              Empty
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function QuickAccessBar({
  onSelectPath,
  selectedPath,
}: {
  onSelectPath: (p: string) => void
  selectedPath: string | null
}) {
  const [pinned, setPinned] = useState<FileInfo[]>([])
  const [recent, setRecent] = useState<FileInfo[]>([])
  const [projects, setProjects] = useState<FileInfo[]>([])
  const [research, setResearch] = useState<FileInfo[]>([])
  const [activeTab, setActiveTab] = useState<'recent' | 'pinned' | 'projects' | 'research'>('recent')

  useEffect(() => {
    fetch('/api/files?pinned=true').then(r => r.json()).then(d => setPinned(d.files || []))
    fetch('/api/files?recent=true').then(r => r.json()).then(d => setRecent(d.files || []))
    fetch('/api/files?list=true&dir=life/projects').then(r => r.json()).then(d =>
      setProjects((d.files || []).filter((f: FileInfo) => !f.isDir && f.name.endsWith('.md')))
    )
    fetch('/api/files?list=true&dir=life/resources').then(r => r.json()).then(d =>
      setResearch((d.files || []).filter((f: FileInfo) => !f.isDir && f.name.includes('growth-report')))
    )
  }, [])

  const tabs = [
    { id: 'recent' as const, label: 'Recent', icon: '📋', files: recent },
    { id: 'pinned' as const, label: 'Pinned', icon: '⚡', files: pinned },
    { id: 'projects' as const, label: 'Projects', icon: '📂', files: projects },
    { id: 'research' as const, label: 'Research', icon: '📊', files: research },
  ]

  const currentFiles = tabs.find(t => t.id === activeTab)?.files || []

  return (
    <div className="card mb-4 p-0 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? 'text-white border-brand-burgundy bg-brand-burgundy/10'
                : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-600'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            <span className="text-zinc-600 text-xs">({tab.files.length})</span>
          </button>
        ))}
      </div>

      {/* File chips */}
      <div className="flex flex-wrap gap-2 p-3">
        {currentFiles.length === 0 ? (
          <span className="text-zinc-600 text-xs italic">No files found</span>
        ) : (
          currentFiles.map((f) => (
            <button
              key={f.path}
              onClick={() => onSelectPath(f.path)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all border ${
                selectedPath === f.path
                  ? 'bg-brand-burgundy/20 border-brand-burgundy/40 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
              }`}
            >
              <FileText className="w-3 h-3" />
              {f.name}
              {(f as any).exists === false && (
                <span className="text-zinc-600">(not created yet)</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Markdown components ───────────────────────────────────────────────────────

const markdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-2xl font-bold text-white mb-4 pb-2 border-b border-zinc-800 font-bebas tracking-widest uppercase">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-xl font-semibold text-white mt-6 mb-3 pb-1 border-b border-zinc-800/60">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-base font-semibold text-brand-amber mt-4 mb-2">{children}</h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="text-sm font-semibold text-zinc-300 mt-3 mb-1">{children}</h4>
  ),
  p: ({ children }: any) => (
    <p className="text-zinc-300 mb-3 leading-relaxed text-sm">{children}</p>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc list-inside space-y-1 mb-3 text-zinc-300 text-sm ml-2">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside space-y-1 mb-3 text-zinc-300 text-sm ml-2">{children}</ol>
  ),
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-brand-burgundy pl-4 py-1 my-3 text-zinc-400 italic bg-brand-burgundy/5 rounded-r">
      {children}
    </blockquote>
  ),
  code: ({ inline, children, className }: any) => {
    if (inline) {
      return (
        <code className="bg-zinc-800 text-brand-amber px-1.5 py-0.5 rounded text-xs font-mono">
          {children}
        </code>
      )
    }
    return (
      <pre className="bg-zinc-900 border border-zinc-700/60 rounded-lg p-4 mb-3 overflow-x-auto">
        <code className={`text-xs font-mono text-zinc-300 ${className || ''}`}>{children}</code>
      </pre>
    )
  },
  table: ({ children }: any) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="border-b border-zinc-700">{children}</thead>
  ),
  th: ({ children }: any) => (
    <th className="text-left text-zinc-400 font-semibold px-3 py-2 text-xs uppercase tracking-wide">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="text-zinc-300 px-3 py-2 border-b border-zinc-800/50 text-sm">{children}</td>
  ),
  tr: ({ children }: any) => (
    <tr className="hover:bg-zinc-800/30 transition-colors">{children}</tr>
  ),
  hr: () => <hr className="border-zinc-700 my-4" />,
  a: ({ href, children }: any) => (
    <a href={href} className="text-brand-green hover:text-green-400 underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  strong: ({ children }: any) => <strong className="text-white font-semibold">{children}</strong>,
  em: ({ children }: any) => <em className="text-zinc-300 italic">{children}</em>,
  del: ({ children }: any) => <del className="text-zinc-600 line-through">{children}</del>,
  input: ({ type, checked }: any) => {
    if (type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={checked}
          readOnly
          className="mr-1.5 accent-brand-burgundy"
        />
      )
    }
    return <input type={type} />
  },
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

function LegacyFilesPage() {
  const [tree, setTree] = useState<TreeNode[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [editedContent, setEditedContent] = useState<string>('')
  const [fileModified, setFileModified] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [loadingFile, setLoadingFile] = useState(false)
  const [fileReadOnly, setFileReadOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false)
  const saveStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load root tree on mount
  useEffect(() => {
    loadRootTree()
  }, [])

  async function loadRootTree() {
    const rootNodes: TreeNode[] = []

    // Load each root folder
    for (const folder of ROOT_FOLDERS) {
      const res = await fetch(`/api/files?list=true&dir=`)
      if (res.ok) break // just need to trigger root load
    }

    const res = await fetch(`/api/files?list=true&dir=`)
    if (!res.ok) return
    const data = await res.json()

    const files: FileInfo[] = data.files || []
    const filtered = files.filter(
      (f) => ROOT_FOLDERS.includes(f.name) || (!f.isDir && f.name.endsWith('.md'))
    )

    setTree(filtered.map((f) => ({ ...f, expanded: false, loaded: !f.isDir, children: f.isDir ? [] : undefined })))
  }

  async function loadChildren(node: TreeNode): Promise<TreeNode[]> {
    const res = await fetch(`/api/files?list=true&dir=${encodeURIComponent(node.path)}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.files || []).map((f: FileInfo) => ({
      ...f,
      expanded: false,
      loaded: !f.isDir,
      children: f.isDir ? [] : undefined,
    }))
  }

  function updateTree(
    nodes: TreeNode[],
    targetPath: string,
    update: (node: TreeNode) => TreeNode
  ): TreeNode[] {
    return nodes.map((n) => {
      if (n.path === targetPath) return update(n)
      if (n.children) return { ...n, children: updateTree(n.children, targetPath, update) }
      return n
    })
  }

  async function handleToggle(node: TreeNode) {
    if (!node.isDir) return

    if (!node.loaded) {
      const children = await loadChildren(node)
      setTree((prev) =>
        updateTree(prev, node.path, (n) => ({
          ...n,
          expanded: true,
          loaded: true,
          children,
        }))
      )
    } else {
      setTree((prev) =>
        updateTree(prev, node.path, (n) => ({ ...n, expanded: !n.expanded }))
      )
    }
  }

  async function handleSelectFile(fileOrPath: TreeNode | string) {
    const filePath = typeof fileOrPath === 'string' ? fileOrPath : fileOrPath.path
    setLoadingFile(true)
    setSelectedPath(filePath)
    setIsEditing(false)
    setSaveStatus('idle')
    setMobileTreeOpen(false)

    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(filePath)}`)
      if (!res.ok) {
        const err = await res.json()
        setFileContent(`> ❌ Error loading file: ${err.error || 'Unknown error'}`)
        setEditedContent('')
        setFileModified('')
        setFileReadOnly(true)
      } else {
        const data = await res.json()
        setFileContent(data.content)
        setEditedContent(data.content)
        setFileModified(data.modified)
        setFileReadOnly(data.readOnly)
      }
    } catch (e) {
      setFileContent('> ❌ Failed to fetch file')
      setFileReadOnly(true)
    } finally {
      setLoadingFile(false)
    }
  }

  async function handleSave() {
    if (!selectedPath || fileReadOnly) return
    setSaving(true)
    setSaveStatus('idle')

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedPath, content: editedContent }),
      })

      if (!res.ok) {
        const err = await res.json()
        setSaveError(err.error || 'Save failed')
        setSaveStatus('error')
      } else {
        const data = await res.json()
        setFileContent(editedContent)
        setFileModified(data.modified)
        setSaveStatus('success')
        setIsEditing(false)
      }
    } catch (e) {
      setSaveError(String(e))
      setSaveStatus('error')
    } finally {
      setSaving(false)
      if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current)
      saveStatusTimer.current = setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  function handleCancelEdit() {
    setEditedContent(fileContent)
    setIsEditing(false)
    setSaveStatus('idle')
  }

  const breadcrumbs = selectedPath ? selectedPath.split('/') : []

  const TreePanel = () => (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-burgundy/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {tree.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-zinc-600 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </div>
        ) : (
          tree.map((node) => (
            <TreeItem
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              onSelect={handleSelectFile}
              onToggle={handleToggle}
              searchQuery={searchQuery}
            />
          ))
        )}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full -m-6 lg:-m-8">
      {/* Quick Access Bar */}
      <div className="px-4 lg:px-6 pt-4 lg:pt-6">
        <div className="flex items-center gap-3 mb-3">
          <FolderOpen className="w-6 h-6 text-brand-burgundy" />
          <h1
            className="text-3xl text-white tracking-widest uppercase"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Workspace Files
          </h1>
          {/* Mobile tree toggle */}
          <button
            onClick={() => setMobileTreeOpen(true)}
            className="lg:hidden ml-auto p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
        <QuickAccessBar onSelectPath={(p) => handleSelectFile(p)} selectedPath={selectedPath} />
      </div>

      {/* Main split layout */}
      <div className="flex flex-1 overflow-hidden border-t border-zinc-800">
        {/* Left: Folder Tree (desktop) */}
        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 border-r border-zinc-800 bg-zinc-900/30">
          <div className="p-3 border-b border-zinc-800 bg-zinc-900/50">
            <p className="text-zinc-600 text-xs font-semibold uppercase tracking-widest">Explorer</p>
          </div>
          <div className="flex-1 overflow-hidden">
            <TreePanel />
          </div>
        </aside>

        {/* Mobile tree drawer */}
        {mobileTreeOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/60 z-40"
              onClick={() => setMobileTreeOpen(false)}
            />
            <aside className="lg:hidden fixed top-0 left-0 h-full w-72 bg-zinc-900 border-r border-zinc-800 z-50 flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-zinc-800">
                <p className="text-zinc-400 text-sm font-semibold">Explorer</p>
                <button onClick={() => setMobileTreeOpen(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <TreePanel />
              </div>
            </aside>
          </>
        )}

        {/* Right: Content Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedPath ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <FolderOpen className="w-16 h-16 text-zinc-700 mb-4" />
              <h2 className="text-zinc-400 text-lg font-semibold mb-2">Select a file to view</h2>
              <p className="text-zinc-600 text-sm max-w-sm">
                Browse the folder tree on the left or use the Quick Access bar above to open a file.
              </p>
            </div>
          ) : (
            <>
              {/* File toolbar */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/40 flex-shrink-0">
                {/* Breadcrumb */}
                <div className="flex items-center gap-1 flex-1 min-w-0 text-xs">
                  {breadcrumbs.map((crumb, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <ChevronRight className="w-3 h-3 text-zinc-600 flex-shrink-0" />}
                      <span className={i === breadcrumbs.length - 1 ? 'text-white font-medium truncate' : 'text-zinc-500 truncate'}>
                        {crumb}
                      </span>
                    </span>
                  ))}
                </div>

                {/* Meta */}
                {fileModified && (
                  <div className="hidden md:flex items-center gap-1 text-zinc-600 text-xs flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatDate(fileModified)}
                  </div>
                )}

                {/* Read-only badge */}
                {fileReadOnly && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700 flex-shrink-0">
                    Read-only
                  </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {saveStatus === 'success' && (
                    <span className="flex items-center gap-1 text-green-400 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="flex items-center gap-1 text-red-400 text-xs">
                      <AlertCircle className="w-3.5 h-3.5" /> {saveError}
                    </span>
                  )}

                  {!fileReadOnly && (
                    <>
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleCancelEdit}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                          <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-white bg-brand-burgundy hover:bg-brand-burgundy-light disabled:opacity-50 transition-all"
                          >
                            <Save className="w-3.5 h-3.5" />
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
                    </>
                  )}

                  {isEditing && (
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all"
                      title="Preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Content area */}
              {loadingFile ? (
                <div className="flex-1 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-zinc-600 animate-spin" />
                </div>
              ) : isEditing ? (
                /* Edit mode */
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="flex-1 w-full bg-zinc-950 text-zinc-200 font-mono text-sm p-6 resize-none focus:outline-none border-0 leading-relaxed"
                  placeholder="Start writing markdown..."
                  spellCheck={false}
                />
              ) : (
                /* View mode */
                <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                  <div className="max-w-4xl mx-auto">
                    {selectedPath.endsWith('.md') ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {fileContent}
                      </ReactMarkdown>
                    ) : (
                      <pre className="text-zinc-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                        {fileContent}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function FilesPage() {
  return (
    <div className="card">
      <h1
        className="text-3xl text-white tracking-widest uppercase"
        style={{ fontFamily: "'Bebas Neue', sans-serif" }}
      >
        Files
      </h1>
      <p className="text-zinc-400 text-sm mt-2">
        Files viewer coming soon — use Telegram to request files from Jarvis.
      </p>
    </div>
  )
}
