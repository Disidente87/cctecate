-- =====================================================
-- CC TECATE - ESQUEMA OPTIMIZADO COMPATIBLE
-- Arquitectura: Recurrencia + Excepciones + Funcionalidad Existente
-- =====================================================

-- =====================================================
-- TABLAS PRINCIPALES (COMPATIBLES CON FUNCIONALIDAD EXISTENTE)
-- =====================================================

-- Tabla de perfiles de usuario (MANTENER ESTRUCTURA EXISTENTE)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('lider', 'senior', 'admin')) NOT NULL DEFAULT 'lider',
  generation TEXT NOT NULL,
  energy_drainers TEXT[] DEFAULT '{}',
  energy_givers TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de generaciones (MANTENER ESTRUCTURA EXISTENTE)
CREATE TABLE generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  -- Fechas de registro
  registration_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  -- Fechas de la generación
  generation_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  generation_graduation_date TIMESTAMP WITH TIME ZONE NOT NULL,
  -- Fechas de entrenamientos
  basic_training_date TIMESTAMP WITH TIME ZONE NOT NULL,
  advanced_training_date TIMESTAMP WITH TIME ZONE NOT NULL,
  pl1_training_date TIMESTAMP WITH TIME ZONE,
  pl2_training_date TIMESTAMP WITH TIME ZONE,
  pl3_training_date TIMESTAMP WITH TIME ZONE,
  -- Estado de la generación
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de metas (COMPATIBLE + OPTIMIZADA)
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_by_senior_id UUID REFERENCES auth.users(id),
  progress_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  target_points INTEGER DEFAULT 100,
  is_completed BOOLEAN DEFAULT false,
  UNIQUE(user_id, category)
);

-- Tabla de mecanismos (OPTIMIZADA + COMPATIBLE)
CREATE TABLE mechanisms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
  user_id UUID NOT NULL REFERENCES auth.users(id),
  start_date DATE NOT NULL,
  end_date DATE, -- NULL = indefinido
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_frequency CHECK (frequency IN (
    'daily', '2x_week', '3x_week', '4x_week', '5x_week', 
    'weekly', 'biweekly', 'monthly', 'yearly'
  ))
);

-- Tabla de actividades gustosas (MANTENER ESTRUCTURA EXISTENTE)
CREATE TABLE activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  unlock_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_by UUID[] DEFAULT '{}',
  category TEXT NOT NULL,
  points INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de llamadas (OPTIMIZADA PARA CALENDARIO Y CALIFICACIONES)
CREATE TABLE calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  senior_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'rescheduled', 'missed')) DEFAULT 'scheduled',
  -- Nuevos campos para calificaciones
  evaluation_status TEXT CHECK (evaluation_status IN ('pending', 'on_time', 'late', 'rescheduled', 'not_done')) DEFAULT 'pending',
  score DECIMAL(2,1) DEFAULT 0 CHECK (score >= 0 AND score <= 3),
  notes TEXT,
  rescheduled_count INTEGER DEFAULT 0,
  -- Campos para programación automática
  call_schedule_id UUID REFERENCES call_schedules(id), -- Referencia a la programación base
  is_auto_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de actividad completada por usuario (MANTENER ESTRUCTURA EXISTENTE)
CREATE TABLE user_activity_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, activity_id)
);

-- =====================================================
-- NUEVAS TABLAS OPTIMIZADAS PARA CALENDARIO
-- =====================================================

-- Tabla de excepciones de horario (NUEVA)
CREATE TABLE mechanism_schedule_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mechanism_id UUID REFERENCES mechanisms(id) ON DELETE CASCADE NOT NULL,
  original_date DATE NOT NULL, -- Fecha que debería ser según la frecuencia
  moved_to_date DATE, -- NULL = cancelada, DATE = movida
  user_id UUID REFERENCES profiles(id) NOT NULL,
  reason TEXT, -- Opcional: razón del cambio
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mechanism_id, original_date)
);

-- Tabla de completions (NUEVA)
CREATE TABLE mechanism_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mechanism_id UUID REFERENCES mechanisms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  completed_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5), -- Opcional
  UNIQUE(mechanism_id, user_id, completed_date)
);

