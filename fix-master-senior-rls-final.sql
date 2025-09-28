-- Script final para corregir políticas RLS de master_senior

-- 1. Eliminar políticas problemáticas
DROP POLICY IF EXISTS "Master Seniors can view assigned users" ON profiles;
DROP POLICY IF EXISTS "Master_senior can view assigned users" ON profiles;

-- 2. Crear política simplificada que no dependa de auth.uid() en la función
CREATE POLICY "Master Seniors can view assigned users" ON profiles
  FOR SELECT USING (
    supervisor_id = auth.uid() 
    AND role IN ('lider', 'senior')
  );

-- 3. Verificar que la política se creó correctamente
SELECT 
  'final_policy' as test_type,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles'
  AND policyname = 'Master Seniors can view assigned users';

-- 4. Probar la consulta directa que usa el frontend
SELECT 
  'frontend_query_test' as test_type,
  id,
  name,
  email,
  generation,
  role
FROM profiles 
WHERE supervisor_id = '1d7011ea-aaf4-4594-ad7f-b70705613b8e'
  AND role IN ('lider', 'senior')
ORDER BY role, name;
