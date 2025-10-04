'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Target, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  TrendingUp,
  Save,
  X,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSelectedUser } from '@/contexts/selected-user'
import { useActiveParticipation } from '@/contexts/active-participation'
import { getUserGoals, createGoalWithMechanisms, updateGoal, deleteGoal, deleteMechanism } from '@/lib/goals'
import type { GoalWithMechanisms, Mechanism, MechanismInsert } from '@/types/database'
import { format } from 'date-fns'
import { ParticipationSelector } from '@/components/portal/ParticipationSelector'

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

// Función para obtener el color fijo de cada categoría
const getCategoryColor = (category: string): string => {
  const categoryColors: Record<string, string> = {
    'Personal': 'bg-yellow-100 border-yellow-300 text-yellow-800',
    'Finanzas': 'bg-green-100 border-green-300 text-green-800',
    'Salud': 'bg-red-100 border-red-300 text-red-800',
    'Familia': 'bg-blue-100 border-blue-300 text-blue-800',
    'Carrera': 'bg-purple-100 border-purple-300 text-purple-800',
    'Relaciones': 'bg-pink-100 border-pink-300 text-pink-800',
    'Espiritual': 'bg-indigo-100 border-indigo-300 text-indigo-800',
    'Recreación': 'bg-orange-100 border-orange-300 text-orange-800'
  }
  
  return categoryColors[category] || 'bg-gray-100 border-gray-300 text-gray-800'
}

// Función para calcular el progreso de una meta usando la misma lógica del calendario
const calculateGoalProgress = async (goal: GoalWithMechanisms, userId: string): Promise<number> => {
  if (goal.mechanisms.length === 0) {
    return 0
  }

  try {
    // Obtener fechas de generación para calcular el período
    const { data: profile } = await supabase
      .from('profiles')
      .select('generation')
      .eq('id', userId)
      .single()

    let mechanismStartDate = new Date()
    let mechanismEndDate = new Date()

    if (profile?.generation) {
      const { data: generationData } = await supabase
        .from('generations')
        .select('pl1_training_date, pl3_training_date')
        .eq('name', profile.generation)
        .single()

      if (generationData?.pl1_training_date && generationData?.pl3_training_date) {
        const pl1Date = new Date(generationData.pl1_training_date)
        const pl3Date = new Date(generationData.pl3_training_date)
        
        // Mecanismos empiezan 1 semana después de PL1
        mechanismStartDate = new Date(pl1Date)
        mechanismStartDate.setDate(mechanismStartDate.getDate() + 9)
        
        // Mecanismos terminan 1 semana antes de PL3
        mechanismEndDate = new Date(pl3Date)
        mechanismEndDate.setDate(mechanismEndDate.getDate() - 7)
      }
    }

    // Calcular actividades totales esperadas para esta meta
    let totalExpectedActivities = 0
    let totalCompletedActivities = 0

    for (const mechanism of goal.mechanisms) {
      // Calcular cuántas actividades se esperan para este mecanismo
      const startDate = mechanism.start_date ? new Date(mechanism.start_date) : mechanismStartDate
      const endDate = mechanism.end_date ? new Date(mechanism.end_date) : mechanismEndDate
      
      // Usar el período completo para el cálculo
      const actualStartDate = startDate > mechanismStartDate ? startDate : mechanismStartDate
      const actualEndDate = endDate < mechanismEndDate ? endDate : mechanismEndDate

      // Normalizar las horas para todas las frecuencias (para incluir el último día)
      const loopStartDate = new Date(actualStartDate)
      const loopEndDate = new Date(actualEndDate)
      
      // Aplicar normalización para todas las frecuencias que usan días específicos
      if (['weekly', '2x_week', '3x_week', '4x_week', '5x_week'].includes(mechanism.frequency)) {
        loopStartDate.setHours(0, 0, 0, 0)
        loopEndDate.setHours(23, 59, 59, 999)
      }

      let expectedCount = 0
      const currentDate = new Date(loopStartDate)
      
      while (currentDate <= loopEndDate) {
        const dayOfWeek = currentDate.getDay()
        let shouldInclude = false

        switch (mechanism.frequency) {
          case 'daily':
            shouldInclude = true
            break
          case 'weekly':
            shouldInclude = dayOfWeek === 5 // Viernes
            break
          case '2x_week':
            shouldInclude = dayOfWeek === 2 || dayOfWeek === 4 // Mar y Jue
            break
          case '3x_week':
            shouldInclude = dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5 // LMV
            break
          case '4x_week':
            shouldInclude = dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4 || dayOfWeek === 5 // MMMJV
            break
          case '5x_week':
            shouldInclude = dayOfWeek >= 1 && dayOfWeek <= 5 // L-V
            break
          case 'biweekly':
            const daysSincePeriodStart = Math.floor((currentDate.getTime() - actualStartDate.getTime()) / (1000 * 60 * 60 * 24))
            shouldInclude = daysSincePeriodStart >= 0 && daysSincePeriodStart % 14 === 0
            break
        }

        if (shouldInclude) {
          expectedCount++
        }

        currentDate.setDate(currentDate.getDate() + 1)
      }

      totalExpectedActivities += expectedCount

      // Contar actividades completadas para este mecanismo
      const { data: completions } = await supabase
        .from('mechanism_completions')
        .select('completed_date')
        .eq('mechanism_id', mechanism.id)
        .eq('user_id', userId)
        .gte('completed_date', format(actualStartDate, 'yyyy-MM-dd'))
        // No aplicamos filtro de fecha límite para obtener el total completado

      totalCompletedActivities += completions?.length || 0
    }

    const progressPercentage = totalExpectedActivities > 0 ? (totalCompletedActivities / totalExpectedActivities) * 100 : 0
    return Math.round(progressPercentage)
  } catch (error) {
    console.error('Error calculating goal progress:', error)
    return 0
  }
}

