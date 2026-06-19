import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'
import { ThresholdProvider } from '@/components/ThresholdProvider'

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
      <body className={inter.className}>
        <ThresholdProvider>
          <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 min-w-0">{children}</div>
          </div>
        </ThresholdProvider>
      </body>
    </html>
  )
}