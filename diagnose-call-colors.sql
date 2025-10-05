-- =====================================================
-- DIAGNÓSTICO DE COLORES EN CALENDARIO DE LLAMADAS
-- =====================================================
-- Este script nos ayudará a entender por qué las llamadas futuras
-- aparecen en azul en lugar de gris

-- Verificar algunas llamadas de ejemplo con sus fechas y estados
SELECT 
  c.id,
  c.scheduled_date,
  c.scheduled_date::DATE as scheduled_date_only,
  CURRENT_DATE as current_date,
  (c.scheduled_date::DATE > CURRENT_DATE) as is_future_date,
  c.evaluation_status,
  CASE 
    WHEN c.evaluation_status = 'on_time' THEN 'green'
    WHEN c.evaluation_status = 'late' THEN 'yellow'
    WHEN c.evaluation_status = 'rescheduled' THEN 'yellow'
    WHEN c.evaluation_status = 'not_done' THEN 'red'
    WHEN c.evaluation_status = 'pending' AND c.scheduled_date::DATE > CURRENT_DATE THEN 'gray'
    WHEN c.evaluation_status = 'pending' AND c.scheduled_date::DATE <= CURRENT_DATE THEN 'blue'
    ELSE 'gray'
  END as calculated_color,
  p.name as senior_name
FROM calls c
JOIN profiles p ON p.id = c.supervisor_id
WHERE c.evaluation_status = 'pending'
ORDER BY c.scheduled_date
LIMIT 10;

-- Verificar la diferencia de tiempo entre CURRENT_DATE y las fechas de llamadas
SELECT 
  'Fecha actual del servidor' as tipo,
  CURRENT_DATE as fecha,
  CURRENT_TIMESTAMP as timestamp_completo
UNION ALL
SELECT 
  'Ejemplo de llamada futura' as tipo,
  (CURRENT_DATE + INTERVAL '1 day')::DATE as fecha,
  (CURRENT_TIMESTAMP + INTERVAL '1 day') as timestamp_completo
UNION ALL
SELECT 
  'Ejemplo de llamada pasada' as tipo,
  (CURRENT_DATE - INTERVAL '1 day')::DATE as fecha,
  (CURRENT_TIMESTAMP - INTERVAL '1 day') as timestamp_completo;
