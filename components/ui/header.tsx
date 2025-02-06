'use client'
import { ArrowLeft, ChevronDown, Home } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface HeaderProps {
  title: string
  showBack?: boolean
  icon?: React.ReactNode
  pages?: string[]
}

export function Header({ title, showBack = true, icon, pages = [] }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false)

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
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md p-2 transition-colors"
            >
              <div className="flex items-center space-x-2">
                {icon}
                <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
                  {title}
                </h1>
              </div>
              {pages.length > 0 && (
                <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              )}
            </button>
            
            {showDropdown && pages.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 z-10">
                {pages.map((page) => (
                  <Link
                    key={page}
                    href={`/${page}`}
                    className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    {page.split('-').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </Link>
                ))}
              </div>
            )}
          </div>
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