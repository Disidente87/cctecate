export type UserRole = 'lider' | 'senior' | 'master_senior' | 'admin'

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
  evaluation_status: 'pending' | 'on_time' | 'late' | 'rescheduled' | 'not_done'
  score: number
  notes?: string
  rescheduled_count: number
  call_schedule_id?: string
  is_auto_generated: boolean
  created_at: string
  updated_at: string
}

export interface CallSchedule {
  id: string
  leader_id: string
  senior_id: string
  monday_time?: string
  wednesday_time?: string
  friday_time?: string
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CallStatistics {
  total_calls: number
  completed_calls: number
  pending_calls: number
  total_score: number
  progress_percentage: number
  available_percentage: number
  on_time_calls: number
  late_calls: number
  rescheduled_calls: number
  not_done_calls: number
}

export interface NextCall {
  call_id: string
  scheduled_date: string
  senior_name: string
  senior_email: string
}

export interface PendingCall {
  call_id: string
  scheduled_date: string
  senior_name: string
  senior_email: string
  days_since_scheduled: number
  is_overdue: boolean
}

export interface CallCalendarItem {
  date: string
  call_id: string
  scheduled_time: string
  senior_name: string
  evaluation_status: string
  score: number
  color_code: string
  is_pending: boolean
  is_future: boolean
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
