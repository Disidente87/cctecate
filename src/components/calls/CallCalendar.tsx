'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Phone } from 'lucide-react'
import { format, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
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
  const [anchorDate, setAnchorDate] = useState(new Date())
  const [calendarData, setCalendarData] = useState<CallCalendarItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [autoAnchored, setAutoAnchored] = useState(false)

  const loadCalendarData = async () => {
    setIsLoading(true)
    try {
      // Ventana fija de 7 semanas (Lunes a Domingo) basada en anchorDate
      const windowStart = startOfWeek(anchorDate, { weekStartsOn: 1 })
      const windowEnd = endOfWeek(addWeeks(windowStart, 6), { weekStartsOn: 1 })
      
      const { data, error } = await supabase.rpc('get_calls_calendar_view', {
        p_leader_id: userId,
        p_start_date: format(windowStart, 'yyyy-MM-dd'),
        p_end_date: format(windowEnd, 'yyyy-MM-dd')
      })

      if (error) {
        console.error('Error loading call calendar:', error)
        return
      }

      setCalendarData(data || [])
      // Ajustar la ventana para que termine en la última semana con llamadas (solo una vez)
      if (!autoAnchored && data && data.length > 0) {
        let maxDateStr = ''
        let minDateStr = ''
        for (const item of data as any[]) {
          if (!maxDateStr || item.date > maxDateStr) maxDateStr = item.date
          if (!minDateStr || item.date < minDateStr) minDateStr = item.date
        }
        if (maxDateStr) {
          const [y, m, d] = maxDateStr.split('-').map((v: string) => parseInt(v, 10))
          const maxDate = new Date(y, m - 1, d)
          // Calcular inicio de ventana para que el final coincida con la semana de maxDate
          const targetStart = startOfWeek(addWeeks(maxDate, -6), { weekStartsOn: 1 })
          const currentStart = startOfWeek(anchorDate, { weekStartsOn: 1 })
          if (currentStart.getTime() !== targetStart.getTime()) {
            setAnchorDate(targetStart)
          }
          setAutoAnchored(true)
        }
      }
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
  }, [userId, anchorDate])

  const calendarStart = startOfWeek(anchorDate, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(addWeeks(calendarStart, 6), { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getCallsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return calendarData.filter(call => call.date === dateStr)
  }

  // Hora local desde UTC
  const getTimeFromTimestamp = (timestamp: string) => getLocalTimeFromTimestamp(timestamp)

  const navigateWindow = (direction: 'prev' | 'next') => {
    setAnchorDate(prev => direction === 'prev' ? subWeeks(prev, 7) : addWeeks(prev, 7))
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
              {`${format(calendarStart, 'dd MMM', { locale: es })} - ${format(calendarEnd, 'dd MMM yyyy', { locale: es })}`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWindow('prev')}
              disabled={isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWindow('next')}
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
                const isCurrentMonth = isSameMonth(day, anchorDate)
                const isToday = isSameDay(day, new Date())

                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      min-h-[60px] p-1 border border-gray-200 rounded
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
