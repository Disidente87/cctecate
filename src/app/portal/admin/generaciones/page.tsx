'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Edit, Calendar, Users, AlertCircle } from 'lucide-react'
import { getAllGenerations, createGeneration, updateGeneration, type Generation } from '@/lib/generations'

export default function GeneracionesAdminPage() {
  const [generations, setGenerations] = useState<Generation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingGeneration, setEditingGeneration] = useState<Generation | null>(null)
  const [formData, setFormData] = useState({
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
    pl3_training_date: '',
    is_active: true
  })

  useEffect(() => {
    loadGenerations()
  }, [])

  const loadGenerations = async () => {
    try {
      const data = await getAllGenerations()
      setGenerations(data)
    } catch (error) {
      console.error('Error loading generations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const generationData = {
        ...formData,
        pl1_training_date: formData.pl1_training_date || null,
        pl2_training_date: formData.pl2_training_date || null,
        pl3_training_date: formData.pl3_training_date || null,
      }

      if (editingGeneration) {
        await updateGeneration(editingGeneration.id, generationData)
      } else {
        await createGeneration(generationData)
      }

      await loadGenerations()
      resetForm()
    } catch (error) {
      console.error('Error saving generation:', error)
    } finally {
      setLoading(false)
    }
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
      pl3_training_date: '',
      is_active: true
    })
    setEditingGeneration(null)
    setShowForm(false)
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
      pl1_training_date: generation.pl1_training_date?.split('T')[0] || '',
      pl2_training_date: generation.pl2_training_date?.split('T')[0] || '',
      pl3_training_date: generation.pl3_training_date?.split('T')[0] || '',
      is_active: generation.is_active
    })
    setEditingGeneration(generation)
    setShowForm(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const isRegistrationActive = (generation: Generation) => {
    const now = new Date()
    const start = new Date(generation.registration_start_date)
    const end = new Date(generation.registration_end_date)
    return now >= start && now <= end
  }

  if (loading && generations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando generaciones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Generaciones</h1>
          <p className="text-gray-600 mt-2">Administra las fechas y configuraciones de las generaciones</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Generación
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-800">
              {editingGeneration ? 'Editar Generación' : 'Nueva Generación'}
            </CardTitle>
            <CardDescription className="text-gray-700">
              {editingGeneration ? 'Modifica los datos de la generación' : 'Crea una nueva generación con sus fechas'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    Nombre de la Generación
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                    placeholder="Ej: C1, C2, C3..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                    placeholder="Descripción de la generación"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    Inicio de Registro
                  </label>
                  <input
                    type="date"
                    value={formData.registration_start_date}
                    onChange={(e) => setFormData({...formData, registration_start_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    Fin de Registro
                  </label>
                  <input
                    type="date"
                    value={formData.registration_end_date}
                    onChange={(e) => setFormData({...formData, registration_end_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    Inicio de Generación
                  </label>
                  <input
                    type="date"
                    value={formData.generation_start_date}
                    onChange={(e) => setFormData({...formData, generation_start_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    Graduación
                  </label>
                  <input
                    type="date"
                    value={formData.generation_graduation_date}
                    onChange={(e) => setFormData({...formData, generation_graduation_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    Entrenamiento Básico
                  </label>
                  <input
                    type="date"
                    value={formData.basic_training_date}
                    onChange={(e) => setFormData({...formData, basic_training_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    Entrenamiento Avanzado
                  </label>
                  <input
                    type="date"
                    value={formData.advanced_training_date}
                    onChange={(e) => setFormData({...formData, advanced_training_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    PL1 (Opcional)
                  </label>
                  <input
                    type="date"
                    value={formData.pl1_training_date}
                    onChange={(e) => setFormData({...formData, pl1_training_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    PL2 (Opcional)
                  </label>
                  <input
                    type="date"
                    value={formData.pl2_training_date}
                    onChange={(e) => setFormData({...formData, pl2_training_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    PL3 (Opcional)
                  </label>
                  <input
                    type="date"
                    value={formData.pl3_training_date}
                    onChange={(e) => setFormData({...formData, pl3_training_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-800">
                  Generación activa
                </label>
              </div>

              <div className="flex space-x-4">
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : editingGeneration ? 'Actualizar' : 'Crear'}
                </Button>
                <Button
                  type="button"
                  onClick={resetForm}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {generations.map((generation) => (
          <Card key={generation.id} className={`${isRegistrationActive(generation) ? 'border-green-200 bg-green-50' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-gray-800">{generation.name}</CardTitle>
                  <CardDescription className="text-gray-700">{generation.description}</CardDescription>
                </div>
                {isRegistrationActive(generation) && (
                  <div className="flex items-center text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium">Activa</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <div className="flex items-center text-gray-600 mb-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="font-medium">Registro:</span>
                </div>
                <p className="ml-6 text-gray-700">
                  {formatDate(generation.registration_start_date)} - {formatDate(generation.registration_end_date)}
                </p>
              </div>

              <div className="text-sm">
                <div className="flex items-center text-gray-600 mb-1">
                  <Users className="h-4 w-4 mr-2" />
                  <span className="font-medium">Generación:</span>
                </div>
                <p className="ml-6 text-gray-700">
                  {formatDate(generation.generation_start_date)} - {formatDate(generation.generation_graduation_date)}
                </p>
              </div>

              <div className="text-sm">
                <div className="flex items-center text-gray-600 mb-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="font-medium">Entrenamientos:</span>
                </div>
                <div className="ml-6 space-y-1 text-gray-700">
                  <p>Básico: {formatDate(generation.basic_training_date)}</p>
                  <p>Avanzado: {formatDate(generation.advanced_training_date)}</p>
                  {generation.pl1_training_date && <p>PL1: {formatDate(generation.pl1_training_date)}</p>}
                  {generation.pl2_training_date && <p>PL2: {formatDate(generation.pl2_training_date)}</p>}
                  {generation.pl3_training_date && <p>PL3: {formatDate(generation.pl3_training_date)}</p>}
                </div>
              </div>

              <Button
                onClick={() => handleEdit(generation)}
                variant="outline"
                size="sm"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {generations.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No hay generaciones</h3>
            <p className="text-gray-600 mb-4">Crea la primera generación para comenzar</p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Generación
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
