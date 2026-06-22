import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { PREVIEW_MODE, mockUser } from '@/lib/mock-data'
import type { UserRole } from '@/types'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (PREVIEW_MODE) {
    return (
      <div className="flex h-full">
        <Sidebar userRole="admin" userName={mockUser.name} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-full">
      <Sidebar
        userRole={(profile?.role || 'member') as UserRole}
        userName={profile?.name || user.email || null}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
