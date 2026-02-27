export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const WORKSPACE_ROOT = '/home/node/.openclaw/workspace'

// Allowed extensions for reading (non-md are read-only)
const READ_ONLY_EXTS = ['.ts', '.js', '.sh', '.json', '.tsx', '.jsx', '.mjs', '.cjs']
const WRITABLE_EXTS = ['.md']

function isPathSafe(filePath: string): boolean {
  // Reject any path with traversal
  if (filePath.includes('..')) return false
  // Resolve the absolute path
  const resolved = path.resolve(WORKSPACE_ROOT, filePath)
  // Must be within workspace root
  return resolved.startsWith(WORKSPACE_ROOT + path.sep) || resolved === WORKSPACE_ROOT
}

function getAbsPath(filePath: string): string {
  return path.join(WORKSPACE_ROOT, filePath)
}

function getFileInfo(filePath: string, name: string, relDir: string) {
  try {
    const stat = fs.statSync(filePath)
    return {
      name,
      path: path.join(relDir, name).replace(/\\/g, '/'),
      isDir: stat.isDirectory(),
      size: stat.isDirectory() ? 0 : stat.size,
      modified: stat.mtime.toISOString(),
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const listMode = searchParams.get('list')
  const filePath = searchParams.get('path')
  const dir = searchParams.get('dir') || ''
  const pinned = searchParams.get('pinned')
  const recent = searchParams.get('recent')

  try {
    // Return pinned files info
    if (pinned === 'true') {
      const today = new Date().toISOString().split('T')[0]
      const pinnedPaths = [
        'MEMORY.md',
        `memory/${today}.md`,
        'AGENTS.md',
        'life/tacit-knowledge.md',
      ]
      const result = pinnedPaths.map((p) => {
        const abs = getAbsPath(p)
        try {
          const stat = fs.statSync(abs)
          return { name: path.basename(p), path: p, isDir: false, size: stat.size, modified: stat.mtime.toISOString(), exists: true }
        } catch {
          return { name: path.basename(p), path: p, isDir: false, size: 0, modified: '', exists: false }
        }
      })
      return NextResponse.json({ files: result })
    }

    // Return recent .md files
    if (recent === 'true') {
      const mdFiles: { name: string; path: string; isDir: boolean; size: number; modified: string }[] = []
      
      const scanForMd = (dirPath: string, relPath: string, depth: number): void => {
        if (depth > 4) return
        try {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true })
          for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
            const absEntry = path.join(dirPath, entry.name)
            const relEntry = relPath ? `${relPath}/${entry.name}` : entry.name
            if (entry.isDirectory()) {
              scanForMd(absEntry, relEntry, depth + 1)
            } else if (entry.name.endsWith('.md')) {
              try {
                const stat = fs.statSync(absEntry)
                mdFiles.push({ name: entry.name, path: relEntry, isDir: false, size: stat.size, modified: stat.mtime.toISOString() })
              } catch { /* skip */ }
            }
          }
        } catch { /* skip */ }
      }

      scanForMd(WORKSPACE_ROOT, '', 0)
      mdFiles.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
      return NextResponse.json({ files: mdFiles.slice(0, 10) })
    }

    // List directory
    if (listMode === 'true') {
      if (!isPathSafe(dir)) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
      }
      const absDir = getAbsPath(dir)
      if (!fs.existsSync(absDir)) {
        return NextResponse.json({ files: [] })
      }
      const entries = fs.readdirSync(absDir, { withFileTypes: true })
      const files = entries
        .filter((e) => {
          if (e.name.startsWith('.')) return false
          if (e.name === 'node_modules') return false
          if (e.isDirectory()) return true
          const ext = path.extname(e.name).toLowerCase()
          return [...WRITABLE_EXTS, ...READ_ONLY_EXTS].includes(ext)
        })
        .map((e) => {
          const absEntry = path.join(absDir, e.name)
          return getFileInfo(absEntry, e.name, dir)
        })
        .filter(Boolean)
        .sort((a, b) => {
          // Dirs first, then alphabetical
          if (a!.isDir !== b!.isDir) return a!.isDir ? -1 : 1
          return a!.name.localeCompare(b!.name)
        })

      return NextResponse.json({ files })
    }

    // Read file
    if (filePath) {
      if (!isPathSafe(filePath)) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
      }
      const absPath = getAbsPath(filePath)
      if (!fs.existsSync(absPath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      const stat = fs.statSync(absPath)
      if (stat.isDirectory()) {
        return NextResponse.json({ error: 'Path is a directory' }, { status: 400 })
      }
      const content = fs.readFileSync(absPath, 'utf-8')
      return NextResponse.json({
        content,
        path: filePath,
        modified: stat.mtime.toISOString(),
        readOnly: !WRITABLE_EXTS.includes(path.extname(filePath).toLowerCase()),
      })
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path: filePath, content } = body

    if (!filePath || content === undefined) {
      return NextResponse.json({ error: 'Missing path or content' }, { status: 400 })
    }

    if (!isPathSafe(filePath)) {
      return NextResponse.json({ error: 'Invalid path — path traversal rejected' }, { status: 400 })
    }

    const ext = path.extname(filePath).toLowerCase()
    if (!WRITABLE_EXTS.includes(ext)) {
      return NextResponse.json({ error: `Writing to ${ext} files is not allowed` }, { status: 403 })
    }

    const absPath = getAbsPath(filePath)
    const dir = path.dirname(absPath)

    // Create directories if needed
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(absPath, content, 'utf-8')
    const stat = fs.statSync(absPath)

    return NextResponse.json({ success: true, path: filePath, modified: stat.mtime.toISOString() })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
