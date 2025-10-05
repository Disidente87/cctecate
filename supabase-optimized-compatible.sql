-- =====================================================
-- CC TECATE - ESQUEMA OPTIMIZADO COMPATIBLE
-- Arquitectura: Recurrencia + Excepciones + Funcionalidad Existente
-- =====================================================

-- =====================================================
-- TABLAS PRINCIPALES (COMPATIBLES CON FUNCIONALIDAD EXISTENTE)
-- =====================================================

-- Tabla de perfiles de usuario (MANTENER ESTRUCTURA EXISTENTE + PARTICIPACIONES + PERFIL COMPLETO)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('lider', 'senior', 'master_senior', 'admin')) NOT NULL DEFAULT 'lider',
  generation TEXT NOT NULL,
  -- Supervisor asignado (nullable: permite registro sin asignación inmediata)
  -- Puede ser un senior, master_senior o admin
  supervisor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Participación activa del usuario (solo admins pueden cambiar)
  active_participation_id UUID REFERENCES user_participations(id),
  -- Campos de perfil personal
  phone TEXT,
  birth_date DATE,
  personal_contract TEXT,
  bio TEXT,
  location TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  -- Arrays de energía (máximo 10 elementos cada uno)
  energy_drainers TEXT[] DEFAULT '{}',
  energy_givers TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restricciones de validación para la tabla profiles
ALTER TABLE profiles 
ADD CONSTRAINT check_personal_contract_length 
CHECK (personal_contract IS NULL OR array_length(string_to_array(personal_contract, ' '), 1) <= 20);

ALTER TABLE profiles 
ADD CONSTRAINT check_energy_givers_length 
CHECK (array_length(energy_givers, 1) IS NULL OR array_length(energy_givers, 1) <= 10);

ALTER TABLE profiles 
ADD CONSTRAINT check_energy_drainers_length 
CHECK (array_length(energy_drainers, 1) IS NULL OR array_length(energy_drainers, 1) <= 10);

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

-- Tabla de participaciones de usuarios (NUEVA - SISTEMA DE PARTICIPACIONES)
CREATE TABLE user_participations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  generation_id UUID REFERENCES generations(id) NOT NULL,
  role TEXT CHECK (role IN ('lider', 'senior', 'master_senior', 'admin')) NOT NULL,
  status TEXT CHECK (status IN ('active', 'completed', 'inactive')) DEFAULT 'active',
  participation_number INTEGER NOT NULL, -- 1, 2, 3... para ordenar participaciones
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, generation_id, role) -- Un usuario solo puede ser lider/senior una vez por generación
);

-- Tabla de metas (COMPATIBLE + OPTIMIZADA + PARTICIPACIONES)
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  -- Participación específica a la que pertenece esta meta
  user_participation_id UUID REFERENCES user_participations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_by_supervisor_id UUID REFERENCES auth.users(id),
  progress_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  target_points INTEGER DEFAULT 100,
  is_completed BOOLEAN DEFAULT false,
  UNIQUE(user_id, category)
);

-- Tabla de mecanismos (OPTIMIZADA + COMPATIBLE + PARTICIPACIONES)
CREATE TABLE mechanisms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  -- Participación específica a la que pertenece este mecanismo
  user_participation_id UUID REFERENCES user_participations(id) ON DELETE CASCADE,
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
  unlock_date DATE NOT NULL,
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
  supervisor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
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
  supervisor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
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
  UNIQUE(leader_id, supervisor_id)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices existentes (MANTENER)
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_generation ON profiles(generation);
CREATE INDEX idx_profiles_supervisor_id ON profiles(supervisor_id);
CREATE INDEX idx_profiles_active_participation ON profiles(active_participation_id);
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_category ON goals(category);
CREATE INDEX idx_goals_completed_by_supervisor ON goals(completed_by_supervisor_id);
CREATE INDEX idx_goals_participation_id ON goals(user_participation_id);
CREATE INDEX idx_mechanisms_goal_id ON mechanisms(goal_id);
CREATE INDEX idx_mechanisms_user_id ON mechanisms(user_id);
CREATE INDEX idx_mechanisms_participation_id ON mechanisms(user_participation_id);
CREATE INDEX idx_activities_unlock_date ON activities(unlock_date);
CREATE INDEX idx_activities_category ON activities(category);
CREATE INDEX idx_calls_leader_id ON calls(leader_id);
CREATE INDEX idx_calls_supervisor_id ON calls(supervisor_id);
CREATE INDEX idx_calls_scheduled_date ON calls(scheduled_date);
CREATE INDEX idx_calls_status ON calls(status);

-- Índices para participaciones (NUEVOS)
CREATE INDEX idx_user_participations_user_id ON user_participations(user_id);
CREATE INDEX idx_user_participations_generation_id ON user_participations(generation_id);
CREATE INDEX idx_user_participations_role ON user_participations(role);
CREATE INDEX idx_user_participations_status ON user_participations(status);
CREATE INDEX idx_user_participations_active ON user_participations(user_id, status) WHERE status = 'active';

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
CREATE INDEX idx_call_schedules_supervisor ON call_schedules (supervisor_id);
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

-- Trigger para user_participations
CREATE TRIGGER update_user_participations_updated_at 
  BEFORE UPDATE ON user_participations
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

-- Función para crear perfil automáticamente (SIMPLIFICADA - SOLO PERFIL BÁSICO)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_role TEXT;
  v_generation_name TEXT;
BEGIN
  -- Obtener datos de los metadatos del usuario
  v_user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'lider');
  v_generation_name := COALESCE(NEW.raw_user_meta_data->>'generation', 'C1');
  
  -- Solo crear el perfil básico (sin participaciones por ahora)
  INSERT INTO public.profiles (id, email, name, role, generation)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    v_user_role,
    v_generation_name
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Si el perfil ya existe, no hacer nada
    RETURN NEW;
  WHEN OTHERS THEN
    -- Si hay cualquier error, no fallar el registro de auth.users
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente (MANTENER)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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
-- FUNCIONES PARA GESTIÓN DE PERFIL
-- =====================================================

