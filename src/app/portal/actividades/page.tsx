'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Star, 
  CheckCircle, 
  Calendar,
  Users,
  Heart,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Save,
  X
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
  const [isAdmin, setIsAdmin] = useState(false)
  const [userRole, setUserRole] = useState<string>('lider')
  
  // Estados para gestión de actividades (admin)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingActivity, setEditingActivity] = useState<string | null>(null)
  const [newActivity, setNewActivity] = useState({
    title: '',
    description: '',
    category: '',
    points: 10,
    unlock_date: ''
  })

  // Cargar usuario y actividades desde la base de datos
  useEffect(() => {
    const loadUserAndActivities = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const viewUserId = selectedUserId || authUserId
        if (viewUserId) {
          setUser({ id: viewUserId })
          
          // Verificar si el usuario es admin y obtener su rol
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authUserId)
            .single()
          
          const role = profile?.role || 'lider'
          setIsAdmin(role === 'admin')
          setUserRole(role)
          
          // Cargar actividades con el rol del usuario
          const activitiesData = await getActivitiesWithCompletion(viewUserId, role)
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

  // Funciones para gestión de actividades (admin)
  const handleAddActivity = async () => {
    try {
      const { error } = await supabase
        .from('activities')
        .insert([{
          title: newActivity.title,
          description: newActivity.description,
          category: newActivity.category,
          points: newActivity.points,
          unlock_date: newActivity.unlock_date || new Date().toISOString().split('T')[0]
        }])

      if (error) throw error

      // Recargar actividades
      const activitiesData = await getActivitiesWithCompletion(user?.id || '', userRole)
      setActivities(activitiesData)
      
      // Limpiar formulario
      setNewActivity({
        title: '',
        description: '',
        category: '',
        points: 10,
        unlock_date: ''
      })
      setShowAddForm(false)
    } catch (err) {
      console.error('Error adding activity:', err)
      setError('Error al agregar la actividad')
    }
  }

  const handleUpdateActivity = async (activityId: string, updates: {
    title?: string
    description?: string
    category?: string
    points?: number
    unlock_date?: string
  }) => {
    try {
      console.log('Updating activity:', activityId, updates)
      
      const { error } = await supabase
        .from('activities')
        .update(updates)
        .eq('id', activityId)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Activity updated successfully')
      
      // Recargar actividades
      const activitiesData = await getActivitiesWithCompletion(user?.id || '', userRole)
      setActivities(activitiesData)
      setEditingActivity(null)
    } catch (err) {
      console.error('Error updating activity:', err)
      setError('Error al actualizar la actividad')
    }
  }

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta actividad?')) return

    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId)

      if (error) throw error

      // Recargar actividades
      const activitiesData = await getActivitiesWithCompletion(user?.id || '', userRole)
      setActivities(activitiesData)
    } catch (err) {
      console.error('Error deleting activity:', err)
      setError('Error al eliminar la actividad')
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

  // Función para verificar si una actividad está bloqueada
  const isActivityLocked = (unlockDate: string) => {
    if (userRole === 'admin') return false
    const today = new Date().toISOString().split('T')[0] // Formato YYYY-MM-DD
    return unlockDate > today
  }
  
  const completedCount = pastActivities.length
  const totalCurrentWeek = currentWeekActivities.length
  const totalActivities = completedCount + totalCurrentWeek
  const completionRate = totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0

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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold ">Actividades Gustosas</h1>
            <p className=" mt-2">
              Descubre nuevas actividades semanales para enriquecer tu crecimiento personal
            </p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Nueva Actividad
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
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

      {/* Formulario para agregar nueva actividad (admin) */}
      {showAddForm && isAdmin && (
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nueva Actividad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={newActivity.title}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título de la actividad"
                />
              </div>
              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={newActivity.category}
                  onValueChange={(value) => setNewActivity(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    <SelectItem value="Bienestar">Bienestar</SelectItem>
                    <SelectItem value="Salud">Salud</SelectItem>
                    <SelectItem value="Relaciones">Relaciones</SelectItem>
                    <SelectItem value="Crecimiento">Crecimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={newActivity.description}
                onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción de la actividad"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="points">Puntos</Label>
                <Input
                  id="points"
                  type="number"
                  value={newActivity.points}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                  min="1"
                />
              </div>
              <div>
                <Label htmlFor="unlock_date">Fecha de desbloqueo</Label>
                <Input
                  id="unlock_date"
                  type="date"
                  value={newActivity.unlock_date}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, unlock_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddActivity} disabled={!newActivity.title || !newActivity.description} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                  : isActivityLocked(activity.unlock_date)
                  ? 'bg-gray-50 border-gray-200 opacity-75'
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
                    {isActivityLocked(activity.unlock_date) && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500 text-white">
                        BLOQUEADA
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium ">
                      {activity.points} pts
                    </span>
                    <button
                      onClick={() => handleToggleActivity(activity.id)}
                      disabled={isActivityLocked(activity.unlock_date)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        activity.is_completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : isActivityLocked(activity.unlock_date)
                          ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                          : 'border-gray-300 hover:border-primary-500'
                      }`}
                      title={
                        isActivityLocked(activity.unlock_date)
                          ? "Actividad bloqueada hasta " + format(new Date(activity.unlock_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })
                          : activity.is_completed 
                          ? "Hacer clic para desmarcar como completada" 
                          : "Hacer clic para marcar como completada"
                      }
                    >
                      {activity.is_completed && (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                {editingActivity === activity.id ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-600">Título</Label>
                      <Input
                        value={activity.title}
                        onChange={(e) => {
                          setActivities(prev => 
                            prev.map(a => 
                              a.id === activity.id 
                                ? { ...a, title: e.target.value }
                                : a
                            )
                          )
                        }}
                        className="font-semibold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Descripción</Label>
                      <Textarea
                        value={activity.description}
                        onChange={(e) => {
                          setActivities(prev => 
                            prev.map(a => 
                              a.id === activity.id 
                                ? { ...a, description: e.target.value }
                                : a
                            )
                          )
                        }}
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-600">Categoría</Label>
                        <Select
                          value={activity.category}
                          onValueChange={(value) => {
                            setActivities(prev => 
                              prev.map(a => 
                                a.id === activity.id 
                                  ? { ...a, category: value }
                                  : a
                              )
                            )
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 shadow-lg">
                            <SelectItem value="Bienestar">Bienestar</SelectItem>
                            <SelectItem value="Salud">Salud</SelectItem>
                            <SelectItem value="Relaciones">Relaciones</SelectItem>
                            <SelectItem value="Crecimiento">Crecimiento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Puntos</Label>
                        <Input
                          type="number"
                          value={activity.points}
                          onChange={(e) => {
                            setActivities(prev => 
                              prev.map(a => 
                                a.id === activity.id 
                                  ? { ...a, points: parseInt(e.target.value) || 0 }
                                  : a
                              )
                            )
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Fecha de desbloqueo</Label>
                      <Input
                        type="date"
                        value={format(new Date(activity.unlock_date), "yyyy-MM-dd")}
                        onChange={(e) => {
                          setActivities(prev => 
                            prev.map(a => 
                              a.id === activity.id 
                                ? { ...a, unlock_date: e.target.value }
                                : a
                            )
                          )
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const updatedActivity = activities.find(a => a.id === activity.id)
                          console.log('Saving activity:', activity.id, updatedActivity)
                          if (updatedActivity) {
                            handleUpdateActivity(activity.id, {
                              title: updatedActivity.title,
                              description: updatedActivity.description,
                              category: updatedActivity.category,
                              points: updatedActivity.points,
                              unlock_date: updatedActivity.unlock_date
                            })
                          }
                        }}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingActivity(null)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-lg">
                      {activity.title}
                    </CardTitle>
                    <CardDescription>
                      {activity.description}
                    </CardDescription>
                  </>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm mb-3">
                  <span>
                    {activity.completed_by.length} personas completaron
                  </span>
                  <span>
                    Desbloqueada el {format(new Date(activity.unlock_date + 'T00:00:00'), 'dd MMM', { locale: es })}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex justify-between pt-2 border-t border-gray-100">
                    <button
                      onClick={() => setEditingActivity(activity.id)}
                      className="px-3 py-1.5 text-sm hover:bg-blue-100 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors text-blue-600"
                      title="Editar actividad"
                    >
                      <Edit className="h-4 w-4 inline mr-1" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteActivity(activity.id)}
                      className="px-3 py-1.5 text-sm hover:bg-red-100 rounded-lg border border-red-200 hover:border-red-300 transition-colors text-red-600"
                      title="Eliminar actividad"
                    >
                      <Trash2 className="h-4 w-4 inline mr-1" />
                      Eliminar
                    </button>
                  </div>
                )}
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
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-green-600">
                      {activity.points} pts
                    </span>
                    <button
                      onClick={() => handleToggleActivity(activity.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        activity.is_completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-primary-500'
                      }`}
                      title="Hacer clic para desmarcar como completada"
                    >
                      {activity.is_completed && (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                {editingActivity === activity.id ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-600">Título</Label>
                      <Input
                        value={activity.title}
                        onChange={(e) => {
                          setActivities(prev => 
                            prev.map(a => 
                              a.id === activity.id 
                                ? { ...a, title: e.target.value }
                                : a
                            )
                          )
                        }}
                        className="font-semibold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Descripción</Label>
                      <Textarea
                        value={activity.description}
                        onChange={(e) => {
                          setActivities(prev => 
                            prev.map(a => 
                              a.id === activity.id 
                                ? { ...a, description: e.target.value }
                                : a
                            )
                          )
                        }}
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-600">Categoría</Label>
                        <Select
                          value={activity.category}
                          onValueChange={(value) => {
                            setActivities(prev => 
                              prev.map(a => 
                                a.id === activity.id 
                                  ? { ...a, category: value }
                                  : a
                              )
                            )
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 shadow-lg">
                            <SelectItem value="Bienestar">Bienestar</SelectItem>
                            <SelectItem value="Salud">Salud</SelectItem>
                            <SelectItem value="Relaciones">Relaciones</SelectItem>
                            <SelectItem value="Crecimiento">Crecimiento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Puntos</Label>
                        <Input
                          type="number"
                          value={activity.points}
                          onChange={(e) => {
                            setActivities(prev => 
                              prev.map(a => 
                                a.id === activity.id 
                                  ? { ...a, points: parseInt(e.target.value) || 0 }
                                  : a
                              )
                            )
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Fecha de desbloqueo</Label>
                      <Input
                        type="date"
                        value={format(new Date(activity.unlock_date), "yyyy-MM-dd")}
                        onChange={(e) => {
                          setActivities(prev => 
                            prev.map(a => 
                              a.id === activity.id 
                                ? { ...a, unlock_date: e.target.value }
                                : a
                            )
                          )
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const updatedActivity = activities.find(a => a.id === activity.id)
                          console.log('Saving activity:', activity.id, updatedActivity)
                          if (updatedActivity) {
                            handleUpdateActivity(activity.id, {
                              title: updatedActivity.title,
                              description: updatedActivity.description,
                              category: updatedActivity.category,
                              points: updatedActivity.points,
                              unlock_date: updatedActivity.unlock_date
                            })
                          }
                        }}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingActivity(null)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-lg line-through">
                      {activity.title}
                    </CardTitle>
                    <CardDescription>
                      {activity.description}
                    </CardDescription>
                  </>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-green-600 mb-3">
                  <span>
                    Completada
                  </span>
                  <span>
                    {format(new Date(activity.unlock_date + 'T00:00:00'), 'dd MMM', { locale: es })}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex justify-between pt-2 border-t border-green-200">
                    <button
                      onClick={() => setEditingActivity(activity.id)}
                      className="px-3 py-1.5 text-sm hover:bg-blue-100 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors text-blue-600"
                      title="Editar actividad"
                    >
                      <Edit className="h-4 w-4 inline mr-1" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteActivity(activity.id)}
                      className="px-3 py-1.5 text-sm hover:bg-red-100 rounded-lg border border-red-200 hover:border-red-300 transition-colors text-red-600"
                      title="Eliminar actividad"
                    >
                      <Trash2 className="h-4 w-4 inline mr-1" />
                      Eliminar
                    </button>
                  </div>
                )}
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
