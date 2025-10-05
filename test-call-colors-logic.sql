-- =====================================================
-- PRUEBA DE LÓGICA DE COLORES PASO A PASO
-- =====================================================

-- Verificar el estado actual de las llamadas
SELECT 
  'Estado actual de llamadas pendientes' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN scheduled_date::DATE > CURRENT_DATE THEN 1 END) as futuras,
  COUNT(CASE WHEN scheduled_date::DATE <= CURRENT_DATE THEN 1 END) as pasadas_o_hoy
FROM calls 
WHERE evaluation_status = 'pending';

-- Verificar algunas llamadas específicas
SELECT 
  c.id,
  c.scheduled_date,
  c.scheduled_date::DATE as fecha_solo,
  CURRENT_DATE as hoy,
  c.evaluation_status,
  -- Prueba cada condición por separado
  (c.evaluation_status = 'pending') as es_pending,
  (c.scheduled_date::DATE > CURRENT_DATE) as es_futura,
  (c.scheduled_date::DATE <= CURRENT_DATE) as es_pasada_o_hoy,
  -- Combinaciones
  (c.evaluation_status = 'pending' AND c.scheduled_date::DATE > CURRENT_DATE) as condicion_gris,
  (c.evaluation_status = 'pending' AND c.scheduled_date::DATE <= CURRENT_DATE) as condicion_azul,
  -- Color que debería asignarse
  CASE 
    WHEN c.evaluation_status = 'pending' AND c.scheduled_date::DATE > CURRENT_DATE THEN 'GRAY'
    WHEN c.evaluation_status = 'pending' AND c.scheduled_date::DATE <= CURRENT_DATE THEN 'BLUE'
    ELSE 'OTHER'
  END as color_esperado
FROM calls c
WHERE c.evaluation_status = 'pending'
ORDER BY c.scheduled_date
LIMIT 5;

-- Verificar si hay algún problema con la función actual
-- Llamar a la función y ver qué devuelve
SELECT 
  'Resultado de la función actual' as tipo,
  call_id,
  scheduled_time,
  evaluation_status,
  color_code,
  is_future
FROM get_calls_calendar_view(
  (SELECT id FROM profiles WHERE role = 'lider' LIMIT 1)::UUID,
  CURRENT_DATE - INTERVAL '7 days',
  CURRENT_DATE + INTERVAL '30 days'
)
WHERE evaluation_status = 'pending'
ORDER BY scheduled_time
LIMIT 5;
