import { ArrowLeft, Home } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  title: string
  showBack?: boolean
}

export function Header({ title, showBack = true }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showBack && (
            <Link 
              href="/"
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </Link>
          )}
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
            {title}
          </h1>
        </div>
        <Link
          href="/"
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Home"
        >
          <Home className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </Link>
      </div>
    </header>
  )
} 