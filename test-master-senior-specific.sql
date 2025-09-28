-- Script específico para probar master_senior 1d7011ea-aaf4-4594-ad7f-b70705613b8e

-- 1. Verificar que el master_senior existe y tiene el rol correcto
SELECT 
  'master_senior_info' as test_type,
  id,
  name,
  email,
  role,
  generation
FROM profiles 
WHERE id = '1d7011ea-aaf4-4594-ad7f-b70705613b8e';

-- 2. Probar la función RPC directamente
SELECT 
  'rpc_result' as test_type,
  id,
  name,
  email,
  generation,
  role
FROM get_users_for_supervisor('1d7011ea-aaf4-4594-ad7f-b70705613b8e');

-- 3. Verificar usuarios asignados directamente
SELECT 
  'direct_assigned_users' as test_type,
  id,
  name,
  email,
  generation,
  role,
  supervisor_id
FROM profiles 
WHERE supervisor_id = '1d7011ea-aaf4-4594-ad7f-b70705613b8e'
  AND role IN ('lider', 'senior')
ORDER BY role, name;

-- 4. Verificar si hay algún problema con la función is_user_master_senior
SELECT 
  'function_test' as test_type,
  is_user_master_senior() as is_master_senior,
  auth.uid() as current_user_id;