-- Tabla de programación de llamadas (NUEVA)
CREATE TABLE call_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  senior_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  -- Horarios de llamadas (3 días por semana: Lunes, Miércoles, Viernes)
  monday_time TIME,
  wednesday_time TIME,
  friday_time TIME,
  -- Período de llamadas
  start_date DATE NOT NULL, -- PL1 + 3 días
  end_date DATE NOT NULL,   -- PL3 - 1 semana
  -- Estado de la programación
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(leader_id, senior_id)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices existentes (MANTENER)
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_generation ON profiles(generation);
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_category ON goals(category);
CREATE INDEX idx_goals_completed_by_senior ON goals(completed_by_senior_id);
CREATE INDEX idx_mechanisms_goal_id ON mechanisms(goal_id);
CREATE INDEX idx_mechanisms_user_id ON mechanisms(user_id);
CREATE INDEX idx_activities_unlock_date ON activities(unlock_date);
CREATE INDEX idx_activities_category ON activities(category);
CREATE INDEX idx_calls_leader_id ON calls(leader_id);
CREATE INDEX idx_calls_senior_id ON calls(senior_id);
CREATE INDEX idx_calls_scheduled_date ON calls(scheduled_date);
CREATE INDEX idx_calls_status ON calls(status);

-- Índices optimizados para calendario (NUEVOS)
CREATE INDEX idx_mechanisms_user_goal ON mechanisms (user_id, goal_id);
CREATE INDEX idx_mechanisms_frequency ON mechanisms (frequency, start_date);
CREATE INDEX idx_mechanism_exceptions_lookup ON mechanism_schedule_exceptions (mechanism_id, original_date);
CREATE INDEX idx_mechanism_exceptions_user ON mechanism_schedule_exceptions (user_id, mechanism_id);
CREATE INDEX idx_mechanism_exceptions_date ON mechanism_schedule_exceptions (moved_to_date) WHERE moved_to_date IS NOT NULL;
CREATE INDEX idx_mechanism_completions_calc ON mechanism_completions (mechanism_id, user_id, completed_date);
CREATE INDEX idx_mechanism_completions_date ON mechanism_completions (user_id, completed_date DESC);

-- Índices optimizados para llamadas (NUEVOS)
CREATE INDEX idx_calls_evaluation_status ON calls (evaluation_status);
CREATE INDEX idx_calls_schedule_id ON calls (call_schedule_id);
CREATE INDEX idx_calls_auto_generated ON calls (is_auto_generated);
CREATE INDEX idx_calls_leader_scheduled ON calls (leader_id, scheduled_date);
CREATE INDEX idx_calls_pending_evaluation ON calls (leader_id, evaluation_status) WHERE evaluation_status = 'pending';
CREATE INDEX idx_call_schedules_leader ON call_schedules (leader_id);
CREATE INDEX idx_call_schedules_senior ON call_schedules (senior_id);
CREATE INDEX idx_call_schedules_active ON call_schedules (is_active) WHERE is_active = true;

-- =====================================================
-- FUNCIONES Y TRIGGERS (MANTENER EXISTENTES + NUEVAS)
-- =====================================================

-- Función para actualizar updated_at automáticamente (MANTENER)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at (MANTENER)
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mechanisms_updated_at BEFORE UPDATE ON mechanisms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers para nuevas tablas
CREATE TRIGGER update_mechanism_schedule_exceptions_updated_at BEFORE UPDATE ON mechanism_schedule_exceptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_schedules_updated_at BEFORE UPDATE ON call_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para calcular automáticamente start_date y end_date de mecanismos
CREATE OR REPLACE FUNCTION set_mechanism_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo calcular si no se proporcionaron explícitamente
  IF NEW.start_date IS NULL THEN
    NEW.start_date := calculate_mechanism_start_date(NEW.user_id);
  END IF;
  
  IF NEW.end_date IS NULL THEN
    NEW.end_date := calculate_mechanism_end_date(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_mechanism_dates_trigger
  BEFORE INSERT ON mechanisms
  FOR EACH ROW EXECUTE FUNCTION set_mechanism_dates();

-- =====================================================
-- FUNCIONES DE NEGOCIO (MANTENER EXISTENTES + NUEVAS)
-- =====================================================

-- Función para crear perfil automáticamente (MANTENER)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, generation)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'lider'),
    COALESCE(NEW.raw_user_meta_data->>'generation', 'C1')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente (MANTENER)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función para calcular el leaderboard (MANTENER)
