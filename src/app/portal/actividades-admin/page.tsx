'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  Star, 
  Save, 
  X,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'

interface Activity {
  id: string
  title: string
  description: string
  category: string
  unlock_date: string | null
  points: number
  created_at: string
  updated_at: string
}

interface NewActivity {
  title: string
  description: string
  category: string
  unlock_date: string
  points: number
}

export default function ActividadesAdminPage() {
  const { user } = useUser()
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingActivity, setEditingActivity] = useState<string | null>(null)
  const [newActivity, setNewActivity] = useState<NewActivity>({
    title: '',
    description: '',
    category: '',
    unlock_date: '',
    points: 10
  })

  const categories = [
    'Ejercicio',
    'Alimentación',
    'Descanso',
    'Aprendizaje',
    'Social',
    'Trabajo',
    'Hobby',
    'Meditación',
    'Lectura',
    'Otro'
  ]

  // Load activities
  useEffect(() => {
    const loadActivities = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('activities')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error('Error loading activities:', error)
          return
        }
        
        setActivities(data || [])
      } catch (error) {
        console.error('Error loading activities:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadActivities()
  }, [])

  const handleAddActivity = async () => {
    if (!newActivity.title || !newActivity.description || !newActivity.category) {
      alert('Por favor completa todos los campos obligatorios')
      return
    }

    setIsSaving(true)
    try {
      const { data, error } = await supabase
        .from('activities')
        .insert([{
          title: newActivity.title,
          description: newActivity.description,
          category: newActivity.category,
          unlock_date: newActivity.unlock_date || null,
          points: newActivity.points
        }])
        .select()
        .single()

      if (error) {
        console.error('Error adding activity:', error)
        alert('Error al agregar la actividad')
        return
      }

      setActivities(prev => [data, ...prev])
      setNewActivity({
        title: '',
        description: '',
        category: '',
        unlock_date: '',
        points: 10
      })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding activity:', error)
      alert('Error al agregar la actividad')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateActivity = async (id: string, updates: Partial<Activity>) => {
    setIsSaving(true)
    try {
      const { data, error } = await supabase
        .from('activities')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating activity:', error)
        alert('Error al actualizar la actividad')
        return
      }

      setActivities(prev => prev.map(activity => 
        activity.id === id ? data : activity
      ))
      setEditingActivity(null)
    } catch (error) {
      console.error('Error updating activity:', error)
      alert('Error al actualizar la actividad')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteActivity = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta actividad?')) {
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting activity:', error)
        alert('Error al eliminar la actividad')
        return
      }

      setActivities(prev => prev.filter(activity => activity.id !== id))
    } catch (error) {
      console.error('Error deleting activity:', error)
      alert('Error al eliminar la actividad')
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sin fecha'
    return new Date(dateString).toLocaleDateString('es-ES')
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Ejercicio': 'bg-green-100 text-green-800',
      'Alimentación': 'bg-orange-100 text-orange-800',
      'Descanso': 'bg-blue-100 text-blue-800',
      'Aprendizaje': 'bg-purple-100 text-purple-800',
      'Social': 'bg-pink-100 text-pink-800',
      'Trabajo': 'bg-gray-100 text-gray-800',
      'Hobby': 'bg-yellow-100 text-yellow-800',
      'Meditación': 'bg-indigo-100 text-indigo-800',
      'Lectura': 'bg-red-100 text-red-800',
      'Otro': 'bg-slate-100 text-slate-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Actividades</h1>
        <p className="text-gray-600 mt-2">
          Administra las actividades gustosas: fechas de desbloqueo, puntos y categorías
        </p>
      </div>

      {/* Add Activity Button */}
      <div className="mb-6">
        <Button 
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Actividad
        </Button>
      </div>

      {/* Add Activity Form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Nueva Actividad</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={newActivity.title}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Caminar 30 minutos"
                />
              </div>
              <div>
                <Label htmlFor="category">Categoría *</Label>
                <Select
                  value={newActivity.category}
                  onValueChange={(value) => setNewActivity(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                id="description"
                value={newActivity.description}
                onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe la actividad en detalle"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unlock_date">Fecha de Desbloqueo</Label>
                <Input
                  id="unlock_date"
                  type="date"
                  value={newActivity.unlock_date}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, unlock_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="points">Puntos</Label>
                <Input
                  id="points"
                  type="number"
                  min="1"
                  max="100"
                  value={newActivity.points}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, points: parseInt(e.target.value) || 10 }))}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleAddActivity}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowAddForm(false)}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activities List */}
      <div className="space-y-4">
        {activities.map(activity => (
          <Card key={activity.id}>
            <CardContent className="p-6">
              {editingActivity === activity.id ? (
                <EditActivityForm
                  activity={activity}
                  categories={categories}
                  onSave={(updates) => handleUpdateActivity(activity.id, updates)}
                  onCancel={() => setEditingActivity(null)}
                  isSaving={isSaving}
                />
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{activity.title}</h3>
                      <Badge className={getCategoryColor(activity.category)}>
                        {activity.category}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {activity.points} pts
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{activity.description}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(activity.unlock_date)}
                      </div>
                      <div>
                        Creada: {formatDate(activity.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingActivity(activity.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteActivity(activity.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {activities.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay actividades
            </h3>
            <p className="text-gray-500">
              Agrega la primera actividad para comenzar
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface EditActivityFormProps {
  activity: Activity
  categories: string[]
  onSave: (updates: Partial<Activity>) => void
  onCancel: () => void
  isSaving: boolean
}

function EditActivityForm({ activity, categories, onSave, onCancel, isSaving }: EditActivityFormProps) {
  const [formData, setFormData] = useState({
    title: activity.title,
    description: activity.description,
    category: activity.category,
    unlock_date: activity.unlock_date || '',
    points: activity.points
  })

  const handleSave = () => {
    onSave({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      unlock_date: formData.unlock_date || null,
      points: formData.points
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-title">Título</Label>
          <Input
            id="edit-title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="edit-category">Categoría</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label htmlFor="edit-description">Descripción</Label>
        <Textarea
          id="edit-description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-unlock_date">Fecha de Desbloqueo</Label>
          <Input
            id="edit-unlock_date"
            type="date"
            value={formData.unlock_date}
            onChange={(e) => setFormData(prev => ({ ...prev, unlock_date: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="edit-points">Puntos</Label>
          <Input
            id="edit-points"
            type="number"
            min="1"
            max="100"
            value={formData.points}
            onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 10 }))}
          />
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Guardando...' : 'Guardar'}
        </Button>
        <Button 
          variant="outline"
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
