import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const API_DIR = './src/app/api'
const SKIP_ROUTES = ['auth/route.ts'] // auth route itself doesn't need protection

function findRoutes(dir) {
  const results = []
  for (const file of readdirSync(dir)) {
    const full = join(dir, file)
    if (statSync(full).isDirectory()) {
      results.push(...findRoutes(full))
    } else if (file === 'route.ts') {
      results.push(full)
    }
  }
  return results
}

const routes = findRoutes(API_DIR)
let modified = 0
let skipped = 0

for (const routePath of routes) {
  // Skip auth route
  if (SKIP_ROUTES.some(s => routePath.endsWith(s))) {
    console.log(`SKIP  ${routePath}`)
    skipped++
    continue
  }

  let content = readFileSync(routePath, 'utf-8')

  // Skip if already has withAuth
  if (content.includes('withAuth')) {
    console.log(`DONE  ${routePath}`)
    skipped++
    continue
  }

  const originalContent = content

  // 1. Add import for withAuth after the first import line
  const importLine = `import { withAuth } from '@/lib/auth-middleware'`
  
  // Find the position after all imports
  const importRegex = /^(import\s+.*?from\s+['"][^'"]+['"];?\s*\n)+/m
  
  // Add withAuth import after 'next/server' import if present, otherwise after first import
  if (content.includes("from 'next/server'") || content.includes('from "next/server"')) {
    content = content.replace(
      /(import\s+\{[^}]*\}\s+from\s+['"]next\/server['"];?)/,
      `$1\n${importLine}`
    )
  } else {
    // Add at the top after 'use server' or before first import
    const firstImportMatch = content.match(/^(import\s)/m)
    if (firstImportMatch) {
      content = content.slice(0, firstImportMatch.index) + importLine + '\n' + content.slice(firstImportMatch.index)
    }
  }

  // 2. Add auth check to each HTTP method handler
  // Pattern: export async function GET/POST/PUT/DELETE/PATCH(request: NextRequest) {
  const methodRegex = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(\s*(request\s*:\s*NextRequest|req\s*:\s*NextRequest|request\s*:\s*Request|req\s*:\s*Request|_request\s*:\s*NextRequest|_req\s*:\s*NextRequest)([^)]*)\)\s*\{/g

  content = content.replace(methodRegex, (match, method, param) => {
    // Extract request param name
    const paramName = param.trim().split(/\s*:\s*/)[0].replace(/^_/, '')
    const actualParam = param.trim().split(/\s*:\s*/)[0]
    
    // If param starts with _, we need to use it — rename it
    const usedParam = actualParam.startsWith('_') ? actualParam.slice(1) : actualParam
    
    // Rebuild match with renamed param if needed
    let newMatch = match
    if (actualParam.startsWith('_')) {
      newMatch = match.replace(actualParam, usedParam)
    }
    
    return `${newMatch}\n  const auth = await withAuth(${usedParam})\n  if (!auth.authorized) return auth.response!`
  })

  // Also handle methods with no request param (e.g., export async function GET() {)
  const noParamMethodRegex = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(\s*\)\s*\{/g
  // For no-param methods, we need to add request param — but this is complex, skip for now
  // These methods don't accept user data so they're lower risk, but we should still protect them
  // We'll handle this differently - inject request parameter
  content = content.replace(noParamMethodRegex, (match, method) => {
    return `export async function ${method}(request: NextRequest) {\n  const auth = await withAuth(request)\n  if (!auth.authorized) return auth.response!`
  })

  // Ensure NextRequest is imported if we added it
  if (content.includes('(request: NextRequest)') && !content.includes('NextRequest')) {
    content = content.replace(
      /(import\s+\{)([^}]*)(}\s+from\s+['"]next\/server['"])/,
      (m, p1, p2, p3) => {
        if (!p2.includes('NextRequest')) {
          return `${p1}${p2}, NextRequest${p3}`
        }
        return m
      }
    )
  }

  if (content !== originalContent) {
    writeFileSync(routePath, content, 'utf-8')
    console.log(`AUTH  ${routePath}`)
    modified++
  } else {
    console.log(`NOOP  ${routePath}`)
    skipped++
  }
}

console.log(`\nDone: ${modified} modified, ${skipped} skipped`)
