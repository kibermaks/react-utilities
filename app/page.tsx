import { Header } from '@/components/ui/header'
import { existsSync } from 'fs'
import { readdir } from 'fs/promises'
import { FileText, Home, Languages, LucideIcon, Settings, ShoppingCart, Users } from 'lucide-react'
import Link from 'next/link'
import path from 'path'

const pageIcons: Record<string, LucideIcon> = {
  'users': Users,
  'settings': Settings,
  'home': Home,
  'products': ShoppingCart,
  'duo-point-tracker': Languages,
  // Add more mappings as needed
  'default': FileText
}

// Get the icon component for a given page name
function getIconForPage(pageName: string) {
  const key = pageName.toLowerCase();
  return pageIcons[key] || pageIcons.default
}

// Mark as async since we're doing file system operations
export default async function StartPage() {
  // Move the page discovery logic here since this is a Server Component
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header title="React Utility Apps" showBack={false} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="max-w-2xl mx-auto mb-8">
          <ul className="space-y-3 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            {pages.map((page, index) => {
              const IconComponent = getIconForPage(page)
              return (
                <li 
                  key={page}
                  className="group transition-all duration-200 ease-in-out"
                >
                  <Link 
                    href={`/${page}`}
                    className="flex items-center space-x-3 p-3 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-slate-100 dark:focus:bg-slate-700"
                    data-page-index={index}
                  >
                    <IconComponent className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="text-slate-700 dark:text-slate-200">
                      {page.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Add keyboard navigation script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  const links = document.querySelectorAll('a[data-page-index]');
                  const currentIndex = Array.from(links).findIndex(link => 
                    link === document.activeElement
                  );
                  
                  let nextIndex;
                  if (e.key === 'ArrowDown') {
                    nextIndex = currentIndex < links.length - 1 ? currentIndex + 1 : 0;
                  } else {
                    nextIndex = currentIndex > 0 ? currentIndex - 1 : links.length - 1;
                  }
                  
                  links[nextIndex]?.focus();
                }
              });
            `
          }}
        />
      </main>
    </div>
  )
}
