'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Plus, Upload } from 'lucide-react'
import type { Hospital, HospitalExample, HospitalTopic } from '@/types'

interface HospitalFormProps {
  mode: 'create' | 'edit'
  hospital?: Hospital & { examples: HospitalExample[]; topics: HospitalTopic[] }
  isAdmin?: boolean
}

type ConditionFields = {
  doctorInfo: string
  strengths: string
  target: string
  includeExpr: string
  excludeExpr: string
  customPrompt: string
}

const SECTION_MAP: Record<string, keyof ConditionFields> = {
  '원장 정보': 'doctorInfo',
  '병원 강점': 'strengths',
  '타겟 고객': 'target',
  '포함할 표현': 'includeExpr',
  '금지 표현': 'excludeExpr',
  '추가 프롬프트': 'customPrompt',
}

const SECTION_LABELS: [keyof ConditionFields, string][] = [
  ['doctorInfo', '원장 정보'],
  ['strengths', '병원 강점'],
  ['target', '타겟 고객'],
  ['includeExpr', '포함할 표현'],
  ['excludeExpr', '금지 표현'],
  ['customPrompt', '추가 프롬프트 (전체 자유 입력)'],
]

const CONDITION_PLACEHOLDERS: Record<keyof ConditionFields, string> = {
  doctorInfo: '예: 김민준 원장 (정형외과 전문의 20년 경력)',
  strengths: '예: 비수술 도수치료, 체외충격파 장비 보유, 건강보험 적용 가능',
  target: '예: 40~60대 직장인, 허리/무릎 통증으로 고생하는 주부',
  includeExpr: '예: 주차 30대 가능, 화목 야간진료 7시까지',
  excludeExpr: '예: 완치, 100% 효과, 최고, 최저',
  customPrompt: '위 항목 외에 AI에게 추가로 전달할 내용을 자유롭게 작성하세요.',
}

function parseConditions(raw: string | null): ConditionFields {
  const empty: ConditionFields = { doctorInfo: '', strengths: '', target: '', includeExpr: '', excludeExpr: '', customPrompt: '' }
  if (!raw) return empty

  const lines = raw.split('\n')
  let current: keyof ConditionFields | null = null
  const result = { ...empty }

  for (const line of lines) {
    const match = line.match(/^\[(.+)\]$/)
    if (match && SECTION_MAP[match[1]]) {
      current = SECTION_MAP[match[1]]
    } else if (current) {
      result[current] += (result[current] ? '\n' : '') + line
    } else {
      result.customPrompt += (result.customPrompt ? '\n' : '') + line
    }
  }

  for (const key of Object.keys(result) as (keyof ConditionFields)[]) {
    result[key] = result[key].trim()
  }
  return result
}

function combineConditions(fields: ConditionFields): string {
  const labelMap: Record<keyof ConditionFields, string> = {
    doctorInfo: '원장 정보',
    strengths: '병원 강점',
    target: '타겟 고객',
    includeExpr: '포함할 표현',
    excludeExpr: '금지 표현',
    customPrompt: '추가 프롬프트',
  }
  const parts: string[] = []
  for (const [key, label] of Object.entries(labelMap)) {
    const val = fields[key as keyof ConditionFields].trim()
    if (val) parts.push(`[${label}]\n${val}`)
  }
  return parts.join('\n\n')
}

