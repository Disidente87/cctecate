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
  Calendar,
  TrendingUp
} from 'lucide-react'

interface Goal {
  id: string
  category: string
  description: string
  mechanisms: string[]
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
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
  weekly: 'Semanal', 
  monthly: 'Mensual',
  yearly: 'Anual'
}

const suggestedMechanisms = {
  Personal: [
    'Meditación de 10 minutos',
    'Lectura personal 30 min',
    'Ejercicio físico',
    'Gratitud diaria',
    'Reflexión personal'
  ],
  Finanzas: [
    'Revisar presupuesto semanal',
    'Ahorrar 10% del ingreso',
    'Invertir en educación financiera',
    'Reducir gastos innecesarios',
    'Seguimiento de gastos'
  ],
  Salud: [
    'Ejercicio 30 min diarios',
    'Comer 5 porciones de frutas/verduras',
    'Beber 2L de agua',
    'Dormir 8 horas',
    'Caminar 10,000 pasos'
  ],
  Familia: [
    'Tiempo de calidad con familia',
    'Comunicación abierta',
    'Apoyo emocional',
    'Actividades familiares',
    'Expresar amor y aprecio'
  ]
}

export default function MetasPage() {
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      category: 'Personal',
      description: 'Desarrollar hábito de lectura diaria',
      mechanisms: ['Leer 30 min antes de dormir', 'Llevar libro siempre'],
      frequency: 'daily',
      isCustom: false,
      completed: false
    },
    {
      id: '2', 
      category: 'Salud',
      description: 'Mantener rutina de ejercicio consistente',
      mechanisms: ['Gimnasio 3x por semana', 'Caminar 30 min diarios'],
      frequency: 'weekly',
      isCustom: false,
      completed: true
    }
  ])

  const [showAddGoal, setShowAddGoal] = useState(false)
  const [newGoal, setNewGoal] = useState({
    category: '',
    description: '',
    mechanisms: [] as string[],
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    isCustom: false
  })

  const [editingGoal, setEditingGoal] = useState<string | null>(null)

  const handleAddGoal = () => {
    if (!newGoal.category || !newGoal.description) return

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
      frequency: 'daily',
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

  // const handleAddMechanism = (goalId: string, mechanism: string) => {
  //   setGoals(goals.map(goal => 
  //     goal.id === goalId 
  //       ? { ...goal, mechanisms: [...goal.mechanisms, mechanism] }
  //       : goal
  //   ))
  // }

  const handleRemoveMechanism = (goalId: string, mechanismIndex: number) => {
    setGoals(goals.map(goal => 
      goal.id === goalId 
        ? { ...goal, mechanisms: goal.mechanisms.filter((_, index) => index !== mechanismIndex) }
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
        <h1 className="text-3xl font-bold text-gray-900">Mis Metas</h1>
        <p className="text-gray-600 mt-2">
          Establece y gestiona tus objetivos personales para alcanzar tus sueños
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso General</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {completedGoals} de {totalGoals} metas completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas Activas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGoals - completedGoals}</div>
            <p className="text-xs text-muted-foreground">
              En progreso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedGoals}</div>
            <p className="text-xs text-muted-foreground">
              Logros alcanzados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Goal Button */}
      <div className="mb-6">
        <Button onClick={() => setShowAddGoal(true)} className="bg-primary-600 hover:bg-primary-700">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Meta
        </Button>
      </div>

      {/* Add Goal Form */}
      {showAddGoal && (
        <Card className="mb-6 border-primary-200">
          <CardHeader>
            <CardTitle>Agregar Nueva Meta</CardTitle>
            <CardDescription>
              Establece un objetivo claro y específico para tu crecimiento personal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría
                </label>
                <select
                  value={newGoal.category}
                  onChange={(e) => setNewGoal({...newGoal, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Selecciona una categoría</option>
                  {goalCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                  <option value="custom">Otra (personalizada)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frecuencia
                </label>
                <select
                  value={newGoal.frequency}
                  onChange={(e) => setNewGoal({...newGoal, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mecanismos de Acción
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Selecciona al menos 4 mecanismos que te ayuden a alcanzar esta meta:
              </p>
              
              {newGoal.category && suggestedMechanisms[newGoal.category as keyof typeof suggestedMechanisms] && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                  {suggestedMechanisms[newGoal.category as keyof typeof suggestedMechanisms].map((mechanism, index) => (
                    <label key={index} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newGoal.mechanisms.includes(mechanism)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewGoal({...newGoal, mechanisms: [...newGoal.mechanisms, mechanism]})
                          } else {
                            setNewGoal({...newGoal, mechanisms: newGoal.mechanisms.filter(m => m !== mechanism)})
                          }
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{mechanism}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Agregar mecanismo personalizado"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      setNewGoal({...newGoal, mechanisms: [...newGoal.mechanisms, e.currentTarget.value.trim()]})
                      e.currentTarget.value = ''
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Agregar mecanismo personalizado"]') as HTMLInputElement
                    if (input && input.value.trim()) {
                      setNewGoal({...newGoal, mechanisms: [...newGoal.mechanisms, input.value.trim()]})
                      input.value = ''
                    }
                  }}
                >
                  Agregar
                </Button>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddGoal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAddGoal}
                disabled={!newGoal.category || !newGoal.description || newGoal.mechanisms.length < 4}
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
                    <CardTitle className={`text-lg ${goal.completed ? 'line-through text-gray-500' : ''}`}>
                      {goal.description}
                    </CardTitle>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        {goal.category}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <Calendar className="w-3 h-3 mr-1" />
                        {frequencyLabels[goal.frequency]}
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
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Mecanismos de Acción:</h4>
                <div className="space-y-2">
                  {goal.mechanisms.map((mechanism, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        goal.completed ? 'bg-green-500' : 'bg-primary-500'
                      }`}></div>
                      <span className={`text-sm ${goal.completed ? 'text-gray-500' : 'text-gray-700'}`}>
                        {mechanism}
                      </span>
                      {editingGoal === goal.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMechanism(goal.id, index)}
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
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes metas establecidas</h3>
              <p className="text-gray-500 mb-4">
                Comienza creando tu primera meta para darle dirección a tu crecimiento personal
              </p>
              <Button onClick={() => setShowAddGoal(true)}>
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
