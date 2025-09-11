import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { LeaderboardEntry } from '@/types'

export interface DashboardStats {
  goalsCompleted: number
  totalGoals: number
  activitiesCompleted: number
  totalActivities: number
  callsThisMonth: number
  leaderboardPosition: number
}

export interface RecentActivity {
  id: string
  title: string
  completed: boolean
  date: string
  type: 'goal' | 'activity' | 'call'
}

export function useDashboard(userId: string) {
  const [stats, setStats] = useState<DashboardStats>({
    goalsCompleted: 0,
    totalGoals: 0,
    activitiesCompleted: 0,
    totalActivities: 0,
    callsThisMonth: 0,
    leaderboardPosition: 0
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    const loadDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Cargar datos en paralelo
        const [
          goalsData,
          activitiesData,
          callsData,
          leaderboardData,
          recentActivitiesData
        ] = await Promise.all([
          // Metas completadas
          supabase
            .from('goals')
            .select('id, completed, created_at')
            .eq('user_id', userId),
          
          // Actividades completadas
          supabase
            .from('user_activity_completions')
            .select(`
              id,
              completed_at,
              activities!inner(
                id,
                title,
                is_active
              )
            `)
            .eq('user_id', userId),
          
          // Llamadas del mes actual
          supabase
            .from('calls')
            .select('id, scheduled_date, evaluation_status')
            .eq('leader_id', userId)
            .gte('scheduled_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
          
          // Posición en leaderboard
          supabase.rpc('get_leaderboard_data', {
            p_user_id: userId,
            p_generation_filter: null
          }),
          
          // Actividades recientes (últimas 5)
          supabase
            .from('user_activity_completions')
            .select(`
              id,
              completed_at,
              activities!inner(
                id,
                title
              )
            `)
            .eq('user_id', userId)
            .order('completed_at', { ascending: false })
            .limit(5)
        ])

        // Procesar datos de metas
        const goals = goalsData.data || []
        const goalsCompleted = goals.filter(goal => goal.completed).length
        const totalGoals = goals.length

        // Procesar datos de actividades
        const activities = activitiesData.data || []
        const activitiesCompleted = activities.length
        
        // Obtener total de actividades activas
        const { data: totalActivitiesData } = await supabase
          .from('activities')
          .select('id')
          .eq('is_active', true)
        const totalActivities = totalActivitiesData?.length || 0

        // Procesar datos de llamadas
        const calls = callsData.data || []
        const callsThisMonth = calls.length

        // Procesar posición en leaderboard
        const leaderboard = leaderboardData.data || []
        const userPosition = leaderboard.findIndex((user: LeaderboardEntry) => user.user_id === userId) + 1
        const leaderboardPosition = userPosition || 0

        // Procesar actividades recientes
        const recent = recentActivitiesData.data || []
        const formattedRecentActivities: RecentActivity[] = recent.map((activity: { id: string; activities: { id: string; title: string }[]; completed_at: string }) => ({
          id: activity.id,
          title: activity.activities?.[0]?.title || 'Actividad',
          completed: true,
          date: new Date(activity.completed_at).toLocaleDateString('es-ES'),
          type: 'activity' as const
        }))

        // Agregar metas recientes completadas
        const recentGoals = goals
          .filter(goal => goal.completed)
          .slice(0, 3)
          .map(goal => ({
            id: goal.id,
            title: `Meta completada`,
            completed: true,
            date: new Date(goal.created_at).toLocaleDateString('es-ES'),
            type: 'goal' as const
          }))

        // Combinar y ordenar actividades recientes
        const allRecentActivities = [...formattedRecentActivities, ...recentGoals]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5)

        setStats({
          goalsCompleted,
          totalGoals,
          activitiesCompleted,
          totalActivities,
          callsThisMonth,
          leaderboardPosition
        })

        setRecentActivities(allRecentActivities)

      } catch (err) {
        console.error('Error loading dashboard data:', err)
        setError('Error al cargar los datos del dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [userId])

  return {
    stats,
    recentActivities,
    loading,
    error
  }
}