export default function HospitalForm({ mode, hospital }: HospitalFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<'info' | 'conditions' | 'examples' | 'topics'>('info')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: hospital?.name || '',
    specialty: hospital?.specialty || '',
    hours: hospital?.hours || '',
  })

  const [conditionFields, setConditionFields] = useState<ConditionFields>(
    parseConditions(hospital?.conditions || null)
  )

  const [doctorNames, setDoctorNames] = useState<string[]>(
    hospital?.doctor_name
      ? hospital.doctor_name.split(',').map(s => s.trim()).filter(Boolean)
      : ['']
  )

  const [examples, setExamples] = useState<{ id?: string; title: string; content: string }[]>(
    (hospital?.examples || []).map(e => ({ id: e.id, title: e.title || '', content: e.content }))
  )
  const [topics, setTopics] = useState<{ id?: string; topic: string }[]>(
    hospital?.topics || []
  )
  const [newTopic, setNewTopic] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleConditionChange = (key: keyof ConditionFields, value: string) => {
    setConditionFields(prev => ({ ...prev, [key]: value }))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const content = ev.target?.result as string
        setExamples(prev => [...prev, { title: file.name.replace('.txt', ''), content }])
      }
      reader.readAsText(file)
    })
  }

  const addTopic = () => {
    if (!newTopic.trim()) return
    setTopics(prev => [...prev, { topic: newTopic.trim() }])
    setNewTopic('')
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('병원명은 필수입니다.'); return }
    if (!doctorNames.some(n => n.trim())) { setError('원장명은 최소 1명 이상 입력해주세요.'); return }

    setSaving(true)
    setError('')

    try {
      let hospitalId = hospital?.id
      const submitData = {
        ...form,
        doctor_name: doctorNames.filter(n => n.trim()).join(', '),
        conditions: combineConditions(conditionFields),
      }

      if (mode === 'create') {
        const { data, error: insertError } = await supabase
          .from('hospitals')
          .insert(submitData)
          .select()
          .single()
        if (insertError) throw insertError
        hospitalId = data.id
      } else {
        const { error: updateError } = await supabase
          .from('hospitals')
          .update(submitData)
          .eq('id', hospitalId!)
        if (updateError) throw updateError
      }

      const newExamples = examples.filter(e => !e.id)
      if (newExamples.length > 0) {
        await supabase.from('hospital_examples').insert(
          newExamples.map(e => ({ hospital_id: hospitalId!, title: e.title, content: e.content }))
        )
      }

      const newTopics = topics.filter(t => !t.id)
      if (newTopics.length > 0) {
        await supabase.from('hospital_topics').insert(
          newTopics.map(t => ({ hospital_id: hospitalId!, topic: t.topic }))
        )
      }

      router.push('/hospitals')
      router.refresh()
    } catch (err) {
      console.error(err)
      setError('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const deleteExample = async (index: number) => {
    const ex = examples[index]
    if (ex.id) await supabase.from('hospital_examples').delete().eq('id', ex.id)
    setExamples(prev => prev.filter((_, i) => i !== index))
  }

  const deleteTopic = async (index: number) => {
    const tp = topics[index]
    if (tp.id) await supabase.from('hospital_topics').delete().eq('id', tp.id)
    setTopics(prev => prev.filter((_, i) => i !== index))
  }

  const tabs = [
    { id: 'info', label: '기본 정보' },
    { id: 'conditions', label: '고정 조건' },
    { id: 'examples', label: `기존 글 학습 (${examples.length})` },
    { id: 'topics', label: `주제 목록 (${topics.length})` },
  ] as const

  const inputClass = 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700">
      {/* 탭 */}
      <div className="flex border-b border-gray-700">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-3 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* 기본 정보 */}
        {tab === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">병원명 *</label>
                <input name="name" value={form.name} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">진료과목</label>
                <input name="specialty" value={form.specialty} onChange={handleChange} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">원장명 *</label>
              <div className="space-y-2">
                {doctorNames.map((name, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={name}
                      onChange={e => {
                        const next = [...doctorNames]
                        next[i] = e.target.value
                        setDoctorNames(next)
                      }}
                      className={inputClass}
                      placeholder="예: 김민준 원장"
                    />
                    {doctorNames.length > 1 && (
                      <button type="button" onClick={() => setDoctorNames(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-600 hover:text-red-400">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setDoctorNames(prev => [...prev, ''])}
                  className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 mt-1"
                >
                  <Plus size={14} />원장 추가
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 고정 조건 */}
        {tab === 'conditions' && (
          <div className="space-y-5">
            <p className="text-xs text-gray-500">항목별로 입력하면 AI가 글 생성 시 자동으로 반영합니다.</p>
            {SECTION_LABELS.map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
                <textarea
                  value={conditionFields[key]}
                  onChange={e => handleConditionChange(key, e.target.value)}
                  rows={key === 'customPrompt' ? 6 : 3}
                  className={`${inputClass} resize-none`}
                  placeholder={CONDITION_PLACEHOLDERS[key]}
                />
              </div>
            ))}
          </div>
        )}

        {/* 기존 글 학습 */}
        {tab === 'examples' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">기존 블로그 글을 업로드하면 동일한 문체로 글을 생성합니다.</p>
              <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-600 cursor-pointer">
                <Upload size={14} />
                .txt 파일 업로드
                <input type="file" accept=".txt" multiple className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
            <div className="space-y-3 mb-4">
              {examples.map((ex, i) => (
                <div key={i} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <input
                      value={ex.title}
                      onChange={e => setExamples(prev => prev.map((item, idx) => idx === i ? { ...item, title: e.target.value } : item))}
                      className="text-sm font-medium text-gray-200 border-none outline-none bg-transparent flex-1"
                      placeholder="제목 (선택)"
                    />
                    <button onClick={() => deleteExample(i)} className="text-gray-600 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">{ex.content.slice(0, 100)}...</p>
                </div>
              ))}
            </div>
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-6">
              <p className="text-sm text-gray-500 text-center mb-3">또는 직접 붙여넣기</p>
              <textarea
                rows={5}
                className={`${inputClass} resize-none`}
                placeholder="기존 블로그 글을 여기에 붙여넣으세요..."
                onBlur={e => {
                  if (e.target.value.trim()) {
                    setExamples(prev => [...prev, { title: '', content: e.target.value.trim() }])
                    e.target.value = ''
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* 주제 목록 */}
        {tab === 'topics' && (
          <div>
            <p className="text-sm text-gray-500 mb-4">자주 사용할 주제를 미리 저장해두면 글 생성 시 빠르게 선택할 수 있습니다.</p>
            <div className="flex gap-2 mb-4">
              <input
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTopic()}
                className={inputClass}
                placeholder="주제 입력 후 Enter 또는 추가 버튼"
              />
              <button onClick={addTopic} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                <Plus size={14} />추가
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {topics.map((t, i) => (
                <span key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-gray-300 rounded-full text-sm">
                  {t.topic}
                  <button onClick={() => deleteTopic(i)} className="text-gray-500 hover:text-red-400">
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-6 mb-4 p-3 bg-red-900/30 text-red-400 rounded-lg text-sm border border-red-800">{error}</div>
      )}

      <div className="px-6 pb-6 flex items-center justify-between">
        <button onClick={() => router.back()} className="px-4 py-2 text-gray-400 border border-gray-600 rounded-lg text-sm hover:bg-gray-700">
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '저장 중...' : mode === 'create' ? '병원 추가' : '저장'}
        </button>
      </div>
    </div>
  )
}
