'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Copy, Check, Trash2, Search, Download, Edit3, Sparkles, Loader2, RefreshCw, X } from 'lucide-react'
import { POST_PATTERN_MAP, POST_LENGTH_MAP } from '@/lib/utils'
import { PREVIEW_MODE, mockPosts, mockHospitals } from '@/lib/mock-data'
import type { Post, Hospital } from '@/types'

type PostWithHospital = Post & { hospital: Hospital }

export default function HistoryPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<PostWithHospital[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<PostWithHospital | null>(null)
  const [copied, setCopied] = useState(false)
  const [regenCopied, setRegenCopied] = useState(false)
  const [search, setSearch] = useState('')
  const [hospitalFilter, setHospitalFilter] = useState('')
  const [hospitals, setHospitals] = useState<Hospital[]>([])

  const [editMode, setEditMode] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [savedOriginal, setSavedOriginal] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)
  const [extractedRules, setExtractedRules] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => { loadPosts() }, [])

  const loadPosts = async () => {
    setLoading(true)
    if (PREVIEW_MODE) {
      const postsWithHospital = mockPosts.map(p => ({
        ...p,
        regenerated_content: null,
        hospital: mockHospitals.find(h => h.id === p.hospital_id) as Hospital,
      }))
      setPosts(postsWithHospital as PostWithHospital[])
      setHospitals(mockHospitals.filter(h => mockPosts.some(p => p.hospital_id === h.id)))
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('posts')
      .select('*, hospital:hospitals(id, name, specialty)')
      .order('created_at', { ascending: false })
      .limit(200)
    setPosts((data || []) as PostWithHospital[])
    const uniqueHospitals = Array.from(
      new Map((data || []).map(p => [p.hospital?.id, p.hospital])).values()
    ).filter(Boolean) as Hospital[]
    setHospitals(uniqueHospitals)
    setLoading(false)
  }

  const selectPost = (post: PostWithHospital) => {
    setSelectedPost(post)
    setEditMode(false)
    setEditedContent('')
    setSavedOriginal('')
    setAnalysisResult(null)
    setExtractedRules(null)
    setCopied(false)
    setRegenCopied(false)
  }

  const downloadTxt = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const deletePost = async (id: string) => {
    if (!confirm('이 글을 삭제할까요?')) return
    if (!PREVIEW_MODE) await supabase.from('posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
    if (selectedPost?.id === id) setSelectedPost(null)
  }

  const copy = async (content: string, regen = false) => {
    await navigator.clipboard.writeText(content)
    if (regen) { setRegenCopied(true); setTimeout(() => setRegenCopied(false), 2000) }
    else { setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const startEdit = () => {
    if (!selectedPost) return
    setSavedOriginal(selectedPost.content)
    setEditedContent(selectedPost.content)
    setEditMode(true)
    setAnalysisResult(null)
    setExtractedRules(null)
  }

  const cancelEdit = () => {
    setEditMode(false)
    setEditedContent('')
    setAnalysisResult(null)
    setExtractedRules(null)
  }

  const analyzeChanges = async () => {
    if (!savedOriginal || editedContent === savedOriginal) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/analyze-diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original: savedOriginal, edited: editedContent }),
      })
      const data = await res.json()
      setAnalysisResult(data.analysis || data.error || '분석 결과를 받지 못했습니다.')
      setExtractedRules(data.rules || '')
    } catch {
      setAnalysisResult('분석 중 오류가 발생했습니다.')
    } finally {
      setAnalyzing(false)
    }
  }

  const regenerateWithStyle = async () => {
    if (!selectedPost || !extractedRules) return
    setRegenerating(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId: selectedPost.hospital?.id,
          topic: selectedPost.topic,
          pattern: selectedPost.pattern,
          length: selectedPost.length,
          seoKeywords: selectedPost.seo_keywords,
          writingStyle: 'formal',
          useQuotation: false,
          styleOverride: extractedRules,
        }),
      })
      const data = await res.json()
      const content = data.content || '재생성 실패'

      if (!PREVIEW_MODE && data.content) {
        await supabase.from('posts').update({ regenerated_content: content }).eq('id', selectedPost.id)
      }

      const updated = { ...selectedPost, regenerated_content: content }
      setSelectedPost(updated)
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, regenerated_content: content } : p))
      setEditMode(false)
      setAnalysisResult(null)
      setExtractedRules(null)
      setEditedContent('')
    } catch {
      setAnalysisResult(prev => prev ? prev + '\n\n재생성 중 오류가 발생했습니다.' : '재생성 중 오류가 발생했습니다.')
    } finally {
      setRegenerating(false)
    }
  }

  const filtered = posts.filter(p => {
    const matchSearch = !search || p.topic.includes(search) || p.content.includes(search)
    const matchHospital = !hospitalFilter || p.hospital?.id === hospitalFilter
    return matchSearch && matchHospital
  })

  const isEdited = editMode && editedContent !== savedOriginal
  const originalLen = savedOriginal.length
  const editedLen = editedContent.length
  const lenDiff = editedLen - originalLen

  return (
    <div className="p-8 flex gap-6 h-full">
      {/* 왼쪽: 목록 */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">히스토리</h1>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="주제 또는 내용 검색"
          />
        </div>
        <select
          value={hospitalFilter}
          onChange={e => setHospitalFilter(e.target.value)}
          className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 병원</option>
          {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-8">불러오는 중...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">검색 결과가 없습니다.</p>
          ) : filtered.map(post => (
            <button
              key={post.id}
              onClick={() => selectPost(post)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedPost?.id === post.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1 flex-1">{post.topic}</p>
                {post.regenerated_content && (
                  <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">AI수정</span>
                )}
              </div>
              <p className="text-xs text-gray-500">{post.hospital?.name} · {POST_PATTERN_MAP[post.pattern]}</p>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(post.created_at).toLocaleDateString('ko-KR')}</p>
              <div className="flex items-center gap-1 mt-2">
                <StatusDot done={post.status_written} label="작성" />
                <StatusDot done={post.status_reviewed} label="검토" />
                <StatusDot done={post.status_published} label="발행" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 오른쪽: 내용 */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedPost ? (
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col min-h-0">

            {/* 헤더 */}
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{selectedPost.topic}</h2>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                    <span>{selectedPost.hospital?.name}</span>
                    <span>·</span>
                    <span>{POST_PATTERN_MAP[selectedPost.pattern]}</span>
                    <span>·</span>
                    <span>{POST_LENGTH_MAP[selectedPost.length]}</span>
                    <span>·</span>
                    <span>{selectedPost.char_count?.toLocaleString()}자</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!editMode ? (
                    <>
                      <button onClick={() => downloadTxt(selectedPost.topic, selectedPost.content)} className="flex items-center gap-1 px-2.5 py-1.5 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Download size={11} />.txt
                      </button>
                      <button onClick={() => copy(selectedPost.content)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">
                        {copied ? <Check size={11} /> : <Copy size={11} />}
                        {copied ? '복사됨' : '복사'}
                      </button>
                      <button onClick={startEdit} className="flex items-center gap-1 px-2.5 py-1.5 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Edit3 size={11} />수정
                      </button>
                      <button onClick={() => deletePost(selectedPost.id)} className="flex items-center gap-1 px-2.5 py-1.5 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-900/30">
                        <Trash2 size={11} />삭제
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-orange-500 dark:text-orange-400 font-medium px-2">수정 중</span>
                      <button onClick={cancelEdit} className="flex items-center gap-1 px-2.5 py-1.5 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X size={11} />취소
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 일반 뷰 */}
            {!editMode && (
              <div className="flex-1 overflow-y-auto min-h-0">
                <pre className="p-5 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-sans">
                  {selectedPost.content}
                </pre>

                {selectedPost.regenerated_content && (
                  <div className="mx-5 mb-5 border-t border-gray-200 dark:border-gray-700 pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 font-medium">AI 수정본</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => downloadTxt(`${selectedPost.topic}_AI수정`, selectedPost.regenerated_content!)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Download size={11} />.txt
                        </button>
                        <button
                          onClick={() => copy(selectedPost.regenerated_content!, true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 dark:bg-purple-700 text-white rounded-lg text-xs hover:bg-purple-700 dark:hover:bg-purple-800"
                        >
                          {regenCopied ? <Check size={11} /> : <Copy size={11} />}
                          {regenCopied ? '복사됨' : '복사'}
                        </button>
                      </div>
                    </div>
                    <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-sans">
                      {selectedPost.regenerated_content}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* 편집 모드 (맞춤법 검사기 스타일) */}
            {editMode && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex flex-1 min-h-0">
                  {/* 왼쪽: 원본 */}
                  <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 dark:border-gray-700">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                      <span className="text-xs text-gray-500 font-medium">원본</span>
                      <span className="text-xs text-gray-400">{originalLen.toLocaleString()}자</span>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <pre className="p-5 text-sm text-gray-400 dark:text-gray-500 whitespace-pre-wrap leading-relaxed font-sans select-text">
                        {savedOriginal}
                      </pre>
                    </div>
                  </div>

                  {/* 오른쪽: 편집 */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                      <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">수정</span>
                      <div className="flex items-center gap-2">
                        {editMode && (
                          <span className="text-xs text-gray-500">
                            {editedLen.toLocaleString()}자
                            {lenDiff !== 0 && (
                              <span className={`ml-1 font-medium ${lenDiff > 0 ? 'text-orange-500' : 'text-blue-500'}`}>
                                ({lenDiff > 0 ? '+' : ''}{lenDiff.toLocaleString()})
                              </span>
                            )}
                          </span>
                        )}
                        {isEdited && <span className="text-xs text-orange-500 dark:text-orange-400">변경됨</span>}
                      </div>
                    </div>
                    <textarea
                      value={editedContent}
                      onChange={e => setEditedContent(e.target.value)}
                      className="flex-1 p-5 text-sm text-gray-900 dark:text-gray-100 leading-relaxed font-sans resize-none focus:outline-none bg-transparent"
                    />
                  </div>
                </div>

                {/* 분석 결과 */}
                {(analyzing || analysisResult) && (
                  <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 max-h-60 overflow-y-auto">
                    {analyzing && (
                      <div className="flex items-center gap-2 p-4">
                        <Loader2 size={14} className="animate-spin text-blue-500" />
                        <span className="text-sm text-blue-600 dark:text-blue-300">변경점을 분석하고 있습니다...</span>
                      </div>
                    )}
                    {analysisResult && !analyzing && (
                      <div className="p-4">
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">변경점 분석 결과</p>
                        <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{analysisResult}</pre>
                      </div>
                    )}
                    {regenerating && (
                      <div className="flex items-center gap-2 px-4 pb-4">
                        <Loader2 size={14} className="animate-spin text-purple-500" />
                        <span className="text-sm text-purple-600 dark:text-purple-300">학습된 스타일로 재생성하고 있습니다...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 하단 액션 바 */}
                <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-5 py-3 bg-white dark:bg-gray-800 flex items-center gap-3">
                  <button
                    onClick={analyzeChanges}
                    disabled={!isEdited || analyzing || regenerating}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {analyzing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    {analyzing ? '분석 중...' : '변경점 분석'}
                  </button>

                  {extractedRules && !analyzing && (
                    <button
                      onClick={regenerateWithStyle}
                      disabled={regenerating}
                      className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-700 dark:hover:bg-purple-800 disabled:opacity-50"
                    >
                      {regenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                      {regenerating ? '재생성 중...' : '학습 후 재생성'}
                    </button>
                  )}

                  <p className="text-xs text-gray-400 ml-auto">
                    {!isEdited
                      ? '오른쪽 글을 수정하면 분석할 수 있습니다'
                      : analysisResult
                      ? '분석 완료 — 학습 후 재생성하거나 계속 수정하세요'
                      : '수정 완료 후 변경점 분석을 눌러주세요'}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 text-sm">
            왼쪽에서 글을 선택하세요
          </div>
        )}
      </div>
    </div>
  )
}

function StatusDot({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full ${done ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-500'}`}>
      {label}
    </span>
  )
}
