-- =====================================================
-- MIGRACIÓN: senior_id → supervisor_id
-- =====================================================
-- Este script migra todas las referencias de senior_id a supervisor_id
-- para unificar la nomenclatura del sistema

-- 1. Renombrar columnas en tablas existentes
ALTER TABLE profiles RENAME COLUMN senior_id TO supervisor_id;
ALTER TABLE goals RENAME COLUMN completed_by_senior_id TO completed_by_supervisor_id;
ALTER TABLE calls RENAME COLUMN senior_id TO supervisor_id;
ALTER TABLE call_schedules RENAME COLUMN senior_id TO supervisor_id;

-- 2. Eliminar índices antiguos
DROP INDEX IF EXISTS idx_profiles_senior_id;
DROP INDEX IF EXISTS idx_goals_completed_by_senior;
DROP INDEX IF EXISTS idx_calls_senior_id;
DROP INDEX IF EXISTS idx_call_schedules_senior;

-- 3. Crear nuevos índices
CREATE INDEX idx_profiles_supervisor_id ON profiles(supervisor_id);
CREATE INDEX idx_goals_completed_by_supervisor ON goals(completed_by_supervisor_id);
CREATE INDEX idx_calls_supervisor_id ON calls(supervisor_id);
CREATE INDEX idx_call_schedules_supervisor ON call_schedules(supervisor_id);

-- 4. Actualizar restricciones UNIQUE
ALTER TABLE call_schedules DROP CONSTRAINT IF EXISTS call_schedules_leader_id_senior_id_key;
ALTER TABLE call_schedules ADD CONSTRAINT call_schedules_leader_id_supervisor_id_key UNIQUE(leader_id, supervisor_id);

-- 5. Eliminar políticas RLS problemáticas
DROP POLICY IF EXISTS "Admins can view assigned users" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all goals" ON goals;
DROP POLICY IF EXISTS "Admins can view all mechanisms" ON mechanisms;
DROP POLICY IF EXISTS "Admins can view all activity completions" ON user_activity_completions;
DROP POLICY IF EXISTS "Admins can view all mechanism exceptions" ON mechanism_schedule_exceptions;
DROP POLICY IF EXISTS "Admins can view all mechanism completions" ON mechanism_completions;
DROP POLICY IF EXISTS "Admins can view all calls" ON calls;
DROP POLICY IF EXISTS "Admins can view all call schedules" ON call_schedules;
DROP POLICY IF EXISTS "Admins can manage all activity completions" ON user_activity_completions;
DROP POLICY IF EXISTS "Admins can manage all mechanism completions" ON mechanism_completions;
DROP POLICY IF EXISTS "Admins can manage all call schedules" ON call_schedules;

-- 6. Recrear políticas RLS usando funciones auxiliares
CREATE POLICY "Admins can view assigned users" ON profiles
    FOR SELECT USING (
        supervisor_id = auth.uid() AND is_user_admin()
    );

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        is_user_admin()
    );

CREATE POLICY "Admins can view all goals" ON goals
  FOR SELECT USING (
    is_user_admin()
  );

CREATE POLICY "Admins can view all mechanisms" ON mechanisms
  FOR SELECT USING (
    is_user_admin()
  );

CREATE POLICY "Admins can view all activity completions" ON user_activity_completions
  FOR SELECT USING (
    is_user_admin()
  );

CREATE POLICY "Admins can view all mechanism exceptions" ON mechanism_schedule_exceptions
  FOR SELECT USING (
    is_user_admin()
  );

CREATE POLICY "Admins can view all mechanism completions" ON mechanism_completions
  FOR SELECT USING (
    is_user_admin()
  );

CREATE POLICY "Admins can view all calls" ON calls
  FOR SELECT USING (
    is_user_admin()
  );

CREATE POLICY "Admins can view all call schedules" ON call_schedules
  FOR SELECT USING (
    is_user_admin()
  );

CREATE POLICY "Admins can manage all activity completions" ON user_activity_completions
    FOR ALL USING (
        is_user_admin()
    );

CREATE POLICY "Admins can manage all mechanism completions" ON mechanism_completions
    FOR ALL USING (
        is_user_admin()
    );

CREATE POLICY "Admins can manage all call schedules" ON call_schedules
    FOR ALL USING (
        is_user_admin()
    );

-- 7. Actualizar políticas de calls para usar supervisor_id
DROP POLICY IF EXISTS "Users can view calls they are involved in" ON calls;
DROP POLICY IF EXISTS "Users can create calls" ON calls;
DROP POLICY IF EXISTS "Users can update calls they are involved in" ON calls;

CREATE POLICY "Users can view calls they are involved in" ON calls
    FOR SELECT USING (auth.uid() = leader_id OR auth.uid() = supervisor_id);

CREATE POLICY "Users can create calls" ON calls
    FOR INSERT WITH CHECK (auth.uid() = leader_id OR auth.uid() = supervisor_id);

CREATE POLICY "Users can update calls they are involved in" ON calls
    FOR UPDATE USING (auth.uid() = leader_id OR auth.uid() = supervisor_id);

-- 8. Actualizar políticas de call_schedules
DROP POLICY IF EXISTS "Users can manage own call schedules" ON call_schedules;

CREATE POLICY "Users can manage own call schedules" ON call_schedules 
  FOR ALL USING (auth.uid() = leader_id OR auth.uid() = supervisor_id);

-- 9. Actualizar funciones RPC
CREATE OR REPLACE FUNCTION get_leaders_for_supervisor(p_supervisor_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  generation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, p.name, p.email, p.generation
  FROM profiles p
  WHERE p.role = 'lider' AND p.supervisor_id = p_supervisor_id
  ORDER BY p.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Actualizar comentarios
COMMENT ON COLUMN goals.completed_by_supervisor_id IS 'ID del Supervisor que marcó la meta como completada';
COMMENT ON FUNCTION get_leaders_for_supervisor IS 'Lista los líderes asignados a un supervisor específico';

-- 11. Verificar migración
SELECT 'Migración completada exitosamente' as status;

-- Verificar que las columnas fueron renombradas
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'goals', 'calls', 'call_schedules') 
  AND column_name IN ('supervisor_id', 'completed_by_supervisor_id')
ORDER BY table_name, column_name;

-- Verificar que los índices fueron creados
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE indexname LIKE '%supervisor%'
ORDER BY indexname;
