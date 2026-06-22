'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, Filter } from 'lucide-react'
import type { Post, Hospital } from '@/types'

type PostWithHospital = Post & { hospital: Hospital }

export default function PublishPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<PostWithHospital[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'published'>('all')
  const [hospitalFilter, setHospitalFilter] = useState('')
  const [hospitals, setHospitals] = useState<Hospital[]>([])

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('*, hospital:hospitals(id, name)')
      .order('created_at', { ascending: false })

    const typedData = (data || []) as PostWithHospital[]
    setPosts(typedData)

    const uniqueHospitals = Array.from(
      new Map(typedData.map(p => [p.hospital?.id, p.hospital])).values()
    ).filter(Boolean) as Hospital[]
    setHospitals(uniqueHospitals)
    setLoading(false)
  }

  const toggleStatus = async (post: PostWithHospital, field: 'status_written' | 'status_reviewed' | 'status_published') => {
    const newValue = !post[field]
    await supabase.from('posts').update({ [field]: newValue }).eq('id', post.id)
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, [field]: newValue } : p))
  }

  const updateNote = async (post: PostWithHospital, notes: string) => {
    await supabase.from('posts').update({ publish_notes: notes }).eq('id', post.id)
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, publish_notes: notes } : p))
  }

  const filtered = posts.filter(p => {
    if (hospitalFilter && p.hospital?.id !== hospitalFilter) return false
    if (filter === 'pending') return !p.status_published
    if (filter === 'published') return p.status_published
    return true
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">발행 관리</h1>
        <div className="flex items-center gap-3">
          <select
            value={hospitalFilter}
            onChange={e => setHospitalFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
          >
            <option value="">전체 병원</option>
            {hospitals.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'pending', 'published'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f === 'all' ? '전체' : f === 'pending' ? '미발행' : '발행완료'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl shadow-sm border border-gray-100">
          해당하는 글이 없습니다.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">병원</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">주제</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">생성일</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500">작성</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500">검토</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500">업로드</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">메모</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(post => (
                <tr key={post.id} className={`hover:bg-gray-50 ${post.status_published ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3 text-sm text-gray-700">{post.hospital?.name}</td>
                  <td className="px-5 py-3 text-sm text-gray-900 max-w-xs truncate">{post.topic}</td>
                  <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(post.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <CheckButton done={post.status_written} onClick={() => toggleStatus(post, 'status_written')} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <CheckButton done={post.status_reviewed} onClick={() => toggleStatus(post, 'status_reviewed')} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <CheckButton done={post.status_published} onClick={() => toggleStatus(post, 'status_published')} />
                  </td>
                  <td className="px-5 py-3">
                    <input
                      defaultValue={post.publish_notes || ''}
                      onBlur={e => updateNote(post, e.target.value)}
                      className="w-full text-xs text-gray-600 border-none bg-transparent focus:outline-none focus:bg-gray-50 rounded px-1"
                      placeholder="메모 입력..."
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CheckButton({ done, onClick }: { done: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-7 h-7 mx-auto flex items-center justify-center rounded-full border-2 transition-colors ${
        done
          ? 'bg-green-500 border-green-500 text-white'
          : 'border-gray-300 text-transparent hover:border-blue-400'
      }`}
    >
      <Check size={12} />
    </button>
  )
}
