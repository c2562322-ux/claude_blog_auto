import { createClient } from '@/lib/supabase/server'
import { Hospital, FileText, CheckSquare, Users } from 'lucide-react'
import { PREVIEW_MODE, mockHospitals, mockPosts, mockUsers } from '@/lib/mock-data'

export default async function DashboardPage() {
  let hospitalsCount = 0
  let postsCount = 0
  let publishedCount = 0
  let usersCount = 0
  let recentPosts: { id: string; topic: string; created_at: string; status_written: boolean; status_reviewed: boolean; status_published: boolean; hospital: { name: string } | null }[] = []

  if (PREVIEW_MODE) {
    hospitalsCount = mockHospitals.length
    postsCount = mockPosts.length
    publishedCount = mockPosts.filter(p => p.status_published).length
    usersCount = mockUsers.length
    recentPosts = mockPosts.map(p => ({
      ...p,
      hospital: mockHospitals.find(h => h.id === p.hospital_id) ? { name: mockHospitals.find(h => h.id === p.hospital_id)!.name } : null,
    }))
  } else {
    const supabase = await createClient()

    const [hospitalsRes, postsRes, publishedRes, usersRes, recentRes] = await Promise.all([
      supabase.from('hospitals').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status_published', true),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('posts')
        .select('id, topic, created_at, status_written, status_reviewed, status_published, hospital:hospitals(name)')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    hospitalsCount = hospitalsRes.count || 0
    postsCount = postsRes.count || 0
    publishedCount = publishedRes.count || 0
    usersCount = usersRes.count || 0
    recentPosts = (recentRes.data || []).map(p => ({ ...p, hospital: (p.hospital as unknown) as { name: string } | null }))
  }

  const stats = [
    { label: '총 병원 수', value: hospitalsCount, icon: Hospital, color: 'blue' },
    { label: '생성된 글', value: postsCount, icon: FileText, color: 'green' },
    { label: '발행 완료', value: publishedCount, icon: CheckSquare, color: 'purple' },
    { label: '팀원 수', value: usersCount, icon: Users, color: 'orange' },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400',
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">대시보드</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className={`inline-flex p-2 rounded-lg mb-3 ${colorMap[stat.color]}`}>
              <stat.icon size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">최근 생성된 글</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {recentPosts.length > 0 ? recentPosts.map(post => (
            <div key={post.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{post.topic}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {post.hospital?.name} · {new Date(post.created_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge label="작성" done={post.status_written} />
                <StatusBadge label="검토" done={post.status_reviewed} />
                <StatusBadge label="발행" done={post.status_published} />
              </div>
            </div>
          )) : (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              아직 생성된 글이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ label, done }: { label: string; done: boolean }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${done ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-500'}`}>
      {label}
    </span>
  )
}
