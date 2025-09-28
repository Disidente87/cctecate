-- Script para corregir todas las políticas de profiles

-- 0. Asegurar que todas las funciones helper existen
CREATE OR REPLACE FUNCTION is_user_leader()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'lider'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_user_master_senior()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'master_senior'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Eliminar todas las políticas problemáticas
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Master Seniors can view assigned users" ON profiles;
DROP POLICY IF EXISTS "Master_senior can view assigned users" ON profiles;

-- 2. Crear políticas específicas y correctas
-- Usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Líderes pueden ver perfiles de seniors
CREATE POLICY "Leaders can view senior profiles" ON profiles
  FOR SELECT USING (
    role = 'senior' AND is_user_leader()
  );

-- Seniors pueden ver a sus líderes asignados
CREATE POLICY "Seniors can view assigned leaders" ON profiles
  FOR SELECT USING (
    role = 'lider' AND supervisor_id = auth.uid()
  );

-- Master Seniors pueden ver a sus usuarios asignados (líderes y seniors)
CREATE POLICY "Master Seniors can view assigned users" ON profiles
  FOR SELECT USING (
    supervisor_id = auth.uid() 
    AND is_user_master_senior()
    AND role IN ('lider', 'senior')
  );

-- Admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_user_admin());

-- 3. Verificar que las políticas se crearon correctamente
SELECT 
  'final_policies' as test_type,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles'
  AND cmd = 'SELECT'
ORDER BY policyname;
