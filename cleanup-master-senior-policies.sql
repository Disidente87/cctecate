-- Script para limpiar y corregir las políticas de master_senior

-- 1. Eliminar todas las políticas de master_senior existentes
DROP POLICY IF EXISTS "Master Seniors can view assigned users" ON profiles;
DROP POLICY IF EXISTS "Master_senior can view assigned users" ON profiles;
DROP POLICY IF EXISTS "Master Seniors can view assigned users' goals" ON goals;
DROP POLICY IF EXISTS "Master Seniors can view assigned users' mechanisms" ON mechanisms;
DROP POLICY IF EXISTS "Master Seniors can view assigned users' activity completions" ON user_activity_completions;
DROP POLICY IF EXISTS "Master Seniors can view assigned users' calls" ON calls;

-- 2. Crear políticas limpias y correctas
CREATE POLICY "Master Seniors can view assigned users" ON profiles
  FOR SELECT USING (
    supervisor_id = auth.uid() 
    AND is_user_master_senior()
    AND role IN ('lider', 'senior')
  );

CREATE POLICY "Master Seniors can view assigned users' goals" ON goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = goals.user_id
        AND p.supervisor_id = auth.uid()
        AND is_user_master_senior()
        AND p.role IN ('lider', 'senior')
    )
  );

CREATE POLICY "Master Seniors can view assigned users' mechanisms" ON mechanisms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM goals g
      JOIN profiles p ON p.id = g.user_id
      WHERE g.id = mechanisms.goal_id
        AND p.supervisor_id = auth.uid()
        AND is_user_master_senior()
        AND p.role IN ('lider', 'senior')
    )
  );

CREATE POLICY "Master Seniors can view assigned users' activity completions" ON user_activity_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = user_activity_completions.user_id
        AND p.supervisor_id = auth.uid()
        AND is_user_master_senior()
        AND p.role IN ('lider', 'senior')
    )
  );

CREATE POLICY "Master Seniors can view assigned users' calls" ON calls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = calls.leader_id
        AND p.supervisor_id = auth.uid()
        AND is_user_master_senior()
        AND p.role IN ('lider', 'senior')
    )
  );

-- 3. Verificar que las políticas se crearon correctamente
SELECT 
  'final_policies' as test_type,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles'
  AND policyname LIKE '%Master%'
ORDER BY policyname;
