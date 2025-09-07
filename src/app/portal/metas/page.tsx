'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Target, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  TrendingUp
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserGoals, createGoalWithMechanisms, updateGoal, deleteGoal, deleteMechanism } from '@/lib/goals'
import type { GoalWithMechanisms, Mechanism } from '@/types/database'

const goalCategories = [
  'Personal',
  'Finanzas', 
  'Salud',
  'Familia',
  'Carrera',
  'Relaciones',
  'Espiritual',
  'Recreación'
]

const frequencyLabels = {
  daily: 'Diario',
  '2x_week': '2 veces por semana',
  '3x_week': '3 veces por semana',
  '4x_week': '4 veces por semana',
  '5x_week': '5 veces por semana',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  yearly: 'Anual'
}


export default function MetasPage() {
  const [goals, setGoals] = useState<GoalWithMechanisms[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [newGoal, setNewGoal] = useState({
    category: '',
    description: '',
    mechanisms: [] as Omit<Mechanism, 'id' | 'goal_id' | 'created_at' | 'updated_at'>[]
  })
  const [editingGoal, setEditingGoal] = useState<string | null>(null)

  // Cargar usuario y metas al montar el componente
  useEffect(() => {
    const loadUserAndGoals = async () => {
      try {
        setError(null)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUser(user)
          const userGoals = await getUserGoals(user.id)
          setGoals(userGoals)
        } else {
          setError('No se pudo cargar la información del usuario')
        }
      } catch (error) {
        console.error('Error loading user and goals:', error)
        setError('Error al cargar las metas')
      } finally {
        setLoading(false)
      }
    }

    loadUserAndGoals()
  }, [])

  const handleAddGoal = async () => {
    if (!newGoal.category || !newGoal.description || newGoal.mechanisms.length < 4 || newGoal.mechanisms.length > 6 || !user) return

    // Verificar si ya existe una meta en esta categoría
    const existingGoalInCategory = goals.find(goal => goal.category === newGoal.category)
    if (existingGoalInCategory) {
      setError(`Ya tienes una meta en la categoría "${newGoal.category}". Solo puedes tener una meta por categoría.`)
      return
    }

    const goalData = {
      user_id: user.id,
      category: newGoal.category,
      description: newGoal.description,
      completed: false,
      progress_percentage: 0
    }

    const newGoalWithMechanisms = await createGoalWithMechanisms(goalData, newGoal.mechanisms)
    
    if (newGoalWithMechanisms) {
      setGoals([newGoalWithMechanisms, ...goals])
      setNewGoal({
        category: '',
        description: '',
        mechanisms: []
      })
      setShowAddGoal(false)
      setError(null) // Limpiar errores previos
    }
  }

  const handleToggleGoal = async (goalId: string) => {
    const goal = goals.find(g => g.id === goalId)
    if (!goal || !user) return

    const updatedGoal = await updateGoal(goalId, {
      completed: !goal.completed,
      completed_by_senior_id: !goal.completed ? user.id : null,
      progress_percentage: !goal.completed ? 100 : 0
    })

    if (updatedGoal) {
      setGoals(goals.map(g => g.id === goalId ? { ...g, ...updatedGoal } : g))
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    const success = await deleteGoal(goalId)
    if (success) {
      setGoals(goals.filter(goal => goal.id !== goalId))
    }
  }

  const handleAddMechanism = (description: string, frequency: string) => {
    if (!description.trim()) return

    const newMechanism = {
      description: description.trim(),
      frequency: frequency as Mechanism['frequency'],
      user_id: user?.id || ''
    }

    setNewGoal({
      ...newGoal,
      mechanisms: [...newGoal.mechanisms, newMechanism]
    })
  }

  const handleRemoveMechanism = (index: number) => {
    setNewGoal({
      ...newGoal,
      mechanisms: newGoal.mechanisms.filter((_, i) => i !== index)
    })
  }

  const handleRemoveMechanismFromGoal = async (goalId: string, mechanismId: string) => {
    const success = await deleteMechanism(mechanismId)
    if (success) {
      setGoals(goals.map(goal => 
        goal.id === goalId 
          ? { ...goal, mechanisms: goal.mechanisms.filter(m => m.id !== mechanismId) }
          : goal
      ))
    }
  }

  const completedGoals = goals.filter(goal => goal.completed).length
  const totalGoals = goals.length
  const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
  const averageProgress = totalGoals > 0 ? Math.round(goals.reduce((sum, goal) => sum + goal.progress_percentage, 0) / totalGoals) : 0

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando metas...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white">
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold ">Mis Metas</h1>
        <p className=" mt-2">
          Establece y gestiona tus objetivos personales para alcanzar tus sueños
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso General</CardTitle>
            <TrendingUp className="h-4 w-4 " />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold ">{completionRate}%</div>
            <p className="text-xs ">
              {completedGoals} de {totalGoals} metas completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso Promedio</CardTitle>
            <Target className="h-4 w-4 " />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold ">{averageProgress}%</div>
            <p className="text-xs ">
              Avance promedio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas Activas</CardTitle>
            <Target className="h-4 w-4 " />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold ">{totalGoals - completedGoals}</div>
            <p className="text-xs ">
              En progreso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 " />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold ">{completedGoals}</div>
            <p className="text-xs ">
              Logros alcanzados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Goal Button */}
      <div className="mb-6">
        <Button 
          onClick={() => setShowAddGoal(true)} 
          disabled={goalCategories.filter(category => !goals.some(goal => goal.category === category)).length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Plus className="mr-2 h-4 w-4 text-white"/>
          {goalCategories.filter(category => !goals.some(goal => goal.category === category)).length === 0 
            ? 'Todas las categorías ocupadas' 
            : 'Nueva Meta'
          }
        </Button>
        {goalCategories.filter(category => !goals.some(goal => goal.category === category)).length === 0 && (
          <p className="text-sm text-amber-600 mt-2">
            Ya tienes una meta en cada categoría disponible. Solo puedes tener una meta por categoría.
          </p>
        )}
      </div>

      {/* Add Goal Form */}
      {showAddGoal && (
        <Card className="mb-6 border-primary-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Agregar Nueva Meta</CardTitle>
            <CardDescription className="">
              Establece un objetivo claro y específico para tu crecimiento personal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Categoría
                </label>
                <select
                  value={newGoal.category}
                  onChange={(e) => setNewGoal({...newGoal, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="" className="text-sm font-medium">Selecciona una categoría</option>
                  {goalCategories
                    .filter(category => !goals.some(goal => goal.category === category))
                    .map(category => (
                      <option key={category} value={category} className="text-sm font-medium">{category}</option>
                    ))}
                  <option value="custom">Otra (personalizada)</option>
                </select>
                {goalCategories.filter(category => !goals.some(goal => goal.category === category)).length === 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    Todas las categorías ya tienen una meta asignada. Solo puedes tener una meta por categoría.
                  </p>
                )}
              </div>

            </div>

            <div>
              <label className="block text-sm font-medium  mb-2">
                Descripción de la Meta
              </label>
              <textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                placeholder="Escribe tu meta en tiempo presente y primera persona (ej: 'Leo 30 minutos diarios para expandir mi conocimiento')"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Mecanismos de Acción
              </label>
              <p className="text-sm mb-2">
                Agrega entre 4 y 6 mecanismos con su frecuencia específica:
                <span className={`ml-2 font-medium ${newGoal.mechanisms.length >= 6 ? 'text-red-600' : 'text-blue-600'}`}>
                  {newGoal.mechanisms.length}/6
                </span>
              </p>
              {newGoal.mechanisms.length >= 6 && (
                <p className="text-sm text-red-600 mb-2">
                  Has alcanzado el límite máximo de 6 mecanismos por meta.
                </p>
              )}
              
              {/* Mecanismos agregados */}
              {newGoal.mechanisms.map((mechanism, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2 p-2 bg-gray-50 rounded">
                  <span className="flex-1 text-sm">{mechanism.description}</span>
                  <span className="text-xs text-gray-500">
                    ({frequencyLabels[mechanism.frequency]})
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveMechanism(index)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {/* Formulario para agregar nuevo mecanismo */}
              <div className="space-y-2 border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Descripción del mecanismo"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    id="mechanism-description"
                  />
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    id="mechanism-frequency"
                  >
                    <option value="daily">Diario</option>
                    <option value="2x_week">2 veces por semana</option>
                    <option value="3x_week">3 veces por semana</option>
                    <option value="4x_week">4 veces por semana</option>
                    <option value="5x_week">5 veces por semana</option>
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quincenal</option>
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const descriptionInput = document.getElementById('mechanism-description') as HTMLInputElement
                    const frequencySelect = document.getElementById('mechanism-frequency') as HTMLSelectElement
                    if (descriptionInput && frequencySelect && descriptionInput.value.trim()) {
                      handleAddMechanism(descriptionInput.value, frequencySelect.value)
                      descriptionInput.value = ''
                    }
                  }}
                  disabled={newGoal.mechanisms.length >= 6}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {newGoal.mechanisms.length >= 6 ? 'Máximo alcanzado' : 'Agregar Mecanismo'}
                </Button>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddGoal(false)} className="bg-blue-600 hover:bg-blue-700 text-white">
                Cancelar
              </Button>
              <Button 
                onClick={handleAddGoal}
                disabled={!newGoal.category || !newGoal.description || newGoal.mechanisms.length < 4 || newGoal.mechanisms.length > 6}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Crear Meta
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals List */}
      <div className="space-y-6">
        {goals.map((goal) => (
          <Card key={goal.id} className={goal.completed ? 'bg-green-50 border-green-200' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <button
                    onClick={() => handleToggleGoal(goal.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${
                      goal.completed 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-gray-300 hover:border-primary-500'
                    }`}
                  >
                    {goal.completed && <CheckCircle className="h-4 w-4" />}
                  </button>
                  <div>
                    <CardTitle className={`text-lg ${goal.completed ? 'line-through ' : ''}`}>
                      {goal.description}
                    </CardTitle>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        {goal.category}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {goal.progress_percentage}% completado
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {goal.mechanisms.length} mecanismos
                      </span>
                      {goal.completed && goal.completed_by_senior_id && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Completada por Senior
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingGoal(editingGoal === goal.id ? null : goal.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteGoal(goal.id)}
                    className=" hover:"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div>
                <h4 className="text-sm font-medium  mb-2">Mecanismos de Acción:</h4>
                <div className="space-y-2">
                  {goal.mechanisms.map((mechanism, index) => (
                    <div key={mechanism.id || index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          goal.completed ? 'bg-green-500' : 'bg-primary-500'
                        }`}></div>
                        <span className={`text-sm ${goal.completed ? '' : ''}`}>
                          {mechanism.description}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({frequencyLabels[mechanism.frequency]})
                        </span>
                      </div>
                      {editingGoal === goal.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMechanismFromGoal(goal.id, mechanism.id)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {goals.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Target className="h-12 w-12  mx-auto mb-4" />
              <h3 className="text-lg font-medium  mb-2">No tienes metas establecidas</h3>
              <p className=" mb-4">
                Comienza creando tu primera meta para darle dirección a tu crecimiento personal
              </p>
              <Button onClick={() => setShowAddGoal(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Crear mi primera meta
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
