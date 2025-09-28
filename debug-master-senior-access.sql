-- Script para diagnosticar el acceso de master_senior

-- 1. Verificar el usuario actual y su rol
SELECT 
  'current_user_info' as test_type,
  auth.uid() as user_id,
  p.name,
  p.email,
  p.role,
  p.supervisor_id
FROM profiles p
WHERE p.id = auth.uid();

-- 2. Verificar si la función is_user_master_senior funciona
SELECT 
  'function_test' as test_type,
  is_user_master_senior() as is_master_senior;

-- 3. Verificar usuarios que deberían ser visibles para el master_senior actual
SELECT 
  'assigned_users' as test_type,
  p.id,
  p.name,
  p.email,
  p.role,
  p.supervisor_id,
  (p.supervisor_id = auth.uid()) as has_correct_supervisor,
  (p.role IN ('lider', 'senior')) as has_correct_role
FROM profiles p
WHERE p.supervisor_id = auth.uid()
  AND p.role IN ('lider', 'senior');

-- 4. Verificar todas las políticas de profiles para master_senior
SELECT 
  'policies' as test_type,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles'
  AND (policyname LIKE '%Master%' OR policyname LIKE '%master%')
ORDER BY policyname;

-- 5. Probar una consulta directa que debería funcionar
SELECT 
  'direct_query' as test_type,
  COUNT(*) as total_users
FROM profiles p
WHERE p.supervisor_id = auth.uid()
  AND p.role IN ('lider', 'senior');

-- 6. Verificar si hay conflictos con otras políticas
SELECT 
  'all_policies' as test_type,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles'
  AND cmd = 'SELECT'
ORDER BY policyname;
