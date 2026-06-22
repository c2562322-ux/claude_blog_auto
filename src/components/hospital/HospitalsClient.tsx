'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, BookOpen, Tag, ChevronRight } from 'lucide-react'
import type { Hospital } from '@/types'

interface Props {
  initialHospitals: Hospital[]
}

export default function HospitalsClient({ initialHospitals }: Props) {
  const [hospitals] = useState(initialHospitals)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-100">병원 관리</h1>
        <Link
          href="/hospitals/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          병원 추가
        </Link>
      </div>

      {hospitals.length > 0 ? (
        <div className="grid gap-3">
          {hospitals.map(hospital => (
            <Link
              key={hospital.id}
              href={`/hospitals/${hospital.id}`}
              className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-blue-500 hover:bg-gray-750 transition-all flex items-center justify-between group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="font-semibold text-gray-100">{hospital.name}</h2>
                  {hospital.specialty && (
                    <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-400 rounded-full">{hospital.specialty}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <BookOpen size={12} />
                    학습글 {hospital.examples?.length || 0}개
                  </span>
                  <span className="flex items-center gap-1">
                    <Tag size={12} />
                    주제 {hospital.topics?.length || 0}개
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-600 group-hover:text-blue-400 transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
          <p className="text-gray-500 mb-4">등록된 병원이 없습니다.</p>
          <Link
            href="/hospitals/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus size={16} />
            첫 번째 병원 추가하기
          </Link>
        </div>
      )}
    </div>
  )
}
