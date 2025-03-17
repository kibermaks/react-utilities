import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Duolingo Point Tracker',
  icons: {
    icon: [
      {
        url: '/duo-point-tracker/favicon.ico',
        sizes: 'any',
      },
      {
        url: '/duo-point-tracker/icon.png',
        type: 'image/png',
        sizes: 'any',
      },
    ],
  },
}

export default function DuolingoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 