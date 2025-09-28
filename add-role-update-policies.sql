-- Agregar políticas RLS específicas para actualización de roles por administradores
-- Ejecutar en el SQL Editor de Supabase

-- Verificar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' 
AND cmd = 'UPDATE'
ORDER BY policyname;

-- Eliminar política existente si existe (para recrearla)
DROP POLICY IF EXISTS "Admins can update supervisor assignments" ON profiles;

-- Crear política completa para que admins puedan actualizar perfiles (incluyendo roles y generaciones)
CREATE POLICY "Admins can update all profile fields" ON profiles
    FOR UPDATE USING (is_user_admin())
    WITH CHECK (is_user_admin());

-- Verificar que la función is_user_admin existe
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

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' 
AND cmd = 'UPDATE'
ORDER BY policyname;

-- Test: Verificar que el usuario actual es admin
SELECT 
  auth.uid() as current_user_id,
  role as current_user_role,
  is_user_admin() as is_admin
FROM profiles 
WHERE id = auth.uid();

-- Mensaje de confirmación
SELECT 'Políticas RLS para actualización completa de perfiles (roles, generaciones y asignaciones) por administradores configuradas' as status;
