import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const POST_LENGTH_MAP = {
  short: '짧게 (1000자)',
  medium: '기본 (1200자)',
  long: '길게 (1500자)',
}

export const POST_PATTERN_MAP = {
  informative: '정보형',
  doctor: '의사 직접 작성형',
}

export const TARGET_CHAR_COUNT = {
  short: 1000,
  medium: 1200,
  long: 1500,
}
