'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Zap, Activity, HardDrive, LogOut } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

const nav = [
  {
    section: 'MONITORING',
    items: [
      { href: '/', label: 'Arus Bocor', icon: Activity },
      { href: '/device-health', label: 'Status Alat', icon: HardDrive },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  if (pathname === '/login') return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-100">
        <div className="p-1.5 bg-blue-600 rounded-lg">
          <Zap size={18} className="text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-gray-900">LeakGuard</p>
          <p className="text-[11px] text-gray-400">Transformer Monitoring</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-6">
        {nav.map((group) => (
          <div key={group.section}>
            <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-gray-400">
              {group.section}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={17} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100 flex flex-col gap-2">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-red-600 hover:bg-red-50"
        >
          <LogOut size={17} />
          Keluar
        </button>
        <div className="text-[11px] text-gray-400 mt-2">
          Septa Puma Surya · Polinema 2026
        </div>
      </div>
    </aside>
  )
}
