import { readFileSync, writeFileSync } from 'fs'

const files = [
  'src/app/api/agents/route.ts',
  'src/app/api/bi/digest/route.ts',
  'src/app/api/brief/route.ts',
  'src/app/api/clients/follow-ups/route.ts',
  'src/app/api/dashboard/route.ts',
  'src/app/api/feed/route.ts',
  'src/app/api/notifications/mark-all-read/route.ts',
  'src/app/api/projects/route.ts',
  'src/app/api/sales/stats/route.ts',
  'src/app/api/setup/phase2/route.ts',
  'src/app/api/setup/route.ts',
  'src/app/api/supabase-status/route.ts',
  'src/app/api/tasks/[id]/route.ts',
  'src/app/api/tasks/route.ts',
  'src/app/api/team/route.ts',
]

for (const file of files) {
  let content = readFileSync(file, 'utf-8')
  const orig = content

  // Case 1: File has no 'next/server' import at all - add one
  if (!content.includes("from 'next/server'") && !content.includes('from "next/server"')) {
    content = `import { NextRequest, NextResponse } from 'next/server'\n` + content
  }

  // Case 2: File imports from 'next/server' but not NextRequest
  content = content.replace(
    /import\s+\{([^}]+)\}\s+from\s+['"]next\/server['"]/g,
    (m, imports) => {
      if (!imports.includes('NextRequest')) {
        return `import {${imports}, NextRequest } from 'next/server'`
      }
      return m
    }
  )

  // Case 3: Functions using 'Request' instead of 'NextRequest' - replace type
  // e.g. (request: Request) or (req: Request)
  content = content.replace(/\((\w+)\s*:\s*Request\)/g, (m, param) => {
    return `(${param}: NextRequest)`
  })

  if (content !== orig) {
    writeFileSync(file, content, 'utf-8')
    console.log(`FIXED ${file}`)
  }
}

console.log('Done fixing imports')
