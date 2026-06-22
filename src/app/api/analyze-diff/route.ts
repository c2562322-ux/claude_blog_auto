import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { original, edited } = await req.json()

  if (!original || !edited) {
    return NextResponse.json({ error: '원본과 수정본이 필요합니다.' }, { status: 400 })
  }

  if (original === edited) {
    return NextResponse.json({ error: '변경사항이 없습니다.' }, { status: 400 })
  }

  const prompt = `아래 두 글을 비교하여 문체, 어미, 표현 방식의 차이점을 분석해주세요.

[원본 글]
${original}

[수정된 글]
${edited}

반드시 아래 형식 그대로 출력하세요. 섹션 제목은 변경하지 마세요.

## 변경된 점
- (각 변경사항을 구체적이고 간결하게 나열. 예: "-입니다 → -어요로 어미 변경", "소제목(##) 제거" 등)

## 앞으로 이 병원 글 작성 시 적용할 규칙
- (위 변경점을 바탕으로 앞으로 글 생성 시 지켜야 할 구체적인 규칙. 예: "어미는 항상 -어요/-해요체 사용", "소제목 없이 단락으로만 구성" 등)

분석 시 중점 확인 항목: 어미/경어체 변화, 인용구 추가/제거, 단락/소제목 구조, 표현 강도, 추가/삭제된 내용 유형`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const analysis = completion.choices[0]?.message?.content || ''
    const rulesMatch = analysis.match(/## 앞으로 이 병원 글 작성 시 적용할 규칙([\s\S]*)/)
    const rules = rulesMatch ? rulesMatch[1].trim() : ''

    return NextResponse.json({ analysis, rules })
  } catch (error) {
    console.error('OpenAI analyze error:', error)
    return NextResponse.json({ error: '분석 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
