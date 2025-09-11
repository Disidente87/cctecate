/**
 * Utilidades para manejo de zonas horarias
 */

/**
 * Obtiene la zona horaria del usuario
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Convierte una hora UTC a la zona horaria local del usuario
 * @param utcTime - Hora en formato "HH:MM" (UTC)
 * @returns Hora en formato "HH:MM" (zona local)
 */
export function convertUTCToLocal(utcTime: string): string {
  if (!utcTime) return utcTime
  
  // Crear una fecha de hoy con la hora UTC
  const today = new Date()
  const [hours, minutes] = utcTime.split(':')
  const utcDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours), parseInt(minutes))
  
  // Convertir a zona horaria local
  const localDate = new Date(utcDate.toLocaleString("en-US", { timeZone: getUserTimezone() }))
  
  // Formatear como HH:MM
  const localHours = String(localDate.getHours()).padStart(2, '0')
  const localMinutes = String(localDate.getMinutes()).padStart(2, '0')
  
  return `${localHours}:${localMinutes}`
}

/**
 * Convierte una hora local a UTC
 * @param localTime - Hora en formato "HH:MM" (zona local)
 * @returns Hora en formato "HH:MM" (UTC)
 */
export function convertLocalToUTC(localTime: string): string {
  if (!localTime) return localTime
  
  // Crear una fecha de hoy con la hora local
  const today = new Date()
  const [hours, minutes] = localTime.split(':')
  const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours), parseInt(minutes))
  
  // Convertir a UTC (RESTAR el offset, no sumar)
  const utcDate = new Date(localDate.getTime()  - (localDate.getTimezoneOffset() * 60000))
  
  // Formatear como HH:MM
  const utcHours = String(utcDate.getUTCHours()).padStart(2, '0')
  const utcMinutes = String(utcDate.getUTCMinutes()).padStart(2, '0')
  
  return `${utcHours}:${utcMinutes}`
}

/**
 * Convierte un timestamp de la base de datos a hora local
 * @param timestamp - Timestamp de la base de datos
 * @returns Hora en formato "HH:MM" (zona local)
 */
export function getLocalTimeFromTimestamp(timestamp: string): string {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const localHours = String(date.getHours()).padStart(2, '0')
  const localMinutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${localHours}:${localMinutes}`
}

/**
 * Obtiene información de la zona horaria del usuario
 */
export function getTimezoneInfo() {
  const timezone = getUserTimezone()
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const offsetHours = Math.floor(Math.abs(offset) / 60)
  const offsetMinutes = Math.abs(offset) % 60
  const offsetSign = offset <= 0 ? '+' : '-'
  const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`
  
  return {
    timezone,
    offset: offsetString,
    offsetMinutes: offset
  }
}
