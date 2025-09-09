-- =====================================================
-- MIGRACIÓN: ESQUEMA ACTUAL → ESQUEMA OPTIMIZADO
-- =====================================================

-- 1. ACTUALIZAR TABLA PROFILES
-- =====================================================

-- Agregar campos faltantes a profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Migrar datos existentes
UPDATE profiles 
SET full_name = COALESCE(name, email)
WHERE full_name IS NULL;

-- 2. ACTUALIZAR TABLA GOALS
-- =====================================================

-- Agregar campos faltantes a goals
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS target_points INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

-- Migrar datos existentes
UPDATE goals 
SET is_completed = completed
WHERE is_completed IS NULL;

-- Cambiar tipo de progress_percentage
ALTER TABLE goals 
ALTER COLUMN progress_percentage TYPE DECIMAL(5,2);

-- 3. ACTUALIZAR TABLA MECHANISMS
-- =====================================================

-- Agregar campos faltantes a mechanisms
ALTER TABLE mechanisms 
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- 4. CREAR NUEVAS TABLAS OPTIMIZADAS
-- =====================================================

-- Tabla de excepciones de horario
CREATE TABLE IF NOT EXISTS mechanism_schedule_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mechanism_id UUID REFERENCES mechanisms(id) ON DELETE CASCADE NOT NULL,
  original_date DATE NOT NULL,
  moved_to_date DATE,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mechanism_id, original_date)
);

-- Tabla de completions
CREATE TABLE IF NOT EXISTS mechanism_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mechanism_id UUID REFERENCES mechanisms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  completed_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
  UNIQUE(mechanism_id, user_id, completed_date)
);

-- 5. CREAR ÍNDICES OPTIMIZADOS
-- =====================================================

-- Índices para mechanisms
CREATE INDEX IF NOT EXISTS idx_mechanisms_user_goal ON mechanisms (user_id, goal_id);
CREATE INDEX IF NOT EXISTS idx_mechanisms_frequency ON mechanisms (frequency, start_date);

-- Índices para excepciones
CREATE INDEX IF NOT EXISTS idx_mechanism_exceptions_lookup ON mechanism_schedule_exceptions (mechanism_id, original_date);
CREATE INDEX IF NOT EXISTS idx_mechanism_exceptions_user ON mechanism_schedule_exceptions (user_id, mechanism_id);
CREATE INDEX IF NOT EXISTS idx_mechanism_exceptions_date ON mechanism_schedule_exceptions (moved_to_date) WHERE moved_to_date IS NOT NULL;

