-- Script para probar la función get_users_for_supervisor con master_senior

-- 1. Verificar que la función existe
SELECT 
  'function_exists' as test_type,
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_name = 'get_users_for_supervisor'
  AND routine_schema = 'public';

-- 2. Probar la función con un master_senior específico
-- (Reemplaza con el ID real de un master_senior que tenga usuarios asignados)
SELECT 
  'rpc_test' as test_type,
  id,
  name,
  email,
  generation,
  role
FROM get_users_for_supervisor('REPLACE_WITH_MASTER_SENIOR_ID');

-- 3. Verificar usuarios asignados directamente
SELECT 
  'direct_query' as test_type,
  p.id,
  p.name,
  p.email,
  p.generation,
  p.role,
  p.supervisor_id
FROM profiles p
WHERE p.supervisor_id = 'REPLACE_WITH_MASTER_SENIOR_ID'
  AND p.role IN ('lider', 'senior')
ORDER BY p.role, p.name;