-- Función para validar el contrato personal (máximo 20 palabras)
CREATE OR REPLACE FUNCTION validate_personal_contract(contract_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF contract_text IS NULL OR contract_text = '' THEN
    RETURN TRUE; -- Permitir valores nulos o vacíos
  END IF;
  
  -- Contar palabras (separadas por espacios)
  RETURN array_length(string_to_array(trim(contract_text), ' '), 1) <= 20;
END;
$$ LANGUAGE plpgsql;

-- Función para validar arrays de energía (máximo 10 elementos)
CREATE OR REPLACE FUNCTION validate_energy_arrays(energy_array TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  IF energy_array IS NULL THEN
    RETURN TRUE; -- Permitir arrays nulos
  END IF;
  
  -- Verificar que no tenga más de 10 elementos
  RETURN array_length(energy_array, 1) <= 10;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar el perfil completo
CREATE OR REPLACE FUNCTION update_user_profile(
  p_user_id UUID,
  p_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_birth_date DATE DEFAULT NULL,
  p_personal_contract TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_linkedin_url TEXT DEFAULT NULL,
  p_website_url TEXT DEFAULT NULL,
  p_energy_givers TEXT[] DEFAULT NULL,
  p_energy_drainers TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_word_count INTEGER;
BEGIN
  -- Verificar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN QUERY SELECT FALSE, 'Usuario no encontrado';
    RETURN;
  END IF;
  
  -- Validar contrato personal (máximo 20 palabras)
  IF p_personal_contract IS NOT NULL AND p_personal_contract != '' THEN
    v_word_count := array_length(string_to_array(trim(p_personal_contract), ' '), 1);
    IF v_word_count > 20 THEN
      RETURN QUERY SELECT FALSE, 'El contrato personal no puede tener más de 20 palabras';
      RETURN;
    END IF;
  END IF;
  
  -- Validar arrays de energía (máximo 10 elementos cada uno)
  IF p_energy_givers IS NOT NULL AND array_length(p_energy_givers, 1) > 10 THEN
    RETURN QUERY SELECT FALSE, 'Las cosas que dan energía no pueden ser más de 10';
    RETURN;
  END IF;
  
  IF p_energy_drainers IS NOT NULL AND array_length(p_energy_drainers, 1) > 10 THEN
    RETURN QUERY SELECT FALSE, 'Las cosas que quitan energía no pueden ser más de 10';
    RETURN;
  END IF;
  
  -- Actualizar el perfil
  UPDATE profiles 
  SET 
    name = COALESCE(p_name, name),
    phone = COALESCE(p_phone, phone),
    birth_date = COALESCE(p_birth_date, birth_date),
    personal_contract = COALESCE(p_personal_contract, personal_contract),
    bio = COALESCE(p_bio, bio),
    location = COALESCE(p_location, location),
    linkedin_url = COALESCE(p_linkedin_url, linkedin_url),
    website_url = COALESCE(p_website_url, website_url),
    energy_givers = COALESCE(p_energy_givers, energy_givers),
    energy_drainers = COALESCE(p_energy_drainers, energy_drainers),
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN QUERY SELECT TRUE, 'Perfil actualizado exitosamente';
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'Error al actualizar el perfil: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el perfil completo del usuario
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  generation TEXT,
  phone TEXT,
  birth_date DATE,
  personal_contract TEXT,
  bio TEXT,
  location TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  energy_givers TEXT[],
  energy_drainers TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.name,
    p.role,
    p.generation,
    p.phone,
    p.birth_date,
    p.personal_contract,
    p.bio,
    p.location,
    p.linkedin_url,
    p.website_url,
    p.energy_givers,
    p.energy_drainers,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.id = p_user_id;
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
  p_supervisor_id UUID,
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
    supervisor_id, 
    monday_time, 
    wednesday_time, 
    friday_time, 
    start_date, 
    end_date
  ) VALUES (
    p_leader_id, 
    p_supervisor_id, 
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
      INSERT INTO calls (leader_id, supervisor_id, scheduled_date, call_schedule_id, is_auto_generated)
      VALUES (v_schedule.leader_id, v_schedule.supervisor_id, v_scheduled_datetime, p_schedule_id, TRUE)
      ON CONFLICT DO NOTHING;
      v_call_count := v_call_count + 1;
    END IF;
    
    -- Miércoles
    IF v_schedule.wednesday_time IS NOT NULL AND EXTRACT(DOW FROM v_current_date) = 3 THEN
      -- Combinar la fecha con la hora (se guarda en UTC)
      v_scheduled_datetime := (v_current_date + v_schedule.wednesday_time)::TIMESTAMP WITH TIME ZONE;
      INSERT INTO calls (leader_id, supervisor_id, scheduled_date, call_schedule_id, is_auto_generated)
      VALUES (v_schedule.leader_id, v_schedule.supervisor_id, v_scheduled_datetime, p_schedule_id, TRUE)
      ON CONFLICT DO NOTHING;
      v_call_count := v_call_count + 1;
    END IF;
    
    -- Viernes
    IF v_schedule.friday_time IS NOT NULL AND EXTRACT(DOW FROM v_current_date) = 5 THEN
      -- Combinar la fecha con la hora (se guarda en UTC)
      v_scheduled_datetime := (v_current_date + v_schedule.friday_time)::TIMESTAMP WITH TIME ZONE;
      INSERT INTO calls (leader_id, supervisor_id, scheduled_date, call_schedule_id, is_auto_generated)
      VALUES (v_schedule.leader_id, v_schedule.supervisor_id, v_scheduled_datetime, p_schedule_id, TRUE)
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
  JOIN profiles p ON p.id = c.supervisor_id
  WHERE c.leader_id = p_leader_id
    AND c.evaluation_status = 'pending'
    AND c.scheduled_date > NOW()
  ORDER BY c.scheduled_date ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para generar vista del calendario de llamadas (CORREGIDA)
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
    -- Códigos de color según el estado - CORREGIDO
    CASE 
      WHEN c.evaluation_status = 'on_time' THEN 'green'
      WHEN c.evaluation_status = 'late' THEN 'yellow'
      WHEN c.evaluation_status = 'rescheduled' THEN 'yellow'
      WHEN c.evaluation_status = 'not_done' THEN 'red'
      -- CORRECCIÓN: Llamadas futuras (pending) = gris
      WHEN c.evaluation_status = 'pending' AND c.scheduled_date::DATE > CURRENT_DATE THEN 'gray'
      -- CORRECCIÓN: Llamadas pasadas (pending) = azul
      WHEN c.evaluation_status = 'pending' AND c.scheduled_date::DATE <= CURRENT_DATE THEN 'blue'
      ELSE 'gray'
    END as color_code,
    (c.evaluation_status = 'pending') as is_pending,
    (c.scheduled_date::DATE > CURRENT_DATE) as is_future
  FROM calls c
  JOIN profiles p ON p.id = c.supervisor_id
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
  JOIN profiles p ON p.id = c.supervisor_id
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
ALTER TABLE user_participations ENABLE ROW LEVEL SECURITY;

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

-- Política para que los seniors puedan ver a sus líderes asignados
CREATE POLICY "Seniors can view assigned leaders" ON profiles
    FOR SELECT USING (
        role = 'lider' AND supervisor_id = auth.uid()
    );

-- Política para que los admins puedan ver a sus usuarios asignados (usando supervisor_id)
CREATE POLICY "Admins can view assigned users" ON profiles
    FOR SELECT USING (
        supervisor_id = auth.uid() AND is_user_admin()
    );

-- Política para que los admins puedan ver todos los perfiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        is_user_admin()
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

-- Función auxiliar para verificar si el usuario es master_senior
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

-- Función auxiliar para verificar si el usuario es senior o master_senior
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

-- Política para que los admins puedan ver todos los perfiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (is_user_admin());

-- Política para que los master_senior puedan ver a sus usuarios asignados
CREATE POLICY "Master Seniors can view assigned users" ON profiles
    FOR SELECT USING (
        supervisor_id = auth.uid() 
        AND role IN ('lider', 'senior')
    );

-- Política para que los admins puedan actualizar asignaciones de supervisores
CREATE POLICY "Admins can update supervisor assignments" ON profiles
    FOR UPDATE USING (is_user_admin())
    WITH CHECK (is_user_admin());

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

-- Políticas adicionales para que SENIORS vean datos de líderes asignados

-- Seniors pueden ver metas de sus líderes
CREATE POLICY "Seniors can view leaders' goals" ON goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = goals.user_id
        AND p.supervisor_id = auth.uid()
    )
  );

-- Admins pueden ver todas las metas
CREATE POLICY "Admins can view all goals" ON goals
  FOR SELECT USING (
    is_user_admin()
  );

-- Master Seniors pueden ver metas de sus usuarios asignados
CREATE POLICY "Master Seniors can view assigned users' goals" ON goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = goals.user_id
        AND p.supervisor_id = auth.uid()
        AND p.role IN ('lider', 'senior')
    )
  );

