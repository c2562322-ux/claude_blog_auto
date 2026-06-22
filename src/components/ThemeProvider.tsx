'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'dark',
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    const t = saved ?? 'dark'
    setTheme(t)
    document.documentElement.classList.toggle('dark', t === 'dark')
  }, [])

  const toggle = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      document.documentElement.classList.toggle('dark', next === 'dark')
      return next
    })
  }

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => useContext(ThemeCtx)
