'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PREVIEW_MODE } from '@/lib/mock-data'

export default function DeleteHospitalButton({ hospitalId, hospitalName }: { hospitalId: string; hospitalName: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`"${hospitalName}"을(를) 삭제할까요?\n관련된 글, 주제, 학습 데이터도 모두 삭제됩니다.`)) return
    setDeleting(true)
    if (!PREVIEW_MODE) {
      await supabase.from('hospitals').delete().eq('id', hospitalId)
    }
    router.push('/hospitals')
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
    >
      <Trash2 size={12} />
      {deleting ? '삭제 중...' : '병원 삭제'}
    </button>
  )
}
