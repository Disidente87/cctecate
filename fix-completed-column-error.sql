-- =====================================================
-- CORRECCIÓN DEL ERROR DE COLUMNA 'completed'
-- =====================================================
-- Problema: La función get_leaderboard_data usa uac.completed
-- pero la columna correcta es uac.completed_at
-- 
-- Solución: Cambiar uac.completed = true por uac.completed_at IS NOT NULL

-- Actualizar la función get_leaderboard_data para corregir
-- la referencia a la columna completed
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
  calls_score DECIMAL(5,2),
  total_score DECIMAL(5,2),
  rank_position INTEGER
) AS $$
DECLARE
  user_role TEXT;
  user_generation TEXT;
  goals_weight DECIMAL(3,2);
  activities_weight DECIMAL(3,2);
  calls_weight DECIMAL(3,2);
BEGIN
  SELECT p.role, p.generation INTO user_role, user_generation
  FROM profiles p WHERE p.id = p_user_id;

  IF user_role IS NULL THEN RETURN; END IF;

  -- Obtener los pesos activos del leaderboard
  SELECT lw.goals_weight, lw.activities_weight, lw.calls_weight 
  INTO goals_weight, activities_weight, calls_weight
  FROM leaderboard_weights lw
  WHERE lw.is_active = TRUE
  ORDER BY lw.created_at DESC
  LIMIT 1;

  -- Si no hay pesos configurados, usar valores por defecto
  IF goals_weight IS NULL THEN
    goals_weight := 0.40;
    activities_weight := 0.30;
    calls_weight := 0.30;
  END IF;

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
          SELECT ROUND((COUNT(CASE WHEN uac.completed_at IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
          FROM activities a
          LEFT JOIN user_activity_completions uac ON uac.activity_id = a.id AND uac.user_id = p.id
          WHERE a.is_active = true
            AND a.unlock_date <= CURRENT_DATE
        ), 0)::DECIMAL(5,2) as activities_completion_percentage,
        COALESCE((
          SELECT CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(CASE WHEN evaluation_status = 'on_time' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
          END
          FROM calls c 
          WHERE c.leader_id = p.id
        ), 0)::DECIMAL(5,2) as calls_score
      FROM profiles p
      WHERE p.role = 'lider'
        AND (p_generation_filter IS NULL OR p.generation = p_generation_filter)
    )
    SELECT 
      ls.user_id,
      ls.name,
      ls.generation,
      ls.goals_completion_percentage,
      ls.activities_completion_percentage,
      ls.calls_score,
      (ls.goals_completion_percentage * goals_weight 
       + ls.activities_completion_percentage * activities_weight 
       + ls.calls_score * calls_weight)::DECIMAL(5,2) as total_score,
      ROW_NUMBER() OVER (
        ORDER BY (ls.goals_completion_percentage * goals_weight 
                + ls.activities_completion_percentage * activities_weight 
                + ls.calls_score * calls_weight) DESC
      )::INTEGER as rank_position
    FROM leader_stats ls
    ORDER BY (ls.goals_completion_percentage * goals_weight 
            + ls.activities_completion_percentage * activities_weight 
            + ls.calls_score * calls_weight) DESC;

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
          SELECT ROUND((COUNT(CASE WHEN uac.completed_at IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
          FROM activities a
          LEFT JOIN user_activity_completions uac ON uac.activity_id = a.id AND uac.user_id = p.id
          WHERE a.is_active = true
            AND a.unlock_date <= CURRENT_DATE
        ), 0)::DECIMAL(5,2) as activities_completion_percentage,
        -- CORRECCIÓN: Usar el mismo cálculo que para admins (porcentaje de llamadas a tiempo)
        COALESCE((
          SELECT CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(CASE WHEN evaluation_status = 'on_time' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
          END
          FROM calls c 
          WHERE c.leader_id = p.id
        ), 0)::DECIMAL(5,2) as calls_score
      FROM profiles p
      WHERE p.role = 'lider' AND p.generation = user_generation
    )
    SELECT 
      ls.user_id,
      ls.name,
      ls.generation,
      ls.goals_completion_percentage,
      ls.activities_completion_percentage,
      ls.calls_score,
      (ls.goals_completion_percentage * goals_weight 
       + ls.activities_completion_percentage * activities_weight 
       + ls.calls_score * calls_weight)::DECIMAL(5,2) as total_score,
      ROW_NUMBER() OVER (
        ORDER BY (ls.goals_completion_percentage * goals_weight 
                + ls.activities_completion_percentage * activities_weight 
                + ls.calls_score * calls_weight) DESC
      )::INTEGER as rank_position
    FROM leader_stats ls
    ORDER BY (ls.goals_completion_percentage * goals_weight 
            + ls.activities_completion_percentage * activities_weight 
            + ls.calls_score * calls_weight) DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar también la función get_leaderboard_stats
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

  IF user_role = 'admin' THEN
    RETURN QUERY
    WITH leader_stats AS (
      SELECT 
        p.id as user_id,
        p.generation,
        COALESCE((
          SELECT AVG(CASE WHEN g.completed = true THEN 100 ELSE COALESCE(calculate_goal_progress_dynamic(g.id, p.id), 0) END)
          FROM goals g WHERE g.user_id = p.id
        ), 0)::DECIMAL(5,2) as goals_completion_percentage,
        COALESCE((
          SELECT ROUND((COUNT(CASE WHEN uac.completed_at IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
          FROM activities a
          LEFT JOIN user_activity_completions uac ON uac.activity_id = a.id AND uac.user_id = p.id
          WHERE a.is_active = true
            AND a.unlock_date <= CURRENT_DATE
        ), 0)::DECIMAL(5,2) as activities_completion_percentage,
        COALESCE((
          SELECT CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(CASE WHEN evaluation_status = 'on_time' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
          END
          FROM calls c 
          WHERE c.leader_id = p.id
        ), 0)::DECIMAL(5,2) as calls_score
      FROM profiles p
      WHERE p.role = 'lider'
        AND (p_generation_filter IS NULL OR p.generation = p_generation_filter)
    )
    SELECT 
      COUNT(*)::INTEGER as total_participants,
      ROUND(AVG(goals_completion_percentage), 2) as average_score,
      (SELECT generation FROM leader_stats GROUP BY generation ORDER BY AVG(goals_completion_percentage) DESC LIMIT 1) as leading_generation,
      ROUND(AVG(goals_completion_percentage), 2) as average_goals_completion
    FROM leader_stats;
  ELSE
    RETURN QUERY
    WITH leader_stats AS (
      SELECT 
        p.id as user_id,
        p.generation,
        COALESCE((
          SELECT AVG(CASE WHEN g.completed = true THEN 100 ELSE COALESCE(calculate_goal_progress_dynamic(g.id, p.id), 0) END)
          FROM goals g WHERE g.user_id = p.id
        ), 0)::DECIMAL(5,2) as goals_completion_percentage,
        COALESCE((
          SELECT ROUND((COUNT(CASE WHEN uac.completed_at IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
          FROM activities a
          LEFT JOIN user_activity_completions uac ON uac.activity_id = a.id AND uac.user_id = p.id
          WHERE a.is_active = true
            AND a.unlock_date <= CURRENT_DATE
        ), 0)::DECIMAL(5,2) as activities_completion_percentage,
        COALESCE((
          SELECT CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(CASE WHEN evaluation_status = 'on_time' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
          END
          FROM calls c 
          WHERE c.leader_id = p.id
        ), 0)::DECIMAL(5,2) as calls_score
      FROM profiles p
      WHERE p.role = 'lider' AND p.generation = user_generation
    )
    SELECT 
      COUNT(*)::INTEGER as total_participants,
      ROUND(AVG(goals_completion_percentage), 2) as average_score,
      user_generation as leading_generation,
      ROUND(AVG(goals_completion_percentage), 2) as average_goals_completion
    FROM leader_stats;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificación
SELECT 'Funciones actualizadas correctamente - columna completed corregida' as status;
