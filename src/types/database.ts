export interface Database {
  public: {
    Tables: {
      goals: {
        Row: {
          id: string
          user_id: string
          category: string
          description: string
          completed: boolean
          created_at: string
          updated_at: string
          completed_by_supervisor_id: string | null
          progress_percentage: number
        }
        Insert: {
          id?: string
          user_id: string
          category: string
          description: string
          completed?: boolean
          created_at?: string
          updated_at?: string
          completed_by_supervisor_id?: string | null
          progress_percentage?: number
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          description?: string
          completed?: boolean
          created_at?: string
          updated_at?: string
          completed_by_supervisor_id?: string | null
          progress_percentage?: number
        }
      }
      mechanisms: {
        Row: {
          id: string
          goal_id: string
          description: string
          frequency: 'daily' | '2x_week' | '3x_week' | '4x_week' | '5x_week' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
          user_id: string
          start_date: string
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          description: string
          frequency: 'daily' | '2x_week' | '3x_week' | '4x_week' | '5x_week' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
          user_id: string
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          goal_id?: string
          description?: string
          frequency?: 'daily' | '2x_week' | '3x_week' | '4x_week' | '5x_week' | 'weekly' | 'monthly' | 'yearly'
          user_id?: string
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Tipos de utilidad para el frontend
export type Goal = Database['public']['Tables']['goals']['Row']
export type GoalInsert = Database['public']['Tables']['goals']['Insert']
export type GoalUpdate = Database['public']['Tables']['goals']['Update']

export type Mechanism = Database['public']['Tables']['mechanisms']['Row']
export type MechanismInsert = Database['public']['Tables']['mechanisms']['Insert']
export type MechanismUpdate = Database['public']['Tables']['mechanisms']['Update']

// Tipos para el frontend con relaciones
export interface GoalWithMechanisms extends Goal {
  mechanisms: Mechanism[]
}

export interface MechanismWithGoal extends Mechanism {
  goal: Goal
}
