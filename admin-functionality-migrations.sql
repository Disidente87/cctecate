-- =====================================================
-- MIGRACIONES PARA FUNCIONALIDADES DE ADMIN
-- =====================================================
-- Este archivo contiene todas las modificaciones necesarias para implementar
-- las funcionalidades de admin en el sistema CC Tecate
-- 
-- ESTRATEGIA: Usar solo la columna supervisor_id para ambos casos:
-- - supervisor_id apunta a un senior → relación senior-líder
-- - supervisor_id apunta a un admin → relación admin-líder/admin-senior
-- 
-- Ejecutar en el SQL Editor de Supabase en el siguiente orden:
-- 1. Nuevas funciones RPC
-- 2. Políticas RLS
-- =====================================================

-- =====================================================
-- 1. LIMPIEZA (si existe admin_id, eliminarla)
-- =====================================================

-- Renombrar columna senior_id a supervisor_id para mayor claridad
ALTER TABLE profiles RENAME COLUMN senior_id TO supervisor_id;
DROP INDEX IF EXISTS idx_profiles_senior_id;
CREATE INDEX idx_profiles_supervisor_id ON profiles(supervisor_id);

-- =====================================================
-- 2. NUEVAS FUNCIONES RPC
-- =====================================================

-- Función unificada para obtener usuarios asignados a un supervisor (senior o admin)
CREATE OR REPLACE FUNCTION get_users_for_supervisor(p_supervisor_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  generation TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, p.name, p.email, p.generation, p.role
  FROM profiles p
  WHERE p.supervisor_id = p_supervisor_id
  ORDER BY p.role, p.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_users_for_supervisor IS 'Lista los usuarios (líderes y seniors) asignados a un supervisor (senior o admin)';

-- Función para obtener el supervisor de un usuario (senior o admin)
CREATE OR REPLACE FUNCTION get_user_supervisor(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  generation TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id, s.name, s.email, s.generation, s.role
  FROM profiles p
  JOIN profiles s ON s.id = p.supervisor_id
  WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_supervisor IS 'Obtiene el supervisor (senior o admin) de un usuario específico';

-- =====================================================
-- 3. POLÍTICAS RLS PARA ADMIN
-- =====================================================

-- Política para que los admins puedan ver a sus usuarios asignados (usando supervisor_id)
CREATE POLICY "Admins can view assigned users" ON profiles
    FOR SELECT USING (
        supervisor_id = auth.uid() AND 
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- Política para que los admins puedan ver todos los perfiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- Admins pueden ver todas las metas
CREATE POLICY "Admins can view all goals" ON goals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Admins pueden ver todos los mecanismos
CREATE POLICY "Admins can view all mechanisms" ON mechanisms
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Admins pueden ver todas las completions de actividades
CREATE POLICY "Admins can view all activity completions" ON user_activity_completions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Admins pueden ver todas las excepciones de mecanismos
CREATE POLICY "Admins can view all mechanism exceptions" ON mechanism_schedule_exceptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Admins pueden ver todas las completions de mecanismos
CREATE POLICY "Admins can view all mechanism completions" ON mechanism_completions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Admins pueden ver todas las llamadas
CREATE POLICY "Admins can view all calls" ON calls
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Admins pueden ver todos los call schedules
CREATE POLICY "Admins can view all call schedules" ON call_schedules
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Policy for admins to manage all activity completions
CREATE POLICY "Admins can manage all activity completions" ON user_activity_completions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- Policy for admins to manage all mechanism completions
CREATE POLICY "Admins can manage all mechanism completions" ON mechanism_completions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- Policy for admins to manage all call schedules
CREATE POLICY "Admins can manage all call schedules" ON call_schedules
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- =====================================================
-- 4. VERIFICACIÓN DE MIGRACIONES
-- =====================================================

-- Verificar que la columna supervisor_id existe
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'supervisor_id';

-- Verificar que el índice idx_profiles_supervisor_id existe
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'profiles' AND indexname = 'idx_profiles_supervisor_id';

-- Verificar que las funciones RPC fueron creadas
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('get_users_for_supervisor', 'get_user_supervisor')
ORDER BY routine_name;

-- Verificar que las políticas RLS fueron creadas
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE policyname LIKE '%Admins%' 
ORDER BY tablename, policyname;

-- =====================================================
-- 5. DATOS DE PRUEBA (OPCIONAL)
-- =====================================================

-- Ejemplo de cómo asignar un admin a un senior (usando supervisor_id)
-- UPDATE profiles SET supervisor_id = 'admin-uuid-here' WHERE id = 'senior-uuid-here';

-- Ejemplo de cómo asignar un admin directamente a un líder (usando supervisor_id)
-- UPDATE profiles SET supervisor_id = 'admin-uuid-here' WHERE id = 'leader-uuid-here';

-- Ejemplo de cómo asignar un senior a un líder (usando supervisor_id)
-- UPDATE profiles SET supervisor_id = 'senior-uuid-here' WHERE id = 'leader-uuid-here';

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 
-- 1. Ejecutar este archivo completo en el SQL Editor de Supabase
-- 2. Las políticas RLS se aplicarán automáticamente
-- 3. Las funciones get_users_for_supervisor y get_user_supervisor estarán disponibles
-- 4. Se usa la columna supervisor_id para ambos casos (senior y admin)
-- 5. Verificar que no haya errores en la ejecución
-- 
-- JERARQUÍA DE USUARIOS:
-- - Admin puede supervisar: Seniors y Líderes
-- - Senior puede supervisar: Líderes
-- - Líder: No supervisa a nadie
-- 
-- ASIGNACIONES:
-- - Líder → Senior (supervisor_id = senior.id)
-- - Líder → Admin (supervisor_id = admin.id)
-- - Senior → Admin (supervisor_id = admin.id)
-- 
-- =====================================================
-- FIN DE MIGRACIONES
-- =====================================================
