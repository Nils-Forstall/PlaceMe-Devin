'use client'

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { useEffect } from 'react'
import './globals.css'
import { initializeDatabase } from '../lib/auth/supabase'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    initializeDatabase().catch(console.error)
  }, [])

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}
