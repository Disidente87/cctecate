'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Phone, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Plus,
  Star
} from 'lucide-react'
import { format, addDays, isAfter, isBefore } from 'date-fns'
import { es } from 'date-fns/locale'

interface Call {
  id: string
  leaderId: string
  leaderName: string
  seniorId: string
  seniorName: string
  scheduledDate: Date
  status: 'scheduled' | 'completed' | 'rescheduled' | 'missed'
  score: number
  notes?: string
  rescheduledCount: number
}

const callStatuses = {
  scheduled: { label: 'Programada', color: 'bg-blue-100 text-blue-800', icon: Calendar },
  completed: { label: 'Completada', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rescheduled: { label: 'Re-agendada', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  missed: { label: 'No realizada', color: 'bg-red-100 text-red-800', icon: XCircle }
}

const scoreLabels = {
  3: 'A tiempo',
  2.5: 'Re-agendada con tiempo',
  2: 'Fuera de tiempo',
  1: 'Re-agendada a destiempo',
  0: 'No realizada'
}

export default function LlamadasPage() {
  const [calls, setCalls] = useState<Call[]>([
    {
      id: '1',
      leaderId: 'leader1',
      leaderName: 'María González',
      seniorId: 'senior1',
      seniorName: 'Carlos Rodríguez',
      scheduledDate: new Date(),
      status: 'scheduled',
      score: 0,
      rescheduledCount: 0
    },
    {
      id: '2',
      leaderId: 'leader2',
      leaderName: 'Ana Martínez',
      seniorId: 'senior1',
      seniorName: 'Carlos Rodríguez',
      scheduledDate: addDays(new Date(), 1),
      status: 'completed',
      score: 3,
      notes: 'Excelente progreso en metas personales',
      rescheduledCount: 0
    },
    {
      id: '3',
      leaderId: 'leader3',
      leaderName: 'Luis Hernández',
      seniorId: 'senior2',
      seniorName: 'Patricia López',
      scheduledDate: addDays(new Date(), -2),
      status: 'missed',
      score: 0,
      rescheduledCount: 1
    }
  ])

  const [showAddCall, setShowAddCall] = useState(false)
  const [newCall, setNewCall] = useState({
    leaderId: '',
    leaderName: '',
    seniorId: '',
    seniorName: '',
    scheduledDate: new Date(),
    notes: ''
  })

  // const [editingCall, setEditingCall] = useState<string | null>(null)

  const handleAddCall = () => {
    if (!newCall.leaderName || !newCall.seniorName) return

    const call: Call = {
      id: Date.now().toString(),
      ...newCall,
      status: 'scheduled',
      score: 0,
      rescheduledCount: 0
    }

    setCalls([...calls, call])
    setNewCall({
      leaderId: '',
      leaderName: '',
      seniorId: '',
      seniorName: '',
      scheduledDate: new Date(),
      notes: ''
    })
    setShowAddCall(false)
  }

  const handleUpdateCallStatus = (callId: string, status: Call['status'], score?: number) => {
    setCalls(calls.map(call => 
      call.id === callId 
        ? { ...call, status, score: score ?? call.score }
        : call
    ))
  }

  const handleRescheduleCall = (callId: string, newDate: Date) => {
    setCalls(calls.map(call => 
      call.id === callId 
        ? { 
            ...call, 
            scheduledDate: newDate, 
            status: 'scheduled',
            rescheduledCount: call.rescheduledCount + 1
          }
        : call
    ))
  }

  const completedCalls = calls.filter(call => call.status === 'completed').length
  const totalCalls = calls.length
  const averageScore = completedCalls > 0 
    ? calls
        .filter(call => call.status === 'completed')
        .reduce((sum, call) => sum + call.score, 0) / completedCalls
    : 0

  const upcomingCalls = calls.filter(call => 
    call.status === 'scheduled' && isAfter(call.scheduledDate, new Date())
  )

  const overdueCalls = calls.filter(call => 
    call.status === 'scheduled' && isBefore(call.scheduledDate, new Date())
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Llamadas</h1>
        <p className="text-gray-600 mt-2">
          Programa y gestiona las llamadas de seguimiento con los líderes
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Llamadas</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCalls}</div>
            <p className="text-xs text-muted-foreground">
              {totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0}% completado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntaje Promedio</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              De 3.0 máximo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingCalls.length}</div>
            <p className="text-xs text-muted-foreground">
              Por realizar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Call Button */}
      <div className="mb-6">
        <Button onClick={() => setShowAddCall(true)} className="bg-primary-600 hover:bg-primary-700">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Llamada
        </Button>
      </div>

      {/* Add Call Form */}
      {showAddCall && (
        <Card className="mb-6 border-primary-200">
          <CardHeader>
            <CardTitle>Programar Nueva Llamada</CardTitle>
            <CardDescription>
              Establece una nueva llamada de seguimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Líder
                </label>
                <input
                  type="text"
                  value={newCall.leaderName}
                  onChange={(e) => setNewCall({...newCall, leaderName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Nombre del líder"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senior
                </label>
                <input
                  type="text"
                  value={newCall.seniorName}
                  onChange={(e) => setNewCall({...newCall, seniorName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Nombre del senior"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha y Hora
                </label>
                <input
                  type="datetime-local"
                  value={format(newCall.scheduledDate, "yyyy-MM-dd'T'HH:mm")}
                  onChange={(e) => setNewCall({...newCall, scheduledDate: new Date(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas (opcional)
                </label>
                <input
                  type="text"
                  value={newCall.notes}
                  onChange={(e) => setNewCall({...newCall, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Notas adicionales"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddCall(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAddCall}
                disabled={!newCall.leaderName || !newCall.seniorName}
              >
                Programar Llamada
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Calls Alert */}
      {overdueCalls.length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">
                  {overdueCalls.length} llamada{overdueCalls.length > 1 ? 's' : ''} vencida{overdueCalls.length > 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-red-600">
                  Tienes llamadas pendientes que debieron realizarse
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calls List */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Todas las Llamadas
          </h2>
          <div className="space-y-4">
            {calls.map((call) => {
              const StatusIcon = callStatuses[call.status].icon
              return (
                <Card key={call.id} className={`${
                  call.status === 'scheduled' && isBefore(call.scheduledDate, new Date()) 
                    ? 'border-red-200 bg-red-50' 
                    : ''
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <StatusIcon className="h-5 w-5 text-gray-400" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {call.leaderName} - {call.seniorName}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${callStatuses[call.status].color}`}>
                            {callStatuses[call.status].label}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>{format(call.scheduledDate, 'dd MMM yyyy, HH:mm', { locale: es })}</span>
                          </div>
                          
                          {call.status === 'completed' && (
                            <div className="flex items-center space-x-2">
                              <Star className="h-4 w-4" />
                              <span>{scoreLabels[call.score as keyof typeof scoreLabels]} ({call.score} pts)</span>
                            </div>
                          )}
                          
                          {call.rescheduledCount > 0 && (
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="h-4 w-4" />
                              <span>Re-agendada {call.rescheduledCount} vez{call.rescheduledCount > 1 ? 'es' : ''}</span>
                            </div>
                          )}
                        </div>

                        {call.notes && (
                          <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            <strong>Notas:</strong> {call.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        {call.status === 'scheduled' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateCallStatus(call.id, 'completed', 3)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              A tiempo
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateCallStatus(call.id, 'completed', 2)}
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              Fuera de tiempo
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateCallStatus(call.id, 'missed')}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              No realizada
                            </Button>
                          </>
                        )}
                        
                        {call.status === 'missed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newDate = new Date()
                              newDate.setDate(newDate.getDate() + 1)
                              handleRescheduleCall(call.id, newDate)
                            }}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Re-agendar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {calls.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay llamadas programadas
            </h3>
            <p className="text-gray-500 mb-4">
              Comienza programando tu primera llamada de seguimiento
            </p>
            <Button onClick={() => setShowAddCall(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Programar Primera Llamada
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