CREATE OR REPLACE FUNCTION get_leaderboard_data(generation_filter TEXT DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_role TEXT,
  total_score NUMERIC,
  goals_completed INTEGER,
  mechanisms_completed INTEGER,
  activities_completed INTEGER,
  calls_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      p.id as user_id,
      p.name as user_name,
      p.role as user_role,
      COALESCE(
        (SELECT COUNT(*) FROM goals g WHERE g.user_id = p.id AND g.completed = true), 0
      ) as goals_completed,
      COALESCE(
        (SELECT COUNT(*) FROM mechanisms m 
         JOIN goals g ON g.id = m.goal_id 
         WHERE g.user_id = p.id), 0
      ) as mechanisms_completed,
      COALESCE(
        (SELECT COUNT(*) FROM user_activity_completions uac WHERE uac.user_id = p.id), 0
      ) as activities_completed,
      COALESCE(
        (SELECT AVG(c.score) FROM calls c WHERE c.leader_id = p.id AND c.status = 'completed'), 0
      ) as calls_score
    FROM profiles p
    WHERE (generation_filter IS NULL OR p.generation = generation_filter)
  )
  SELECT 
    us.user_id,
    us.user_name,
    us.user_role,
    (us.goals_completed * 10 + us.mechanisms_completed * 5 + us.activities_completed * 3 + us.calls_score * 20) as total_score,
    us.goals_completed,
    us.mechanisms_completed,
    us.activities_completed,
    us.calls_score
  FROM user_stats us
  ORDER BY total_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener la generación activa (MANTENER)
CREATE OR REPLACE FUNCTION get_active_generation()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  registration_start_date TIMESTAMP WITH TIME ZONE,
  registration_end_date TIMESTAMP WITH TIME ZONE,
  generation_start_date TIMESTAMP WITH TIME ZONE,
  generation_graduation_date TIMESTAMP WITH TIME ZONE,
  basic_training_date TIMESTAMP WITH TIME ZONE,
  advanced_training_date TIMESTAMP WITH TIME ZONE,
  pl1_training_date TIMESTAMP WITH TIME ZONE,
  pl2_training_date TIMESTAMP WITH TIME ZONE,
  pl3_training_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.description,
    g.registration_start_date,
    g.registration_end_date,
    g.generation_start_date,
    g.generation_graduation_date,
    g.basic_training_date,
    g.advanced_training_date,
    g.pl1_training_date,
    g.pl2_training_date,
    g.pl3_training_date,
    g.is_active,
    g.created_at,
    g.updated_at
  FROM generations g
  WHERE g.is_active = TRUE
    AND CURRENT_TIMESTAMP BETWEEN g.registration_start_date AND g.registration_end_date
  ORDER BY g.registration_start_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIONES PARA CÁLCULO AUTOMÁTICO DE FECHAS
-- =====================================================

-- Función para calcular start_date automáticamente (PL1 + 1 semana)
CREATE OR REPLACE FUNCTION calculate_mechanism_start_date(p_user_id UUID)
RETURNS DATE AS $$
DECLARE
  v_generation_name TEXT;
  v_pl1_date TIMESTAMP WITH TIME ZONE;
  v_start_date DATE;
BEGIN
  -- Obtener la generación del usuario
  SELECT generation INTO v_generation_name
  FROM profiles 
  WHERE id = p_user_id;
  
  IF v_generation_name IS NULL THEN
    -- Si no tiene generación, usar fecha actual
    RETURN CURRENT_DATE;
  END IF;
  
  -- Obtener la fecha PL1 de la generación
  SELECT pl1_training_date INTO v_pl1_date
  FROM generations 
  WHERE name = v_generation_name;
  
  IF v_pl1_date IS NULL THEN
    -- Si no hay PL1 definido, usar fecha actual
    RETURN CURRENT_DATE;
  END IF;
  
  -- Calcular start_date = PL1 + 1 semana
  v_start_date := (v_pl1_date + INTERVAL '7 days')::DATE;
  
  RETURN v_start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para calcular end_date automáticamente (PL3 - 1 semana)
CREATE OR REPLACE FUNCTION calculate_mechanism_end_date(p_user_id UUID)
RETURNS DATE AS $$
DECLARE
  v_generation_name TEXT;
  v_pl3_date TIMESTAMP WITH TIME ZONE;
  v_end_date DATE;
