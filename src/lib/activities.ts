import { supabase } from '@/lib/supabase'

export interface Activity {
  id: string
  title: string
  description: string
  unlock_date: string // Formato YYYY-MM-DD
  completed_by: string[]
  category: string
  points: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ActivityWithCompletion extends Activity {
  is_completed: boolean
}

// Obtener todas las actividades
export async function getActivities(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('unlock_date', { ascending: true })

  if (error) {
    console.error('Error fetching activities:', error)
    throw error
  }

  return data || []
}

// Obtener actividades con estado de completación para un usuario específico
export async function getActivitiesWithCompletion(userId: string, userRole?: string): Promise<ActivityWithCompletion[]> {
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('*')
    .order('unlock_date', { ascending: true })

  if (activitiesError) {
    console.error('Error fetching activities:', activitiesError)
    throw activitiesError
  }

  if (!activities) return []

  // Filtrar actividades basándose en el rol del usuario y fecha de desbloqueo
  const today = new Date().toISOString().split('T')[0] // Formato YYYY-MM-DD

  const filteredActivities = activities.filter(activity => {
    // Los administradores pueden ver todas las actividades
    if (userRole === 'admin') {
      return true
    }
    
    // Líderes y seniors solo pueden ver actividades desbloqueadas
    return activity.unlock_date <= today
  })

  // Obtener las actividades completadas por el usuario
  const { data: completedActivities, error: completedError } = await supabase
    .from('user_activity_completions')
    .select('activity_id')
    .eq('user_id', userId)

  if (completedError) {
    console.error('Error fetching completed activities:', completedError)
    throw completedError
  }

  const completedActivityIds = new Set(completedActivities?.map(c => c.activity_id) || [])

  // Combinar actividades con estado de completación
  return filteredActivities.map(activity => ({
    ...activity,
    is_completed: completedActivityIds.has(activity.id)
  }))
}

// Marcar actividad como completada
export async function completeActivity(activityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_activity_completions')
    .insert({
      activity_id: activityId,
      user_id: userId,
      completed_at: new Date().toISOString()
    })

  if (error) {
    console.error('Error completing activity:', error)
    throw error
  }
}

// Desmarcar actividad como completada
export async function uncompleteActivity(activityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_activity_completions')
    .delete()
    .eq('activity_id', activityId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error uncompleting activity:', error)
    throw error
  }
}

// Toggle completación de actividad
export async function toggleActivityCompletion(activityId: string, userId: string, isCompleted: boolean): Promise<void> {
  if (isCompleted) {
    await completeActivity(activityId, userId)
  } else {
    await uncompleteActivity(activityId, userId)
  }
}
