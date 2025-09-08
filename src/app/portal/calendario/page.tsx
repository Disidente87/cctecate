'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, Plus, CheckCircle, Target, Clock, TrendingUp } from 'lucide-react'
import { NotionCalendar } from '@/components/calendar/NotionCalendar'
import { useCalendarActivities } from '@/hooks/useCalendarActivities'
import { getUserGoals } from '@/lib/goals'
import { supabase } from '@/lib/supabase'
import type { GoalWithMechanisms } from '@/types/database'

export default function CalendarioPage() {
  const [goals, setGoals] = useState<GoalWithMechanisms[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)

  const {
    activities,
    updateActivityDate,
    toggleActivityComplete,
    addActivity
  } = useCalendarActivities(goals)

  useEffect(() => {
    const loadUserAndGoals = async () => {
      try {
        setLoading(true)
        
        // Obtener usuario autenticado
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !authUser) {
          console.error('Error getting user:', authError)
          setGoals([])
          return
        }
        
        setUser({ id: authUser.id })
        
        // Cargar metas reales de la base de datos
        const userGoals = await getUserGoals(authUser.id)
        console.log('Loaded goals:', userGoals) // Debug log
        setGoals(userGoals)
        
      } catch (error) {
        console.error('Error loading data:', error)
        setGoals([])
      } finally {
        setLoading(false)
      }
    }

    loadUserAndGoals()
  }, [])

  // Calcular estadísticas
  const today = new Date()
  const todayActivities = activities.filter(activity => 
    activity.date.toDateString() === today.toDateString()
  )
  const completedToday = todayActivities.filter(activity => activity.completed).length
  const totalToday = todayActivities.length

  const thisWeekActivities = activities.filter(activity => {
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    return activity.date >= weekStart && activity.date <= weekEnd
  })
  const completedThisWeek = thisWeekActivities.filter(activity => activity.completed).length

  const handleUpdateActivityDate = (activityId: string, newDate: Date) => {
    updateActivityDate(activityId, newDate)
    // Aquí se podría guardar en la base de datos
    console.log('Activity moved to:', newDate)
  }

  const handleAddActivity = (date: Date, goalId: string) => {
    // Por ahora, agregar a la primera meta disponible
    if (goals.length > 0) {
      const firstGoal = goals[0]
      if (firstGoal.mechanisms.length > 0) {
        addActivity(date, firstGoal.id, firstGoal.mechanisms[0].id)
      }
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando calendario...</p>
          </div>
        </div>
      </div>
    )
  }

  // Si no hay metas, mostrar mensaje para crear metas primero
  if (goals.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Mi Calendario</h1>
          <p className="text-gray-600 mt-2">
            Organiza y gestiona tus actividades diarias con drag & drop
          </p>
        </div>

        {/* Mensaje cuando no hay metas */}
        <Card className="text-center py-16">
          <CardContent>
            <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              No tienes metas creadas
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Para visualizar tu calendario de actividades, primero necesitas crear tus metas y definir los mecanismos para alcanzarlas.
            </p>
            <div className="space-y-4">
              <Button 
                onClick={() => window.location.href = '/portal/metas'}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <Target className="mr-2 h-5 w-5" />
                Crear Mis Metas
              </Button>
              <div className="text-sm text-gray-500">
                Una vez que tengas metas, podrás ver tus actividades organizadas en el calendario
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Mi Calendario</h1>
        <p className="text-gray-600 mt-2">
          Organiza y gestiona tus actividades diarias con drag & drop
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoy</CardTitle>
            <CalendarIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedToday}/{totalToday}</div>
            <p className="text-xs text-gray-600">
              Actividades completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedThisWeek}</div>
            <p className="text-xs text-gray-600">
              Completadas esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0}%
            </div>
            <p className="text-xs text-gray-600">
              Eficiencia diaria
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actividades</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activities.length}</div>
            <p className="text-xs text-gray-600">
              En el calendario
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendario Notion */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5" />
            <span>Calendario de Actividades</span>
          </CardTitle>
          <CardDescription>
            Arrastra las actividades entre días para reorganizar tu horario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotionCalendar
            goals={goals}
            activities={activities}
            onUpdateActivityDate={handleUpdateActivityDate}
            onAddActivity={handleAddActivity}
          />
        </CardContent>
      </Card>

      {/* Actividades de Hoy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Actividades de Hoy</span>
          </CardTitle>
          <CardDescription>
            {today.toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {todayActivities.map((activity) => (
              <div
                key={activity.id}
                className={`flex items-center space-x-4 p-4 rounded-lg border transition-all ${
                  activity.completed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <button
                  onClick={() => toggleActivityComplete(activity.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    activity.completed 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'border-gray-300 hover:border-green-500'
                  }`}
                >
                  {activity.completed && <CheckCircle className="h-4 w-4" />}
                </button>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className={`font-medium ${activity.completed ? 'line-through text-gray-500' : ''}`}>
                      {activity.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${activity.color}`}>
                      {activity.goalCategory}
                    </span>
                    <span className="text-xs text-gray-500">
                      {activity.frequency}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${activity.completed ? 'text-gray-500' : 'text-gray-600'}`}>
                    {activity.description}
                  </p>
                </div>
              </div>
            ))}

            {todayActivities.length === 0 && (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay actividades para hoy</h3>
                <p className="text-gray-600 mb-4">
                  Crea algunas metas para generar actividades automáticamente
                </p>
                <Button 
                  onClick={() => window.location.href = '/portal/metas'}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ir a Metas
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}