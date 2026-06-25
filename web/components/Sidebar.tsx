'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Zap, Activity, HardDrive, LogOut, ChevronDown, ChevronRight, Menu, BarChart2, Bell, FileText } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useLanguage } from '@/contexts/LanguageContext'

export function Sidebar() {
  const [session, setSession] = useState<any>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentDevice = searchParams.get('device')
  const router = useRouter()
  const supabase = createClient()
  const [devices, setDevices] = useState<any[]>([])
  const [isArusBocorOpen, setIsArusBocorOpen] = useState(true)
  const { t, language, setLanguage } = useLanguage()

  useEffect(() => {
    const fetchDevices = () => {
      supabase.from('devices').select('device_id, description').eq('is_active', true).order('device_id').then(({ data }) => {
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
    window.location.href = '/login'
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
                const isParentActive = active && (!isArusBocor || (isArusBocor && !currentDevice))

                return (
                  <div key={item.href}>
                    <div className={`relative flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 overflow-hidden group ${
                        isParentActive
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      {isParentActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-md shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
                      )}
                      <Link 
                        href={item.href} 
                        className="flex items-center gap-3 flex-1 py-1"
                        onClick={() => {
                          if (isArusBocor && !isArusBocorOpen) setIsArusBocorOpen(true)
                        }}
                      >
                        <Icon size={18} className={isParentActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600 transition-colors'} />
                        <span>{item.label}</span>
                      </Link>
                      {isArusBocor && devices.length > 0 && (
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsArusBocorOpen(!isArusBocorOpen); }} className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                          {isArusBocorOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      )}
                    </div>
                    
                    {/* Submenu untuk Trafo */}
                    {isArusBocor && isArusBocorOpen && devices.length > 0 && (
                      <div className="mt-1.5 ml-9 space-y-1">
                        {devices.map(d => {
                          const isChildActive = currentDevice === d.device_id
                          return (
                            <Link
                              key={d.device_id}
                              href={`/?device=${d.device_id}`}
                              className={`block px-3 py-2 text-xs rounded-md transition-all relative overflow-hidden ${
                                isChildActive 
                                  ? 'text-blue-700 bg-blue-50/50 font-medium' 
                                  : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              {isChildActive && (
                                <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-blue-400 rounded-r-sm shadow-[0_0_6px_rgba(96,165,250,0.6)]" />
                              )}
                              {d.description || `Trafo ${d.device_id}`}
                            </Link>
                          )
                        })}
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
