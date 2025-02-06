import { existsSync } from 'fs'
import { readdir } from 'fs/promises'
import path from 'path'

export async function GET() {
  const pagesDirectory = path.join(process.cwd(), 'app')
  const entries = await readdir(pagesDirectory, { withFileTypes: true })
  
  const pages = entries
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.'))
    .filter(entry => {
      const pageFile = path.join(pagesDirectory, entry.name, 'page.tsx')
      try {
        return existsSync(pageFile)
      } catch {
        return false
      }
    })
    .map(entry => entry.name)

  return Response.json({ pages })
}