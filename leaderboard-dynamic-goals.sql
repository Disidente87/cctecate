-- =====================================================
-- FUNCIONES DEL LEADERBOARD CON CÁLCULO DINÁMICO DE METAS
-- =====================================================

-- Función para calcular el progreso de una meta específica (replica la lógica del frontend)
CREATE OR REPLACE FUNCTION calculate_goal_progress_dynamic(
  p_goal_id UUID,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  total_expected_activities INTEGER := 0;
  total_completed_activities INTEGER := 0;
  progress_percentage INTEGER := 0;
  user_generation TEXT;
  pl1_date DATE;
  pl3_date DATE;
  goal_completed BOOLEAN;
  mechanism_record RECORD;
  current_date_var DATE;
  expected_count INTEGER;
  day_of_week INTEGER;
  should_include BOOLEAN;
  days_since_period_start INTEGER;
  mechanism_start_date DATE;
  mechanism_end_date DATE;
  mechanism_completed_count INTEGER;
BEGIN
  -- Verificar si la meta está completada
  SELECT g.completed INTO goal_completed
  FROM goals g
  WHERE g.id = p_goal_id;
  
  -- Si está completada, retornar 100%
  IF goal_completed THEN
    RETURN 100;
  END IF;
  
  -- Obtener generación del usuario
  SELECT p.generation INTO user_generation
  FROM profiles p 
  WHERE p.id = p_user_id;
  
  -- Obtener fechas de la generación
  IF user_generation IS NOT NULL THEN
    SELECT g.pl1_training_date, g.pl3_training_date
    INTO pl1_date, pl3_date
    FROM generations g
    WHERE g.name = user_generation;
    
    -- Mecanismos empiezan 1 semana después de PL1
    IF pl1_date IS NOT NULL THEN
      mechanism_start_date := pl1_date + INTERVAL '7 days';
    ELSE
      mechanism_start_date := CURRENT_DATE;
    END IF;
    
    -- Mecanismos terminan 1 semana antes de PL3
    IF pl3_date IS NOT NULL THEN
      mechanism_end_date := pl3_date - INTERVAL '7 days';
    ELSE
      mechanism_end_date := CURRENT_DATE + INTERVAL '30 days';
    END IF;
  ELSE
    mechanism_start_date := CURRENT_DATE;
    mechanism_end_date := CURRENT_DATE + INTERVAL '30 days';
  END IF;
  
  -- Calcular actividades esperadas y completadas para cada mecanismo de la meta
  FOR mechanism_record IN
    SELECT 
      GREATEST(COALESCE(m.start_date, mechanism_start_date), mechanism_start_date) as start_date,
      LEAST(COALESCE(m.end_date, mechanism_end_date), mechanism_end_date) as end_date,
      m.frequency,
      m.id as mechanism_id
    FROM mechanisms m
    WHERE m.goal_id = p_goal_id
  LOOP
    -- Calcular actividades esperadas para este mecanismo
    current_date_var := mechanism_record.start_date;
    expected_count := 0;
    
    WHILE current_date_var <= mechanism_record.end_date LOOP
      day_of_week := EXTRACT(DOW FROM current_date_var);
      should_include := FALSE;
      
      CASE 
        WHEN mechanism_record.frequency = 'daily' THEN
          should_include := TRUE;
        WHEN mechanism_record.frequency = 'weekly' THEN
          should_include := (day_of_week = 1); -- Lunes
        WHEN mechanism_record.frequency = '2x_week' THEN
          should_include := (day_of_week = 1 OR day_of_week = 4); -- Lun y Jue
        WHEN mechanism_record.frequency = '3x_week' THEN
          should_include := (day_of_week = 1 OR day_of_week = 3 OR day_of_week = 5); -- LMV
        WHEN mechanism_record.frequency = '4x_week' THEN
          should_include := (day_of_week = 1 OR day_of_week = 2 OR day_of_week = 4 OR day_of_week = 5); -- LMMJV
        WHEN mechanism_record.frequency = '5x_week' THEN
          should_include := (day_of_week >= 1 AND day_of_week <= 5); -- L-V
        WHEN mechanism_record.frequency = 'biweekly' THEN
          days_since_period_start := current_date_var - mechanism_record.start_date;
          should_include := (days_since_period_start % 14 = 0);
      END CASE;
      
      IF should_include THEN
        expected_count := expected_count + 1;
      END IF;
      
      current_date_var := current_date_var + INTERVAL '1 day';
    END LOOP;
    
    total_expected_activities := total_expected_activities + expected_count;
    
    -- Contar actividades completadas para este mecanismo
    mechanism_completed_count := 0;
    SELECT COUNT(*)
    INTO mechanism_completed_count
    FROM mechanism_completions mc
    WHERE mc.mechanism_id = mechanism_record.mechanism_id
      AND mc.user_id = p_user_id
      AND mc.completed_date >= mechanism_record.start_date
      AND mc.completed_date <= mechanism_record.end_date;
    
    -- ACUMULAR las actividades completadas
    total_completed_activities := total_completed_activities + mechanism_completed_count;
  END LOOP;
  
  -- Calcular porcentaje de progreso
  IF total_expected_activities > 0 THEN
    progress_percentage := ROUND((total_completed_activities::DECIMAL / total_expected_activities::DECIMAL) * 100);
  END IF;
  
  RETURN progress_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener leaderboard de líderes por generación con cálculo dinámico
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
  -- Obtener rol y generación del usuario actual
  SELECT p.role, p.generation 
  INTO user_role, user_generation
  FROM profiles p 
  WHERE p.id = p_user_id;
  
  -- Si no se encuentra el usuario, retornar vacío
  IF user_role IS NULL THEN
    RETURN;
  END IF;
  
  -- Admin puede ver todas las generaciones
  -- Todos los demás usuarios (lider, senior, etc.) solo pueden ver su propia generación
  IF user_role = 'admin' THEN
    -- Admin puede ver todas las generaciones o filtrar por una específica
    RETURN QUERY
    WITH leader_stats AS (
      SELECT 
        p.id as user_id,
        p.name,
        p.generation,
        -- Calcular porcentaje promedio de metas replicando la lógica del frontend
        COALESCE(
          (SELECT AVG(
            CASE 
              WHEN g.completed = true THEN 100
              ELSE calculate_goal_progress_dynamic(g.id, p.id)
            END
          )
           FROM goals g
           WHERE g.user_id = p.id), 0
        )::DECIMAL(5,2) as goals_completion_percentage,
        -- Calcular porcentaje de actividades completadas
        COALESCE(
          (SELECT (COUNT(uac.activity_id)::DECIMAL / NULLIF(COUNT(a.id), 0)) * 100
           FROM activities a
           LEFT JOIN user_activity_completions uac ON uac.activity_id = a.id AND uac.user_id = p.id
           WHERE a.is_active = true), 0
        )::DECIMAL(5,2) as activities_completion_percentage,
        -- Calcular score promedio de llamadas
        COALESCE(
          (SELECT AVG(c.score) 
           FROM calls c 
           WHERE c.leader_id = p.id 
             AND c.evaluation_status IN ('on_time', 'late')
             AND c.score IS NOT NULL), 0
        )::DECIMAL(3,2) as calls_score
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
      -- Calcular score total (promedio ponderado: metas 40%, actividades 30%, llamadas 30%)
      (ls.goals_completion_percentage * 0.4 + 
       ls.activities_completion_percentage * 0.3 + 
       (ls.calls_score * 100/3) * 0.3)::DECIMAL(5,2) as total_score,
      ROW_NUMBER() OVER (ORDER BY 
        (ls.goals_completion_percentage * 0.4 + 
         ls.activities_completion_percentage * 0.3 + 
         (ls.calls_score * 100/3) * 0.3) DESC
      )::INTEGER as rank_position
    FROM leader_stats ls
    ORDER BY (ls.goals_completion_percentage * 0.4 + ls.activities_completion_percentage * 0.3 + (ls.calls_score * 100/3) * 0.3) DESC;
    
  ELSE
    -- Todos los demás usuarios (lider, senior, etc.) solo pueden ver su propia generación
    RETURN QUERY
    WITH leader_stats AS (
      SELECT 
        p.id as user_id,
        p.name,
        p.generation,
        -- Calcular porcentaje promedio de metas replicando la lógica del frontend
        COALESCE(
          (SELECT AVG(
            CASE 
              WHEN g.completed = true THEN 100
              ELSE calculate_goal_progress_dynamic(g.id, p.id)
            END
          )
           FROM goals g
           WHERE g.user_id = p.id), 0
        )::DECIMAL(5,2) as goals_completion_percentage,
        -- Calcular porcentaje de actividades completadas
        COALESCE(
          (SELECT (COUNT(uac.activity_id)::DECIMAL / NULLIF(COUNT(a.id), 0)) * 100
           FROM activities a
           LEFT JOIN user_activity_completions uac ON uac.activity_id = a.id AND uac.user_id = p.id
           WHERE a.is_active = true), 0
        )::DECIMAL(5,2) as activities_completion_percentage,
        -- Calcular score promedio de llamadas
        COALESCE(
          (SELECT AVG(c.score) 
           FROM calls c 
           WHERE c.leader_id = p.id 
             AND c.evaluation_status IN ('on_time', 'late')
             AND c.score IS NOT NULL), 0
        )::DECIMAL(3,2) as calls_score
      FROM profiles p
      WHERE p.role = 'lider'
        AND p.generation = user_generation
    )
    SELECT 
      ls.user_id,
      ls.name,
      ls.generation,
      ls.goals_completion_percentage,
      ls.activities_completion_percentage,
      ls.calls_score,
      -- Calcular score total (promedio ponderado: metas 40%, actividades 30%, llamadas 30%)
      (ls.goals_completion_percentage * 0.4 + 
       ls.activities_completion_percentage * 0.3 + 
       (ls.calls_score * 100/3) * 0.3)::DECIMAL(5,2) as total_score,
      ROW_NUMBER() OVER (ORDER BY 
        (ls.goals_completion_percentage * 0.4 + 
         ls.activities_completion_percentage * 0.3 + 
         (ls.calls_score * 100/3) * 0.3) DESC
      )::INTEGER as rank_position
    FROM leader_stats ls
    ORDER BY (ls.goals_completion_percentage * 0.4 + ls.activities_completion_percentage * 0.3 + (ls.calls_score * 100/3) * 0.3) DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas generales del leaderboard con cálculo dinámico
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
  -- Obtener rol y generación del usuario actual
  SELECT p.role, p.generation 
  INTO user_role, user_generation
  FROM profiles p 
  WHERE p.id = p_user_id;
  
  -- Si no se encuentra el usuario, retornar vacío
  IF user_role IS NULL THEN
    RETURN;
  END IF;
  
  -- Todos los usuarios pueden ver estadísticas de su generación
  -- Admin puede ver todas las generaciones, otros (lider, senior, etc.) solo su propia generación
    RETURN QUERY
    WITH leader_stats AS (
      SELECT 
        p.generation,
        -- Calcular porcentaje promedio de metas replicando la lógica del frontend
        COALESCE(
          (SELECT AVG(
            CASE 
              WHEN g.completed = true THEN 100
              ELSE calculate_goal_progress_dynamic(g.id, p.id)
            END
          )
           FROM goals g
           WHERE g.user_id = p.id), 0
        )::DECIMAL(5,2) as goals_completion_percentage,
        -- Calcular score total (promedio ponderado: metas 40%, actividades 30%, llamadas 30%)
        (COALESCE(
          (SELECT AVG(
            CASE 
              WHEN g.completed = true THEN 100
              ELSE calculate_goal_progress_dynamic(g.id, p.id)
            END
          )
           FROM goals g
           WHERE g.user_id = p.id), 0
        ) * 0.4 + 
         COALESCE(
          (SELECT (COUNT(uac.activity_id)::DECIMAL / NULLIF(COUNT(a.id), 0)) * 100
           FROM activities a
           LEFT JOIN user_activity_completions uac ON uac.activity_id = a.id AND uac.user_id = p.id
           WHERE a.is_active = true), 0
        ) * 0.3 + 
         COALESCE(
          (SELECT AVG(c.score) 
           FROM calls c 
           WHERE c.leader_id = p.id 
             AND c.evaluation_status IN ('on_time', 'late')
             AND c.score IS NOT NULL), 0
        ) * 100/3 * 0.3)::DECIMAL(5,2) as total_score
      FROM profiles p
      WHERE p.role = 'lider'
        AND (
          (user_role = 'admin' AND (p_generation_filter IS NULL OR p.generation = p_generation_filter))
          OR 
          (user_role != 'admin' AND p.generation = user_generation)
        )
    ),
    generation_stats AS (
      SELECT 
        generation,
        COUNT(*) as participant_count,
        AVG(total_score) as avg_score,
        AVG(goals_completion_percentage) as avg_goals
      FROM leader_stats
      GROUP BY generation
    )
    SELECT 
      (SELECT COUNT(*)::INTEGER FROM leader_stats) as total_participants,
      (SELECT AVG(total_score) FROM leader_stats) as average_score,
      (SELECT generation FROM generation_stats ORDER BY avg_score DESC LIMIT 1) as leading_generation,
      (SELECT AVG(goals_completion_percentage) FROM leader_stats) as average_goals_completion;
  -- Todos los usuarios pueden ver estadísticas de su generación
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener generaciones disponibles para el usuario
CREATE OR REPLACE FUNCTION get_available_generations(p_user_id UUID)
RETURNS TABLE (generation TEXT) AS $$
DECLARE
  user_role TEXT;
  user_generation TEXT;
BEGIN
  -- Obtener rol y generación del usuario actual
  SELECT p.role, p.generation 
  INTO user_role, user_generation
  FROM profiles p 
  WHERE p.id = p_user_id;
  
  -- Si no se encuentra el usuario, retornar vacío
  IF user_role IS NULL THEN
    RETURN;
  END IF;
  
  IF user_role = 'admin' THEN
    -- Admin puede ver todas las generaciones que tienen lideres
    RETURN QUERY
    SELECT DISTINCT p.generation
    FROM profiles p
    WHERE p.role = 'lider'
    ORDER BY p.generation;
  ELSE
    -- Todos los demás usuarios (lider, senior, etc.) pueden ver su propia generación
    RETURN QUERY
    SELECT user_generation as generation;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION calculate_goal_progress_dynamic IS 'Calcula el progreso de una meta específica replicando exactamente la lógica del frontend';
COMMENT ON FUNCTION get_leaderboard_data IS 'Obtiene datos del leaderboard con cálculo dinámico de metas: admin ve todas las generaciones, otros usuarios solo su generación';
COMMENT ON FUNCTION get_leaderboard_stats IS 'Obtiene estadísticas del leaderboard con cálculo dinámico de metas: todos los usuarios pueden ver estadísticas de su generación';
COMMENT ON FUNCTION get_available_generations IS 'Obtiene generaciones disponibles: admin ve todas, otros usuarios solo su generación';