BEGIN
  -- Obtener la generación del usuario
  SELECT generation INTO v_generation_name
  FROM profiles 
  WHERE id = p_user_id;
  
  IF v_generation_name IS NULL THEN
    -- Si no tiene generación, usar NULL (indefinido)
    RETURN NULL;
  END IF;
  
  -- Obtener la fecha PL3 de la generación
  SELECT pl3_training_date INTO v_pl3_date
  FROM generations 
  WHERE name = v_generation_name;
  
  IF v_pl3_date IS NULL THEN
    -- Si no hay PL3 definido, usar NULL (indefinido)
    RETURN NULL;
  END IF;
  
  -- Calcular end_date = PL3 - 1 semana
  v_end_date := (v_pl3_date - INTERVAL '7 days')::DATE;
  
  RETURN v_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- NUEVAS FUNCIONES OPTIMIZADAS PARA CALENDARIO
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
    md.date as date,
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

-- =====================================================
-- FUNCIONES OPTIMIZADAS PARA SISTEMA DE LLAMADAS
-- =====================================================

-- Función para crear programación de llamadas automática
CREATE OR REPLACE FUNCTION create_call_schedule(
  p_leader_id UUID,
  p_senior_id UUID,
  p_monday_time TIME,
  p_wednesday_time TIME,
  p_friday_time TIME
)
RETURNS UUID AS $$
DECLARE
  v_schedule_id UUID;
  v_leader_generation TEXT;
  v_pl1_date TIMESTAMP WITH TIME ZONE;
  v_pl3_date TIMESTAMP WITH TIME ZONE;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Obtener la generación del líder
  SELECT generation INTO v_leader_generation
  FROM profiles 
  WHERE id = p_leader_id;
  
  IF v_leader_generation IS NULL THEN
    RAISE EXCEPTION 'Líder no encontrado o sin generación asignada';
  END IF;
  
  -- Obtener fechas PL1 y PL3 de la generación
  SELECT pl1_training_date, pl3_training_date 
  INTO v_pl1_date, v_pl3_date
  FROM generations 
  WHERE name = v_leader_generation;
  
  IF v_pl1_date IS NULL OR v_pl3_date IS NULL THEN
    RAISE EXCEPTION 'Fechas PL1 o PL3 no definidas para la generación %', v_leader_generation;
  END IF;
  
  -- Calcular fechas de inicio y fin
  v_start_date := (v_pl1_date + INTERVAL '2 days')::DATE;
  v_end_date := (v_pl3_date - INTERVAL '5 days')::DATE;
  
  -- Crear la programación
  INSERT INTO call_schedules (
    leader_id, 
    senior_id, 
    monday_time, 
    wednesday_time, 
    friday_time, 
    start_date, 
    end_date
  ) VALUES (
    p_leader_id, 
    p_senior_id, 
    p_monday_time,
    p_wednesday_time,
    p_friday_time,
    v_start_date, 
    v_end_date
  ) RETURNING id INTO v_schedule_id;
  
  -- Generar todas las llamadas automáticamente
  PERFORM generate_calls_from_schedule(v_schedule_id);
  
  RETURN v_schedule_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para generar llamadas desde una programación