-- Admins pueden crear metas para cualquier usuario
CREATE POLICY "Admins can create goals for any user" ON goals
  FOR INSERT WITH CHECK (
    is_user_admin()
  );

-- Admins pueden actualizar metas de cualquier usuario
CREATE POLICY "Admins can update goals for any user" ON goals
  FOR UPDATE USING (
    is_user_admin()
  );

-- Admins pueden eliminar metas de cualquier usuario
CREATE POLICY "Admins can delete goals for any user" ON goals
  FOR DELETE USING (
    is_user_admin()
  );

-- Seniors pueden ver mecanismos de metas de sus líderes
CREATE POLICY "Seniors can view leaders' mechanisms" ON mechanisms
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM goals g
      JOIN profiles p ON p.id = g.user_id
      WHERE g.id = mechanisms.goal_id
        AND p.supervisor_id = auth.uid()
    )
  );

-- Admins pueden ver todos los mecanismos
CREATE POLICY "Admins can view all mechanisms" ON mechanisms
  FOR SELECT USING (
    is_user_admin()
  );

-- Master Seniors pueden ver mecanismos de sus usuarios asignados
CREATE POLICY "Master Seniors can view assigned users' mechanisms" ON mechanisms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM goals g
      JOIN profiles p ON p.id = g.user_id
      WHERE g.id = mechanisms.goal_id
        AND p.supervisor_id = auth.uid()
        AND p.role IN ('lider', 'senior')
    )
  );

-- Admins pueden crear mecanismos para cualquier usuario
CREATE POLICY "Admins can create mechanisms for any user" ON mechanisms
  FOR INSERT WITH CHECK (
    is_user_admin()
  );

-- Admins pueden actualizar mecanismos de cualquier usuario
CREATE POLICY "Admins can update mechanisms for any user" ON mechanisms
  FOR UPDATE USING (
    is_user_admin()
  );

-- Admins pueden eliminar mecanismos de cualquier usuario
CREATE POLICY "Admins can delete mechanisms for any user" ON mechanisms
  FOR DELETE USING (
    is_user_admin()
  );

-- Seniors pueden ver completions de actividades gustosas de sus líderes
CREATE POLICY "Seniors can view leaders' activity completions" ON user_activity_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = user_activity_completions.user_id
        AND p.supervisor_id = auth.uid()
    )
  );

-- Admins pueden ver todas las completions de actividades
CREATE POLICY "Admins can view all activity completions" ON user_activity_completions
  FOR SELECT USING (
    is_user_admin()
  );

-- Master Seniors pueden ver completions de actividades de sus usuarios asignados
CREATE POLICY "Master Seniors can view assigned users' activity completions" ON user_activity_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = user_activity_completions.user_id
        AND p.supervisor_id = auth.uid()
        AND p.role IN ('lider', 'senior')
    )
  );

-- Seniors pueden ver excepciones de mecanismos de sus líderes
CREATE POLICY "Seniors can view leaders' mechanism exceptions" ON mechanism_schedule_exceptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM mechanisms m
      JOIN goals g ON g.id = m.goal_id
      JOIN profiles p ON p.id = g.user_id
      WHERE m.id = mechanism_schedule_exceptions.mechanism_id
        AND p.supervisor_id = auth.uid()
    )
  );

-- Admins pueden ver todas las excepciones de mecanismos
CREATE POLICY "Admins can view all mechanism exceptions" ON mechanism_schedule_exceptions
  FOR SELECT USING (
    is_user_admin()
  );

-- Seniors pueden ver completions de mecanismos de sus líderes
CREATE POLICY "Seniors can view leaders' mechanism completions" ON mechanism_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM mechanisms m
      JOIN goals g ON g.id = m.goal_id
      JOIN profiles p ON p.id = g.user_id
      WHERE m.id = mechanism_completions.mechanism_id
        AND p.supervisor_id = auth.uid()
    )
  );

-- Admins pueden ver todas las completions de mecanismos
CREATE POLICY "Admins can view all mechanism completions" ON mechanism_completions
  FOR SELECT USING (
    is_user_admin()
  );

-- Seniors pueden ver llamadas de sus líderes
CREATE POLICY "Seniors can view leaders' calls" ON calls
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = calls.leader_id
        AND p.supervisor_id = auth.uid()
    )
  );

-- Admins pueden ver todas las llamadas
CREATE POLICY "Admins can view all calls" ON calls
  FOR SELECT USING (
    is_user_admin()
  );

-- Master Seniors pueden ver llamadas de sus usuarios asignados
CREATE POLICY "Master Seniors can view assigned users' calls" ON calls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = calls.leader_id
        AND p.supervisor_id = auth.uid()
        AND p.role IN ('lider', 'senior')
    )
  );

-- Admins pueden crear llamadas para cualquier usuario
CREATE POLICY "Admins can create calls for any user" ON calls
  FOR INSERT WITH CHECK (
    is_user_admin()
  );

-- Admins pueden actualizar llamadas de cualquier usuario
CREATE POLICY "Admins can update calls for any user" ON calls
  FOR UPDATE USING (
    is_user_admin()
  );

-- Admins pueden eliminar llamadas de cualquier usuario
CREATE POLICY "Admins can delete calls for any user" ON calls
  FOR DELETE USING (
    is_user_admin()
  );

-- Seniors pueden ver call schedules de sus líderes (opcional)
CREATE POLICY "Seniors can view leaders' schedules" ON call_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = call_schedules.leader_id
        AND p.supervisor_id = auth.uid()
    )
  );

-- Admins pueden ver todos los call schedules
CREATE POLICY "Admins can view all call schedules" ON call_schedules
  FOR SELECT USING (
    is_user_admin()
  );

-- Admins pueden crear call schedules para cualquier usuario
CREATE POLICY "Admins can create call schedules for any user" ON call_schedules
  FOR INSERT WITH CHECK (
    is_user_admin()
  );

-- Admins pueden actualizar call schedules de cualquier usuario
CREATE POLICY "Admins can update call schedules for any user" ON call_schedules
  FOR UPDATE USING (
    is_user_admin()
  );

