'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Phone, 
  Calendar,
  Clock, 
  CheckCircle, 
  AlertCircle,
  Star,
  Settings
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useCalls } from '@/hooks/useCalls'
import { useSelectedUser } from '@/contexts/selected-user'
import { CallEvaluationModal } from '@/components/calls/CallEvaluationModal'
import { CallCalendar } from '@/components/calls/CallCalendar'
import { CallScheduleForm } from '@/components/calls/CallScheduleForm'
import { CallCalendarItem } from '@/types'
import { getLocalTimeFromTimestamp } from '@/utils/timezone'

export default function LlamadasPage() {
  const { selectedUserId, authUserRole } = useSelectedUser()
  const {
    callSchedule,
    statistics,
    nextCall,
    pendingCalls,
    isLoading,
    createCallSchedule,
    evaluateCall,
    refreshData
  } = useCalls(selectedUserId)

  // Hora local desde UTC
  const getTimeFromTimestamp = (timestamp: string) => getLocalTimeFromTimestamp(timestamp)

  // Convierte un TIME (UTC) de la BD a hora local HH:MM
  function formatScheduleTime(time?: string) {
    if (!time) return ''
    // Acepta formatos HH:MM o HH:MM:SS
    const normalized = time.length === 5 ? `${time}:00` : time
    // Usar la fecha de hoy para respetar el DST actual
    const todayStr = new Date().toISOString().split('T')[0]
    const isoFromUtcTime = `${todayStr}T${normalized}Z`
    const date = new Date(isoFromUtcTime)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [showEvaluationModal, setShowEvaluationModal] = useState(false)
  const [selectedCall, setSelectedCall] = useState<CallCalendarItem | null>(null)

  // Solo supervisores pueden evaluar llamadas
  const canEvaluateCalls = authUserRole === 'senior' || authUserRole === 'master_senior' || authUserRole === 'admin'

  const handleCreateSchedule = async (seniorId: string, mondayTime?: string, wednesdayTime?: string, fridayTime?: string) => {
    try {
      await createCallSchedule(seniorId, mondayTime, wednesdayTime, fridayTime)
      setShowScheduleForm(false)
      // Actualizar los datos después de crear la programación
      await refreshData()
    } catch (error) {
      console.error('Error creating call schedule:', error)
    }
  }

  const handleEvaluateCall = async (callId: string, evaluationStatus: 'on_time' | 'late' | 'rescheduled' | 'not_done', score?: number, notes?: string) => {
    try {
      await evaluateCall(callId, evaluationStatus, score, notes)
      setShowEvaluationModal(false)
      setSelectedCall(null)
      // Actualizar los datos después de evaluar la llamada
      await refreshData()
    } catch (error) {
      console.error('Error evaluating call:', error)
    }
  }

  const handleCallClick = (call: CallCalendarItem) => {
    if (call.evaluation_status === 'pending' && !call.is_future && canEvaluateCalls) {
      setSelectedCall(call)
      setShowEvaluationModal(true)
    }
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
        <h1 className="text-3xl font-bold">Gestión de Llamadas</h1>
        <p className="text-gray-600 mt-2">
          Programa y gestiona las llamadas de seguimiento con tu Senior
        </p>
      </div>

      {/* Estadísticas */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próxima Llamada</CardTitle>
              <Phone className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              {nextCall ? (
                <>
                  <div className="text-lg font-bold text-blue-600">
                    {format(new Date(nextCall.scheduled_date), 'dd MMM', { locale: es })}, {getTimeFromTimestamp(nextCall.scheduled_date)}
                  </div>
                  <p className="text-xs text-gray-600">
                    Con {nextCall.senior_name}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-lg font-bold text-gray-400">Sin llamadas</div>
                  <p className="text-xs text-gray-600">
                    Programadas
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Porcentaje de Avance</CardTitle>
              <CheckCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.progress_percentage.toFixed(1)}%</div>
              <p className="text-xs text-gray-600">
                de {statistics.available_percentage.toFixed(1)}% disponible
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score Total</CardTitle>
              <Star className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_score.toFixed(1)}</div>
              <p className="text-xs text-gray-600">
                Puntos obtenidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Llamadas Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.pending_calls} de {statistics.total_calls}</div>
              <p className="text-xs text-gray-600">
                Por evaluar
              </p>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Llamadas Pendientes */}
      {pendingCalls.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Llamadas Pendientes de Evaluación
            </CardTitle>
            <CardDescription>
              Tienes {pendingCalls.length} llamada{pendingCalls.length > 1 ? 's' : ''} que necesitan ser evaluadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingCalls.map((call) => (
                <div
                  key={call.call_id}
                  className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-900">
                        {format(new Date(call.scheduled_date), 'dd MMM yyyy', { locale: es })}, {getTimeFromTimestamp(call.scheduled_date)}
                      </p>
                      <p className="text-sm text-orange-700">
                        Con {call.senior_name}
                        {call.is_overdue && (
                          <span className="ml-2 text-red-600 font-medium">
                            (Vencida hace {call.days_since_scheduled} día{call.days_since_scheduled > 1 ? 's' : ''})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {canEvaluateCalls && (
                    <Button
                      onClick={() => {
                        const callItem: CallCalendarItem = {
                          call_id: call.call_id,
                          scheduled_time: call.scheduled_date,
                          senior_name: call.senior_name,
                          evaluation_status: 'pending',
                          score: 0,
                          color_code: 'blue',
                          is_pending: true,
                          is_future: false,
                          date: call.scheduled_date.split('T')[0]
                        }
                        handleCallClick(callItem)
                      }}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      Evaluar
                    </Button>
                  )}
                  {!canEvaluateCalls && (
                    <div className="text-sm text-gray-500 px-3 py-2">
                      Tu Senior evaluará esta llamada
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      

      {/* Botón de Configurar Horarios (cuando no hay programación) */}
      {!callSchedule && (
        <div className="mb-4 flex justify-end">
          <Button
            onClick={() => setShowScheduleForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Settings className="mr-2 h-4 w-4" />
            Configurar Horarios
          </Button>
        </div>
      )}

      {/* Calendario de Llamadas */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Calendario de Llamadas</h2>
        <CallCalendar 
          userId={selectedUserId} 
          onCallClick={handleCallClick}
          canEvaluateCalls={canEvaluateCalls}
        />
      </div>

      {/* Programación de Llamadas (movida debajo del calendario) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Programación de Llamadas</h2>
          {!callSchedule && (
            <Button
              onClick={() => setShowScheduleForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Settings className="mr-2 h-4 w-4" />
              Configurar Horarios
            </Button>
          )}
        </div>

        {callSchedule ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Horarios Configurados
              </CardTitle>
              <CardDescription>
                Tu programación automática de llamadas está activa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {callSchedule.monday_time && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Lunes</p>
                      <p className="text-sm text-blue-700">{formatScheduleTime(callSchedule.monday_time)}</p>
                    </div>
                  </div>
                )}
                {callSchedule.wednesday_time && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Miércoles</p>
                      <p className="text-sm text-blue-700">{formatScheduleTime(callSchedule.wednesday_time)}</p>
                    </div>
                  </div>
                )}
                {callSchedule.friday_time && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Viernes</p>
                      <p className="text-sm text-blue-700">{formatScheduleTime(callSchedule.friday_time)}</p>
                    </div>
                  </div>
                )}
              </div>
              
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="text-center py-12">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay programación configurada
              </h3>
              <p className="text-gray-600 mb-4">
                Configura tus horarios de llamadas para generar automáticamente las llamadas con tu Senior
              </p>
              <Button
                onClick={() => setShowScheduleForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Settings className="mr-2 h-4 w-4" />
                Configurar Horarios
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modales */}
      <CallScheduleForm
        isOpen={showScheduleForm}
        onClose={() => setShowScheduleForm(false)}
        onSubmit={handleCreateSchedule}
      />

      {selectedCall && (
        <CallEvaluationModal
          call={{
            id: selectedCall.call_id,
            scheduled_date: selectedCall.scheduled_time,
            senior_name: selectedCall.senior_name,
            senior_email: '' // No disponible en CallCalendarItem
          }}
          isOpen={showEvaluationModal}
          onClose={() => {
            setShowEvaluationModal(false)
            setSelectedCall(null)
          }}
          onEvaluate={handleEvaluateCall}
        />
      )}
    </div>
  )
}