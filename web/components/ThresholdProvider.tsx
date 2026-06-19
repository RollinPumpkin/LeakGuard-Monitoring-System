'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { AlarmThresholds, DEFAULT_WARNING_A, DEFAULT_CRITICAL_A } from '@/lib/leak'

interface ThresholdContextType {
  thresholds: AlarmThresholds
  setThresholds: (t: AlarmThresholds) => void
}

const ThresholdContext = createContext<ThresholdContextType | undefined>(undefined)

export function ThresholdProvider({ children }: { children: React.ReactNode }) {
  const [thresholds, setThresholdsState] = useState<AlarmThresholds>({
    warning: DEFAULT_WARNING_A,
    critical: DEFAULT_CRITICAL_A,
  })

  useEffect(() => {
    const saved = localStorage.getItem('alarm_thresholds')
    if (saved) {
      try {
        setThresholdsState(JSON.parse(saved))
      } catch (e) {}
    }
  }, [])

  const setThresholds = (t: AlarmThresholds) => {
    setThresholdsState(t)
    localStorage.setItem('alarm_thresholds', JSON.stringify(t))
  }

  return (
    <ThresholdContext.Provider value={{ thresholds, setThresholds }}>
      {children}
    </ThresholdContext.Provider>
  )
}

export function useThresholds() {
  const context = useContext(ThresholdContext)
  if (context === undefined) {
    throw new Error('useThresholds must be used within a ThresholdProvider')
  }
  return context
}
