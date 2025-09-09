'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { OptimizedCalendar } from '@/components/calendar/OptimizedCalendar'
import { GoalProgressDashboard } from '@/components/calendar/GoalProgressDashboard'

export default function CalendarPage() {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [refreshGoalsProgress, setRefreshGoalsProgress] = useState<(() => void) | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Obtener usuario autenticado
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) {
          console.error('Auth error:', authError)
          return
        }
        if (!user) {
          console.warn('User not authenticated')
          return
        }

        setUser({ id: user.id })
        console.log('Calendar page - user loaded:', user.id)
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando Calendario...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No autenticado</h2>
          <p className="text-gray-600 mb-6">
            Por favor inicia sesión para acceder al calendario
          </p>
          <a
            href="/auth/login"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Iniciar Sesión
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Calendario Optimizado</h1>
        <p className="text-gray-600">
          Arrastra las actividades entre días para reorganizar tu horario
        </p>
      </div>

      {/* Dashboard de Progreso */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Progreso de Metas</h2>
        <GoalProgressDashboard 
          userId={user.id} 
          onRefresh={setRefreshGoalsProgress}
        />
      </div>

      {/* Calendario */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Calendario Semanal</h2>
        <OptimizedCalendar userId={user.id} currentDate={currentDate} />
      </div>

      {/* Controles de navegación */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000))}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
        >
          ← Semana Anterior
        </button>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Hoy
        </button>
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000))}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Semana Siguiente →
        </button>
      </div>
    </div>
  )
}