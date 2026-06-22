export type UserRole = 'admin' | 'member'

export interface User {
  id: string
  name: string | null
  email: string
  role: UserRole
  created_at: string
}

export interface Hospital {
  id: string
  name: string
  specialty: string | null
  location: string | null
  phone: string | null
  hours: string | null
  doctor_name: string | null
  conditions: string | null
  created_at: string
  updated_at: string
  examples?: HospitalExample[]
  topics?: HospitalTopic[]
  assignments?: HospitalAssignment[]
}

export interface HospitalExample {
  id: string
  hospital_id: string
  title: string | null
  content: string
  created_at: string
}

export interface HospitalTopic {
  id: string
  hospital_id: string
  topic: string
  created_at: string
}

export interface HospitalAssignment {
  id: string
  hospital_id: string
  user_id: string
  created_at: string
  user?: User
}

export type PostPattern = 'informative' | 'doctor'
export type PostLength = 'short' | 'medium' | 'long'
export type WritingStyle = 'formal' | 'casual'

export interface Post {
  id: string
  hospital_id: string
  user_id: string | null
  topic: string
  pattern: PostPattern
  length: PostLength
  seo_keywords: string | null
  content: string
  regenerated_content: string | null
  char_count: number | null
  status_written: boolean
  status_reviewed: boolean
  status_published: boolean
  publish_notes: string | null
  created_at: string
  hospital?: Hospital
  user?: User
}
