import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PenSquare } from 'lucide-react'
import HospitalForm from '@/components/hospital/HospitalForm'
import DeleteHospitalButton from '@/components/hospital/DeleteHospitalButton'
import { PREVIEW_MODE, mockHospitals } from '@/lib/mock-data'

export default async function HospitalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let hospital = null
  let isAdmin = true

  if (PREVIEW_MODE) {
    hospital = mockHospitals.find(h => h.id === id) || mockHospitals[0]
    isAdmin = true
  } else {
    const supabase = await createClient()

    const { data } = await supabase
      .from('hospitals')
      .select(`
        *,
        examples:hospital_examples(*),
        topics:hospital_topics(*)
      `)
      .eq('id', id)
      .single()

    hospital = data
    isAdmin = true
  }

  if (!hospital) notFound()

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{hospital.name}</h1>
        <Link
          href={`/generate?hospital=${hospital.id}`}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          <PenSquare size={14} />
          글 생성
        </Link>
      </div>
      <HospitalForm mode="edit" hospital={hospital} isAdmin={isAdmin} />
      {isAdmin && (
        <div className="mt-4 flex justify-end">
          <DeleteHospitalButton hospitalId={hospital.id} hospitalName={hospital.name} />
        </div>
      )}
    </div>
  )
}
