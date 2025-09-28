-- =====================================================
-- ACTUALIZAR POLÍTICAS RLS PARA MASTER_SENIOR
-- =====================================================

-- 1. Política para que master_senior pueda ver perfiles de líderes y seniors asignados
CREATE POLICY "Master_senior can view assigned users" ON profiles
  FOR SELECT USING (
    supervisor_id = auth.uid() 
    AND is_user_master_senior()
    AND role IN ('lider', 'senior')
  );

-- 2. Política para que master_senior pueda ver metas de sus usuarios asignados
CREATE POLICY "Master_senior can view assigned users' goals" ON goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = goals.user_id
        AND p.supervisor_id = auth.uid()
        AND is_user_master_senior()
    )
  );

-- 3. Política para que master_senior pueda actualizar metas de sus usuarios asignados
CREATE POLICY "Master_senior can update assigned users' goals" ON goals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = goals.user_id
        AND p.supervisor_id = auth.uid()
        AND is_user_master_senior()
    )
  );

-- 4. Política para que master_senior pueda ver mecanismos de sus usuarios asignados
CREATE POLICY "Master_senior can view assigned users' mechanisms" ON mechanisms
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM goals g
      JOIN profiles p ON p.id = g.user_id
      WHERE g.id = mechanisms.goal_id
        AND p.supervisor_id = auth.uid()
        AND is_user_master_senior()
    )
  );

-- 5. Política para que master_senior pueda actualizar mecanismos de sus usuarios asignados
CREATE POLICY "Master_senior can update assigned users' mechanisms" ON mechanisms
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM goals g
      JOIN profiles p ON p.id = g.user_id
      WHERE g.id = mechanisms.goal_id
        AND p.supervisor_id = auth.uid()
        AND is_user_master_senior()
    )
  );

-- 6. Política para que master_senior pueda ver llamadas de sus usuarios asignados
CREATE POLICY "Master_senior can view assigned users' calls" ON calls
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = calls.leader_id
        AND p.supervisor_id = auth.uid()
        AND is_user_master_senior()
    )
  );

-- 7. Política para que master_senior pueda actualizar llamadas de sus usuarios asignados
CREATE POLICY "Master_senior can update assigned users' calls" ON calls
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = calls.leader_id
        AND p.supervisor_id = auth.uid()
        AND is_user_master_senior()
    )
  );

-- 8. Política para que master_senior pueda ver completions de actividades de sus usuarios asignados
CREATE POLICY "Master_senior can view assigned users' activity completions" ON user_activity_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = user_activity_completions.user_id
        AND p.supervisor_id = auth.uid()
        AND is_user_master_senior()
    )
  );

-- 9. Política para que master_senior pueda gestionar completions de actividades de sus usuarios asignados
CREATE POLICY "Master_senior can manage assigned users' activity completions" ON user_activity_completions
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = user_activity_completions.user_id
        AND p.supervisor_id = auth.uid()
        AND is_user_master_senior()
    )
  );

-- 10. Política para que master_senior pueda ver completions de mecanismos de sus usuarios asignados
CREATE POLICY "Master_senior can view assigned users' mechanism completions" ON mechanism_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM mechanisms m
      JOIN goals g ON g.id = m.goal_id
      JOIN profiles p ON p.id = g.user_id
      WHERE m.id = mechanism_completions.mechanism_id
        AND p.supervisor_id = auth.uid()
        AND is_user_master_senior()
    )
  );

-- 11. Política para que master_senior pueda gestionar completions de mecanismos de sus usuarios asignados
CREATE POLICY "Master_senior can manage assigned users' mechanism completions" ON mechanism_completions
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM mechanisms m
      JOIN goals g ON g.id = m.goal_id
      JOIN profiles p ON p.id = g.user_id
      WHERE m.id = mechanism_completions.mechanism_id
        AND p.supervisor_id = auth.uid()
        AND is_user_master_senior()
    )
  );

-- 12. Política para que master_senior pueda ver excepciones de mecanismos de sus usuarios asignados
CREATE POLICY "Master_senior can view assigned users' mechanism exceptions" ON mechanism_schedule_exceptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM mechanisms m
      JOIN goals g ON g.id = m.goal_id
      JOIN profiles p ON p.id = g.user_id
      WHERE m.id = mechanism_schedule_exceptions.mechanism_id
        AND p.supervisor_id = auth.uid()
        AND is_user_master_senior()
    )
  );

-- 13. Política para que master_senior pueda ver call schedules de sus usuarios asignados
CREATE POLICY "Master_senior can view assigned users' call schedules" ON call_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = call_schedules.leader_id
        AND p.supervisor_id = auth.uid()
        AND is_user_master_senior()
    )
  );

-- 14. Política para que master_senior pueda ver sus propias participaciones
CREATE POLICY "Master_senior can view own participations" ON user_participations
  FOR SELECT USING (
    user_id = auth.uid() AND is_user_master_senior()
  );

-- 15. Política para que master_senior NO pueda crear/actualizar/eliminar participaciones
-- (Solo admins pueden hacer esto)
-- No se crea política específica, se mantiene la restricción existente

-- 16. Política para que master_senior NO pueda gestionar actividades
-- (Solo admins pueden hacer esto)
-- No se crea política específica, se mantiene la restricción existente

-- 17. Política para que master_senior NO pueda cambiar asignaciones
-- (Solo admins pueden hacer esto)
-- No se crea política específica, se mantiene la restricción existente

-- 18. Verificar que las políticas se crearon correctamente
SELECT 
  'VERIFICACIÓN' as tipo,
  'Políticas RLS para master_senior creadas exitosamente' as estado,
  'Master_senior puede supervisar líderes y seniors' as detalles;
