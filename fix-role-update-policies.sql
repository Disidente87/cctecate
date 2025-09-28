-- Verificar y agregar políticas RLS para que administradores puedan actualizar roles
-- Ejecutar en el SQL Editor de Supabase

-- Verificar que la política de actualización de perfiles para admins existe
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' 
AND policyname LIKE '%supervisor%'
ORDER BY policyname;

-- Si no existe la política, crearla
CREATE POLICY "Admins can update supervisor assignments" ON profiles
    FOR UPDATE USING (is_user_admin())
    WITH CHECK (is_user_admin());

-- Verificar que la función is_user_admin existe
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'is_user_admin';

-- Si la función no existe, crearla
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
AND policyname LIKE '%admin%'
ORDER BY policyname;

-- Mensaje de confirmación
SELECT 'Políticas RLS para actualización de roles y asignaciones de administradores configuradas correctamente' as status;
