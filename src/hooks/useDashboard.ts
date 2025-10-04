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
  timestamp: number
  type: 'goal' | 'activity' | 'call' | 'mechanism'
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

        // Obtener fecha de hoy para filtrar actividades desbloqueadas
        const today = new Date().toISOString().split('T')[0] // Formato YYYY-MM-DD

        // Cargar datos en paralelo
        const [
          goalsData,
          activitiesData,
          callsData,
          leaderboardData,
          mechanismsData,
          callsRecentData,
          activitiesRecentData
        ] = await Promise.all([
          // Metas completadas
          supabase
            .from('goals')
            .select('id, completed, created_at')
            .eq('user_id', userId),
          
          // Actividades completadas (solo las desbloqueadas)
          supabase
            .from('user_activity_completions')
            .select(`
              id,
              completed_at,
              activities!inner(
                id,
                title,
                is_active,
                unlock_date
              )
            `)
            .eq('user_id', userId)
            .lte('activities.unlock_date', today), // Solo actividades desbloqueadas
          
          // Llamadas del mes actual (funciona para líderes, seniors y master seniors)
          supabase
            .from('calls')
            .select('id, scheduled_date, evaluation_status, leader_id, supervisor_id')
            .or(`leader_id.eq.${userId},supervisor_id.eq.${userId}`)
            .gte('scheduled_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
          
          // Posición en leaderboard
          supabase.rpc('get_leaderboard_data', {
            p_user_id: userId,
            p_generation_filter: null
          }),
          
          // Mecanismos completados recientes
          supabase
            .from('mechanism_completions')
            .select(`
              id,
              completed_at,
              mechanisms!inner(
                id,
                description,
                goals!inner(
                  id,
                  description
                )
              )
            `)
            .eq('user_id', userId)
            .order('completed_at', { ascending: false })
            .limit(10),
          
          // Llamadas completadas recientes (funciona para líderes, seniors y master seniors)
          supabase
            .from('calls')
            .select(`
              id,
              scheduled_date,
              updated_at,
              evaluation_status,
              score,
              leader_id,
              supervisor_id
            `)
            .or(`leader_id.eq.${userId},supervisor_id.eq.${userId}`)
            .in('evaluation_status', ['on_time', 'late', 'rescheduled', 'not_done'])
            .order('updated_at', { ascending: false })
            .limit(10),
          
          // Actividades completadas recientes (solo las desbloqueadas)
          supabase
            .from('user_activity_completions')
            .select(`
              id,
              completed_at,
              activities!inner(
                id,
                title,
                unlock_date
              )
            `)
            .eq('user_id', userId)
            .lte('activities.unlock_date', today) // Solo actividades desbloqueadas
            .order('completed_at', { ascending: false })
            .limit(10)
        ])

        // Procesar datos de metas
        const goals = goalsData.data || []
        const goalsCompleted = goals.filter(goal => goal.completed).length
        const totalGoals = goals.length

        // Procesar datos de actividades
        const activities = activitiesData.data || []
        const activitiesCompleted = activities.length
        
        // Obtener total de actividades activas y desbloqueadas
        const { data: totalActivitiesData } = await supabase
          .from('activities')
          .select('id')
          .eq('is_active', true)
          .lte('unlock_date', today) // Solo actividades desbloqueadas
        const totalActivities = totalActivitiesData?.length || 0

        // Procesar datos de llamadas
        const calls = callsData.data || []
        const callsThisMonth = calls.length

        // Procesar posición en leaderboard
        const leaderboard = leaderboardData.data || []
        const userPosition = leaderboard.findIndex((user: LeaderboardEntry) => user.user_id === userId) + 1
        const leaderboardPosition = userPosition || 0

        // Procesar actividades recientes de todos los tipos
        const mechanisms = mechanismsData.data || []
        const callsRecent = callsRecentData.data || []
        const activitiesRecent = activitiesRecentData.data || []

        // Formatear mecanismos completados
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedMechanisms: RecentActivity[] = mechanisms.map((mechanism: any) => ({
          id: mechanism.id,
          title: `${mechanism.mechanisms?.goals?.description || 'Meta'}: ${mechanism.mechanisms?.description || 'Mecanismo'}`,
          completed: true,
          date: new Date(mechanism.completed_at).toLocaleDateString('es-ES', { timeZone: 'UTC' }),
          timestamp: new Date(mechanism.completed_at).getTime(),
          type: 'mechanism' as const
        }))

        // Formatear llamadas completadas (funciona para líderes y supervisores)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedCalls: RecentActivity[] = callsRecent.map((call: any) => {
          const isLeader = call.leader_id === userId
          const role = isLeader ? 'como líder' : 'como supervisor'
          return {
            id: call.id,
            title: `Llamada completada ${role} (${call.evaluation_status === 'on_time' ? 'A tiempo' : 
              call.evaluation_status === 'late' ? 'Tardía' : 
              call.evaluation_status === 'rescheduled' ? 'Reagendada' : 'No realizada'})`,
            completed: true,
            date: new Date(call.updated_at).toLocaleDateString('es-ES', { timeZone: 'UTC' }),
            timestamp: new Date(call.updated_at).getTime(),
            type: 'call' as const
          }
        })

        // Formatear actividades completadas
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedActivities: RecentActivity[] = activitiesRecent.map((activity: any) => ({
          id: activity.id,
          title: activity.activities?.title || 'Actividad',
          completed: true,
          date: new Date(activity.completed_at).toLocaleDateString('es-ES', { timeZone: 'UTC' }),
          timestamp: new Date(activity.completed_at).getTime(),
          type: 'activity' as const
        }))
        
        // Combinar y ordenar todas las actividades recientes por fecha
        const allActivities = [...formattedMechanisms, ...formattedCalls, ...formattedActivities]
        
        const allRecentActivities = allActivities
          .sort((a, b) => {
            // Usar timestamps exactos para ordenamiento preciso
            return b.timestamp - a.timestamp
          })
          .slice(0, 3) // Solo las 3 más recientes

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
