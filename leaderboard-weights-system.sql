-- =====================================================
-- SISTEMA DE PESOS DINÁMICOS DEL LEADERBOARD
-- =====================================================
-- Este script implementa un sistema configurable de pesos
-- para el cálculo del leaderboard que permite a los admins
-- ajustar la importancia de metas, actividades y llamadas
-- =====================================================

-- Tabla para almacenar los pesos del sistema de scoring del leaderboard
CREATE TABLE IF NOT EXISTS leaderboard_weights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goals_weight DECIMAL(3,2) NOT NULL DEFAULT 0.40 CHECK (goals_weight >= 0 AND goals_weight <= 1),
  activities_weight DECIMAL(3,2) NOT NULL DEFAULT 0.30 CHECK (activities_weight >= 0 AND activities_weight <= 1),
  calls_weight DECIMAL(3,2) NOT NULL DEFAULT 0.30 CHECK (calls_weight >= 0 AND calls_weight <= 1),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Constraint para asegurar que los pesos sumen 1.0
  CONSTRAINT check_weights_sum CHECK (goals_weight + activities_weight + calls_weight = 1.0)
);

-- Insertar configuración inicial
INSERT INTO leaderboard_weights (goals_weight, activities_weight, calls_weight, is_active)
VALUES (0.40, 0.30, 0.30, TRUE)
ON CONFLICT DO NOTHING;

-- Comentarios para documentar la tabla
COMMENT ON TABLE leaderboard_weights IS 'Configuración de pesos para el cálculo del leaderboard';
COMMENT ON COLUMN leaderboard_weights.goals_weight IS 'Peso para el porcentaje de completitud de metas (0.0 - 1.0)';
COMMENT ON COLUMN leaderboard_weights.activities_weight IS 'Peso para el porcentaje de actividades completadas (0.0 - 1.0)';
COMMENT ON COLUMN leaderboard_weights.calls_weight IS 'Peso para el score de llamadas (0.0 - 1.0)';
COMMENT ON COLUMN leaderboard_weights.is_active IS 'Indica si esta configuración está activa';

-- =====================================================
-- FUNCIONES PARA GESTIONAR LOS PESOS
-- =====================================================

