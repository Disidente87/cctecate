'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Phone } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { CallCalendarItem } from '@/types'
import { supabase } from '@/lib/supabase'
import { getLocalTimeFromTimestamp } from '@/utils/timezone'

interface CallCalendarProps {
  userId: string
  onCallClick: (call: CallCalendarItem) => void
}

const colorClasses = {
  green: 'bg-green-500 text-white',
  yellow: 'bg-yellow-500 text-white',
  red: 'bg-red-500 text-white',
  blue: 'bg-blue-500 text-white',
  gray: 'bg-gray-400 text-white'
}

export function CallCalendar({ userId, onCallClick }: CallCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarData, setCalendarData] = useState<CallCalendarItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadCalendarData = async () => {
    setIsLoading(true)
    try {
      // Usar startOfWeek y endOfWeek para incluir días de semanas anteriores y siguientes
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Lunes como primer día
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 }) // Lunes como primer día
      
      const { data, error } = await supabase.rpc('get_calls_calendar_view', {
        p_leader_id: userId,
        p_start_date: format(calendarStart, 'yyyy-MM-dd'),
        p_end_date: format(calendarEnd, 'yyyy-MM-dd')
      })

      if (error) {
        console.error('Error loading call calendar:', error)
        return
      }

      setCalendarData(data || [])
    } catch (error) {
      console.error('Error loading call calendar:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      loadCalendarData()
    }
  }, [userId, currentDate])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Lunes como primer día
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 }) // Lunes como primer día
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getCallsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return calendarData.filter(call => call.date === dateStr)
  }

  // Hora local desde UTC
  const getTimeFromTimestamp = (timestamp: string) => getLocalTimeFromTimestamp(timestamp)

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Calendario de Llamadas
            </CardTitle>
            <CardDescription>
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
              disabled={isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
              disabled={isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-gray-500">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="p-2">{day}</div>
              ))}
            </div>

            {/* Calendario */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const calls = getCallsForDate(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isToday = isSameDay(day, new Date())

                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      min-h-[80px] p-1 border border-gray-200 rounded
                      ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                      ${isToday ? 'ring-2 ring-blue-500' : ''}
                    `}
                  >
                    <div className="text-sm font-medium mb-1">
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {calls.map((call, index) => (
                        <button
                          key={`${call.call_id}-${index}`}
                          onClick={() => onCallClick(call)}
                          className={`
                            w-full text-xs p-1 rounded text-left truncate
                            ${colorClasses[call.color_code as keyof typeof colorClasses] || 'bg-gray-400 text-white'}
                            hover:opacity-80 transition-opacity
                          `}
                          title={`${call.senior_name} - ${getTimeFromTimestamp(call.scheduled_time)}`}
                        >
                          <div className="truncate">
                            {getTimeFromTimestamp(call.scheduled_time)}
                          </div>
                          <div className="truncate text-xs opacity-90">
                            {call.senior_name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span>A Tiempo</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-500"></div>
                <span>Fuera de Tiempo / Reprogramada</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span>No Realizada</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span>Pendiente de Evaluación</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-400"></div>
                <span>Futura</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
