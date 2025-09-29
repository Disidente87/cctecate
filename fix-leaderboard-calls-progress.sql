-- =====================================================
-- FIX: Mostrar porcentaje de progreso de llamadas en leaderboard
-- En lugar de calls_score, mostrar progress_percentage (llamadas a tiempo)
-- =====================================================

-- Actualizar la función get_leaderboard_data para mostrar progress_percentage de llamadas
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
            AND a.unlock_date <= CURRENT_DATE  -- Solo actividades desbloqueadas
        ), 0)::DECIMAL(5,2) as activities_completion_percentage,
        COALESCE((
          -- Cambiar de AVG(score) a progress_percentage (llamadas a tiempo)
          SELECT CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(CASE WHEN evaluation_status = 'on_time' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
          END
          FROM calls c 
          WHERE c.leader_id = p.id
        ), 0)::DECIMAL(3,2) as calls_score
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
      (ls.goals_completion_percentage * 0.4 
       + ls.activities_completion_percentage * 0.3 
       + (ls.calls_score / 100) * 0.3)::DECIMAL(5,2) as total_score,  -- Ajustar cálculo para porcentaje
      ROW_NUMBER() OVER (
        ORDER BY (ls.goals_completion_percentage * 0.4 
                + ls.activities_completion_percentage * 0.3 
                + (ls.calls_score / 100) * 0.3) DESC  -- Ajustar cálculo para porcentaje
      )::INTEGER as rank_position
    FROM leader_stats ls
    ORDER BY (ls.goals_completion_percentage * 0.4 
            + ls.activities_completion_percentage * 0.3 
            + (ls.calls_score / 100) * 0.3) DESC;  -- Ajustar cálculo para porcentaje

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
            AND a.unlock_date <= CURRENT_DATE  -- Solo actividades desbloqueadas
        ), 0)::DECIMAL(5,2) as activities_completion_percentage,
        COALESCE((
          -- Cambiar de AVG(score) a progress_percentage (llamadas a tiempo)
          SELECT CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(CASE WHEN evaluation_status = 'on_time' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
          END
          FROM calls c 
          WHERE c.leader_id = p.id
        ), 0)::DECIMAL(3,2) as calls_score
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
      (ls.goals_completion_percentage * 0.4 
       + ls.activities_completion_percentage * 0.3 
       + (ls.calls_score / 100) * 0.3)::DECIMAL(5,2) as total_score,  -- Ajustar cálculo para porcentaje
      ROW_NUMBER() OVER (
        ORDER BY (ls.goals_completion_percentage * 0.4 
                + ls.activities_completion_percentage * 0.3 
                + (ls.calls_score / 100) * 0.3) DESC  -- Ajustar cálculo para porcentaje
      )::INTEGER as rank_position
    FROM leader_stats ls
    ORDER BY (ls.goals_completion_percentage * 0.4 
            + ls.activities_completion_percentage * 0.3 
            + (ls.calls_score / 100) * 0.3) DESC;  -- Ajustar cálculo para porcentaje
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
            AND a.unlock_date <= CURRENT_DATE  -- Solo actividades desbloqueadas
        ), 0) * 0.3 
        + COALESCE((
          -- Cambiar de AVG(score) a progress_percentage (llamadas a tiempo)
          SELECT CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(CASE WHEN evaluation_status = 'on_time' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
          END
          FROM calls c 
          WHERE c.leader_id = p.id
        ), 0) * (1.0/100.0) * 0.3  -- Ajustar cálculo para porcentaje
      )::DECIMAL(5,2) as total_score
    FROM profiles p
    WHERE p.role = 'lider'
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

-- Verificar que las funciones se actualizaron correctamente
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('get_leaderboard_data', 'get_leaderboard_stats');
