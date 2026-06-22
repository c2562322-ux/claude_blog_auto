'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Copy, Check, RefreshCw, Loader2, Tag, Search, Edit3, X, Save } from 'lucide-react'
import { POST_LENGTH_MAP, POST_PATTERN_MAP } from '@/lib/utils'
import { PREVIEW_MODE, mockHospitals } from '@/lib/mock-data'
import type { Hospital, HospitalTopic, PostLength, PostPattern, WritingStyle } from '@/types'

function GenerateContent() {
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get('hospital')
  const supabase = createClient()
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [topics, setTopics] = useState<HospitalTopic[]>([])
  const [hospitalSearch, setHospitalSearch] = useState('')

  const [topic, setTopic] = useState('')
  const [pattern, setPattern] = useState<PostPattern>('informative')
  const [length, setLength] = useState<PostLength>('medium')
  const [seoKeywords, setSeoKeywords] = useState('')
  const [writingStyle, setWritingStyle] = useState<WritingStyle>('formal')
  const [useQuotation, setUseQuotation] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState('')
  const [charCount, setCharCount] = useState(0)
  const [postId, setPostId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saveWarning, setSaveWarning] = useState(false)
  const [copied, setCopied] = useState(false)

  // 편집 모드
  const [editMode, setEditMode] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [editSaved, setEditSaved] = useState(false)

  useEffect(() => { loadHospitals() }, [])

  useEffect(() => {
    if (preselectedId && hospitals.length > 0 && !selectedHospital) {
      const target = hospitals.find(h => h.id === preselectedId)
      if (target) selectHospital(target)
    }
  }, [hospitals, preselectedId])

  const loadHospitals = async () => {
    if (PREVIEW_MODE) { setHospitals(mockHospitals); return }
    const { data } = await supabase.from('hospitals').select('*').order('name')
    setHospitals(data || [])
  }

  const selectHospital = async (hospital: Hospital) => {
    setSelectedHospital(hospital)
    setResult('')
    setError('')
    setEditMode(false)
    if (PREVIEW_MODE) {
      const mock = mockHospitals.find(h => h.id === hospital.id)
      setTopics(mock?.topics || [])
      return
    }
    const { data } = await supabase
      .from('hospital_topics')
      .select('*')
      .eq('hospital_id', hospital.id)
      .order('created_at')
    setTopics(data || [])
  }

  const generate = async () => {
    if (!selectedHospital || !topic.trim()) { setError('병원을 선택하고 주제를 입력해주세요.'); return }
    if (!seoKeywords.trim()) { setError('키워드를 입력해주세요.'); return }
    setGenerating(true); setError(''); setResult(''); setEditMode(false); setSaveWarning(false)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId: selectedHospital.id,
          topic: topic.trim(),
          pattern, length,
          seoKeywords: seoKeywords.trim() || null,
          writingStyle, useQuotation,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '오류가 발생했습니다.'); return }
      setResult(data.content)
      setCharCount(data.charCount)
      setPostId(data.postId || null)
      setSaveWarning(!data.postId)
      if (data.saveError) console.error('Save error:', data.saveError)
    } catch { setError('네트워크 오류가 발생했습니다.') }
    finally { setGenerating(false) }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const startEdit = () => {
    setEditedContent(result)
    setEditMode(true)
    setEditSaved(false)
  }

  const saveEdit = async () => {
    setResult(editedContent)
    setCharCount(editedContent.length)
    setEditMode(false)
    setEditSaved(true)
    if (postId && !PREVIEW_MODE) {
      await supabase.from('posts').update({ content: editedContent, char_count: editedContent.length }).eq('id', postId)
    }
    setTimeout(() => setEditSaved(false), 2000)
  }

  const cancelEdit = () => {
    setEditMode(false)
    setEditedContent('')
  }

  const filteredHospitals = hospitals.filter(h =>
    !hospitalSearch || h.name.includes(hospitalSearch) || (h.specialty || '').includes(hospitalSearch)
  )

  const btnBase = 'py-2 px-3 rounded-lg text-sm font-medium transition-colors'
  const btnActive = 'bg-blue-600 text-white'
  const btnInactive = 'bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500'

  const inputCls = 'w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'

  const displayCharCount = editMode ? editedContent.length : charCount

  return (
    <div className="p-8 flex gap-6 h-full">
      {/* 왼쪽: 설정 패널 */}
      <div className="w-80 flex-shrink-0 space-y-5 overflow-y-auto">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">글 생성</h1>

        {/* 병원 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">병원 선택</label>
          {hospitals.length > 0 && (
            <div className="relative mb-2">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                value={hospitalSearch}
                onChange={e => setHospitalSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="병원 검색..."
              />
            </div>
          )}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {filteredHospitals.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">병원이 없습니다.</p>
            ) : filteredHospitals.map(h => (
              <button
                key={h.id}
                onClick={() => selectHospital(h)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedHospital?.id === h.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                <div className="font-medium">{h.name}</div>
                {h.specialty && (
                  <div className={`text-xs mt-0.5 ${selectedHospital?.id === h.id ? 'text-blue-100' : 'text-gray-500'}`}>
                    {h.specialty}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 주제 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">주제</label>
          {topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {topics.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTopic(t.topic)}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Tag size={10} />
                  {t.topic}
                </button>
              ))}
            </div>
          )}
          <textarea
            value={topic}
            onChange={e => setTopic(e.target.value)}
            rows={3}
            className={inputCls}
            placeholder="예: 허리디스크 비수술 치료법"
          />
        </div>

        {/* 글 패턴 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">글 패턴</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(POST_PATTERN_MAP) as PostPattern[]).map(p => (
              <button key={p} onClick={() => setPattern(p)} className={`${btnBase} ${pattern === p ? btnActive : btnInactive}`}>
                {POST_PATTERN_MAP[p]}
              </button>
            ))}
          </div>
        </div>

        {/* 글 길이 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">글 길이</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(POST_LENGTH_MAP) as PostLength[]).map(l => (
              <button key={l} onClick={() => setLength(l)} className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors ${length === l ? btnActive : btnInactive}`}>
                {POST_LENGTH_MAP[l]}
              </button>
            ))}
          </div>
        </div>

        {/* 문체 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">문체</label>
          <div className="grid grid-cols-2 gap-2">
            {([['formal', '-입니다체'], ['casual', '-했었어요체']] as [WritingStyle, string][]).map(([val, label]) => (
              <button key={val} onClick={() => setWritingStyle(val)} className={`${btnBase} ${writingStyle === val ? btnActive : btnInactive}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 인용구 */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useQuotation}
            onChange={e => setUseQuotation(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">인용구 포함</span>
        </label>

        {/* 키워드 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            키워드 <span className="text-red-500">*</span>
          </label>
          <input
            value={seoKeywords}
            onChange={e => setSeoKeywords(e.target.value)}
            className={inputCls}
            placeholder="예: 강남 정형외과, 허리디스크"
          />
        </div>

        <button
          onClick={generate}
          disabled={generating || !selectedHospital || !seoKeywords.trim()}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {generating ? <><Loader2 size={16} className="animate-spin" />생성 중...</> : '글 생성하기'}
        </button>
      </div>

      {/* 오른쪽: 결과 */}
      <div className="flex-1 flex flex-col min-h-0">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800">{error}</div>
        )}
        {saveWarning && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm border border-yellow-200 dark:border-yellow-800">
            글이 생성되었지만 저장에 실패했습니다. Supabase posts 테이블 RLS 정책을 확인해주세요.
          </div>
        )}

        {result ? (
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col min-h-0">
            {/* 결과 헤더 */}
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {editMode ? '편집 중' : editSaved ? '저장됨' : '생성 완료'}
                </span>
                <span className="text-xs text-gray-500">
                  {displayCharCount.toLocaleString()}자
                  {editMode && editedContent.length !== charCount && (
                    <span className={`ml-1 ${editedContent.length > charCount ? 'text-orange-500' : 'text-blue-500'}`}>
                      ({editedContent.length > charCount ? '+' : ''}{(editedContent.length - charCount).toLocaleString()})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <>
                    <button
                      onClick={generate}
                      disabled={generating}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <RefreshCw size={12} />재생성
                    </button>
                    <button
                      onClick={startEdit}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Edit3 size={12} />편집
                    </button>
                    <button
                      onClick={copy}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? '복사됨' : '복사'}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={cancelEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-700">
                      <X size={12} />취소
                    </button>
                    <button onClick={saveEdit} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">
                      <Save size={12} />저장
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 결과 본문 */}
            {editMode ? (
              <textarea
                value={editedContent}
                onChange={e => setEditedContent(e.target.value)}
                className="flex-1 p-5 text-sm text-gray-900 dark:text-gray-200 leading-relaxed font-sans resize-none focus:outline-none bg-transparent"
              />
            ) : (
              <div className="flex-1 p-5 overflow-y-auto">
                <pre className="text-sm text-gray-900 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-sans">{result}</pre>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center">
            <div className="text-center text-gray-500">
              {generating ? (
                <div>
                  <Loader2 size={32} className="animate-spin mx-auto mb-3 text-blue-500" />
                  <p className="text-sm">글을 작성하고 있습니다...</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm">병원을 선택하고 주제를 입력하면</p>
                  <p className="text-sm">AI가 블로그 글을 작성해드립니다.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GeneratePage() {
  return <Suspense><GenerateContent /></Suspense>
}