-- Índices para completions
CREATE INDEX IF NOT EXISTS idx_mechanism_completions_calc ON mechanism_completions (mechanism_id, user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_mechanism_completions_date ON mechanism_completions (user_id, completed_date DESC);

-- 6. CREAR FUNCIONES SQL OPTIMIZADAS
-- =====================================================

-- Función para calcular progreso de mecanismo
CREATE OR REPLACE FUNCTION calculate_mechanism_progress(
  p_mechanism_id UUID,
  p_user_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_expected INTEGER,
  total_completed INTEGER,
  progress_percentage DECIMAL(5,2),
  last_completion_date DATE,
  current_streak INTEGER
) AS $$
DECLARE
  v_mechanism RECORD;
  v_start_date DATE;
  v_end_date DATE;
  v_total_expected INTEGER := 0;
  v_total_completed INTEGER := 0;
  v_current_streak INTEGER := 0;
BEGIN
  -- Obtener información del mecanismo
  SELECT * INTO v_mechanism 
  FROM mechanisms 
  WHERE id = p_mechanism_id AND user_id = p_user_id;
  
  IF v_mechanism IS NULL THEN
    RETURN;
  END IF;
  
  -- Definir rango de fechas (por defecto: últimos 30 días)
  v_start_date := COALESCE(p_start_date, v_mechanism.start_date, CURRENT_DATE - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, v_mechanism.end_date, CURRENT_DATE);
  
  -- Calcular total esperado según frecuencia
  CASE v_mechanism.frequency
    WHEN 'daily' THEN
      v_total_expected := (v_end_date - v_start_date) + 1;
    WHEN 'weekly' THEN
      v_total_expected := CEIL((v_end_date - v_start_date + 1) / 7.0);
    WHEN '2x_week' THEN
      v_total_expected := CEIL((v_end_date - v_start_date + 1) / 7.0) * 2;
    WHEN '3x_week' THEN
      v_total_expected := CEIL((v_end_date - v_start_date + 1) / 7.0) * 3;
    WHEN '4x_week' THEN
      v_total_expected := CEIL((v_end_date - v_start_date + 1) / 7.0) * 4;
    WHEN '5x_week' THEN
      v_total_expected := CEIL((v_end_date - v_start_date + 1) / 7.0) * 5;
    WHEN 'biweekly' THEN
      v_total_expected := CEIL((v_end_date - v_start_date + 1) / 14.0);
    WHEN 'monthly' THEN
      v_total_expected := CEIL((v_end_date - v_start_date + 1) / 30.0);
    WHEN 'yearly' THEN
      v_total_expected := CEIL((v_end_date - v_start_date + 1) / 365.0);
  END CASE;
  
  -- Ajustar por excepciones canceladas
  SELECT v_total_expected - COUNT(*) INTO v_total_expected
  FROM mechanism_schedule_exceptions 
  WHERE mechanism_id = p_mechanism_id 
    AND moved_to_date IS NULL 
    AND original_date BETWEEN v_start_date AND v_end_date;
  
  -- Contar completions reales
  SELECT COUNT(*) INTO v_total_completed
  FROM mechanism_completions 
  WHERE mechanism_id = p_mechanism_id 
    AND user_id = p_user_id 
    AND completed_date BETWEEN v_start_date AND v_end_date;
  
  -- Calcular racha actual
  WITH consecutive_days AS (
    SELECT 
      completed_date,
      completed_date - ROW_NUMBER() OVER (ORDER BY completed_date DESC)::integer AS grp
    FROM mechanism_completions 
    WHERE mechanism_id = p_mechanism_id 
      AND user_id = p_user_id 
      AND completed_date <= CURRENT_DATE
    ORDER BY completed_date DESC
  )
  SELECT COUNT(*) INTO v_current_streak
  FROM consecutive_days 
  WHERE grp = (SELECT grp FROM consecutive_days LIMIT 1);
  
  RETURN QUERY SELECT 
    v_total_expected,
    v_total_completed,
    CASE 
      WHEN v_total_expected > 0 THEN (v_total_completed::DECIMAL / v_total_expected * 100)
      ELSE 0 
    END,
    (SELECT MAX(completed_date) FROM mechanism_completions 
     WHERE mechanism_id = p_mechanism_id AND user_id = p_user_id),
    v_current_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para calcular progreso de meta
CREATE OR REPLACE FUNCTION calculate_goal_progress(
  p_goal_id UUID,
  p_user_id UUID,
  p_period_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_mechanisms INTEGER,
  active_mechanisms INTEGER,
  avg_progress DECIMAL(5,2),
  mechanisms_on_track INTEGER,
  goal_completion_prediction_days INTEGER,
  last_activity_date DATE
) AS $$
BEGIN
  RETURN QUERY
  WITH mechanism_progress AS (
    SELECT 
      m.id,
      m.description,
      mp.total_expected,
      mp.total_completed,
      mp.progress_percentage,
      mp.last_completion_date,
      mp.current_streak,
      CASE 
        WHEN mp.progress_percentage >= 70 THEN 1 
        ELSE 0 
      END as is_on_track
    FROM mechanisms m
    CROSS JOIN LATERAL calculate_mechanism_progress(
      m.id, 
      p_user_id, 
      CURRENT_DATE - p_period_days, 
      CURRENT_DATE
    ) mp
    WHERE m.goal_id = p_goal_id AND m.user_id = p_user_id
  )
  SELECT 
    COUNT(*)::INTEGER as total_mechanisms,
    COUNT(CASE WHEN progress_percentage > 0 THEN 1 END)::INTEGER as active_mechanisms,
    COALESCE(AVG(progress_percentage), 0)::DECIMAL(5,2) as avg_progress,
    SUM(is_on_track)::INTEGER as mechanisms_on_track,
    CASE 
      WHEN AVG(progress_percentage) > 0 THEN 
        CEIL((100 - AVG(progress_percentage)) / (AVG(progress_percentage) / p_period_days))
      ELSE NULL
    END::INTEGER as goal_completion_prediction_days,
    MAX(last_completion_date) as last_activity_date
  FROM mechanism_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para generar vista del calendario
CREATE OR REPLACE FUNCTION get_user_calendar_view(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date DATE,
  mechanism_id UUID,
  mechanism_description TEXT,
  goal_id UUID,
  goal_description TEXT,
  is_scheduled BOOLEAN,
  is_exception BOOLEAN,
  is_completed BOOLEAN,
  original_date DATE
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE date_series AS (
    SELECT p_start_date as date
    UNION ALL
    SELECT date + 1
    FROM date_series
    WHERE date < p_end_date
  ),
  mechanism_dates AS (
    SELECT 
      ds.date,
      m.id as mechanism_id,
      m.description as mechanism_description,
      m.goal_id,
      g.description as goal_description,
      -- Lógica para determinar si debe estar programado según frecuencia
      CASE 
        WHEN m.frequency = 'daily' THEN true
        WHEN m.frequency = 'weekly' AND EXTRACT(DOW FROM ds.date) = EXTRACT(DOW FROM m.start_date) THEN true
        WHEN m.frequency = '2x_week' AND EXTRACT(DOW FROM ds.date) IN (1, 4) THEN true -- Lun y Jue
        WHEN m.frequency = '3x_week' AND EXTRACT(DOW FROM ds.date) IN (1, 3, 5) THEN true -- LMV
        WHEN m.frequency = '4x_week' AND EXTRACT(DOW FROM ds.date) IN (1, 2, 4, 5) THEN true -- LMaJV
        WHEN m.frequency = '5x_week' AND EXTRACT(DOW FROM ds.date) BETWEEN 1 AND 5 THEN true -- L-V
        WHEN m.frequency = 'biweekly' AND EXTRACT(DOW FROM ds.date) = EXTRACT(DOW FROM m.start_date) AND 
             (ds.date - m.start_date) % 14 = 0 THEN true
        WHEN m.frequency = 'monthly' AND EXTRACT(DAY FROM ds.date) = EXTRACT(DAY FROM m.start_date) THEN true
        WHEN m.frequency = 'yearly' AND EXTRACT(MONTH FROM ds.date) = EXTRACT(MONTH FROM m.start_date) AND 
             EXTRACT(DAY FROM ds.date) = EXTRACT(DAY FROM m.start_date) THEN true
        ELSE false
      END as should_be_scheduled,
      ds.date as original_date
    FROM date_series ds
    CROSS JOIN mechanisms m
    JOIN goals g ON g.id = m.goal_id
    WHERE m.user_id = p_user_id
      AND ds.date >= m.start_date
      AND (m.end_date IS NULL OR ds.date <= m.end_date)
  )
  SELECT 
    md.date,
    md.mechanism_id,
    md.mechanism_description,
    md.goal_id,
    md.goal_description,
    CASE 
      WHEN ex.moved_to_date IS NOT NULL THEN false -- Movida a otra fecha
      WHEN ex.moved_to_date IS NULL AND ex.id IS NOT NULL THEN false -- Cancelada
      ELSE md.should_be_scheduled
    END as is_scheduled,
    ex.id IS NOT NULL as is_exception,
    mc.id IS NOT NULL as is_completed,
    md.original_date
  FROM mechanism_dates md
  LEFT JOIN mechanism_schedule_exceptions ex ON ex.mechanism_id = md.mechanism_id AND ex.original_date = md.date
  LEFT JOIN mechanism_completions mc ON mc.mechanism_id = md.mechanism_id AND mc.completed_date = md.date AND mc.user_id = p_user_id
  WHERE md.should_be_scheduled OR ex.id IS NOT NULL
  
  UNION ALL
  
  -- Incluir actividades movidas a esta fecha
  SELECT 
    ex.moved_to_date as date,
    ex.mechanism_id,
    m.description as mechanism_description,
    m.goal_id,
    g.description as goal_description,
    true as is_scheduled,
    true as is_exception,
    mc.id IS NOT NULL as is_completed,
    ex.original_date
  FROM mechanism_schedule_exceptions ex
  JOIN mechanisms m ON m.id = ex.mechanism_id
  JOIN goals g ON g.id = m.goal_id
  LEFT JOIN mechanism_completions mc ON mc.mechanism_id = ex.mechanism_id AND mc.completed_date = ex.moved_to_date AND mc.user_id = p_user_id
  WHERE ex.user_id = p_user_id
    AND ex.moved_to_date IS NOT NULL
    AND ex.moved_to_date BETWEEN p_start_date AND p_end_date
  
  ORDER BY date, mechanism_description;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. CONFIGURAR RLS PARA NUEVAS TABLAS
-- =====================================================

-- Habilitar RLS
ALTER TABLE mechanism_schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanism_completions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users can manage own exceptions" ON mechanism_schedule_exceptions 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own completions" ON mechanism_completions 
  FOR ALL USING (auth.uid() = user_id);

-- 8. COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE mechanism_schedule_exceptions IS 'Excepciones a las reglas de recurrencia (movimientos, cancelaciones)';
COMMENT ON TABLE mechanism_completions IS 'Registro de completions reales de mecanismos';
COMMENT ON FUNCTION calculate_mechanism_progress IS 'Calcula progreso de un mecanismo específico';
COMMENT ON FUNCTION calculate_goal_progress IS 'Calcula progreso agregado de una meta';
COMMENT ON FUNCTION get_user_calendar_view IS 'Genera vista del calendario con fechas dinámicas y excepciones';

-- =====================================================
-- MENSAJE DE CONFIRMACIÓN
-- =====================================================
SELECT 'Migración a esquema optimizado completada exitosamente!' as status;
