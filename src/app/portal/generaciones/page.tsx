'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  Users, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Generation {
  id: string
  name: string
  description: string
  registration_start_date: string
  registration_end_date: string
  generation_start_date: string
  generation_graduation_date: string
  basic_training_date: string
  advanced_training_date: string
  pl1_training_date: string | null
  pl2_training_date: string | null
  pl3_training_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface GenerationFormData {
  name: string
  description: string
  registration_start_date: string
  registration_end_date: string
  generation_start_date: string
  generation_graduation_date: string
  basic_training_date: string
  advanced_training_date: string
  pl1_training_date: string
  pl2_training_date: string
  pl3_training_date: string
}

export default function GeneracionesPage() {
  const [generations, setGenerations] = useState<Generation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState<GenerationFormData>({
    name: '',
    description: '',
    registration_start_date: '',
    registration_end_date: '',
    generation_start_date: '',
    generation_graduation_date: '',
    basic_training_date: '',
    advanced_training_date: '',
    pl1_training_date: '',
    pl2_training_date: '',
    pl3_training_date: ''
  })

  // Cargar generaciones
  useEffect(() => {
    loadGenerations()
  }, [])

  const loadGenerations = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading generations:', error)
        setError('Error al cargar las generaciones')
        return
      }

      setGenerations(data || [])
    } catch (error) {
      console.error('Error loading generations:', error)
      setError('Error al cargar las generaciones')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof GenerationFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      registration_start_date: '',
      registration_end_date: '',
      generation_start_date: '',
      generation_graduation_date: '',
      basic_training_date: '',
      advanced_training_date: '',
      pl1_training_date: '',
      pl2_training_date: '',
      pl3_training_date: ''
    })
    setError('')
    setSuccess('')
  }

  const handleCreate = () => {
    resetForm()
    setIsCreating(true)
    setIsEditing(false)
    setEditingId(null)
    setShowForm(true)
  }

  const handleEdit = (generation: Generation) => {
    setFormData({
      name: generation.name,
      description: generation.description || '',
      registration_start_date: generation.registration_start_date.split('T')[0],
      registration_end_date: generation.registration_end_date.split('T')[0],
      generation_start_date: generation.generation_start_date.split('T')[0],
      generation_graduation_date: generation.generation_graduation_date.split('T')[0],
      basic_training_date: generation.basic_training_date.split('T')[0],
      advanced_training_date: generation.advanced_training_date.split('T')[0],
      pl1_training_date: generation.pl1_training_date ? generation.pl1_training_date.split('T')[0] : '',
      pl2_training_date: generation.pl2_training_date ? generation.pl2_training_date.split('T')[0] : '',
      pl3_training_date: generation.pl3_training_date ? generation.pl3_training_date.split('T')[0] : ''
    })
    setIsCreating(false)
    setIsEditing(true)
    setEditingId(generation.id)
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const generationData = {
        name: formData.name,
        description: formData.description,
        registration_start_date: new Date(formData.registration_start_date).toISOString(),
        registration_end_date: new Date(formData.registration_end_date).toISOString(),
        generation_start_date: new Date(formData.generation_start_date).toISOString(),
        generation_graduation_date: new Date(formData.generation_graduation_date).toISOString(),
        basic_training_date: new Date(formData.basic_training_date).toISOString(),
        advanced_training_date: new Date(formData.advanced_training_date).toISOString(),
        pl1_training_date: formData.pl1_training_date ? new Date(formData.pl1_training_date).toISOString() : null,
        pl2_training_date: formData.pl2_training_date ? new Date(formData.pl2_training_date).toISOString() : null,
        pl3_training_date: formData.pl3_training_date ? new Date(formData.pl3_training_date).toISOString() : null,
        is_active: true
      }

      if (isCreating) {
        const { error } = await supabase
          .from('generations')
          .insert([generationData])

        if (error) {
          throw error
        }

        setSuccess('Generación creada exitosamente')
      } else if (isEditing && editingId) {
        const { error } = await supabase
          .from('generations')
          .update(generationData)
          .eq('id', editingId)

        if (error) {
          throw error
        }

        setSuccess('Generación actualizada exitosamente')
      }

      await loadGenerations()
      setShowForm(false)
      resetForm()
    } catch (error) {
      console.error('Error saving generation:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(`Error al ${isCreating ? 'crear' : 'actualizar'} la generación: ${errorMessage}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta generación?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('generations')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      setSuccess('Generación eliminada exitosamente')
      await loadGenerations()
    } catch (error) {
      console.error('Error deleting generation:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(`Error al eliminar la generación: ${errorMessage}`)
    }
  }

  const getStatusBadge = (generation: Generation) => {
    const now = new Date()
    const regStart = new Date(generation.registration_start_date)
    const regEnd = new Date(generation.registration_end_date)
    const genStart = new Date(generation.generation_start_date)
    const genEnd = new Date(generation.generation_graduation_date)

    if (now < regStart) {
      return <Badge variant="outline" className="text-blue-600 border-blue-300">Próxima</Badge>
    } else if (now >= regStart && now <= regEnd) {
      return <Badge variant="outline" className="text-green-600 border-green-300">Registro Abierto</Badge>
    } else if (now > regEnd && now < genStart) {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-300">En Preparación</Badge>
    } else if (now >= genStart && now <= genEnd) {
      return <Badge variant="outline" className="text-purple-600 border-purple-300">Activa</Badge>
    } else {
      return <Badge variant="outline" className="text-gray-600 border-gray-300">Finalizada</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: es })
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Cargando generaciones...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Generaciones</h1>
        <p className="text-gray-600 mt-2">
          Administra las generaciones del programa CC Tecate
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex gap-4">
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Generación
          </Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {isCreating ? 'Crear Nueva Generación' : 'Editar Generación'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div>
                  <Label htmlFor="name">Nombre de la Generación *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ej: C1, C2, C3..."
                    required
                  />
                </div>

                {/* Descripción */}
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Descripción de la generación"
                  />
                </div>

                {/* Fechas de Registro */}
                <div>
                  <Label htmlFor="registration_start_date">Inicio de Registro *</Label>
                  <Input
                    id="registration_start_date"
                    type="date"
                    value={formData.registration_start_date}
                    onChange={(e) => handleInputChange('registration_start_date', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="registration_end_date">Fin de Registro *</Label>
                  <Input
                    id="registration_end_date"
                    type="date"
                    value={formData.registration_end_date}
                    onChange={(e) => handleInputChange('registration_end_date', e.target.value)}
                    required
                  />
                </div>

                {/* Fechas de Generación */}
                <div>
                  <Label htmlFor="generation_start_date">Inicio de Generación *</Label>
                  <Input
                    id="generation_start_date"
                    type="date"
                    value={formData.generation_start_date}
                    onChange={(e) => handleInputChange('generation_start_date', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="generation_graduation_date">Fin de Generación *</Label>
                  <Input
                    id="generation_graduation_date"
                    type="date"
                    value={formData.generation_graduation_date}
                    onChange={(e) => handleInputChange('generation_graduation_date', e.target.value)}
                    required
                  />
                </div>

                {/* Entrenamientos */}
                <div>
                  <Label htmlFor="basic_training_date">Entrenamiento Básico *</Label>
                  <Input
                    id="basic_training_date"
                    type="date"
                    value={formData.basic_training_date}
                    onChange={(e) => handleInputChange('basic_training_date', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="advanced_training_date">Entrenamiento Avanzado *</Label>
                  <Input
                    id="advanced_training_date"
                    type="date"
                    value={formData.advanced_training_date}
                    onChange={(e) => handleInputChange('advanced_training_date', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="pl1_training_date">PL1 (Opcional)</Label>
                  <Input
                    id="pl1_training_date"
                    type="date"
                    value={formData.pl1_training_date}
                    onChange={(e) => handleInputChange('pl1_training_date', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="pl2_training_date">PL2 (Opcional)</Label>
                  <Input
                    id="pl2_training_date"
                    type="date"
                    value={formData.pl2_training_date}
                    onChange={(e) => handleInputChange('pl2_training_date', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="pl3_training_date">PL3 (Opcional)</Label>
                  <Input
                    id="pl3_training_date"
                    type="date"
                    value={formData.pl3_training_date}
                    onChange={(e) => handleInputChange('pl3_training_date', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {isCreating ? 'Crear Generación' : 'Actualizar Generación'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Generations List */}
      <div className="grid gap-6">
        {generations.map((generation) => (
          <Card key={generation.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-3">
                    <Users className="h-5 w-5" />
                    {generation.name}
                    {getStatusBadge(generation)}
                  </CardTitle>
                  {generation.description && (
                    <p className="text-gray-600 mt-1">{generation.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(generation)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(generation.id)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Registro</h4>
                  <p className="text-sm text-gray-600">
                    {formatDate(generation.registration_start_date)} - {formatDate(generation.registration_end_date)}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Generación</h4>
                  <p className="text-sm text-gray-600">
                    {formatDate(generation.generation_start_date)} - {formatDate(generation.generation_graduation_date)}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Entrenamientos</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Básico: {formatDate(generation.basic_training_date)}</p>
                    <p>Avanzado: {formatDate(generation.advanced_training_date)}</p>
                    {generation.pl1_training_date && (
                      <p>PL1: {formatDate(generation.pl1_training_date)}</p>
                    )}
                    {generation.pl2_training_date && (
                      <p>PL2: {formatDate(generation.pl2_training_date)}</p>
                    )}
                    {generation.pl3_training_date && (
                      <p>PL3: {formatDate(generation.pl3_training_date)}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Creada</h4>
                  <p className="text-sm text-gray-600">
                    {formatDate(generation.created_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {generations.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay generaciones</h3>
            <p className="text-gray-600 mb-4">Crea tu primera generación para comenzar</p>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Crear Primera Generación
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