const frequencyLabels = {
  daily: 'Diario',
  '2x_week': '2 veces por semana',
  '3x_week': '3 veces por semana',
  '4x_week': '4 veces por semana',
  '5x_week': '5 veces por semana',
  weekly: 'Semanal',
  biweekly: 'Quincenal'
}


export default function MetasPage() {
  const { selectedUserId, authUserId, authUserRole, isSenior, isMasterSenior } = useSelectedUser()
  const { activeParticipation, isAdmin } = useActiveParticipation()
  const [goals, setGoals] = useState<GoalWithMechanisms[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [goalError, setGoalError] = useState<Record<string, string>>({})
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [newGoal, setNewGoal] = useState({
    category: '',
    description: '',
    mechanisms: [] as Omit<MechanismInsert, 'id' | 'goal_id' | 'created_at' | 'updated_at'>[]
  })
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  const [editingGoalData, setEditingGoalData] = useState<{
    id: string
    category: string
    description: string
    mechanisms: Array<{
      id: string
      description: string
      frequency: string
    }>
  } | null>(null)

  // Limpiar formulario cuando cambie la vista (senior viendo líder vs sus propios datos)
  useEffect(() => {
    setNewGoal({
      category: '',
      description: '',
      mechanisms: []
    })
    setShowAddGoal(false)
    setEditingGoal(null)
    setError(null)
  }, [selectedUserId])

  // Cargar metas del perfil seleccionado
  useEffect(() => {
    const loadUserAndGoals = async () => {
      try {
        setError(null)
        const viewUserId = selectedUserId || authUserId
        if (viewUserId) {
          setUser({ id: viewUserId })
          
          // Si es un Senior o Master Senior viendo datos de otro usuario, no pasar participationId
          // para que getUserGoals obtenga la participación activa del usuario seleccionado
          const participationId = ((isSenior || isMasterSenior) && selectedUserId !== authUserId) 
            ? undefined 
            : activeParticipation?.participation_id
          
          const userGoals = await getUserGoals(viewUserId, participationId)
          
          // Calcular progreso dinámicamente para cada meta
          const goalsWithProgress = await Promise.all(
            userGoals.map(async (goal) => {
              // Si la meta está marcada como completada, usar 100% independientemente del progreso real
              if (goal.completed) {
                return {
                  ...goal,
                  progress_percentage: 100
                }
              }
              
              // Si no está completada, calcular el progreso real
              const progressPercentage = await calculateGoalProgress(goal, viewUserId)
              return {
                ...goal,
                progress_percentage: progressPercentage
              }
            })
          )
          
          setGoals(goalsWithProgress)
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
  }, [selectedUserId, authUserId, activeParticipation])

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

    // Limpiar errores previos para esta meta
    setGoalError(prev => ({ ...prev, [goalId]: '' }))

    // Si se está intentando completar una meta, verificar que tenga 100% de progreso
    if (!goal.completed && goal.progress_percentage < 100) {
      setGoalError(prev => ({ ...prev, [goalId]: 'No puedes marcar una meta como completada hasta que tenga 100% de progreso' }))
      return
    }

    // Solo los supervisores pueden marcar metas como completadas
    if (!goal.completed && authUserRole !== 'senior' && authUserRole !== 'master_senior' && authUserRole !== 'admin') {
      setGoalError(prev => ({ ...prev, [goalId]: 'Solo tu Senior puede marcar esta meta como completada cuando alcance el 100%' }))
      return
    }

    const updatedGoal = await updateGoal(goalId, {
      completed: !goal.completed,
      completed_by_supervisor_id: !goal.completed ? user.id : null,
      progress_percentage: !goal.completed ? 100 : goal.progress_percentage // Mantener el progreso real al desmarcar
    })

    if (updatedGoal) {
      // Si se está desmarcando, recalcular el progreso real
      if (goal.completed) {
        const realProgress = await calculateGoalProgress(goal, user.id)
        setGoals(goals.map(g => g.id === goalId ? { ...g, ...updatedGoal, progress_percentage: realProgress } : g))
      } else {
        setGoals(goals.map(g => g.id === goalId ? { ...g, ...updatedGoal } : g))
      }
      setError(null) // Limpiar errores al completar exitosamente
      setGoalError(prev => ({ ...prev, [goalId]: '' })) // Limpiar error específico de esta meta
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
      user_id: user?.id || '',
      start_date: null, // La BD calculará automáticamente (PL1 + 1 semana)
      end_date: null    // La BD calculará automáticamente (PL3 - 1 semana)
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

  const handleStartEditing = (goal: GoalWithMechanisms) => {
    setEditingGoal(goal.id)
    setEditingGoalData({
      id: goal.id,
      category: goal.category,
      description: goal.description,
      mechanisms: goal.mechanisms.map(m => ({
        id: m.id,
        description: m.description,
        frequency: m.frequency
      }))
    })
  }

  const handleCancelEditing = () => {
    setEditingGoal(null)
    setEditingGoalData(null)
  }

  const handleSaveEditing = async () => {
    if (!editingGoalData) return

    // Validar cantidad de mecanismos (mínimo 4, máximo 6)
    if (editingGoalData.mechanisms.length < 4) {
      setError('Cada meta debe tener al menos 4 mecanismos de acción')
      return
    }
    
    if (editingGoalData.mechanisms.length > 6) {
      setError('Cada meta puede tener máximo 6 mecanismos de acción')
      return
    }

    // Validar que todos los mecanismos tengan descripción
    const emptyMechanisms = editingGoalData.mechanisms.filter(m => !m.description.trim())
    if (emptyMechanisms.length > 0) {
      setError('Todos los mecanismos deben tener una descripción')
      return
    }

    try {
      setLoading(true)
      setError(null) // Limpiar errores previos
      
      // Actualizar la meta
      await updateGoal(editingGoalData.id, {
        category: editingGoalData.category,
        description: editingGoalData.description
      })

      // Obtener la meta original para comparar mecanismos
      const originalGoal = goals.find(g => g.id === editingGoalData.id)
      if (!originalGoal) {
        throw new Error('Meta original no encontrada')
      }

      // Identificar mecanismos que se eliminaron del formulario
      const originalMechanismIds = originalGoal.mechanisms.map(m => m.id)
      const currentMechanismIds = editingGoalData.mechanisms
        .filter(m => !m.id.startsWith('temp-'))
        .map(m => m.id)
      
      const mechanismsToDelete = originalMechanismIds.filter(id => !currentMechanismIds.includes(id))
      
      // Eliminar mecanismos que se removieron del formulario
      for (const mechanismId of mechanismsToDelete) {
        await deleteMechanism(mechanismId)
      }

      // Procesar mecanismos del formulario
      for (const mechanism of editingGoalData.mechanisms) {
        if (mechanism.id.startsWith('temp-')) {
          // Crear nuevo mecanismo
          const { error } = await supabase
            .from('mechanisms')
            .insert({
              goal_id: editingGoalData.id,
              user_id: selectedUserId || authUserId,
              description: mechanism.description,
              frequency: mechanism.frequency
            })
          
          if (error) {
            throw error
          }
        } else {
          // Actualizar mecanismo existente
          const { error } = await supabase
            .from('mechanisms')
            .update({
              description: mechanism.description,
              frequency: mechanism.frequency
            })
            .eq('id', mechanism.id)
          
          if (error) {
            throw error
          }
        }
      }

      // Recargar metas y recalcular progreso
      const viewUserId = selectedUserId || authUserId
      if (viewUserId) {
        const goalsData = await getUserGoals(viewUserId)
        
        // Recalcular el progreso para la meta editada
        const updatedGoals = await Promise.all(
          goalsData.map(async (goal) => {
            if (goal.id === editingGoalData.id) {
              // Recalcular progreso para la meta que se acaba de editar
              const progressPercentage = await calculateGoalProgress(goal, viewUserId)
              return {
                ...goal,
                progress_percentage: progressPercentage
              }
            }
            return goal
          })
        )
        
        setGoals(updatedGoals)
      }
      
      setEditingGoal(null)
      setEditingGoalData(null)
    } catch (error) {
      console.error('Error saving goal:', error)
      setError('Error al guardar los cambios')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMechanismToEditing = () => {
    if (!editingGoalData) return
    
    // Validar que no se excedan los 6 mecanismos
    if (editingGoalData.mechanisms.length >= 6) {
      setError('Cada meta puede tener máximo 6 mecanismos de acción')
      return
    }
    
    setEditingGoalData({
      ...editingGoalData,
      mechanisms: [
        ...editingGoalData.mechanisms,
        {
          id: `temp-${Date.now()}`,
          description: '',
          frequency: 'daily'
        }
      ]
    })
  }

  const handleRemoveMechanismFromEditing = (mechanismId: string) => {
    if (!editingGoalData) return
    
    // Validar que no se eliminen mecanismos si quedarían menos de 4
    if (editingGoalData.mechanisms.length <= 4) {
      setError('Cada meta debe tener al menos 4 mecanismos de acción')
      return
    }
    
    setEditingGoalData({
      ...editingGoalData,
      mechanisms: editingGoalData.mechanisms.filter(m => m.id !== mechanismId)
    })
  }

  const handleUpdateEditingMechanism = (mechanismId: string, field: 'description' | 'frequency', value: string) => {
    if (!editingGoalData) return
    
    setEditingGoalData({
      ...editingGoalData,
      mechanisms: editingGoalData.mechanisms.map(m => 
        m.id === mechanismId ? { ...m, [field]: value } : m
      )
    })
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

  // Removemos el return temprano para errores - ahora se mostrarán como alertas

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold ">Mis Metas</h1>
        <p className=" mt-2">
          Establece y gestiona tus objetivos personales para alcanzar tus sueños
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="inline-flex text-red-400 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selector de Participación (solo para admins) */}
      {isAdmin && (
        <div className="mb-6">
          <ParticipationSelector />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso Aprobado</CardTitle>
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
        {(isSenior || isMasterSenior) && selectedUserId !== authUserId ? (
          // Senior o Master Senior viendo datos de un líder - deshabilitar creación de metas
          <div>
            <Button 
              disabled
              className="bg-gray-400 cursor-not-allowed text-white"
            >
              <Plus className="mr-2 h-4 w-4 text-white"/>
              Nueva Meta
            </Button>
            <p className="text-sm text-amber-600 mt-2">
              No puedes agregar metas para el líder seleccionado
            </p>
          </div>
        ) : (
          // Usuario normal o senior viendo sus propios datos
          <div>
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
                    ({frequencyLabels[mechanism.frequency as keyof typeof frequencyLabels] || mechanism.frequency})
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
              <Button variant="outline" onClick={() => setShowAddGoal(false)}>
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
          <Card key={goal.id} className={`${goal.completed ? 'bg-green-50 border-green-200' : getCategoryColor(goal.category).replace('bg-', 'border-').replace('-100', '-200')}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <button
                    onClick={() => handleToggleGoal(goal.id)}
                    disabled={!goal.completed && goal.progress_percentage < 100}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${
                      goal.completed 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : goal.progress_percentage < 100
                          ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-50'
                          : 'border-gray-300 hover:border-primary-500'
                    }`}
                    title={!goal.completed && goal.progress_percentage < 100 ? 'Completa el 100% del progreso para marcar como completada' : ''}
                  >
                    {goal.completed && <CheckCircle className="h-4 w-4" />}
                  </button>
                  <div>
                    <CardTitle className={`text-lg ${goal.completed ? 'line-through ' : ''}`}>
                      {goal.description}
                    </CardTitle>
                    <div className="space-y-3 mt-2">
                      <div className="flex items-center space-x-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(goal.category)}`}>
                          {goal.category}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {goal.progress_percentage}% completado
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {goal.mechanisms.length} mecanismos
                        </span>
                        {goal.completed && goal.completed_by_supervisor_id && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Completada por Senior
                          </span>
                        )}
                      </div>
                      
                      {/* Barra de progreso visual */}
                      <div className="w-full">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Progreso</span>
                          <span className="font-medium">{goal.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              goal.completed 
                                ? 'bg-green-500' 
                                : goal.progress_percentage >= 75 
                                  ? 'bg-blue-500' 
                                  : goal.progress_percentage >= 50 
                                    ? 'bg-yellow-500' 
                                    : 'bg-red-500'
                            }`}
                            style={{ width: `${goal.progress_percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Mensaje de error específico para esta meta */}
                      {goalError[goal.id] && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center">
                            <AlertCircle className="h-4 w-4 text-red-400 mr-2" />
                            <p className="text-sm text-red-800 flex-1">{goalError[goal.id]}</p>
                            <button
                              onClick={() => setGoalError(prev => ({ ...prev, [goal.id]: '' }))}
                              className="ml-2 text-red-400 hover:text-red-600 transition-colors"
                              title="Cerrar mensaje"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {selectedUserId === authUserId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editingGoal === goal.id ? handleCancelEditing() : handleStartEditing(goal)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {selectedUserId === authUserId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGoal(goal.id)}
                      className=" hover:"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              
              {/* Formulario de edición */}
              {editingGoal === goal.id && editingGoalData && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                  <h4 className="text-sm font-medium mb-3">Editar Meta</h4>
                  
                  {/* Editar categoría */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Categoría</label>
                    <Select
                      value={editingGoalData.category}
                      onValueChange={(value) => setEditingGoalData({
                        ...editingGoalData,
                        category: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {goalCategories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Editar descripción */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Descripción</label>
                    <Textarea
                      value={editingGoalData.description}
                      onChange={(e) => setEditingGoalData({
                        ...editingGoalData,
                        description: e.target.value
                      })}
                      placeholder="Describe tu meta..."
                      rows={3}
                    />
                  </div>

                  {/* Editar mecanismos */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <label className="block text-sm font-medium">Mecanismos de Acción</label>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          editingGoalData.mechanisms.length < 4 
                            ? 'bg-red-100 text-red-700' 
                            : editingGoalData.mechanisms.length > 6 
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {editingGoalData.mechanisms.length}/6 (mín. 4)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddMechanismToEditing}
                        disabled={editingGoalData.mechanisms.length >= 6}
                        className={editingGoalData.mechanisms.length >= 6 ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
                    
                    <div className="space-y-1">
                      {editingGoalData.mechanisms.map((mechanism, index) => (
                        <div key={mechanism.id} className="flex items-center space-x-2 p-2 bg-white rounded">
                          <Input
                            value={mechanism.description}
                            onChange={(e) => handleUpdateEditingMechanism(mechanism.id, 'description', e.target.value)}
                            placeholder="Descripción del mecanismo"
                            className="flex-1 border border-gray-200 shadow-none focus:ring-0 focus:border-gray-300"
                          />
                          <Select
                            value={mechanism.frequency}
                            onValueChange={(value) => handleUpdateEditingMechanism(mechanism.id, 'frequency', value)}
                          >
                            <SelectTrigger className="w-32 bg-white border border-gray-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {Object.entries(frequencyLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMechanismFromEditing(mechanism.id)}
                            disabled={editingGoalData.mechanisms.length <= 4}
                            className={`text-red-600 hover:text-red-700 ${
                              editingGoalData.mechanisms.length <= 4 
                                ? 'opacity-50 cursor-not-allowed' 
                                : ''
                            }`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={handleCancelEditing}
                      className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveEditing}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {loading ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                </div>
              )}

              
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
                          ({frequencyLabels[mechanism.frequency as keyof typeof frequencyLabels] || mechanism.frequency})
                        </span>
                      </div>
                      {editingGoal === goal.id && selectedUserId === authUserId && (
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