-- Admins pueden eliminar call schedules de cualquier usuario
CREATE POLICY "Admins can delete call schedules for any user" ON call_schedules
  FOR DELETE USING (
    is_user_admin()
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

-- Políticas para administradores gestionar actividades
CREATE POLICY "Admins can view all activities" ON activities
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert activities" ON activities
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update activities" ON activities
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete activities" ON activities
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas básicas para calls (MANTENER)
CREATE POLICY "Users can view calls they are involved in" ON calls
    FOR SELECT USING (auth.uid() = leader_id OR auth.uid() = supervisor_id);

CREATE POLICY "Users can create calls" ON calls
    FOR INSERT WITH CHECK (auth.uid() = leader_id OR auth.uid() = supervisor_id);

CREATE POLICY "Users can update calls they are involved in" ON calls
    FOR UPDATE USING (auth.uid() = leader_id OR auth.uid() = supervisor_id);

-- Políticas básicas para user_activity_completions (MANTENER)
CREATE POLICY "Users can view own activity completions" ON user_activity_completions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activity completions" ON user_activity_completions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity completions" ON user_activity_completions
    FOR DELETE USING (auth.uid() = user_id);

-- Policy for seniors to create/update activity completions for their assigned leaders
CREATE POLICY "Seniors can manage leaders' activity completions" ON user_activity_completions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = user_activity_completions.user_id 
            AND p.supervisor_id = auth.uid()
        )
    );

-- Policy for admins to manage all activity completions
CREATE POLICY "Admins can manage all activity completions" ON user_activity_completions
    FOR ALL USING (
        is_user_admin()
    );

-- Políticas básicas para generations (MANTENER)
CREATE POLICY "Everyone can view generations" ON generations
    FOR SELECT USING (true);

-- Políticas para nuevas tablas optimizadas
CREATE POLICY "Users can manage own exceptions" ON mechanism_schedule_exceptions 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own completions" ON mechanism_completions 
  FOR ALL USING (auth.uid() = user_id);

-- Policy for seniors to manage mechanism completions for their assigned leaders
CREATE POLICY "Seniors can manage leaders' mechanism completions" ON mechanism_completions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = mechanism_completions.user_id 
            AND p.supervisor_id = auth.uid()
        )
    );

-- Policy for admins to manage all mechanism completions
CREATE POLICY "Admins can manage all mechanism completions" ON mechanism_completions
    FOR ALL USING (
        is_user_admin()
    );

-- Master Seniors pueden ver completions de mecanismos de sus usuarios asignados (líderes y seniors)
CREATE POLICY "Master Seniors can view assigned users' mechanism completions" ON mechanism_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = mechanism_completions.user_id
        AND p.supervisor_id = auth.uid()
        AND p.role IN ('lider', 'senior')
    )
  );

-- Master Seniors pueden gestionar completions de mecanismos de sus usuarios asignados (líderes y seniors)
CREATE POLICY "Master Seniors can manage assigned users' mechanism completions" ON mechanism_completions
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = mechanism_completions.user_id
        AND p.supervisor_id = auth.uid()
        AND p.role IN ('lider', 'senior')
    )
  );

-- Políticas para call_schedules
CREATE POLICY "Users can manage own call schedules" ON call_schedules 
  FOR ALL USING (auth.uid() = leader_id OR auth.uid() = supervisor_id);

-- Políticas para user_participations (SISTEMA DE PARTICIPACIONES)
-- Los usuarios pueden ver sus propias participaciones
CREATE POLICY "Users can view own participations" ON user_participations
  FOR SELECT USING (user_id = auth.uid());

-- Los admins pueden ver todas las participaciones
CREATE POLICY "Admins can view all participations" ON user_participations
  FOR SELECT USING (is_user_admin());

-- Solo admins pueden crear participaciones
CREATE POLICY "Admins can create participations" ON user_participations
  FOR INSERT WITH CHECK (is_user_admin());

-- Solo admins pueden actualizar participaciones
CREATE POLICY "Admins can update participations" ON user_participations
  FOR UPDATE USING (is_user_admin());

-- Solo admins pueden eliminar participaciones
CREATE POLICY "Admins can delete participations" ON user_participations
  FOR DELETE USING (is_user_admin());


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
COMMENT ON TABLE profiles IS 'Perfiles de usuario que extienden auth.users + SISTEMA DE PARTICIPACIONES';
COMMENT ON TABLE generations IS 'Generaciones del programa CC Tecate con fechas de registro y entrenamientos';
COMMENT ON TABLE user_participations IS 'Participaciones de usuarios en diferentes generaciones con roles específicos - SOLO ADMINS PUEDEN GESTIONAR';
COMMENT ON TABLE goals IS 'Metas personales de los usuarios - UNA META POR CATEGORÍA + VINCULADAS A PARTICIPACIONES';
COMMENT ON TABLE mechanisms IS 'Mecanismos de acción para alcanzar las metas - 4-6 POR META + OPTIMIZADO PARA CALENDARIO + VINCULADOS A PARTICIPACIONES';
COMMENT ON TABLE activities IS 'Actividades gustosas semanales';
COMMENT ON TABLE calls IS 'Llamadas de seguimiento entre líderes y seniors';
COMMENT ON TABLE user_activity_completions IS 'Registro de actividades completadas por usuario';
COMMENT ON TABLE mechanism_schedule_exceptions IS 'Excepciones a las reglas de recurrencia (movimientos, cancelaciones)';
COMMENT ON TABLE mechanism_completions IS 'Registro de completions reales de mecanismos';

-- Comentarios para las políticas de master_senior
COMMENT ON POLICY "Master Seniors can view assigned users' mechanism completions" ON mechanism_completions IS 'Permite a los master seniors ver completions de mecanismos de sus usuarios asignados (líderes y seniors)';
COMMENT ON POLICY "Master Seniors can manage assigned users' mechanism completions" ON mechanism_completions IS 'Permite a los master seniors gestionar completions de mecanismos de sus usuarios asignados (líderes y seniors)';
COMMENT ON TABLE call_schedules IS 'Programación automática de llamadas (L, M, V) entre líderes y seniors';
COMMENT ON TABLE trigger_logs IS 'Logs del sistema para debugging de triggers y funciones';

