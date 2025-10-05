-- =====================================================
-- DIAGNÓSTICO DETALLADO DE COLORES DE LLAMADAS
-- =====================================================
-- Este script nos mostrará exactamente qué está pasando
-- con cada llamada y por qué se está asignando el color incorrecto

-- 1. Verificar todas las llamadas pendientes con detalles
SELECT 
  c.id as call_id,
  c.scheduled_date,
  c.scheduled_date::DATE as scheduled_date_only,
  CURRENT_DATE as current_date,
  c.evaluation_status,
  -- Comparación directa
  (c.scheduled_date::DATE > CURRENT_DATE) as is_future_date,
  (c.scheduled_date::DATE <= CURRENT_DATE) as is_past_or_today,
  -- Lógica de colores paso a paso
  CASE 
    WHEN c.evaluation_status = 'pending' AND c.scheduled_date::DATE > CURRENT_DATE THEN 'DEBERÍA SER GRIS'
    WHEN c.evaluation_status = 'pending' AND c.scheduled_date::DATE <= CURRENT_DATE THEN 'DEBERÍA SER AZUL'
    ELSE 'OTRO COLOR'
  END as color_esperado,
  -- Color que se está asignando actualmente
  CASE 
    WHEN c.evaluation_status = 'on_time' THEN 'green'
    WHEN c.evaluation_status = 'late' THEN 'yellow'
    WHEN c.evaluation_status = 'rescheduled' THEN 'yellow'
    WHEN c.evaluation_status = 'not_done' THEN 'red'
    WHEN c.evaluation_status = 'pending' AND c.scheduled_date::DATE > CURRENT_DATE THEN 'gray'
    WHEN c.evaluation_status = 'pending' AND c.scheduled_date::DATE <= CURRENT_DATE THEN 'blue'
    ELSE 'gray'
  END as color_asignado,
  p.name as senior_name
FROM calls c
JOIN profiles p ON p.id = c.supervisor_id
WHERE c.evaluation_status = 'pending'
ORDER BY c.scheduled_date;

-- 2. Verificar si hay algún problema con el tipo de datos
SELECT 
  'Verificación de tipos de datos' as tipo,
  CURRENT_DATE as current_date_type,
  pg_typeof(CURRENT_DATE) as current_date_type_name,
  (SELECT scheduled_date::DATE FROM calls LIMIT 1) as sample_scheduled_date,
  pg_typeof((SELECT scheduled_date::DATE FROM calls LIMIT 1)) as scheduled_date_type_name;

-- 3. Verificar comparaciones específicas
SELECT 
  'Comparaciones específicas' as tipo,
  CURRENT_DATE as fecha_actual,
  (CURRENT_DATE + 1) as fecha_mañana,
  (CURRENT_DATE + 1) > CURRENT_DATE as comparacion_futura,
  (CURRENT_DATE - 1) > CURRENT_DATE as comparacion_pasada;
