-- =====================================================
-- FIX: Recursión infinita en políticas RLS
-- =====================================================
-- Este script corrige las políticas RLS que causan recursión infinita
-- al consultar la tabla profiles desde dentro de políticas de profiles

-- 1. Eliminar políticas problemáticas
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

-- 2. Recrear políticas usando funciones auxiliares
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

-- 3. Verificar que las funciones auxiliares existen
SELECT 'Políticas RLS corregidas exitosamente' as status;