-- Comentarios en las columnas importantes
COMMENT ON COLUMN profiles.role IS 'Rol del usuario: lider, senior, admin (sincronizado con participaciones activas)';
COMMENT ON COLUMN profiles.generation IS 'Generación a la que pertenece el usuario';
COMMENT ON COLUMN profiles.supervisor_id IS 'ID del Supervisor asignado (senior o admin) para el usuario (nullable)';
COMMENT ON COLUMN profiles.active_participation_id IS 'ID de la participación activa del usuario (solo admins pueden cambiar)';
COMMENT ON COLUMN profiles.energy_drainers IS 'Lista de cosas que quitan energía al usuario (máximo 10 elementos)';
COMMENT ON COLUMN profiles.energy_givers IS 'Lista de cosas que dan energía al usuario (máximo 10 elementos)';
COMMENT ON COLUMN profiles.phone IS 'Número de teléfono del usuario';
COMMENT ON COLUMN profiles.birth_date IS 'Fecha de nacimiento del usuario';
COMMENT ON COLUMN profiles.personal_contract IS 'Contrato personal del usuario (máximo 20 palabras)';
COMMENT ON COLUMN profiles.bio IS 'Biografía o descripción personal del usuario';
COMMENT ON COLUMN profiles.location IS 'Ubicación o ciudad del usuario';
COMMENT ON COLUMN profiles.linkedin_url IS 'URL del perfil de LinkedIn';
COMMENT ON COLUMN profiles.website_url IS 'URL del sitio web personal';
COMMENT ON COLUMN user_participations.participation_number IS 'Número secuencial de participación del usuario (1, 2, 3...)';
COMMENT ON COLUMN user_participations.status IS 'Estado de la participación: active, completed, inactive';
COMMENT ON COLUMN user_participations.role IS 'Rol específico en esta participación: lider, senior, admin';
COMMENT ON COLUMN goals.user_participation_id IS 'ID de la participación específica a la que pertenece esta meta';
COMMENT ON COLUMN goals.completed_by_supervisor_id IS 'ID del Supervisor que marcó la meta como completada';
COMMENT ON COLUMN goals.progress_percentage IS 'Porcentaje de avance de la meta (0-100)';
COMMENT ON COLUMN mechanisms.user_participation_id IS 'ID de la participación específica a la que pertenece este mecanismo';
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

-- Comentarios en las funciones de perfil
COMMENT ON FUNCTION validate_personal_contract IS 'Valida que el contrato personal no exceda 20 palabras';
COMMENT ON FUNCTION validate_energy_arrays IS 'Valida que los arrays de energía no excedan 10 elementos';
COMMENT ON FUNCTION update_user_profile IS 'Actualiza el perfil completo del usuario con validaciones';
COMMENT ON FUNCTION get_user_profile IS 'Obtiene el perfil completo del usuario';

-- Comentarios en las funciones del sistema de participaciones
COMMENT ON FUNCTION get_user_current_role IS 'Obtiene el rol actual del usuario desde su participación activa';
COMMENT ON FUNCTION get_user_active_participation IS 'Obtiene la participación activa de un usuario con información de generación';
COMMENT ON FUNCTION change_user_active_participation IS 'Cambia la participación activa de un usuario (solo admins)';
COMMENT ON FUNCTION create_user_participation IS 'Crea una nueva participación para un usuario (solo admins)';
COMMENT ON FUNCTION create_and_activate_participation IS 'Crea y activa automáticamente una nueva participación (solo admins)';
COMMENT ON FUNCTION sync_user_role_from_participation IS 'Sincroniza el rol en profiles con la participación activa';
COMMENT ON FUNCTION get_user_participations IS 'Obtiene todas las participaciones de un usuario ordenadas por número';

-- Comentarios en las nuevas funciones de asignación
COMMENT ON FUNCTION check_user_participation IS 'Verifica si un usuario tiene participación activa y devuelve información básica';
COMMENT ON FUNCTION create_participation_from_assignment IS 'Crea o actualiza participación desde la ventana de asignación (maneja supervisor, rol y generación)';
COMMENT ON FUNCTION get_users_without_participation IS 'Obtiene lista de usuarios que no tienen participación activa';

-- Comentarios en las funciones de logging
COMMENT ON FUNCTION insert_trigger_log IS 'Inserta logs del trigger de forma segura (no falla si hay error)';
COMMENT ON FUNCTION get_recent_logs IS 'Obtiene logs recientes del sistema para debugging';

-- =====================================================
-- SISTEMA DE PESOS DINÁMICOS DEL LEADERBOARD
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

-- Insertar configuración inicial si no existe
INSERT INTO leaderboard_weights (goals_weight, activities_weight, calls_weight, is_active)
SELECT 0.40, 0.30, 0.30, TRUE
WHERE NOT EXISTS (SELECT 1 FROM leaderboard_weights WHERE is_active = TRUE);

-- Comentarios para documentar la tabla
COMMENT ON TABLE leaderboard_weights IS 'Configuración de pesos para el cálculo del leaderboard';
COMMENT ON COLUMN leaderboard_weights.goals_weight IS 'Peso para el porcentaje de completitud de metas (0.0 - 1.0)';
COMMENT ON COLUMN leaderboard_weights.activities_weight IS 'Peso para el porcentaje de actividades completadas (0.0 - 1.0)';
COMMENT ON COLUMN leaderboard_weights.calls_weight IS 'Peso para el score de llamadas (0.0 - 1.0)';
COMMENT ON COLUMN leaderboard_weights.is_active IS 'Indica si esta configuración está activa';

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

-- Función para obtener estadísticas del leaderboard
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

-- Función para obtener generaciones disponibles
CREATE OR REPLACE FUNCTION get_available_generations(p_user_id UUID)
RETURNS TABLE (generation TEXT) AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT p.role INTO user_role
  FROM profiles p WHERE p.id = p_user_id;

  IF user_role IS NULL THEN RETURN; END IF;

  IF user_role = 'admin' THEN
    RETURN QUERY
    SELECT DISTINCT p.generation
    FROM profiles p
    WHERE p.role = 'lider'
    ORDER BY p.generation;
  ELSE
    RETURN QUERY
    SELECT DISTINCT p.generation
    FROM profiles p
    WHERE p.role = 'lider'
    ORDER BY p.generation;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
