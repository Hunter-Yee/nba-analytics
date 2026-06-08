import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NBA Live Analytics',
  description: 'Historical NBA game replay with live win probability modeling',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#080a0e] text-white">
        {children}
      </body>
    </html>
  )
}