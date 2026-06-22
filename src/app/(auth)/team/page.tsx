import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamManager from '@/components/team/TeamManager'
import { PREVIEW_MODE, mockUsers, mockHospitals } from '@/lib/mock-data'

export default async function TeamPage() {
  let users = []
  let hospitals: { id: string; name: string; specialty: string | null; location: string | null; phone: string | null; hours: string | null; doctor_name: string | null; conditions: string | null; created_at: string; updated_at: string; assignments: { user_id: string }[] }[] = []

  if (PREVIEW_MODE) {
    users = mockUsers
    hospitals = mockHospitals.map(h => ({
      ...h,
      assignments: [{ user_id: 'preview-user-2' }],
      examples: undefined,
      topics: undefined,
    }))
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user!.id)
      .single()

    if (profile?.role !== 'admin') redirect('/dashboard')

    const [usersRes, hospitalsRes] = await Promise.all([
      supabase.from('users').select('*').order('name'),
      supabase.from('hospitals').select('*, assignments:hospital_assignments(user_id)').order('name'),
    ])

    users = usersRes.data || []
    hospitals = (hospitalsRes.data || []) as typeof hospitals
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">팀원 관리</h1>
      <TeamManager
        initialUsers={users}
        initialHospitals={hospitals}
      />
    </div>
  )
}
