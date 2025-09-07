'use client'

import { useState } from 'react'
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

interface Mechanism {
  id: string
  description: string
  frequency: 'daily' | '2x_week' | '3x_week' | '4x_week' | '5x_week' | 'weekly' | 'monthly' | 'yearly'
}

interface Goal {
  id: string
  category: string
  description: string
  mechanisms: Mechanism[]
  isCustom: boolean
  completed: boolean
}

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
  weekly: '1 vez por semana',
  monthly: 'Mensual',
  yearly: 'Anual'
}


export default function MetasPage() {
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      category: 'Personal',
      description: 'Desarrollar hábito de lectura diaria',
      mechanisms: [
        { id: '1-1', description: 'Leer 30 min antes de dormir', frequency: 'daily' },
        { id: '1-2', description: 'Llevar libro siempre', frequency: 'daily' }
      ],
      isCustom: false,
      completed: false
    },
    {
      id: '2', 
      category: 'Salud',
      description: 'Mantener rutina de ejercicio consistente',
      mechanisms: [
        { id: '2-1', description: 'Gimnasio 3x por semana', frequency: '3x_week' },
        { id: '2-2', description: 'Caminar 30 min diarios', frequency: 'daily' }
      ],
      isCustom: false,
      completed: true
    }
  ])

  const [showAddGoal, setShowAddGoal] = useState(false)
  const [newGoal, setNewGoal] = useState({
    category: '',
    description: '',
    mechanisms: [] as Mechanism[],
    isCustom: false
  })

  const [editingGoal, setEditingGoal] = useState<string | null>(null)

  const handleAddGoal = () => {
    if (!newGoal.category || !newGoal.description || newGoal.mechanisms.length < 4) return

    const goal: Goal = {
      id: Date.now().toString(),
      ...newGoal,
      completed: false
    }

    setGoals([...goals, goal])
    setNewGoal({
      category: '',
      description: '',
      mechanisms: [],
      isCustom: false
    })
    setShowAddGoal(false)
  }

  const handleToggleGoal = (goalId: string) => {
    setGoals(goals.map(goal => 
      goal.id === goalId ? { ...goal, completed: !goal.completed } : goal
    ))
  }

  const handleDeleteGoal = (goalId: string) => {
    setGoals(goals.filter(goal => goal.id !== goalId))
  }

  const handleAddMechanism = (description: string, frequency: string) => {
    if (!description.trim()) return

    const newMechanism: Mechanism = {
      id: Date.now().toString(),
      description: description.trim(),
      frequency: frequency as Mechanism['frequency']
    }

    setNewGoal({
      ...newGoal,
      mechanisms: [...newGoal.mechanisms, newMechanism]
    })
  }

  const handleRemoveMechanism = (mechanismId: string) => {
    setNewGoal({
      ...newGoal,
      mechanisms: newGoal.mechanisms.filter(m => m.id !== mechanismId)
    })
  }

  const handleRemoveMechanismFromGoal = (goalId: string, mechanismId: string) => {
    setGoals(goals.map(goal => 
      goal.id === goalId 
        ? { ...goal, mechanisms: goal.mechanisms.filter(m => m.id !== mechanismId) }
        : goal
    ))
  }

  const completedGoals = goals.filter(goal => goal.completed).length
  const totalGoals = goals.length
  const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
        <Button onClick={() => setShowAddGoal(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4 text-white"/>
          Nueva Meta
        </Button>
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
                  {goalCategories.map(category => (
                    <option key={category} value={category} className="text-sm font-medium">{category}</option>
                  ))}
                  <option value="custom">Otra (personalizada)</option>
                </select>
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
                Agrega al menos 4 mecanismos con su frecuencia específica:
              </p>
              
              {/* Mecanismos agregados */}
              {newGoal.mechanisms.map((mechanism) => (
                <div key={mechanism.id} className="flex items-center space-x-2 mb-2 p-2 bg-gray-50 rounded">
                  <span className="flex-1 text-sm">{mechanism.description}</span>
                  <span className="text-xs text-gray-500">
                    ({frequencyLabels[mechanism.frequency]})
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveMechanism(mechanism.id)}
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
                    <option value="weekly">1 vez por semana</option>
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
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Agregar Mecanismo
                </Button>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddGoal(false)} className="bg-blue-600 hover:bg-blue-700 text-white">
                Cancelar
              </Button>
              <Button 
                onClick={handleAddGoal}
                disabled={!newGoal.category || !newGoal.description || newGoal.mechanisms.length < 4}
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
