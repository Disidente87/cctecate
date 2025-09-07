import { createClient } from '@/lib/supabase-server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Target, 
  Calendar, 
  Trophy, 
  Phone, 
  CheckCircle,
  Clock,
  Star
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function PortalDashboard() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Redirigir al login si no hay usuario
    redirect('/auth/login')
  }

  const userRole = user.user_metadata?.role || 'lider'
  const userName = user.user_metadata?.name || user.email

  // Datos mock para el dashboard (en una implementación real, estos vendrían de la base de datos)
  const stats = {
    goalsCompleted: 12,
    totalGoals: 20,
    activitiesCompleted: 8,
    totalActivities: 10,
    callsThisMonth: 4,
    leaderboardPosition: 3
  }

  const recentActivities = [
    { id: 1, title: 'Meditación matutina', completed: true, date: '2024-01-15' },
    { id: 2, title: 'Ejercicio cardiovascular', completed: true, date: '2024-01-14' },
    { id: 3, title: 'Lectura personal', completed: false, date: '2024-01-16' },
    { id: 4, title: 'Llamada con Senior', completed: true, date: '2024-01-13' },
  ]

  const quickActions = [
    {
      title: 'Gestionar Metas',
      description: 'Establece y revisa tus objetivos personales',
      href: '/portal/metas',
      icon: Target,
      color: 'bg-primary-100 text-primary-600'
    },
    {
      title: 'Ver Calendario',
      description: 'Organiza tus actividades diarias',
      href: '/portal/calendario',
      icon: Calendar,
      color: 'bg-secondary-100 text-secondary-600'
    },
    {
      title: 'Actividades Gustosas',
      description: 'Descubre nuevas actividades semanales',
      href: '/portal/actividades',
      icon: Star,
      color: 'bg-accent-100 text-accent-600'
    },
    {
      title: 'Programar Llamada',
      description: 'Coordina tu próxima llamada con tu Senior',
      href: '/portal/llamadas',
      icon: Phone,
      color: 'bg-purple-100 '
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold ">
          ¡Bienvenido, {userName}!
        </h1>
        <p className=" mt-2">
          Aquí tienes un resumen de tu progreso y las acciones más importantes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas Completadas</CardTitle>
            <Target className="h-4 w-4 " />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold ">{stats.goalsCompleted}/{stats.totalGoals}</div>
            <p className="text-xs ">
              {Math.round((stats.goalsCompleted / stats.totalGoals) * 100)}% completado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actividades</CardTitle>
            <CheckCircle className="h-4 w-4 " />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold ">{stats.activitiesCompleted}/{stats.totalActivities}</div>
            <p className="text-xs ">
              {Math.round((stats.activitiesCompleted / stats.totalActivities) * 100)}% completado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Llamadas Este Mes</CardTitle>
            <Phone className="h-4 w-4 " />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold ">{stats.callsThisMonth}</div>
            <p className="text-xs ">
              +2 desde el mes pasado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posición Ranking</CardTitle>
            <Trophy className="h-4 w-4 " />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold ">#{stats.leaderboardPosition}</div>
            <p className="text-xs ">
              En tu generación
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold  mb-6">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold  mb-1">{action.title}</h3>
                        <p className="text-sm ">{action.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div>
          <h2 className="text-xl font-semibold  mb-6">Actividades Recientes</h2>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      activity.completed 
                        ? 'bg-green-100 ' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {activity.completed ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        activity.completed ? '' : ''
                      }`}>
                        {activity.title}
                      </p>
                      <p className="text-xs ">{activity.date}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Link href="/portal/calendario">
                  <Button variant="outline" size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Ver todas las actividades
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Role-specific content */}
      {userRole === 'admin' && (
        <div className="mt-8">
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="">Panel de Administración</CardTitle>
              <CardDescription className="">
                Acceso completo al sistema de gestión
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Link href="/portal/admin/generations">
                  <Button variant="outline" className="bg-blue-600 hover:bg-blue-700 text-white">
                    Gestionar Generaciones
                  </Button>
                </Link>
                <Link href="/portal/admin/users">
                  <Button variant="outline" className="bg-blue-600 hover:bg-blue-700 text-white">
                    Gestionar Usuarios
                  </Button>
                </Link>
                <Link href="/portal/admin/activities">
                  <Button variant="outline" className="bg-blue-600 hover:bg-blue-700 text-white">
                    Configurar Actividades
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
