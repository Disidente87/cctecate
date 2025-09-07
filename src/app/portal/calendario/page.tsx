'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Calendar as CalendarIcon, 
  Plus, 
  CheckCircle, 
  Clock,
  Target,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

interface Activity {
  id: string
  title: string
  description: string
  date: Date
  completed: boolean
  type: 'goal' | 'activity' | 'call'
  priority: 'high' | 'medium' | 'low'
}

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activities, setActivities] = useState<Activity[]>([
    {
      id: '1',
      title: 'Meditación matutina',
      description: '10 minutos de meditación',
      date: new Date(),
      completed: false,
      type: 'goal',
      priority: 'high'
    },
    {
      id: '2',
      title: 'Ejercicio cardiovascular',
      description: '30 minutos de cardio',
      date: new Date(),
      completed: true,
      type: 'goal',
      priority: 'medium'
    },
    {
      id: '3',
      title: 'Llamada con Senior',
      description: 'Revisión semanal de progreso',
      date: addDays(new Date(), 1),
      completed: false,
      type: 'call',
      priority: 'high'
    },
    {
      id: '4',
      title: 'Lectura personal',
      description: 'Capítulo 3 del libro de liderazgo',
      date: addDays(new Date(), 2),
      completed: false,
      type: 'activity',
      priority: 'low'
    }
  ])

  const [showAddActivity, setShowAddActivity] = useState(false)
  const [newActivity, setNewActivity] = useState({
    title: '',
    description: '',
    date: new Date(),
    type: 'goal' as 'goal' | 'activity' | 'call',
    priority: 'medium' as 'high' | 'medium' | 'low'
  })

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Lunes
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const handleToggleActivity = (activityId: string) => {
    setActivities(activities.map(activity => 
      activity.id === activityId 
        ? { ...activity, completed: !activity.completed }
        : activity
    ))
  }

  const handleAddActivity = () => {
    if (!newActivity.title) return

    const activity: Activity = {
      id: Date.now().toString(),
      ...newActivity,
      completed: false
    }

    setActivities([...activities, activity])
    setNewActivity({
      title: '',
      description: '',
      date: new Date(),
      type: 'goal',
      priority: 'medium'
    })
    setShowAddActivity(false)
  }

  const getActivitiesForDay = (date: Date) => {
    return activities.filter(activity => isSameDay(activity.date, date))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50'
      case 'medium': return 'border-yellow-200 bg-yellow-50'
      case 'low': return 'border-green-200 bg-green-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'goal': return <Target className="h-4 w-4" />
      case 'call': return <CalendarIcon className="h-4 w-4" />
      case 'activity': return <Clock className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const completedToday = activities.filter(activity => 
    isSameDay(activity.date, new Date()) && activity.completed
  ).length

  const totalToday = activities.filter(activity => 
    isSameDay(activity.date, new Date())
  ).length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mi Calendario</h1>
        <p className="text-gray-600 mt-2">
          Organiza y gestiona tus actividades diarias
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoy</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedToday}/{totalToday}</div>
            <p className="text-xs text-muted-foreground">
              Actividades completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activities.filter(a => a.completed).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Total completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Eficiencia diaria
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(subDays(currentDate, 7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(addDays(currentDate, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week View */}
      <div className="grid grid-cols-7 gap-4 mb-6">
        {weekDays.map((day, index) => {
          const dayActivities = getActivitiesForDay(day)
          const isToday = isSameDay(day, new Date())
          
          return (
            <Card key={index} className={isToday ? 'ring-2 ring-primary-500' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-center">
                  {format(day, 'EEE', { locale: es })}
                </CardTitle>
                <p className="text-xs text-center text-gray-500">
                  {format(day, 'd')}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {dayActivities.slice(0, 3).map((activity) => (
                    <div
                      key={activity.id}
                      className={`p-2 rounded text-xs ${getPriorityColor(activity.priority)} ${
                        activity.completed ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-1">
                        {getTypeIcon(activity.type)}
                        <span className="truncate">{activity.title}</span>
                      </div>
                    </div>
                  ))}
                  {dayActivities.length > 3 && (
                    <p className="text-xs text-gray-500 text-center">
                      +{dayActivities.length - 3} más
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add Activity Button */}
      <div className="mb-6">
        <Button onClick={() => setShowAddActivity(true)} className="bg-primary-600 hover:bg-primary-700">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Actividad
        </Button>
      </div>

      {/* Add Activity Form */}
      {showAddActivity && (
        <Card className="mb-6 border-primary-200">
          <CardHeader>
            <CardTitle>Agregar Actividad</CardTitle>
            <CardDescription>
              Programa una nueva actividad en tu calendario
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({...newActivity, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Nombre de la actividad"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha
                </label>
                <input
                  type="date"
                  value={format(newActivity.date, 'yyyy-MM-dd')}
                  onChange={(e) => setNewActivity({...newActivity, date: new Date(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={newActivity.description}
                onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
                placeholder="Detalles de la actividad"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo
                </label>
                <select
                  value={newActivity.type}
                  onChange={(e) => setNewActivity({...newActivity, type: e.target.value as 'goal' | 'activity' | 'call'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="goal">Meta</option>
                  <option value="activity">Actividad</option>
                  <option value="call">Llamada</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridad
                </label>
                <select
                  value={newActivity.priority}
                  onChange={(e) => setNewActivity({...newActivity, priority: e.target.value as 'high' | 'medium' | 'low'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddActivity(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAddActivity}
                disabled={!newActivity.title}
              >
                Agregar Actividad
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Actividades de Hoy</CardTitle>
          <CardDescription>
            {format(new Date(), 'dd MMMM yyyy', { locale: es })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getActivitiesForDay(new Date()).map((activity) => (
              <div
                key={activity.id}
                className={`flex items-center space-x-4 p-4 rounded-lg border ${
                  activity.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                }`}
              >
                <button
                  onClick={() => handleToggleActivity(activity.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    activity.completed 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'border-gray-300 hover:border-primary-500'
                  }`}
                >
                  {activity.completed && <CheckCircle className="h-4 w-4" />}
                </button>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(activity.type)}
                    <h3 className={`font-medium ${activity.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {activity.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      activity.priority === 'high' ? 'bg-red-100 text-red-800' :
                      activity.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {activity.priority === 'high' ? 'Alta' : activity.priority === 'medium' ? 'Media' : 'Baja'}
                    </span>
                  </div>
                  {activity.description && (
                    <p className={`text-sm mt-1 ${activity.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                      {activity.description}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {getActivitiesForDay(new Date()).length === 0 && (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay actividades para hoy</h3>
                <p className="text-gray-500 mb-4">
                  Agrega algunas actividades para mantenerte productivo
                </p>
                <Button onClick={() => setShowAddActivity(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Actividad
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
