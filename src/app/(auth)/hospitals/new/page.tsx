import HospitalForm from '@/components/hospital/HospitalForm'

export default async function NewHospitalPage() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-100 mb-8">병원 추가</h1>
      <HospitalForm mode="create" />
    </div>
  )
}