GRANT EXECUTE ON FUNCTION get_leaderboard_stats(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_generations(UUID) TO authenticated;

-- Función principal del leaderboard (actualizada con cálculo corregido de calls_score)
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

-- Otorgar permisos para la función principal
GRANT EXECUTE ON FUNCTION get_leaderboard_data(UUID, TEXT) TO authenticated;

-- =====================================================
-- FUNCIONES DEL SISTEMA DE PARTICIPACIONES
-- =====================================================

-- Función para verificar si un usuario tiene participación activa
CREATE OR REPLACE FUNCTION check_user_participation(p_user_id UUID)
RETURNS TABLE (
  has_participation BOOLEAN,
  participation_id UUID,
  user_role TEXT,
  user_generation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN p.active_participation_id IS NOT NULL THEN TRUE ELSE FALSE END as has_participation,
    p.active_participation_id as participation_id,
    p.role as user_role,
    p.generation as user_generation
  FROM profiles p
  WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear o actualizar participación desde asignación
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
BEGIN
  -- Verificar si el usuario existe
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN QUERY SELECT FALSE, 'Usuario no encontrado', NULL::UUID;
    RETURN;
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

-- Función para obtener usuarios sin participación
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
    AND p.role IN ('lider', 'senior', 'master_senior', 'admin')
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos para las nuevas funciones
GRANT EXECUTE ON FUNCTION check_user_participation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_participation_from_assignment(UUID, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_without_participation() TO authenticated;

-- Otorgar permisos para las funciones de perfil
GRANT EXECUTE ON FUNCTION update_user_profile(UUID, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_personal_contract(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_energy_arrays(TEXT[]) TO authenticated;

-- Permisos para funciones del leaderboard con pesos dinámicos
GRANT EXECUTE ON FUNCTION get_active_leaderboard_weights() TO authenticated;
GRANT EXECUTE ON FUNCTION update_leaderboard_weights(DECIMAL, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard_weights_config() TO authenticated;

-- Función para obtener el rol actual del usuario desde participaciones
CREATE OR REPLACE FUNCTION get_user_current_role(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Obtener el rol de la participación activa
  SELECT up.role INTO v_role
  FROM user_participations up
  JOIN profiles p ON p.active_participation_id = up.id
  WHERE p.id = p_user_id
    AND up.status = 'active'
  LIMIT 1;
  
  -- Si no hay participación activa, devolver null
  RETURN COALESCE(v_role, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener participación activa de un usuario
CREATE OR REPLACE FUNCTION get_user_active_participation(p_user_id UUID)
RETURNS TABLE (
  participation_id UUID,
  generation_name TEXT,
  role TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id as participation_id,
    g.name as generation_name,
    up.role,
    up.status
  FROM user_participations up
  JOIN generations g ON g.id = up.generation_id
  WHERE up.user_id = p_user_id 
    AND up.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para cambiar participación activa (solo admins)
CREATE OR REPLACE FUNCTION change_user_active_participation(
  p_user_id UUID,
  p_participation_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_participation_exists BOOLEAN;
  v_participation_role TEXT;
BEGIN
  -- Verificar que el usuario actual es admin
  SELECT is_user_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar participaciones activas';
  END IF;
  
  -- Verificar que la participación existe y pertenece al usuario
  SELECT EXISTS(
    SELECT 1 FROM user_participations 
    WHERE id = p_participation_id AND user_id = p_user_id
  ) INTO v_participation_exists;
  
  IF NOT v_participation_exists THEN
    RAISE EXCEPTION 'La participación no existe o no pertenece al usuario';
  END IF;
  
  -- Obtener el rol de la participación
  SELECT role INTO v_participation_role
  FROM user_participations 
  WHERE id = p_participation_id;
  
  -- Actualizar la participación activa
  UPDATE profiles 
  SET active_participation_id = p_participation_id
  WHERE id = p_user_id;
  
  -- Sincronizar el rol en profiles con la participación activa
  UPDATE profiles 
  SET role = v_participation_role
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear nueva participación
CREATE OR REPLACE FUNCTION create_user_participation(
  p_user_id UUID,
  p_generation_id UUID,
  p_role TEXT
)
RETURNS UUID AS $$
DECLARE
  v_participation_id UUID;
  v_participation_number INTEGER;
BEGIN
  -- Verificar que el usuario actual es admin
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden crear participaciones';
  END IF;
  
  -- Obtener el siguiente número de participación para este usuario
  SELECT COALESCE(MAX(participation_number), 0) + 1 
  INTO v_participation_number
  FROM user_participations 
  WHERE user_id = p_user_id;
  
  -- Crear la nueva participación
  INSERT INTO user_participations (
    user_id, 
    generation_id, 
    role, 
    participation_number
  ) VALUES (
    p_user_id, 
    p_generation_id, 
    p_role, 
    v_participation_number
  ) RETURNING id INTO v_participation_id;
  
  -- Si es la primera participación, marcarla como activa
  IF v_participation_number = 1 THEN
    UPDATE profiles 
    SET active_participation_id = v_participation_id
    WHERE id = p_user_id;
  END IF;
  
  RETURN v_participation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear nueva participación y activarla automáticamente
CREATE OR REPLACE FUNCTION create_and_activate_participation(
  p_user_id UUID,
  p_generation_id UUID,
  p_role TEXT
)
RETURNS UUID AS $$
DECLARE
  v_participation_id UUID;
  v_participation_number INTEGER;
BEGIN
  -- Verificar que el usuario actual es admin
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden crear participaciones';
  END IF;
  
  -- Verificar que el rol es válido
  IF p_role NOT IN ('lider', 'senior', 'master_senior', 'admin') THEN
    RAISE EXCEPTION 'Rol inválido. Debe ser lider, senior, master_senior o admin';
  END IF;
  
  -- Obtener el siguiente número de participación para este usuario
  SELECT COALESCE(MAX(participation_number), 0) + 1 
  INTO v_participation_number
  FROM user_participations 
  WHERE user_id = p_user_id;
  
  -- Crear la nueva participación
  INSERT INTO user_participations (
    user_id, 
    generation_id, 
    role, 
    participation_number,
    status
  ) VALUES (
    p_user_id, 
    p_generation_id, 
    p_role, 
    v_participation_number,
    'active'
  ) RETURNING id INTO v_participation_id;
  
  -- Marcar participación anterior como completada
  UPDATE user_participations 
  SET status = 'completed'
  WHERE user_id = p_user_id 
    AND participation_number < v_participation_number;
  
  -- Actualizar participación activa
  UPDATE profiles 
  SET active_participation_id = v_participation_id
  WHERE id = p_user_id;
  
  -- Sincronizar el rol en profiles
  UPDATE profiles 
  SET role = p_role
  WHERE id = p_user_id;
  
  RETURN v_participation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para sincronizar el rol en profiles con la participación activa
CREATE OR REPLACE FUNCTION sync_user_role_from_participation(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_current_role TEXT;
  v_participation_role TEXT;
BEGIN
  -- Obtener el rol de la participación activa
  SELECT up.role INTO v_participation_role
  FROM user_participations up
  JOIN profiles p ON p.active_participation_id = up.id
  WHERE p.id = p_user_id
    AND up.status = 'active'
  LIMIT 1;
  
  -- Si no hay participación activa, no hacer nada
  IF v_participation_role IS NULL THEN
    RETURN 'No hay participación activa';
  END IF;
  
  -- Obtener el rol actual en profiles
  SELECT role INTO v_current_role
  FROM profiles 
  WHERE id = p_user_id;
  
  -- Si el rol es diferente, actualizarlo
  IF v_current_role != v_participation_role THEN
    UPDATE profiles 
    SET role = v_participation_role
    WHERE id = p_user_id;
    
    RETURN 'Rol actualizado de ' || COALESCE(v_current_role, 'NULL') || ' a ' || v_participation_role;
  ELSE
    RETURN 'Rol ya está sincronizado: ' || v_participation_role;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener todas las participaciones de un usuario
CREATE OR REPLACE FUNCTION get_user_participations(p_user_id UUID)
RETURNS TABLE (
  participation_id UUID,
  generation_name TEXT,
  role TEXT,
  status TEXT,
  participation_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id as participation_id,
    g.name as generation_name,
    up.role,
    up.status,
    up.participation_number,
    up.created_at,
    (p.active_participation_id = up.id) as is_active
  FROM user_participations up
  JOIN generations g ON g.id = up.generation_id
  JOIN profiles p ON p.id = up.user_id
  WHERE up.user_id = p_user_id
  ORDER BY up.participation_number DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TABLA DE LOGS PARA DEBUGGING
-- =====================================================

-- Crear tabla para almacenar logs del trigger
CREATE TABLE IF NOT EXISTS trigger_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  log_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  log_level TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Función para insertar logs
CREATE OR REPLACE FUNCTION insert_trigger_log(
  p_level TEXT,
  p_message TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO trigger_logs (log_level, message, user_id)
  VALUES (p_level, p_message, p_user_id);
EXCEPTION WHEN OTHERS THEN
  -- Si falla el log, no fallar el trigger
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener logs recientes
CREATE OR REPLACE FUNCTION get_recent_logs(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  log_time TIMESTAMP WITH TIME ZONE,
  log_level TEXT,
  message TEXT,
  user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.log_time,
    t.log_level,
    t.message,
    t.user_id
  FROM trigger_logs t
  WHERE t.log_level IN ('LOG', 'NOTICE', 'WARNING', 'ERROR', 'FATAL', 'PANIC')
    AND (t.message LIKE '%handle_new_user%' OR t.message LIKE '%on_auth_user_created%')
  ORDER BY t.log_time DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos para las funciones de logging
GRANT EXECUTE ON FUNCTION insert_trigger_log(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_logs(INTEGER) TO authenticated;

-- =====================================================
-- MIGRACIÓN DE DATOS EXISTENTES AL SISTEMA DE PARTICIPACIONES
-- =====================================================

-- Migrar usuarios existentes al sistema de participaciones
DO $$
DECLARE
  user_record RECORD;
  v_generation_id UUID;
  v_participation_id UUID;
  v_participation_number INTEGER;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Iniciando migración de usuarios existentes a participaciones...';

  -- Procesar usuarios que no tienen participación activa
  FOR user_record IN
    SELECT p.id, p.name, p.email, p.role, p.generation, p.supervisor_id
    FROM profiles p
    LEFT JOIN user_participations up ON p.id = up.user_id AND up.status = 'active'
    WHERE up.id IS NULL 
      AND p.role IN ('lider', 'senior', 'master_senior', 'admin')
  LOOP
    BEGIN
      RAISE NOTICE 'Procesando usuario: % (%)', user_record.name, user_record.email;

      -- Obtener generation_id
      SELECT id INTO v_generation_id 
      FROM generations 
      WHERE name = user_record.generation;

      IF v_generation_id IS NULL THEN
        RAISE WARNING 'Generación "%" no encontrada para usuario %', user_record.generation, user_record.name;
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;

      -- Calcular número de participación
      SELECT COALESCE(MAX(participation_number), 0) + 1
      INTO v_participation_number
      FROM user_participations
      WHERE user_id = user_record.id;

      -- Crear participación
      INSERT INTO user_participations (user_id, generation_id, role, participation_number, status)
      VALUES (user_record.id, v_generation_id, user_record.role, v_participation_number, 'active')
      RETURNING id INTO v_participation_id;

      -- Actualizar perfil con active_participation_id
      UPDATE profiles
      SET active_participation_id = v_participation_id
      WHERE id = user_record.id;

      RAISE NOTICE 'Participación creada para %: %', user_record.name, v_participation_id;
      v_success_count := v_success_count + 1;

    EXCEPTION
      WHEN unique_violation THEN
        RAISE WARNING 'Participación ya existe para usuario %', user_record.name;
        v_error_count := v_error_count + 1;
      WHEN OTHERS THEN
        RAISE WARNING 'Error procesando usuario %: %', user_record.name, SQLERRM;
        v_error_count := v_error_count + 1;
    END;
  END LOOP;

  RAISE NOTICE 'Migración completada. Exitosos: %, Errores: %', v_success_count, v_error_count;
END $$;

-- Migrar metas existentes a las nuevas participaciones
UPDATE goals 
SET user_participation_id = up.id
FROM user_participations up
WHERE goals.user_id = up.user_id 
  AND up.status = 'active';

-- Migrar mecanismos existentes a las nuevas participaciones
UPDATE mechanisms 
SET user_participation_id = up.id
FROM user_participations up
WHERE mechanisms.user_id = up.user_id 
  AND up.status = 'active';

-- Sincronizar roles en profiles con las participaciones activas
UPDATE profiles 
SET role = up.role
FROM user_participations up
WHERE profiles.active_participation_id = up.id
  AND up.status = 'active'
  AND profiles.role != up.role;

-- =====================================================
-- MENSAJE DE CONFIRMACIÓN
-- =====================================================
SELECT 'Base de datos CC Tecate optimizada y compatible creada exitosamente! Incluye: sistema de llamadas automático, jerarquía unificada con supervisor_id, sistema de participaciones completo, trigger simplificado para registro de usuarios, funciones de asignación automática de participaciones, sistema de logging para debugging, políticas completas para administradores, y sistema completo de gestión de perfil con validaciones.' as status;

-- =====================================================
-- RPC: Obtener líderes asignados a un supervisor
-- =====================================================
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
  WHERE p.role = 'lider' AND p.supervisor_id = p_supervisor_id
  ORDER BY p.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_leaders_for_supervisor IS 'Lista los líderes asignados a un supervisor específico';

-- =====================================================
-- RPC: Obtener usuarios asignados a un supervisor (senior o admin)
-- =====================================================
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
  ORDER BY p.role, p.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_users_for_supervisor IS 'Lista los usuarios (líderes y seniors) asignados a un supervisor (senior o admin)';

-- =====================================================
-- RPC: Obtener el supervisor de un usuario
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_supervisor(p_user_id UUID)
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
    s.id, s.name, s.email, s.generation, s.role
  FROM profiles p
  JOIN profiles s ON s.id = p.supervisor_id
  WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_supervisor IS 'Obtiene el supervisor (senior o admin) de un usuario específico';

-- =====================================================
-- FUNCIÓN PARA OBTENER SUPERVISOR ASIGNADO (CORREGIDA)
-- =====================================================

-- Eliminar función existente si existe
DROP FUNCTION IF EXISTS get_user_supervisor(UUID);

-- Función para obtener el supervisor asignado de un usuario
-- Esta función maneja los permisos RLS correctamente
CREATE OR REPLACE FUNCTION get_user_supervisor(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el usuario existe y tiene supervisor asignado
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.email
  FROM profiles u
  INNER JOIN profiles s ON s.id = u.supervisor_id
  WHERE u.id = p_user_id
    AND u.supervisor_id IS NOT NULL
    AND s.role IN ('senior', 'master_senior', 'admin');
END;
$$;

-- Comentario sobre la función
COMMENT ON FUNCTION get_user_supervisor(UUID) IS 'Obtiene el supervisor asignado de un usuario con permisos RLS correctos';

-- =====================================================
-- LEADERBOARD (Funciones robustas con ELSE/COALESCE)
-- =====================================================

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
  SELECT g.completed INTO goal_completed FROM goals g WHERE g.id = p_goal_id;
  IF goal_completed THEN RETURN 100; END IF;

  SELECT p.generation INTO user_generation FROM profiles p WHERE p.id = p_user_id;

  IF user_generation IS NOT NULL THEN
    SELECT g.pl1_training_date, g.pl3_training_date INTO pl1_date, pl3_date
    FROM generations g WHERE g.name = user_generation;

    mechanism_start_date := COALESCE(pl1_date + INTERVAL '9 days', CURRENT_DATE);
    mechanism_end_date   := COALESCE(pl3_date - INTERVAL '7 days', CURRENT_DATE + INTERVAL '30 days');
  ELSE
    mechanism_start_date := CURRENT_DATE;
    mechanism_end_date   := CURRENT_DATE + INTERVAL '30 days';
  END IF;

  FOR mechanism_record IN
    SELECT 
      GREATEST(COALESCE(m.start_date, mechanism_start_date), mechanism_start_date) as start_date,
      LEAST(COALESCE(m.end_date, mechanism_end_date), mechanism_end_date) as end_date,
      m.frequency,
      m.id as mechanism_id
    FROM mechanisms m
    WHERE m.goal_id = p_goal_id
  LOOP
    current_date_var := mechanism_record.start_date;
    expected_count := 0;

    WHILE current_date_var <= mechanism_record.end_date LOOP
      day_of_week := EXTRACT(DOW FROM current_date_var);
      should_include := FALSE;

      CASE
        WHEN mechanism_record.frequency = 'daily' THEN
          should_include := TRUE;
        WHEN mechanism_record.frequency = 'weekly' THEN
          should_include := (day_of_week = 1);
        WHEN mechanism_record.frequency = '2x_week' THEN
          should_include := (day_of_week = 1 OR day_of_week = 4);
        WHEN mechanism_record.frequency = '3x_week' THEN
          should_include := (day_of_week = 1 OR day_of_week = 3 OR day_of_week = 5);
        WHEN mechanism_record.frequency = '4x_week' THEN
          should_include := (day_of_week = 1 OR day_of_week = 2 OR day_of_week = 3 OR day_of_week = 4);
        WHEN mechanism_record.frequency = '5x_week' THEN
          should_include := (day_of_week BETWEEN 1 AND 5);
        WHEN mechanism_record.frequency = 'biweekly' THEN
          days_since_period_start := current_date_var - mechanism_record.start_date;
          should_include := (days_since_period_start >= 0 AND days_since_period_start % 14 = 0);
        WHEN mechanism_record.frequency = 'monthly' THEN
          should_include := (EXTRACT(DAY FROM current_date_var) = EXTRACT(DAY FROM mechanism_record.start_date));
        WHEN mechanism_record.frequency = 'yearly' THEN
          should_include := (
            EXTRACT(MONTH FROM current_date_var) = EXTRACT(MONTH FROM mechanism_record.start_date)
            AND EXTRACT(DAY FROM current_date_var) = EXTRACT(DAY FROM mechanism_record.start_date)
          );
        ELSE
          should_include := FALSE;
      END CASE;

      IF should_include THEN
        expected_count := expected_count + 1;
      END IF;

      current_date_var := current_date_var + INTERVAL '1 day';
    END LOOP;

    total_expected_activities := total_expected_activities + expected_count;

    mechanism_completed_count := 0;
    SELECT COUNT(*) INTO mechanism_completed_count
    FROM mechanism_completions mc
    WHERE mc.mechanism_id = mechanism_record.mechanism_id
      AND mc.user_id = p_user_id
      AND mc.completed_date >= mechanism_record.start_date
      AND mc.completed_date <= mechanism_record.end_date;

    total_completed_activities := total_completed_activities + mechanism_completed_count;
  END LOOP;

  IF total_expected_activities > 0 THEN
    progress_percentage := LEAST(100, ROUND((total_completed_activities::DECIMAL / total_expected_activities::DECIMAL) * 100));
  END IF;

  RETURN progress_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
          SELECT (COUNT(uac.activity_id)::DECIMAL / NULLIF(COUNT(a.id), 0)) * 100
          FROM activities a
          LEFT JOIN user_activity_completions uac ON uac.activity_id = a.id AND uac.user_id = p.id
          WHERE a.is_active = true
            AND a.unlock_date <= CURRENT_DATE  -- Solo actividades desbloqueadas
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
        ), 0) * 0.5 
        + COALESCE((
          SELECT (COUNT(uac.activity_id)::DECIMAL / NULLIF(COUNT(a.id), 0)) * 100
          FROM activities a
          LEFT JOIN user_activity_completions uac ON uac.activity_id = a.id AND uac.user_id = p.id
          WHERE a.is_active = true
            AND a.unlock_date <= CURRENT_DATE  -- Solo actividades desbloqueadas
        ), 0) * 0.25 
        + COALESCE((
          -- Usar progress_percentage (porcentaje de avance - llamadas a tiempo)
          SELECT CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(CASE WHEN evaluation_status = 'on_time' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
          END
          FROM calls c 
          WHERE c.leader_id = p.id
        ), 0) * 0.25
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

-- =====================================================
-- SISTEMA DE PESOS DINÁMICOS DEL LEADERBOARD
-- =====================================================
-- Este sistema permite a los administradores configurar
-- los pesos para el cálculo del leaderboard de forma dinámica
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

-- Insertar configuración inicial si no existe
INSERT INTO leaderboard_weights (goals_weight, activities_weight, calls_weight, is_active)
SELECT 0.40, 0.30, 0.30, TRUE
WHERE NOT EXISTS (SELECT 1 FROM leaderboard_weights WHERE is_active = TRUE);

-- Comentarios para documentar la tabla
COMMENT ON TABLE leaderboard_weights IS 'Configuración de pesos para el cálculo del leaderboard';
COMMENT ON COLUMN leaderboard_weights.goals_weight IS 'Peso para el porcentaje de completitud de metas (0.0 - 1.0)';
COMMENT ON COLUMN leaderboard_weights.activities_weight IS 'Peso para el porcentaje de actividades completadas (0.0 - 1.0)';
COMMENT ON COLUMN leaderboard_weights.calls_weight IS 'Peso para el score de llamadas (0.0 - 1.0)';
COMMENT ON COLUMN leaderboard_weights.is_active IS 'Indica si esta configuración está activa';

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

-- Otorgar permisos adicionales para las funciones del sistema de pesos
GRANT EXECUTE ON FUNCTION get_active_leaderboard_weights() TO authenticated;
GRANT EXECUTE ON FUNCTION update_leaderboard_weights(DECIMAL, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard_weights_config() TO authenticated;

-- =====================================================
-- CONFIRMACIÓN FINAL
-- =====================================================

-- Verificar que el sistema de pesos dinámicos esté funcionando
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM leaderboard_weights WHERE is_active = TRUE) THEN
    RAISE EXCEPTION 'Error: No se pudo configurar el sistema de pesos dinámicos';
  END IF;
  
  RAISE NOTICE 'Sistema de pesos dinámicos del leaderboard configurado correctamente';
  RAISE NOTICE 'Configuracion inicial: Metas 40%%, Actividades 30%%, Llamadas 30%%';
  RAISE NOTICE 'Los administradores pueden modificar los pesos desde la interfaz web';
END $$;
