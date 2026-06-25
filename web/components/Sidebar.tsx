'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Zap, Activity, HardDrive, LogOut, ChevronDown, ChevronRight, Menu, BarChart2, Bell, FileText } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useLanguage } from '@/contexts/LanguageContext'

export function Sidebar() {
  const [session, setSession] = useState<any>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [devices, setDevices] = useState<any[]>([])
  const [isArusBocorOpen, setIsArusBocorOpen] = useState(true)
  const { t, language, setLanguage } = useLanguage()

  useEffect(() => {
    const fetchDevices = () => {
      supabase.from('devices').select('device_id, description').order('device_id').then(({ data }) => {
        if (data) setDevices(data)
      })
    }
    fetchDevices()

    const channel = supabase
      .channel('sidebar-devices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => {
        fetchDevices()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  if (pathname === '/login') return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user?.id) {
        const { data } = await supabase.from('user_roles').select('role').eq('id', session.user.id).single()
        if (data?.role === 'super_admin') setIsSuperAdmin(true)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user?.id) {
        const { data } = await supabase.from('user_roles').select('role').eq('id', session.user.id).single()
        if (data?.role === 'super_admin') setIsSuperAdmin(true)
        else setIsSuperAdmin(false)
      } else {
        setIsSuperAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth, supabase])

  const nav = (t: any) => {
    const items = [
      {
        section: t('monitoring'),
        items: [
          { href: '/', label: 'Dashboard', icon: Activity },
          { href: '/prediction', label: 'Prediction Behavior', icon: BarChart2 },
          { href: '/alerts', label: 'Notifikasi', icon: Bell },
          { href: '/reports', label: 'Laporan', icon: FileText },
          { href: '/device-health', label: t('device_status'), icon: HardDrive },
        ],
      },
    ]

    if (isSuperAdmin) {
      items.push({
        section: 'Admin',
        items: [
          { href: '/admin', label: 'Manajemen Admin', icon: Zap }
        ]
      })
    }

    return items
  }

  return (
    <aside className="w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-100">
        <div className="p-1.5 bg-blue-600 rounded-lg">
          <Zap size={18} className="text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-gray-900">{t('leakguard')}</p>
          <p className="text-[11px] text-gray-400">{t('transformer_monitoring')}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {nav(t).map((group: any) => (
          <div key={group.section}>
            <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-gray-400">
              {group.section}
            </p>
            <div className="space-y-1">
              {group.items.map((item: any) => {
                const active = pathname === item.href
                const Icon = item.icon
                const isArusBocor = item.href === '/'

                return (
                  <div key={item.href}>
                    <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                        active && !isArusBocor
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        if (isArusBocor) setIsArusBocorOpen(!isArusBocorOpen)
                      }}
                    >
                      <Link href={item.href} className="flex items-center gap-3 flex-1" onClick={(e) => isArusBocor && e.stopPropagation()}>
                        <Icon size={17} className={active ? 'text-blue-600' : ''} />
                        <span className={active ? 'text-blue-600 font-medium' : ''}>{item.label}</span>
                      </Link>
                      {isArusBocor && devices.length > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); setIsArusBocorOpen(!isArusBocorOpen); }} className="p-1">
                          {isArusBocorOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      )}
                    </div>
                    
                    {/* Submenu untuk Trafo */}
                    {isArusBocor && isArusBocorOpen && devices.length > 0 && (
                      <div className="mt-1 ml-9 space-y-1">
                        {devices.map(d => (
                          <Link
                            key={d.device_id}
                            href={`/?device=${d.device_id}`}
                            className="block px-3 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            {d.description || `Trafo ${d.device_id}`}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100 flex flex-col gap-2">
        <div className="flex bg-gray-100 rounded-lg p-1 mb-2">
          <button
            onClick={() => setLanguage('id')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${language === 'id' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            ID
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${language === 'en' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            EN
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-red-600 hover:bg-red-50"
        >
          <LogOut size={17} />
          {t('logout')}
        </button>
        <div className="text-[11px] text-gray-400 mt-2">
          Septa Puma Surya · Polinema 2026
        </div>
      </div>
    </aside>
  )
}
