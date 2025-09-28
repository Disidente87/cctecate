-- Agregar políticas RLS para que administradores puedan gestionar actividades
-- Ejecutar en el SQL Editor de Supabase

-- Política para que administradores puedan ver todas las actividades
CREATE POLICY "Admins can view all activities" ON activities
    FOR SELECT USING (is_user_admin());

-- Política para que administradores puedan insertar actividades
CREATE POLICY "Admins can insert activities" ON activities
    FOR INSERT WITH CHECK (is_user_admin());

-- Política para que administradores puedan actualizar actividades
CREATE POLICY "Admins can update activities" ON activities
    FOR UPDATE USING (is_user_admin());

-- Política para que administradores puedan eliminar actividades
CREATE POLICY "Admins can delete activities" ON activities
    FOR DELETE USING (is_user_admin());

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'activities' 
ORDER BY policyname;
