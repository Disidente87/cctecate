'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Star, 
  CheckCircle, 
  Lock,
  Calendar,
  Users,
  Heart
} from 'lucide-react'
import { format, startOfWeek, addWeeks } from 'date-fns'
import { es } from 'date-fns/locale'

interface Activity {
  id: string
  title: string
  description: string
  unlockDate: Date
  completedBy: string[]
  category: string
  points: number
  isUnlocked: boolean
}

export default function ActividadesPage() {
  const [activities] = useState<Activity[]>([
    {
      id: '1',
      title: 'Gratitud Matutina',
      description: 'Escribe 3 cosas por las que estás agradecido cada mañana',
      unlockDate: startOfWeek(new Date(), { weekStartsOn: 1 }),
      completedBy: ['user1', 'user2'],
      category: 'Bienestar',
      points: 10,
      isUnlocked: true
    },
    {
      id: '2',
      title: 'Caminata Consciente',
      description: 'Da un paseo de 20 minutos prestando atención a tu entorno',
      unlockDate: addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1),
      completedBy: ['user1'],
      category: 'Salud',
      points: 15,
      isUnlocked: false
    },
    {
      id: '3',
      title: 'Conversación Profunda',
      description: 'Ten una conversación significativa con alguien importante en tu vida',
      unlockDate: addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 2),
      completedBy: [],
      category: 'Relaciones',
      points: 20,
      isUnlocked: false
    },
    {
      id: '4',
      title: 'Reflexión Nocturna',
      description: 'Reflexiona sobre tu día y anota una lección aprendida',
      unlockDate: addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 3),
      completedBy: [],
      category: 'Crecimiento',
      points: 12,
      isUnlocked: false
    }
  ])

  const [completedActivities, setCompletedActivities] = useState<string[]>(['1'])

  const handleToggleActivity = (activityId: string) => {
    if (completedActivities.includes(activityId)) {
      setCompletedActivities(completedActivities.filter(id => id !== activityId))
    } else {
      setCompletedActivities([...completedActivities, activityId])
    }
  }

  const unlockedActivities = activities.filter(activity => activity.isUnlocked)
  const completedCount = completedActivities.length
  const totalUnlocked = unlockedActivities.length
  const completionRate = totalUnlocked > 0 ? Math.round((completedCount / totalUnlocked) * 100) : 0

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Bienestar': return 'bg-pink-100 text-pink-800'
      case 'Salud': return 'bg-green-100 text-green-800'
      case 'Relaciones': return 'bg-blue-100 text-blue-800'
      case 'Crecimiento': return 'bg-purple-100 text-purple-800'
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Actividades Gustosas</h1>
        <p className="text-gray-600 mt-2">
          Descubre nuevas actividades semanales para enriquecer tu crecimiento personal
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso Semanal</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {completedCount} de {totalUnlocked} completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntos Obtenidos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activities
                .filter(activity => completedActivities.includes(activity.id))
                .reduce((total, activity) => total + activity.points, 0)
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próxima Actividad</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activities.filter(activity => !activity.isUnlocked).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Por desbloquear
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Week Activities */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Actividades de Esta Semana
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {unlockedActivities.map((activity) => (
            <Card 
              key={activity.id} 
              className={`transition-all duration-200 ${
                completedActivities.includes(activity.id) 
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
                    <span className="text-sm font-medium text-gray-600">
                      {activity.points} pts
                    </span>
                    <button
                      onClick={() => handleToggleActivity(activity.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        completedActivities.includes(activity.id)
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-primary-500'
                      }`}
                    >
                      {completedActivities.includes(activity.id) && (
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
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    {activity.completedBy.length} personas completaron
                  </span>
                  <span>
                    Desbloqueada el {format(activity.unlockDate, 'dd MMM', { locale: es })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Upcoming Activities */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Próximas Actividades
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities
            .filter(activity => !activity.isUnlocked)
            .map((activity) => (
              <Card key={activity.id} className="opacity-60">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Lock className="h-4 w-4 text-gray-400" />
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(activity.category)}`}>
                        {activity.category}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {activity.points} pts
                    </span>
                  </div>
                  <CardTitle className="text-lg text-gray-500">
                    {activity.title}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {activity.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Se desbloqueará el {format(activity.unlockDate, 'dd MMM yyyy', { locale: es })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {/* Completion Message */}
      {completedCount === totalUnlocked && totalUnlocked > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-primary-50 border-green-200">
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              ¡Excelente trabajo!
            </h3>
            <p className="text-gray-600 mb-4">
              Has completado todas las actividades de esta semana. 
              ¡Sigue así y mantén tu momentum!
            </p>
            <div className="text-2xl font-bold text-primary-600">
              +{activities
                .filter(activity => completedActivities.includes(activity.id))
                .reduce((total, activity) => total + activity.points, 0)
              } puntos obtenidos
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {unlockedActivities.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay actividades disponibles
            </h3>
            <p className="text-gray-500 mb-4">
              Las actividades se desbloquean semanalmente. 
              Vuelve pronto para descubrir nuevas experiencias.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
