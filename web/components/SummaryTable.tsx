'use client'
import React from 'react'
import { TrafoStatus } from '@/types'

export function SummaryTable({ trafos }: { trafos: TrafoStatus[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Ringkasan Semua Kanal</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-24">Fasa</th>
              {trafos.map(t => (
                <th key={t.config.name} className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">
                  {t.config.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['R', 'S', 'T'] as const).map(ph => (
              <tr key={ph} className="border-t border-gray-100">
                <td className="px-4 py-3 font-semibold text-gray-700">Fasa {ph}</td>
                {trafos.map(t => {
                  const p = t.phases.find(x => x.phase === ph)!
                  return (
                    <td key={t.config.name}
                      className={`px-4 py-3 text-center font-mono text-sm
                        ${p.status === 'Warning' ? 'bg-yellow-50 text-yellow-800 font-semibold' : 'text-gray-800'}`}>
                      {p.value.toFixed(4)}
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td className="px-4 py-3 font-semibold text-gray-700">Rata-rata</td>
              {trafos.map(t => (
                <td key={t.config.name} className="px-4 py-3 text-center font-mono font-bold text-gray-900">
                  {t.avgCurrent.toFixed(4)}
                </td>
              ))}
            </tr>
            <tr className="border-t border-gray-100">
              <td className="px-4 py-3 font-semibold text-gray-700">Status</td>
              {trafos.map(t => (
                <td key={t.config.name} className="px-4 py-3 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold
                    ${t.overallStatus === 'Normal' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>
                    {t.overallStatus}
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