CREATE OR REPLACE FUNCTION generate_calls_from_schedule(p_schedule_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_schedule RECORD;
  v_current_date DATE;
  v_call_count INTEGER := 0;
  v_scheduled_datetime TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Obtener información de la programación
  SELECT * INTO v_schedule
  FROM call_schedules 
  WHERE id = p_schedule_id;
  
  IF v_schedule IS NULL THEN
    RAISE EXCEPTION 'Programación no encontrada';
  END IF;
  
  -- Iterar por todas las fechas en el rango
  v_current_date := v_schedule.start_date;
  
  WHILE v_current_date <= v_schedule.end_date LOOP
    -- Lunes
    IF v_schedule.monday_time IS NOT NULL AND EXTRACT(DOW FROM v_current_date) = 1 THEN
      -- Combinar la fecha con la hora (se guarda en UTC)
      v_scheduled_datetime := (v_current_date + v_schedule.monday_time)::TIMESTAMP WITH TIME ZONE;
      INSERT INTO calls (leader_id, senior_id, scheduled_date, call_schedule_id, is_auto_generated)
      VALUES (v_schedule.leader_id, v_schedule.senior_id, v_scheduled_datetime, p_schedule_id, TRUE)
      ON CONFLICT DO NOTHING;
      v_call_count := v_call_count + 1;
    END IF;
    
    -- Miércoles
    IF v_schedule.wednesday_time IS NOT NULL AND EXTRACT(DOW FROM v_current_date) = 3 THEN
      -- Combinar la fecha con la hora (se guarda en UTC)
      v_scheduled_datetime := (v_current_date + v_schedule.wednesday_time)::TIMESTAMP WITH TIME ZONE;
      INSERT INTO calls (leader_id, senior_id, scheduled_date, call_schedule_id, is_auto_generated)
      VALUES (v_schedule.leader_id, v_schedule.senior_id, v_scheduled_datetime, p_schedule_id, TRUE)
      ON CONFLICT DO NOTHING;
      v_call_count := v_call_count + 1;
    END IF;
    
    -- Viernes
    IF v_schedule.friday_time IS NOT NULL AND EXTRACT(DOW FROM v_current_date) = 5 THEN
      -- Combinar la fecha con la hora (se guarda en UTC)
      v_scheduled_datetime := (v_current_date + v_schedule.friday_time)::TIMESTAMP WITH TIME ZONE;
      INSERT INTO calls (leader_id, senior_id, scheduled_date, call_schedule_id, is_auto_generated)
      VALUES (v_schedule.leader_id, v_schedule.senior_id, v_scheduled_datetime, p_schedule_id, TRUE)
      ON CONFLICT DO NOTHING;
      v_call_count := v_call_count + 1;
    END IF;
    
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN v_call_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para evaluar una llamada
CREATE OR REPLACE FUNCTION evaluate_call(
  p_call_id UUID,
  p_evaluation_status TEXT,
  p_score DECIMAL(2,1) DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_call RECORD;
  v_calculated_score DECIMAL(2,1);
BEGIN
  -- Obtener información de la llamada
  SELECT * INTO v_call
  FROM calls 
  WHERE id = p_call_id;
  
  IF v_call IS NULL THEN
    RAISE EXCEPTION 'Llamada no encontrada';
  END IF;
  
  -- Calcular score automáticamente si no se proporciona
  IF p_score IS NULL THEN
    CASE p_evaluation_status
      WHEN 'on_time' THEN v_calculated_score := 3.0;
      WHEN 'late' THEN v_calculated_score := 2.0;
      WHEN 'rescheduled' THEN v_calculated_score := 1.0;
      WHEN 'not_done' THEN v_calculated_score := 0.0;
      ELSE v_calculated_score := 0.0;
    END CASE;
  ELSE
    v_calculated_score := p_score;
  END IF;
  
  -- Actualizar la llamada
  UPDATE calls 
  SET 
    evaluation_status = p_evaluation_status,
    score = v_calculated_score,
    notes = COALESCE(p_notes, notes),
    status = CASE 
      WHEN p_evaluation_status IN ('on_time', 'late', 'rescheduled') THEN 'completed'
      WHEN p_evaluation_status = 'not_done' THEN 'missed'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_call_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de llamadas
CREATE OR REPLACE FUNCTION get_call_statistics(p_leader_id UUID)
RETURNS TABLE (
  total_calls INTEGER,
  completed_calls INTEGER,
  pending_calls INTEGER,
  total_score DECIMAL(5,1),
  progress_percentage DECIMAL(5,2),
  available_percentage DECIMAL(5,2),
  on_time_calls INTEGER,
  late_calls INTEGER,
  rescheduled_calls INTEGER,
  not_done_calls INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_calls,
    COUNT(CASE WHEN evaluation_status != 'pending' THEN 1 END)::INTEGER as completed_calls,
    COUNT(CASE WHEN evaluation_status = 'pending' THEN 1 END)::INTEGER as pending_calls,
    COALESCE(SUM(score), 0)::DECIMAL(5,1) as total_score,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(CASE WHEN evaluation_status = 'on_time' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
    END::DECIMAL(5,2) as progress_percentage,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(CASE WHEN evaluation_status != 'pending' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
    END::DECIMAL(5,2) as available_percentage,
    COUNT(CASE WHEN evaluation_status = 'on_time' THEN 1 END)::INTEGER as on_time_calls,
    COUNT(CASE WHEN evaluation_status = 'late' THEN 1 END)::INTEGER as late_calls,
    COUNT(CASE WHEN evaluation_status = 'rescheduled' THEN 1 END)::INTEGER as rescheduled_calls,
    COUNT(CASE WHEN evaluation_status = 'not_done' THEN 1 END)::INTEGER as not_done_calls
  FROM calls 
  WHERE leader_id = p_leader_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener la próxima llamada
CREATE OR REPLACE FUNCTION get_next_call(p_leader_id UUID)
RETURNS TABLE (
  call_id UUID,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  senior_name TEXT,
  senior_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as call_id,
    c.scheduled_date,
    p.name as senior_name,
    p.email as senior_email
  FROM calls c
  JOIN profiles p ON p.id = c.senior_id
  WHERE c.leader_id = p_leader_id
    AND c.evaluation_status = 'pending'
    AND c.scheduled_date > NOW()
  ORDER BY c.scheduled_date ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para generar vista del calendario de llamadas
CREATE OR REPLACE FUNCTION get_calls_calendar_view(
  p_leader_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date DATE,
  call_id UUID,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  senior_name TEXT,
  evaluation_status TEXT,
  score DECIMAL(2,1),
  color_code TEXT,
  is_pending BOOLEAN,
  is_future BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.scheduled_date::DATE as date,
    c.id as call_id,
    c.scheduled_date as scheduled_time,
    p.name as senior_name,
    c.evaluation_status,
    c.score,
    -- Códigos de color según el estado
    CASE 
      WHEN c.evaluation_status = 'on_time' THEN 'green'
      WHEN c.evaluation_status = 'late' THEN 'yellow'
      WHEN c.evaluation_status = 'rescheduled' THEN 'yellow'
      WHEN c.evaluation_status = 'not_done' THEN 'red'
      WHEN c.evaluation_status = 'pending' AND c.scheduled_date::DATE > CURRENT_DATE THEN 'gray'
      WHEN c.evaluation_status = 'pending' AND c.scheduled_date::DATE <= CURRENT_DATE THEN 'blue'
      ELSE 'gray'
    END as color_code,
    (c.evaluation_status = 'pending') as is_pending,
    (c.scheduled_date::DATE > CURRENT_DATE) as is_future
  FROM calls c
  JOIN profiles p ON p.id = c.senior_id
  WHERE c.leader_id = p_leader_id
    AND c.scheduled_date::DATE BETWEEN p_start_date AND p_end_date
  ORDER BY c.scheduled_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener llamadas pendientes de evaluación
CREATE OR REPLACE FUNCTION get_pending_calls(p_leader_id UUID)
RETURNS TABLE (
  call_id UUID,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  senior_name TEXT,
  senior_email TEXT,
  days_since_scheduled INTEGER,
  is_overdue BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as call_id,
    c.scheduled_date,
    p.name as senior_name,
    p.email as senior_email,
    (CURRENT_DATE - c.scheduled_date::DATE) as days_since_scheduled,
    (c.scheduled_date::DATE < CURRENT_DATE) as is_overdue
  FROM calls c
  JOIN profiles p ON p.id = c.senior_id
  WHERE c.leader_id = p_leader_id
    AND c.evaluation_status = 'pending'
    AND c.scheduled_date::DATE <= CURRENT_DATE
  ORDER BY c.scheduled_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener perfiles de seniors (sin problemas de RLS)
CREATE OR REPLACE FUNCTION get_senior_profiles()
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    role TEXT,
    generation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.email,
        p.role,
        p.generation
    FROM profiles p
    WHERE p.role = 'senior'
    ORDER BY p.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - POLÍTICAS COMPLETAS
-- =====================================================

-- Habilitar Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanisms ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanism_schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanism_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_schedules ENABLE ROW LEVEL SECURITY;

-- Políticas básicas para profiles (MANTENER)
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Política para que los líderes puedan ver los perfiles de seniors
-- Usar una función auxiliar para evitar recursión
CREATE OR REPLACE FUNCTION is_user_leader()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'lider'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Leaders can view senior profiles" ON profiles
    FOR SELECT USING (
        role = 'senior' AND is_user_leader()
    );

-- Función auxiliar para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política para que los admins puedan ver todos los perfiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (is_user_admin());

-- Políticas básicas para goals (MANTENER)
CREATE POLICY "Users can view own goals" ON goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals" ON goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON goals
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas básicas para mechanisms (MANTENER)
CREATE POLICY "Users can view mechanisms for their goals" ON mechanisms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM goals 
            WHERE goals.id = mechanisms.goal_id 
            AND goals.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create mechanisms for their goals" ON mechanisms
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM goals 
            WHERE goals.id = mechanisms.goal_id 
            AND goals.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update mechanisms for their goals" ON mechanisms
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM goals 
            WHERE goals.id = mechanisms.goal_id 
            AND goals.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete mechanisms for their goals" ON mechanisms
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM goals 
            WHERE goals.id = mechanisms.goal_id 
            AND goals.user_id = auth.uid()
        )
    );

-- Políticas básicas para activities (MANTENER)
CREATE POLICY "Authenticated users can view active activities" ON activities
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Políticas básicas para calls (MANTENER)
CREATE POLICY "Users can view calls they are involved in" ON calls
    FOR SELECT USING (auth.uid() = leader_id OR auth.uid() = senior_id);

CREATE POLICY "Users can create calls" ON calls
    FOR INSERT WITH CHECK (auth.uid() = leader_id OR auth.uid() = senior_id);

CREATE POLICY "Users can update calls they are involved in" ON calls
    FOR UPDATE USING (auth.uid() = leader_id OR auth.uid() = senior_id);

-- Políticas básicas para user_activity_completions (MANTENER)
CREATE POLICY "Users can view own activity completions" ON user_activity_completions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activity completions" ON user_activity_completions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity completions" ON user_activity_completions
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas básicas para generations (MANTENER)
CREATE POLICY "Everyone can view generations" ON generations
    FOR SELECT USING (true);

-- Políticas para nuevas tablas optimizadas
CREATE POLICY "Users can manage own exceptions" ON mechanism_schedule_exceptions 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own completions" ON mechanism_completions 
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para call_schedules
CREATE POLICY "Users can manage own call schedules" ON call_schedules 
  FOR ALL USING (auth.uid() = leader_id OR auth.uid() = senior_id);

-- =====================================================
-- DATOS INICIALES (MANTENER EXISTENTES)
-- =====================================================

-- Insertar generaciones de ejemplo (MANTENER)
INSERT INTO generations (
  name, 
  description, 
  registration_start_date, 
  registration_end_date, 
  generation_start_date, 
  generation_graduation_date, 
  basic_training_date, 
  advanced_training_date
) VALUES 
('C1', 'Primera generación de líderes', 
 NOW() - INTERVAL '30 days', NOW() + INTERVAL '30 days',
 NOW() - INTERVAL '15 days', NOW() + INTERVAL '90 days',
 NOW() - INTERVAL '10 days', NOW() + INTERVAL '30 days'),
('C2', 'Segunda generación de líderes', 
 NOW() + INTERVAL '60 days', NOW() + INTERVAL '120 days',
 NOW() + INTERVAL '90 days', NOW() + INTERVAL '180 days',
 NOW() + INTERVAL '100 days', NOW() + INTERVAL '130 days'),
('C3', 'Tercera generación de líderes', 
 NOW() + INTERVAL '150 days', NOW() + INTERVAL '210 days',
 NOW() + INTERVAL '180 days', NOW() + INTERVAL '270 days',
 NOW() + INTERVAL '190 days', NOW() + INTERVAL '220 days');

-- Insertar actividades gustosas de ejemplo (MANTENER)
INSERT INTO activities (title, description, unlock_date, category, points) VALUES 
('Gratitud Matutina', 'Escribe 3 cosas por las que estás agradecido cada mañana', NOW(), 'Bienestar', 10),
('Caminata Consciente', 'Da un paseo de 20 minutos prestando atención a tu entorno', NOW() + INTERVAL '7 days', 'Salud', 15),
('Conversación Profunda', 'Ten una conversación significativa con alguien importante en tu vida', NOW() + INTERVAL '14 days', 'Relaciones', 20),
('Reflexión Nocturna', 'Reflexiona sobre tu día y anota una lección aprendida', NOW() + INTERVAL '21 days', 'Crecimiento', 12),
('Meditación de 10 minutos', 'Practica meditación durante 10 minutos al día', NOW() + INTERVAL '28 days', 'Bienestar', 8),
('Lectura Inspiracional', 'Lee un capítulo de un libro de desarrollo personal', NOW() + INTERVAL '35 days', 'Crecimiento', 15);

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

-- Comentarios en las tablas
COMMENT ON TABLE profiles IS 'Perfiles de usuario que extienden auth.users';
COMMENT ON TABLE generations IS 'Generaciones del programa CC Tecate con fechas de registro y entrenamientos';
COMMENT ON TABLE goals IS 'Metas personales de los usuarios - UNA META POR CATEGORÍA';
COMMENT ON TABLE mechanisms IS 'Mecanismos de acción para alcanzar las metas - 4-6 POR META + OPTIMIZADO PARA CALENDARIO';
COMMENT ON TABLE activities IS 'Actividades gustosas semanales';
COMMENT ON TABLE calls IS 'Llamadas de seguimiento entre líderes y seniors';
COMMENT ON TABLE user_activity_completions IS 'Registro de actividades completadas por usuario';
COMMENT ON TABLE mechanism_schedule_exceptions IS 'Excepciones a las reglas de recurrencia (movimientos, cancelaciones)';
COMMENT ON TABLE mechanism_completions IS 'Registro de completions reales de mecanismos';
COMMENT ON TABLE call_schedules IS 'Programación automática de llamadas (L, M, V) entre líderes y seniors';

-- Comentarios en las columnas importantes
COMMENT ON COLUMN profiles.role IS 'Rol del usuario: lider, senior, admin';
COMMENT ON COLUMN profiles.generation IS 'Generación a la que pertenece el usuario';
COMMENT ON COLUMN profiles.energy_drainers IS 'Lista de cosas que quitan energía al usuario';
COMMENT ON COLUMN profiles.energy_givers IS 'Lista de cosas que dan energía al usuario';
COMMENT ON COLUMN goals.completed_by_senior_id IS 'ID del Senior que marcó la meta como completada';
COMMENT ON COLUMN goals.progress_percentage IS 'Porcentaje de avance de la meta (0-100)';
COMMENT ON COLUMN mechanisms.frequency IS 'Frecuencia con la que se realiza el mecanismo: daily, 2x_week, 3x_week, 4x_week, 5x_week, weekly, biweekly, monthly, yearly';
COMMENT ON COLUMN mechanisms.user_id IS 'ID del usuario propietario del mecanismo';
COMMENT ON COLUMN mechanisms.start_date IS 'Fecha de inicio del mecanismo (para lógica de recurrencia)';
COMMENT ON COLUMN mechanisms.end_date IS 'Fecha de fin del mecanismo (NULL = indefinido)';
COMMENT ON COLUMN calls.score IS 'Puntuación de la llamada: 0-3 puntos';
COMMENT ON COLUMN calls.evaluation_status IS 'Estado de evaluación: pending, on_time, late, rescheduled, not_done';
COMMENT ON COLUMN calls.call_schedule_id IS 'Referencia a la programación base de llamadas';
COMMENT ON COLUMN calls.is_auto_generated IS 'Indica si la llamada fue generada automáticamente';
COMMENT ON COLUMN call_schedules.monday_time IS 'Hora de llamadas los lunes';
COMMENT ON COLUMN call_schedules.wednesday_time IS 'Hora de llamadas los miércoles';
COMMENT ON COLUMN call_schedules.friday_time IS 'Hora de llamadas los viernes';
COMMENT ON COLUMN activities.unlock_date IS 'Fecha en que se desbloquea la actividad';
COMMENT ON COLUMN activities.completed_by IS 'Array de IDs de usuarios que completaron la actividad';

-- Comentarios en las funciones
COMMENT ON FUNCTION calculate_mechanism_progress IS 'Calcula progreso de un mecanismo específico';
COMMENT ON FUNCTION calculate_goal_progress IS 'Calcula progreso agregado de una meta';
COMMENT ON FUNCTION get_user_calendar_view IS 'Genera vista del calendario con fechas dinámicas y excepciones';
COMMENT ON FUNCTION create_call_schedule IS 'Crea programación automática de llamadas para un líder';
COMMENT ON FUNCTION generate_calls_from_schedule IS 'Genera todas las llamadas desde una programación';
COMMENT ON FUNCTION evaluate_call IS 'Evalúa una llamada con calificación y estado';
COMMENT ON FUNCTION get_call_statistics IS 'Obtiene estadísticas de llamadas para un líder';
COMMENT ON FUNCTION get_next_call IS 'Obtiene la próxima llamada pendiente de un líder';
COMMENT ON FUNCTION get_calls_calendar_view IS 'Genera vista del calendario de llamadas con colores por estado';
COMMENT ON FUNCTION get_pending_calls IS 'Obtiene llamadas pendientes de evaluación';

-- =====================================================
-- MENSAJE DE CONFIRMACIÓN
-- =====================================================
SELECT 'Base de datos CC Tecate optimizada y compatible creada exitosamente! Incluye sistema de llamadas automático.' as status;
