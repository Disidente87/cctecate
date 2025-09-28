-- Debug y verificar políticas RLS para actualización de roles
-- Ejecutar en el SQL Editor de Supabase

-- Verificar políticas existentes para la tabla profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' 
AND cmd = 'UPDATE'
ORDER BY policyname;

-- Verificar que la función is_user_admin existe y funciona
SELECT is_user_admin() as current_user_is_admin;

-- Verificar el rol del usuario actual
SELECT role FROM profiles WHERE id = auth.uid();

-- Crear política específica para actualización de roles por administradores
CREATE POLICY "Admins can update user roles" ON profiles
    FOR UPDATE USING (is_user_admin())
    WITH CHECK (is_user_admin());

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' 
AND policyname LIKE '%role%'
ORDER BY policyname;

-- Test: Intentar actualizar un rol (solo para debug)
-- UPDATE profiles SET role = 'senior' WHERE id = 'test-id' AND is_user_admin();

-- Mensaje de confirmación
SELECT 'Políticas RLS para actualización de roles verificadas y configuradas' as status;
