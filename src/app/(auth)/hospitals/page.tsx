import { createClient } from '@/lib/supabase/server'
import { PREVIEW_MODE, mockHospitals } from '@/lib/mock-data'
import HospitalsClient from '@/components/hospital/HospitalsClient'

export default async function HospitalsPage() {
  let hospitals: typeof mockHospitals = []

  if (PREVIEW_MODE) {
    hospitals = mockHospitals
  } else {
    const supabase = await createClient()
    const { data } = await supabase
      .from('hospitals')
      .select('*, examples:hospital_examples(id), topics:hospital_topics(id)')
      .order('name')
    hospitals = (data || []) as typeof mockHospitals
  }

  return <HospitalsClient initialHospitals={hospitals} />
}
