import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { TARGET_CHAR_COUNT } from '@/lib/utils'
import type { PostLength, PostPattern, WritingStyle } from '@/types'

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await req.json()
  const { hospitalId, topic, pattern, length, seoKeywords, writingStyle, useQuotation, styleOverride } = body

  if (!hospitalId || !topic) {
    return NextResponse.json({ error: '병원과 주제를 입력해주세요.' }, { status: 400 })
  }

  const { data: hospital } = await supabase
    .from('hospitals')
    .select('*, examples:hospital_examples(*)')
    .eq('id', hospitalId)
    .single()

  if (!hospital) {
    return NextResponse.json({ error: '병원 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const targetChars = TARGET_CHAR_COUNT[length as PostLength] || 900
  const examples = hospital.examples?.slice(0, 3) || []

  const conditionsSection = hospital.conditions?.trim()
    ? `\n고정 조건:\n${hospital.conditions.trim()}`
    : ''

  const hospitalContext = `병원명: ${hospital.name}
진료과목: ${hospital.specialty || '미입력'}
지역: ${hospital.location || '미입력'}
전화번호: ${hospital.phone || '미입력'}
원장명: ${hospital.doctor_name || '미입력'}${conditionsSection}`

  const examplesContext = examples.length > 0
    ? `\n\n[참고할 기존 글 문체/스타일 - 아래 글들의 어조와 구성을 참고하여 작성하세요]\n` +
      examples.map((e: { title: string | null; content: string }, i: number) =>
        `예시 ${i + 1}${e.title ? ` (${e.title})` : ''}:\n${e.content.slice(0, 600)}`
      ).join('\n\n---\n\n')
    : ''

  const patternInstruction = (pattern as PostPattern) === 'doctor'
    ? `[글쓰기 패턴: 의사 직접 작성형]
- 원장(${hospital.doctor_name || '원장'})이 직접 쓴 것처럼 1인칭으로 작성
- "저는 진료를 하면서...", "제가 환자분들께 자주 말씀드리는..." 등의 표현 사용
- 임상 경험과 실제 사례를 녹여내는 에세이 톤
- 전문가의 따뜻한 조언 형식`
    : `[글쓰기 패턴: 정보형]
- 객관적 3인칭 시점으로 작성
- 소제목 2~3개 포함 (## 사용)
- 검색 최적화를 위한 키워드 자연스럽게 배치
- 도입부(공감) → 정보 본문 → 내원 유도 마무리 구성`

  const seoInstruction = seoKeywords
    ? `\n[SEO 키워드 - 글에 자연스럽게 포함시킬 것]: ${seoKeywords}`
    : ''

  const styleRule = (writingStyle as WritingStyle) === 'casual'
    ? '문체: -했었어요/-하더라고요/-거든요 등 부드럽고 친근한 경어체로 작성'
    : '문체: -입니다/-합니다/-습니다 격식 있는 경어체로 작성'

  const quotationRule = useQuotation
    ? '인용구: 환자 경험담 또는 전문가 말을 인용하는 형식의 문장을 1~2개 자연스럽게 포함'
    : null

  const rules = [
    `분량: 약 ${targetChars}자 (±100자 허용)`,
    '의료광고법 준수: "완치", "100% 효과", "최고" 등 과장 표현 절대 금지',
    '병원명, 지역명, 진료과목을 글에 자연스럽게 포함',
    '마지막에 전화번호 또는 예약 안내로 마무리',
    '네이버 블로그에 바로 올릴 수 있는 완성된 글로 작성',
    styleRule,
    ...(quotationRule ? [quotationRule] : []),
  ]

  const styleOverrideSection = styleOverride
    ? `\n\n[관리자가 학습시킨 스타일 규칙 — 아래 규칙을 반드시 우선 적용할 것]\n${styleOverride}`
    : ''

  const systemPrompt = `당신은 네이버 블로그 전문 콘텐츠 작가입니다. 병원 홍보 블로그 글을 작성합니다.

[필수 규칙]
${rules.map(r => `- ${r}`).join('\n')}`

  const userPrompt = `[병원 정보]
${hospitalContext}
${examplesContext}

${patternInstruction}
${seoInstruction}${styleOverrideSection}

[작성 주제]
${topic}

위 조건을 모두 반영하여 네이버 블로그 포스팅 글을 작성해주세요.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2048,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const content = completion.choices[0]?.message?.content || ''
    const charCount = content.length

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        hospital_id: hospitalId,
        user_id: user.id,
        topic,
        pattern,
        length,
        seo_keywords: seoKeywords || null,
        content,
        char_count: charCount,
        status_written: false,
        status_reviewed: false,
        status_published: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Post save error:', error)
      return NextResponse.json({ content, charCount, postId: null, saveError: error.message })
    }

    return NextResponse.json({ content, charCount, postId: post?.id })
  } catch (error) {
    console.error('OpenAI API error:', error)
    return NextResponse.json({ error: '글 생성 중 오류가 발생했습니다. API 키를 확인해주세요.' }, { status: 500 })
  }
}
