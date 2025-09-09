export type UserRole = 'lider' | 'senior' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  generation: string
  energy_drainers: string[]
  energy_givers: string[]
  created_at: string
  updated_at: string
}

export interface Generation {
  id: string
  name: string
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  category: string
  description: string
  mechanisms: string[]
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  is_custom: boolean
  created_at: string
  updated_at: string
}

export interface Mechanism {
  id: string
  goal_id: string
  description: string
  frequency: 'daily' | '2x_week' | '3x_week' | '4x_week' | '5x_week' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
  user_id: string
  start_date?: string | null
  end_date?: string | null
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  title: string
  description: string
  unlock_date: string
  completed_by: string[]
  created_at: string
  updated_at: string
}

export interface Call {
  id: string
  leader_id: string
  senior_id: string
  scheduled_date: string
  status: 'scheduled' | 'completed' | 'rescheduled' | 'missed'
  score: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface LeaderboardEntry {
  user_id: string
  name: string
  generation: string
  goals_completion_percentage: number
  activities_completion_percentage: number
  calls_score: number
  total_score: number
  rank: number
}
