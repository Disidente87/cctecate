'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Star, 
  CheckCircle, 
  Calendar,
  Users,
  Heart,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getActivitiesWithCompletion, toggleActivityCompletion, type ActivityWithCompletion } from '@/lib/activities'
import { supabase } from '@/lib/supabase'
import { useSelectedUser } from '@/contexts/selected-user'

export default function ActividadesPage() {
  const { selectedUserId, authUserId } = useSelectedUser()
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [activities, setActivities] = useState<ActivityWithCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar usuario y actividades desde la base de datos
  useEffect(() => {
    const loadUserAndActivities = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const viewUserId = selectedUserId || authUserId
        if (viewUserId) {
          setUser({ id: viewUserId })
          const activitiesData = await getActivitiesWithCompletion(viewUserId)
          setActivities(activitiesData)
        }
      } catch (err) {
        console.error('Error loading user and activities:', err)
        setError('Error al cargar las actividades')
      } finally {
        setLoading(false)
      }
    }

    loadUserAndActivities()
  }, [selectedUserId, authUserId])

  const handleToggleActivity = async (activityId: string) => {
    if (!user) return

    const activity = activities.find(a => a.id === activityId)
    if (!activity) return

    try {
      const newCompletedState = !activity.is_completed
      await toggleActivityCompletion(activityId, user.id, newCompletedState)
      
      // Actualizar el estado local
      setActivities(prev => 
        prev.map(a => 
          a.id === activityId 
            ? { ...a, is_completed: newCompletedState }
            : a
        )
      )
    } catch (err) {
      console.error('Error toggling activity:', err)
      setError('Error al actualizar la actividad')
    }
  }

  // Actividades activas no completadas (para "Actividades de Esta Semana")
  const currentWeekActivities = activities.filter(activity => 
    activity.is_active && !activity.is_completed
  )
  
  // Actividades completadas (para "Actividades Pasadas")
  const pastActivities = activities.filter(activity => 
    activity.is_active && activity.is_completed
  )
  
  const completedCount = pastActivities.length
  const totalCurrentWeek = currentWeekActivities.length
  const completionRate = totalCurrentWeek > 0 ? Math.round((completedCount / (completedCount + totalCurrentWeek)) * 100) : 0

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Bienestar': return 'bg-pink-100 '
      case 'Salud': return 'bg-green-100 '
      case 'Relaciones': return 'bg-blue-100 '
      case 'Crecimiento': return 'bg-purple-100 '
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Bienestar': return <Heart className="h-4 w-4" />
      case 'Salud': return <Star className="h-4 w-4" />
      case 'Relaciones': return <Users className="h-4 w-4" />
      case 'Crecimiento': return <CheckCircle className="h-4 w-4" />
      default: return <Star className="h-4 w-4" />
    }
  }

  // Mostrar loading si está cargando las actividades
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando actividades...</p>
          </div>
        </div>
      </div>
    )
  }

  // Mostrar error si hay un problema
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold ">Actividades Gustosas</h1>
        <p className=" mt-2">
          Descubre nuevas actividades semanales para enriquecer tu crecimiento personal
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium ">Progreso General</CardTitle>
            <Star className="h-4 w-4 " />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs ">
              {completedCount} completadas de {completedCount + totalCurrentWeek} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium ">Puntos Obtenidos</CardTitle>
            <CheckCircle className="h-4 w-4 " />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold ">
              {pastActivities
                .reduce((total, activity) => total + activity.points, 0)
              }
            </div>
            <p className="text-xs ">
              Total acumulado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium ">Actividades Pendientes</CardTitle>
            <Calendar className="h-4 w-4 " />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold ">
              {totalCurrentWeek}
            </div>
            <p className="text-xs ">
              Por completar esta semana
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Week Activities */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold  mb-6">
          Actividades de Esta Semana
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentWeekActivities.map((activity) => (
            <Card 
              key={activity.id} 
              className={`transition-all duration-200 ${
                activity.is_completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'hover:shadow-md'
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(activity.category)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(activity.category)}`}>
                      {activity.category}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium ">
                      {activity.points} pts
                    </span>
                    <button
                      onClick={() => handleToggleActivity(activity.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        activity.is_completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-primary-500'
                      }`}
                    >
                      {activity.is_completed && (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <CardTitle className="text-lg">
                  {activity.title}
                </CardTitle>
                <CardDescription>
                  {activity.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm ">
                  <span>
                    {activity.completed_by.length} personas completaron
                  </span>
                  <span>
                    Desbloqueada el {format(new Date(activity.unlock_date), 'dd MMM', { locale: es })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Past Activities */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold  mb-6">
          Actividades Pasadas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pastActivities.map((activity) => (
            <Card 
              key={activity.id} 
              className="bg-green-50 border-green-200 opacity-90"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(activity.category)}`}>
                      {activity.category}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-green-600">
                    {activity.points} pts
                  </span>
                </div>
                <CardTitle className="text-lg line-through">
                  {activity.title}
                </CardTitle>
                <CardDescription>
                  {activity.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-green-600">
                  <span>
                    Completada
                  </span>
                  <span>
                    {format(new Date(activity.unlock_date), 'dd MMM', { locale: es })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Completion Message */}
      {totalCurrentWeek === 0 && pastActivities.length > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-primary-50 border-green-200">
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 " />
            </div>
            <h3 className="text-xl font-semibold  mb-2">
              ¡Excelente trabajo!
            </h3>
            <p className=" mb-4">
              Has completado todas las actividades activas. 
              ¡Sigue así y mantén tu momentum!
            </p>
            <div className="text-2xl font-bold text-primary-600">
              +{pastActivities
                .reduce((total, activity) => total + activity.points, 0)
              } puntos obtenidos
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {currentWeekActivities.length === 0 && pastActivities.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium  mb-2">
              No hay actividades disponibles
            </h3>
            <p className=" mb-4">
              Las actividades se activan semanalmente. 
              Vuelve pronto para descubrir nuevas experiencias.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
