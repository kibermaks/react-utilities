import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Coda Calls',
  icons: {
    icon: [
      {
        url: '/private/coda-calls/favicon.ico',
        sizes: 'any',
      },
      {
        url: '/private/coda-calls/icon.png',
        type: 'image/png',
        sizes: '32x32',
      },
    ],
  },
}

export default function CodaCallsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 