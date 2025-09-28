-- =====================================================
-- AGREGAR ROL 'master_senior' A LA BASE DE DATOS
-- =====================================================

-- 1. Actualizar constraint de roles en profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('lider', 'senior', 'master_senior', 'admin'));

-- 2. Actualizar constraint de roles en user_participations
ALTER TABLE user_participations DROP CONSTRAINT IF EXISTS user_participations_role_check;
ALTER TABLE user_participations ADD CONSTRAINT user_participations_role_check 
  CHECK (role IN ('lider', 'senior', 'master_senior', 'admin'));

-- 3. Actualizar constraint de roles en mechanisms
ALTER TABLE mechanisms DROP CONSTRAINT IF EXISTS check_frequency;
ALTER TABLE mechanisms ADD CONSTRAINT check_frequency CHECK (frequency IN (
  'daily', '2x_week', '3x_week', '4x_week', '5x_week', 
  'weekly', 'biweekly', 'monthly', 'yearly'
));

-- 4. Crear función para verificar si un usuario es master_senior
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

-- 5. Crear función para verificar si un usuario es senior o master_senior
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

-- 6. Crear función para verificar si un usuario puede ser supervisor
CREATE OR REPLACE FUNCTION can_be_supervisor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('senior', 'master_senior', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Crear función para verificar jerarquía de supervisión
CREATE OR REPLACE FUNCTION can_supervise_user(p_target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_role TEXT;
  v_target_role TEXT;
BEGIN
  -- Obtener rol del usuario actual
  SELECT role INTO v_current_role FROM profiles WHERE id = auth.uid();
  
  -- Obtener rol del usuario objetivo
  SELECT role INTO v_target_role FROM profiles WHERE id = p_target_user_id;
  
  -- Reglas de supervisión:
  -- - Admin puede supervisar a todos
  -- - Master_senior puede supervisar a lider y senior
  -- - Senior solo puede supervisar a lider
  -- - Lider no puede supervisar a nadie
  
  CASE v_current_role
    WHEN 'admin' THEN
      RETURN TRUE; -- Admin puede supervisar a todos
    WHEN 'master_senior' THEN
      RETURN v_target_role IN ('lider', 'senior'); -- Master_senior puede supervisar lider y senior
    WHEN 'senior' THEN
      RETURN v_target_role = 'lider'; -- Senior solo puede supervisar lider
    ELSE
      RETURN FALSE; -- Lider no puede supervisar a nadie
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Actualizar función get_users_for_supervisor para incluir master_senior
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
    AND p.role IN ('lider', 'senior', 'master_senior') -- Incluir master_senior
  ORDER BY p.role, p.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Actualizar función get_leaders_for_supervisor para incluir master_senior
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
  WHERE p.supervisor_id = p_supervisor_id
    AND p.role IN ('lider', 'senior', 'master_senior') -- Incluir master_senior
  ORDER BY p.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Actualizar función get_users_without_participation para incluir master_senior
CREATE OR REPLACE FUNCTION get_users_without_participation()
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  generation TEXT,
  supervisor_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.name,
    p.email,
    p.role,
    p.generation,
    p.supervisor_id
  FROM profiles p
  WHERE p.active_participation_id IS NULL
    AND p.role IN ('lider', 'senior', 'master_senior', 'admin') -- Incluir master_senior
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Actualizar función create_participation_from_assignment para incluir master_senior
CREATE OR REPLACE FUNCTION create_participation_from_assignment(
  p_user_id UUID,
  p_generation_name TEXT,
  p_role TEXT,
  p_supervisor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  participation_id UUID
) AS $$
DECLARE
  v_generation_id UUID;
  v_participation_id UUID;
  v_existing_participation_id UUID;
  v_participation_number INTEGER;
  v_supervisor_role TEXT;
BEGIN
  -- Verificar si el usuario existe
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN QUERY SELECT FALSE, 'Usuario no encontrado', NULL::UUID;
    RETURN;
  END IF;

  -- Verificar rol válido
  IF p_role NOT IN ('lider', 'senior', 'master_senior', 'admin') THEN
    RETURN QUERY SELECT FALSE, 'Rol inválido. Debe ser lider, senior, master_senior o admin', NULL::UUID;
    RETURN;
  END IF;

  -- Verificar jerarquía de supervisión si se asigna supervisor
  IF p_supervisor_id IS NOT NULL THEN
    -- Obtener rol del supervisor
    SELECT role INTO v_supervisor_role FROM profiles WHERE id = p_supervisor_id;
    
    -- Verificar si el supervisor puede supervisar al usuario
    IF NOT can_supervise_user(p_user_id) THEN
      RETURN QUERY SELECT FALSE, 'El supervisor no puede supervisar a un usuario con este rol', NULL::UUID;
      RETURN;
    END IF;
  END IF;

  -- Obtener generation_id
  SELECT id INTO v_generation_id 
  FROM generations 
  WHERE name = p_generation_name;
  
  IF v_generation_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Generación no encontrada: ' || p_generation_name, NULL::UUID;
    RETURN;
  END IF;

  -- Verificar si ya existe una participación activa para este usuario
  SELECT active_participation_id INTO v_existing_participation_id
  FROM profiles 
  WHERE id = p_user_id;

  -- Si ya tiene participación activa, marcar como completada y crear nueva
  IF v_existing_participation_id IS NOT NULL THEN
    UPDATE user_participations 
    SET status = 'completed', updated_at = NOW()
    WHERE id = v_existing_participation_id;
  END IF;

  -- Calcular número de participación
  SELECT COALESCE(MAX(participation_number), 0) + 1
  INTO v_participation_number
  FROM user_participations
  WHERE user_id = p_user_id;

  -- Crear nueva participación
  INSERT INTO user_participations (user_id, generation_id, role, participation_number, status)
  VALUES (p_user_id, v_generation_id, p_role, v_participation_number, 'active')
  RETURNING id INTO v_participation_id;

  -- Actualizar perfil con nueva participación
  UPDATE profiles
  SET 
    active_participation_id = v_participation_id,
    role = p_role,
    generation = p_generation_name,
    supervisor_id = p_supervisor_id,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN QUERY SELECT TRUE, 'Participación creada exitosamente', v_participation_id;

EXCEPTION
  WHEN unique_violation THEN
    -- Si ya existe participación para esta combinación, obtenerla
    SELECT id INTO v_participation_id 
    FROM user_participations 
    WHERE user_id = p_user_id AND generation_id = v_generation_id AND role = p_role;
    
    -- Actualizar perfil
    UPDATE profiles
    SET 
      active_participation_id = v_participation_id,
      role = p_role,
      generation = p_generation_name,
      supervisor_id = p_supervisor_id,
      updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN QUERY SELECT TRUE, 'Participación existente activada', v_participation_id;
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'Error: ' || SQLERRM, NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Actualizar leaderboard para excluir master_senior
CREATE OR REPLACE FUNCTION get_leaderboard_data(
  p_user_id UUID,
  p_generation_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  generation TEXT,
  goals_completion_percentage DECIMAL(5,2),
  activities_completion_percentage DECIMAL(5,2),
  calls_score DECIMAL(3,2),
  total_score DECIMAL(5,2),
  rank_position INTEGER
) AS $$
DECLARE
  user_role TEXT;
  user_generation TEXT;
BEGIN
  SELECT p.role, p.generation INTO user_role, user_generation
  FROM profiles p WHERE p.id = p_user_id;

  IF user_role IS NULL THEN RETURN; END IF;

  IF user_role = 'admin' THEN
    RETURN QUERY
    WITH leader_stats AS (
      SELECT 
        p.id as user_id,
        p.name,
        p.generation,
        COALESCE((
          SELECT AVG(CASE WHEN g.completed = true THEN 100 ELSE COALESCE(calculate_goal_progress_dynamic(g.id, p.id), 0) END)
          FROM goals g WHERE g.user_id = p.id
        ), 0)::DECIMAL(5,2) as goals_completion_percentage,
        COALESCE((
          SELECT (COUNT(uac.activity_id)::DECIMAL / NULLIF(COUNT(a.id), 0)) * 100
          FROM activities a
          LEFT JOIN user_activity_completions uac ON uac.activity_id = a.id AND uac.user_id = p.id
          WHERE a.is_active = true
        ), 0)::DECIMAL(5,2) as activities_completion_percentage,
        COALESCE((
          SELECT AVG(c.score)
          FROM calls c 
          WHERE c.leader_id = p.id 
            AND c.evaluation_status IN ('on_time','late')
            AND c.score IS NOT NULL
        ), 0)::DECIMAL(3,2) as calls_score
      FROM profiles p
      WHERE p.role = 'lider' -- Solo líderes en el leaderboard
        AND (p_generation_filter IS NULL OR p.generation = p_generation_filter)
    )
    SELECT 
      ls.user_id,
      ls.name,
      ls.generation,
      ls.goals_completion_percentage,
      ls.activities_completion_percentage,
      ls.calls_score,
      (ls.goals_completion_percentage * 0.4 
       + ls.activities_completion_percentage * 0.3 
       + (ls.calls_score * 100/3) * 0.3)::DECIMAL(5,2) as total_score,
      ROW_NUMBER() OVER (
        ORDER BY (ls.goals_completion_percentage * 0.4 
                + ls.activities_completion_percentage * 0.3 
                + (ls.calls_score * 100/3) * 0.3) DESC
      )::INTEGER as rank_position
    FROM leader_stats ls
    ORDER BY (ls.goals_completion_percentage * 0.4 
            + ls.activities_completion_percentage * 0.3 
            + (ls.calls_score * 100/3) * 0.3) DESC;

  ELSE
    RETURN QUERY
    WITH leader_stats AS (
      SELECT 
        p.id as user_id,
        p.name,
        p.generation,
        COALESCE((
          SELECT AVG(CASE WHEN g.completed = true THEN 100 ELSE COALESCE(calculate_goal_progress_dynamic(g.id, p.id), 0) END)
          FROM goals g WHERE g.user_id = p.id
        ), 0)::DECIMAL(5,2) as goals_completion_percentage,
        COALESCE((
          SELECT (COUNT(uac.activity_id)::DECIMAL / NULLIF(COUNT(a.id), 0)) * 100
          FROM activities a
          LEFT JOIN user_activity_completions uac ON uac.activity_id = a.id AND uac.user_id = p.id
          WHERE a.is_active = true
        ), 0)::DECIMAL(5,2) as activities_completion_percentage,
        COALESCE((
          SELECT AVG(c.score) 
          FROM calls c 
          WHERE c.leader_id = p.id 
            AND c.evaluation_status IN ('on_time','late')
            AND c.score IS NOT NULL
        ), 0)::DECIMAL(3,2) as calls_score
      FROM profiles p
      WHERE p.role = 'lider' AND p.generation = user_generation -- Solo líderes en el leaderboard
    )
    SELECT 
      ls.user_id,
      ls.name,
      ls.generation,
      ls.goals_completion_percentage,
      ls.activities_completion_percentage,
      ls.calls_score,
      (ls.goals_completion_percentage * 0.4 
       + ls.activities_completion_percentage * 0.3 
       + (ls.calls_score * 100/3) * 0.3)::DECIMAL(5,2) as total_score,
      ROW_NUMBER() OVER (
        ORDER BY (ls.goals_completion_percentage * 0.4 
                + ls.activities_completion_percentage * 0.3 
                + (ls.calls_score * 100/3) * 0.3) DESC
      )::INTEGER as rank_position
    FROM leader_stats ls
    ORDER BY (ls.goals_completion_percentage * 0.4 
            + ls.activities_completion_percentage * 0.3 
            + (ls.calls_score * 100/3) * 0.3) DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Actualizar función get_leaderboard_stats para excluir master_senior
CREATE OR REPLACE FUNCTION get_leaderboard_stats(
  p_user_id UUID,
  p_generation_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_participants INTEGER,
  average_score DECIMAL(5,2),
  leading_generation TEXT,
  average_goals_completion DECIMAL(5,2)
) AS $$
DECLARE
  user_role TEXT;
  user_generation TEXT;
BEGIN
  SELECT p.role, p.generation INTO user_role, user_generation
  FROM profiles p WHERE p.id = p_user_id;

  IF user_role IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH leader_stats AS (
    SELECT 
      p.generation,
      COALESCE((
        SELECT AVG(CASE WHEN g.completed = true THEN 100 ELSE COALESCE(calculate_goal_progress_dynamic(g.id, p.id), 0) END)
        FROM goals g WHERE g.user_id = p.id
      ), 0)::DECIMAL(5,2) as goals_completion_percentage,
      (
        COALESCE((
          SELECT AVG(CASE WHEN g.completed = true THEN 100 ELSE COALESCE(calculate_goal_progress_dynamic(g.id, p.id), 0) END)
          FROM goals g WHERE g.user_id = p.id
        ), 0) * 0.4 
        + COALESCE((
          SELECT (COUNT(uac.activity_id)::DECIMAL / NULLIF(COUNT(a.id), 0)) * 100
          FROM activities a
          LEFT JOIN user_activity_completions uac ON uac.activity_id = a.id AND uac.user_id = p.id
          WHERE a.is_active = true
        ), 0) * 0.3 
        + COALESCE((
          SELECT AVG(c.score) 
          FROM calls c 
          WHERE c.leader_id = p.id 
            AND c.evaluation_status IN ('on_time','late')
            AND c.score IS NOT NULL
        ), 0) * (100.0/3.0) * 0.3
      )::DECIMAL(5,2) as total_score
    FROM profiles p
    WHERE p.role = 'lider' -- Solo líderes en el leaderboard
      AND (
        (user_role = 'admin' AND (p_generation_filter IS NULL OR p.generation = p_generation_filter))
        OR 
        (user_role <> 'admin' AND p.generation = user_generation)
      )
  ),
  generation_stats AS (
    SELECT generation,
           COUNT(*) as participant_count,
           AVG(total_score) as avg_score,
           AVG(goals_completion_percentage) as avg_goals
    FROM leader_stats
    GROUP BY generation
  )
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM leader_stats) as total_participants,
    COALESCE((SELECT AVG(total_score) FROM leader_stats), 0)::DECIMAL(5,2) as average_score,
    (SELECT generation FROM generation_stats ORDER BY avg_score DESC NULLS LAST LIMIT 1) as leading_generation,
    COALESCE((SELECT AVG(goals_completion_percentage) FROM leader_stats), 0)::DECIMAL(5,2) as average_goals_completion;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Otorgar permisos para las nuevas funciones
GRANT EXECUTE ON FUNCTION is_user_master_senior() TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_senior_or_master() TO authenticated;
GRANT EXECUTE ON FUNCTION can_be_supervisor() TO authenticated;
GRANT EXECUTE ON FUNCTION can_supervise_user(UUID) TO authenticated;

-- 15. Verificar que los cambios se aplicaron correctamente
SELECT 
  'VERIFICACIÓN' as tipo,
  'Rol master_senior agregado exitosamente' as estado,
  'Constraints actualizados' as detalles;
