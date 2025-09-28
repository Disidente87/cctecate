-- Script para corregir las políticas de master_senior

-- 1. Crear funciones helper para master_senior
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

CREATE OR REPLACE FUNCTION is_user_senior_or_master()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('senior', 'master_senior')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Agregar políticas para que master_senior pueda ver a sus usuarios asignados
CREATE POLICY "Master Seniors can view assigned users" ON profiles
  FOR SELECT USING (
    supervisor_id = auth.uid() 
    AND is_user_master_senior()
    AND role IN ('lider', 'senior')
  );

-- 3. Agregar políticas para metas
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

-- 4. Agregar políticas para mecanismos
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

-- 5. Agregar políticas para actividades
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

-- 6. Agregar políticas para llamadas
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

-- 7. Verificar que las políticas se crearon correctamente
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles'
  AND policyname LIKE '%Master%'
ORDER BY policyname;
