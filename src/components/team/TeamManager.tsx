'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Hospital, UserRole } from '@/types'

interface HospitalWithAssignments extends Omit<Hospital, 'assignments'> {
  assignments: { user_id: string }[]
}

interface TeamManagerProps {
  initialUsers: User[]
  initialHospitals: HospitalWithAssignments[]
}

export default function TeamManager({ initialUsers, initialHospitals }: TeamManagerProps) {
  const supabase = createClient()
  const [users, setUsers] = useState(initialUsers)
  const [hospitals, setHospitals] = useState(initialHospitals)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)

  const assignedHospitalIds = hospitals
    .filter(h => h.assignments.some(a => a.user_id === selectedUser?.id))
    .map(h => h.id)

  const toggleAssignment = async (hospitalId: string) => {
    if (!selectedUser) return
    setSaving(true)

    const isAssigned = assignedHospitalIds.includes(hospitalId)

    if (isAssigned) {
      await supabase
        .from('hospital_assignments')
        .delete()
        .eq('hospital_id', hospitalId)
        .eq('user_id', selectedUser.id)

      setHospitals(prev => prev.map(h =>
        h.id === hospitalId
          ? { ...h, assignments: h.assignments.filter(a => a.user_id !== selectedUser.id) }
          : h
      ))
    } else {
      await supabase
        .from('hospital_assignments')
        .insert({ hospital_id: hospitalId, user_id: selectedUser.id })

      setHospitals(prev => prev.map(h =>
        h.id === hospitalId
          ? { ...h, assignments: [...h.assignments, { user_id: selectedUser.id }] }
          : h
      ))
    }

    setSaving(false)
  }

  const updateRole = async (userId: string, role: UserRole) => {
    await supabase.from('users').update({ role }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    if (selectedUser?.id === userId) setSelectedUser(prev => prev ? { ...prev, role } : null)
  }

  return (
    <div className="flex gap-6">
      {/* 팀원 목록 */}
      <div className="w-72 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">팀원 ({users.length}명)</h2>
        <div className="space-y-2">
          {users.map(user => (
            <div
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                selectedUser?.id === user.id
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.name || user.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
                </div>
                <select
                  value={user.role}
                  onChange={e => {
                    e.stopPropagation()
                    updateRole(user.id, e.target.value as UserRole)
                  }}
                  onClick={e => e.stopPropagation()}
                  className={`text-xs px-2 py-1 rounded-full border-none outline-none cursor-pointer ${
                    user.role === 'admin'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <option value="member">멤버</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                담당 병원 {hospitals.filter(h => h.assignments.some(a => a.user_id === user.id)).length}개
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 병원 배정 */}
      <div className="flex-1">
        {selectedUser ? (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-1">
              {selectedUser.name || selectedUser.email} 담당 병원 배정
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              클릭하여 담당 병원을 추가하거나 제거할 수 있습니다.
              {saving && <span className="ml-2 text-blue-500">저장 중...</span>}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {hospitals.map(h => {
                const isAssigned = h.assignments.some(a => a.user_id === selectedUser.id)
                return (
                  <button
                    key={h.id}
                    onClick={() => toggleAssignment(h.id)}
                    disabled={saving}
                    className={`text-left p-3 rounded-xl border transition-colors ${
                      isAssigned
                        ? 'border-blue-300 bg-blue-50 text-blue-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200'
                    }`}
                  >
                    <p className="text-sm font-medium">{h.name}</p>
                    {h.specialty && (
                      <p className={`text-xs mt-0.5 ${isAssigned ? 'text-blue-500' : 'text-gray-400'}`}>
                        {h.specialty}
                      </p>
                    )}
                    {isAssigned && (
                      <span className="inline-block mt-1 text-xs text-blue-600">담당 중</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center h-64 text-gray-400 text-sm">
            왼쪽에서 팀원을 선택하여 병원을 배정하세요
          </div>
        )}
      </div>
    </div>
  )
}
