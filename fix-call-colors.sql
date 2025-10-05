-- =====================================================
-- CORRECCIÓN DE COLORES EN CALENDARIO DE LLAMADAS
-- =====================================================
-- Problema: Las llamadas futuras y pendientes aparecen ambas en azul
-- cuando las futuras deberían aparecer en gris
-- 
-- Solución: Corregir la lógica de asignación de colores

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
    -- Códigos de color según el estado - CORREGIDO
    CASE 
      WHEN c.evaluation_status = 'on_time' THEN 'green'
      WHEN c.evaluation_status = 'late' THEN 'yellow'
      WHEN c.evaluation_status = 'rescheduled' THEN 'yellow'
      WHEN c.evaluation_status = 'not_done' THEN 'red'
      -- CORRECCIÓN: Llamadas futuras (pendientes) = gris
      WHEN c.evaluation_status = 'pending' AND c.scheduled_date::DATE > CURRENT_DATE THEN 'gray'
      -- CORRECCIÓN: Llamadas pasadas (pendientes) = azul
      WHEN c.evaluation_status = 'pending' AND c.scheduled_date::DATE <= CURRENT_DATE THEN 'blue'
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

-- Verificar la función con algunos datos de prueba
SELECT 
  'Función get_calls_calendar_view actualizada correctamente' as status,
  'Llamadas futuras (pending) ahora aparecerán en gris' as cambio_1,
  'Llamadas pasadas (pending) aparecerán en azul' as cambio_2;
