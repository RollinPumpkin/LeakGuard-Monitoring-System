'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Shield, UserPlus, Users } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function AdminPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'viewer'>('admin')
  const [loading, setLoading] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null)
  
  const { t } = useLanguage()
  const supabase = createClient()

  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        
        if (data && data.role === 'super_admin') {
          setIsSuperAdmin(true)
        } else {
          setIsSuperAdmin(false)
        }
      } else {
        setIsSuperAdmin(false)
      }
    }
    checkRole()
  }, [supabase])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan')
      }

      alert(`Berhasil menambahkan user ${email} sebagai ${role}`)
      setEmail('')
      setPassword('')
    } catch (err: any) {
      alert(`Gagal: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (isSuperAdmin === null) {
    return <div className="p-8">Loading...</div>
  }

  if (isSuperAdmin === false) {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-12 bg-white rounded-xl shadow border border-red-200 text-center">
        <Shield size={48} className="mx-auto text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Akses Ditolak</h1>
        <p className="text-gray-500">Hanya Super Admin yang dapat mengakses halaman ini.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-indigo-600" />
            Manajemen Admin
          </h1>
          <p className="text-sm text-gray-500 mt-1">Tambahkan admin atau viewer baru tanpa harus membuka Supabase.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
            <UserPlus size={20} className="text-blue-500" />
            Tambah User Baru
          </h2>

          <form onSubmit={handleAddUser} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5 border bg-gray-50 text-gray-900 placeholder-gray-400"
                placeholder="admin@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5 border bg-gray-50 text-gray-900 placeholder-gray-400"
                placeholder="Minimal 6 karakter"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5">Role</label>
              <select
                value={role}
                onChange={(e: any) => setRole(e.target.value)}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5 border bg-gray-50 text-gray-900 font-medium"
              >
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 mt-4 transition-colors"
            >
              {loading ? 'Memproses...' : 'Tambahkan User'}
            </button>
            <p className="text-xs text-gray-500 text-center mt-3">
              Pastikan Anda telah menambahkan <code>SUPABASE_SERVICE_ROLE_KEY</code> di Vercel/.env.local agar fitur ini berfungsi.
            </p>
          </form>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 p-8 flex flex-col justify-center text-center shadow-sm">
          <Users size={56} className="mx-auto text-indigo-500 mb-5" />
          <h3 className="text-xl font-black text-indigo-950 mb-3">Panduan Super Admin</h3>
          <p className="text-sm text-gray-800 mb-6 leading-relaxed font-medium">
            Sebagai Super Admin, Anda dapat menambahkan akun baru yang akan langsung dapat digunakan untuk login ke dashboard ini.
          </p>
          <div className="text-left bg-white p-5 rounded-xl text-sm text-gray-800 shadow-sm border border-indigo-100">
            <ul className="list-disc pl-5 space-y-3">
              <li><strong className="text-indigo-900">Admin:</strong> Memiliki akses untuk mengelola alat, menghapus alat, dan melihat data.</li>
              <li><strong className="text-indigo-900">Viewer:</strong> Hanya dapat melihat data, tidak dapat menghapus atau mengkonfigurasi.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
