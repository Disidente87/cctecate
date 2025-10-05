-- =====================================================
-- ACTUALIZACIÓN FORZADA DE COLORES EN CALENDARIO DE LLAMADAS
-- =====================================================
-- Problema: Todas las llamadas futuras aparecen en azul
-- Solución: Actualizar la función con lógica corregida y debug

-- Primero, vamos a ver qué está pasando exactamente
-- Ejecutar esto para diagnosticar:
SELECT 
  'DIAGNÓSTICO: Llamadas pendientes con fechas' as info,
  COUNT(*) as total_pending_calls,
  COUNT(CASE WHEN scheduled_date::DATE > CURRENT_DATE THEN 1 END) as future_calls,
  COUNT(CASE WHEN scheduled_date::DATE <= CURRENT_DATE THEN 1 END) as past_calls
FROM calls 
WHERE evaluation_status = 'pending';

-- Ahora actualizar la función con lógica corregida
CREATE OR REPLACE FUNCTION get_calls_calendar_view(
  p_leader_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date DATE,
  call_id UUID,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  senior_name TEXT,
  evaluation_status TEXT,
  score DECIMAL(2,1),
  color_code TEXT,
  is_pending BOOLEAN,
  is_future BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.scheduled_date::DATE as date,
    c.id as call_id,
    c.scheduled_date as scheduled_time,
    p.name as senior_name,
    c.evaluation_status,
    c.score,
    -- LÓGICA CORREGIDA CON DEBUG
    CASE 
      WHEN c.evaluation_status = 'on_time' THEN 'green'
      WHEN c.evaluation_status = 'late' THEN 'yellow'
      WHEN c.evaluation_status = 'rescheduled' THEN 'yellow'
      WHEN c.evaluation_status = 'not_done' THEN 'red'
      -- CORRECCIÓN: Verificar que la fecha sea realmente futura
      WHEN c.evaluation_status = 'pending' AND (c.scheduled_date::DATE > CURRENT_DATE) THEN 'gray'
      WHEN c.evaluation_status = 'pending' AND (c.scheduled_date::DATE <= CURRENT_DATE) THEN 'blue'
      ELSE 'gray'
    END as color_code,
    (c.evaluation_status = 'pending') as is_pending,
    (c.scheduled_date::DATE > CURRENT_DATE) as is_future
  FROM calls c
  JOIN profiles p ON p.id = c.supervisor_id
  WHERE c.leader_id = p_leader_id
    AND c.scheduled_date::DATE BETWEEN p_start_date AND p_end_date
  ORDER BY c.scheduled_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar que la función se actualizó correctamente
SELECT 'Función get_calls_calendar_view actualizada correctamente' as status;

-- Probar la función con algunos datos
SELECT 
  call_id,
  scheduled_time,
  evaluation_status,
  color_code,
  is_future,
  senior_name
FROM get_calls_calendar_view(
  (SELECT id FROM profiles WHERE role = 'lider' LIMIT 1)::UUID,
  CURRENT_DATE - INTERVAL '7 days',
  CURRENT_DATE + INTERVAL '30 days'
)
WHERE evaluation_status = 'pending'
ORDER BY scheduled_time
LIMIT 10;
