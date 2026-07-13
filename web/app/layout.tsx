import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'
import { ThresholdProvider } from '@/components/ThresholdProvider'
import { LanguageProvider } from '@/contexts/LanguageContext'
import GlobalAlertPopup from '@/components/GlobalAlertPopup'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LeakGuard — Transformer Monitoring',
  description: 'Dashboard monitoring kebocoran arus transformator berbasis IoT',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <LanguageProvider>
          <ThresholdProvider>
            <div className="flex min-h-screen bg-gray-50">
              <div className="hidden md:flex sticky top-0 h-screen">
                <Suspense fallback={<div className="w-60 bg-white border-r h-screen" />}>
                  <Sidebar />
                </Suspense>
              </div>
              <div className="flex-1 min-w-0">{children}</div>
            </div>
            <GlobalAlertPopup />
          </ThresholdProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}