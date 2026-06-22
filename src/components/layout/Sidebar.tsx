'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Hospital,
  PenSquare,
  History,
  CheckSquare,
  Users,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import type { UserRole } from '@/types'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: '대시보드', icon: <LayoutDashboard size={18} /> },
  { href: '/hospitals', label: '병원 관리', icon: <Hospital size={18} /> },
  { href: '/generate', label: '글 생성', icon: <PenSquare size={18} /> },
  { href: '/history', label: '히스토리', icon: <History size={18} /> },
  { href: '/publish', label: '발행 관리', icon: <CheckSquare size={18} /> },
  { href: '/team', label: '팀원 관리', icon: <Users size={18} />, adminOnly: true },
]

interface SidebarProps {
  userRole: UserRole
  userName: string | null
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, toggle } = useTheme()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const visibleItems = navItems.filter(item => !item.adminOnly || userRole === 'admin')

  return (
    <aside className="w-60 min-h-screen bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white flex flex-col">
      <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">병원 블로그 생성기</h1>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{userName || '사용자'}</p>
        {userRole === 'admin' && (
          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">관리자</span>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200 dark:border-slate-700 space-y-1">
        <button
          onClick={toggle}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? '라이트 모드' : '다크 모드'}
        </button>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <LogOut size={18} />
          로그아웃
        </button>
      </div>
    </aside>
  )
}