-- Función para obtener los pesos activos del leaderboard
CREATE OR REPLACE FUNCTION get_active_leaderboard_weights()
RETURNS TABLE (
  goals_weight DECIMAL(3,2),
  activities_weight DECIMAL(3,2),
  calls_weight DECIMAL(3,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lw.goals_weight,
    lw.activities_weight,
    lw.calls_weight
  FROM leaderboard_weights lw
  WHERE lw.is_active = TRUE
  ORDER BY lw.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar los pesos del leaderboard (solo admins)
CREATE OR REPLACE FUNCTION update_leaderboard_weights(
  p_goals_weight DECIMAL(3,2),
  p_activities_weight DECIMAL(3,2),
  p_calls_weight DECIMAL(3,2)
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_total_weight DECIMAL(3,2);
BEGIN
  -- Verificar que el usuario actual es admin
  SELECT is_user_admin() INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN QUERY SELECT FALSE, 'Solo los administradores pueden modificar los pesos del leaderboard';
    RETURN;
  END IF;
  
  -- Verificar que los pesos sumen 1.0
  v_total_weight := p_goals_weight + p_activities_weight + p_calls_weight;
  
  IF v_total_weight != 1.0 THEN
    RETURN QUERY SELECT FALSE, 'Los pesos deben sumar exactamente 1.0 (100%). Actual: ' || v_total_weight;
    RETURN;
  END IF;
  
  -- Verificar que todos los pesos estén en el rango válido
  IF p_goals_weight < 0 OR p_goals_weight > 1 OR 
     p_activities_weight < 0 OR p_activities_weight > 1 OR
     p_calls_weight < 0 OR p_calls_weight > 1 THEN
    RETURN QUERY SELECT FALSE, 'Los pesos deben estar entre 0.0 y 1.0';
    RETURN;
  END IF;
  
  -- Desactivar configuración actual
  UPDATE leaderboard_weights SET is_active = FALSE WHERE is_active = TRUE;
  
  -- Crear nueva configuración
  INSERT INTO leaderboard_weights (goals_weight, activities_weight, calls_weight, is_active, created_by)
  VALUES (p_goals_weight, p_activities_weight, p_calls_weight, TRUE, auth.uid());
  
  RETURN QUERY SELECT TRUE, 'Pesos del leaderboard actualizados exitosamente';
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'Error al actualizar los pesos: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener la configuración actual de pesos
CREATE OR REPLACE FUNCTION get_leaderboard_weights_config()
RETURNS TABLE (
  goals_weight DECIMAL(3,2),
  activities_weight DECIMAL(3,2),
  calls_weight DECIMAL(3,2),
  total_weight DECIMAL(3,2),
  last_updated TIMESTAMP WITH TIME ZONE,
  updated_by_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lw.goals_weight,
    lw.activities_weight,
    lw.calls_weight,
    (lw.goals_weight + lw.activities_weight + lw.calls_weight) as total_weight,
    lw.updated_at,
    COALESCE(p.name, 'Sistema') as updated_by_name
  FROM leaderboard_weights lw
  LEFT JOIN profiles p ON p.id = lw.created_by
  WHERE lw.is_active = TRUE
  ORDER BY lw.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ACTUALIZACIÓN DE LA FUNCIÓN PRINCIPAL DEL LEADERBOARD
-- =====================================================

-- Función actualizada para usar pesos dinámicos
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
          SELECT (COUNT(uac.activity_id)::DECIMAL / NULLIF(COUNT(a.id), 0)) * 100
          FROM activities a
          LEFT JOIN user_activity_completions uac ON uac.activity_id = a.id AND uac.user_id = p.id
          WHERE a.is_active = true
            AND a.unlock_date <= CURRENT_DATE  -- Solo actividades desbloqueadas
        ), 0)::DECIMAL(5,2) as activities_completion_percentage,
        COALESCE((
          -- Usar progress_percentage (porcentaje de avance - llamadas a tiempo)
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
       + (ls.calls_score / 100) * calls_weight)::DECIMAL(5,2) as total_score,
      ROW_NUMBER() OVER (
        ORDER BY (ls.goals_completion_percentage * goals_weight 
                + ls.activities_completion_percentage * activities_weight 
                + (ls.calls_score / 100) * calls_weight) DESC
      )::INTEGER as rank_position
    FROM leader_stats ls
    ORDER BY (ls.goals_completion_percentage * goals_weight 
            + ls.activities_completion_percentage * activities_weight 
            + (ls.calls_score / 100) * calls_weight) DESC;

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
          SELECT AVG(c.score) 
          FROM calls c 
          WHERE c.leader_id = p.id 
            AND c.evaluation_status IN ('on_time','late')
            AND c.score IS NOT NULL
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
       + (ls.calls_score / 100) * calls_weight)::DECIMAL(5,2) as total_score,
      ROW_NUMBER() OVER (
        ORDER BY (ls.goals_completion_percentage * goals_weight 
                + ls.activities_completion_percentage * activities_weight 
                + (ls.calls_score / 100) * calls_weight) DESC
      )::INTEGER as rank_position
    FROM leader_stats ls
    ORDER BY (ls.goals_completion_percentage * goals_weight 
            + ls.activities_completion_percentage * activities_weight 
            + (ls.calls_score / 100) * calls_weight) DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PERMISOS Y SEGURIDAD
-- =====================================================

-- Habilitar RLS en la tabla leaderboard_weights
ALTER TABLE leaderboard_weights ENABLE ROW LEVEL SECURITY;

-- Política para que todos los usuarios autenticados puedan leer la configuración activa
CREATE POLICY "Allow authenticated users to read active weights" ON leaderboard_weights
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = TRUE);

-- Política para que solo admins puedan insertar nuevas configuraciones
CREATE POLICY "Allow admins to insert weights" ON leaderboard_weights
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política para que solo admins puedan actualizar configuraciones
CREATE POLICY "Allow admins to update weights" ON leaderboard_weights
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Otorgar permisos para las funciones
GRANT EXECUTE ON FUNCTION get_active_leaderboard_weights() TO authenticated;
GRANT EXECUTE ON FUNCTION update_leaderboard_weights(DECIMAL, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard_weights_config() TO authenticated;

-- =====================================================
-- CONFIRMACIÓN Y VERIFICACIÓN
-- =====================================================

-- Verificar que la configuración inicial se insertó correctamente
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM leaderboard_weights WHERE is_active = TRUE) THEN
    RAISE EXCEPTION 'Error: No se pudo insertar la configuración inicial de pesos';
  END IF;
  
  RAISE NOTICE 'Sistema de pesos dinámicos del leaderboard instalado correctamente';
  RAISE NOTICE 'Configuración inicial: Metas 40%%, Actividades 30%%, Llamadas 30%%';
  RAISE NOTICE 'Los administradores pueden modificar los pesos desde la interfaz web';
END $$;

-- Mostrar la configuración actual
SELECT 
  'Configuración Actual' as estado,
  goals_weight * 100 as metas_peso,
  activities_weight * 100 as actividades_peso,
  calls_weight * 100 as llamadas_peso,
  (goals_weight + activities_weight + calls_weight) * 100 as total_peso,
  created_at as fecha_creacion
FROM leaderboard_weights 
WHERE is_active = TRUE;
