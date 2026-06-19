import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Taleforge — D&D en ligne',
  description: 'Jeu de rôle multijoueur avec Claude comme Maître du Jeu',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
