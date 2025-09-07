-- Creando Consciencia Tecate - Esquema de Base de Datos Consolidado
-- Ejecutar este script en el SQL Editor de Supabase para resetear la base de datos
-- Incluye todas las modificaciones y correcciones aplicadas

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- ELIMINAR TABLAS EXISTENTES (si existen)
-- ==============================================
DROP TABLE IF EXISTS user_activity_completions CASCADE;
DROP TABLE IF EXISTS calls CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS mechanisms CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS generations CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ==============================================
-- CREAR TABLAS CON ESTRUCTURA ACTUALIZADA
-- ==============================================

-- Tabla de perfiles de usuario (extiende auth.users)
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

-- Tabla de generaciones
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

-- Tabla de metas (ESTRUCTURA ACTUALIZADA)
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_by_senior_id UUID REFERENCES auth.users(id),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- Tabla de mecanismos/actividades (ESTRUCTURA ACTUALIZADA)
CREATE TABLE mechanisms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_frequency CHECK (frequency IN ('daily', '2x_week', '3x_week', '4x_week', '5x_week', 'weekly', 'biweekly', 'monthly', 'yearly'))
);

-- Tabla de actividades gustosas
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

-- Tabla de llamadas
CREATE TABLE calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  senior_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'rescheduled', 'missed')) DEFAULT 'scheduled',
  score DECIMAL(2,1) DEFAULT 0 CHECK (score >= 0 AND score <= 3),
  notes TEXT,
  rescheduled_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de actividad completada por usuario
CREATE TABLE user_activity_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, activity_id)
);

-- ==============================================
-- ÍNDICES PARA MEJORAR EL RENDIMIENTO
-- ==============================================
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

-- ==============================================
-- FUNCIONES Y TRIGGERS
-- ==============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
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

-- ==============================================
-- ROW LEVEL SECURITY (RLS) - POLÍTICAS SIMPLIFICADAS
-- ==============================================

-- Habilitar Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanisms ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_completions ENABLE ROW LEVEL SECURITY;

-- Políticas básicas para profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Políticas básicas para goals
CREATE POLICY "Users can view own goals" ON goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals" ON goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON goals
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas básicas para mechanisms
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

-- Políticas básicas para activities
CREATE POLICY "Authenticated users can view active activities" ON activities
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Políticas básicas para calls
CREATE POLICY "Users can view calls they are involved in" ON calls
    FOR SELECT USING (auth.uid() = leader_id OR auth.uid() = senior_id);

CREATE POLICY "Users can create calls" ON calls
    FOR INSERT WITH CHECK (auth.uid() = leader_id OR auth.uid() = senior_id);

CREATE POLICY "Users can update calls they are involved in" ON calls
    FOR UPDATE USING (auth.uid() = leader_id OR auth.uid() = senior_id);

-- Políticas básicas para user_activity_completions
CREATE POLICY "Users can view own activity completions" ON user_activity_completions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activity completions" ON user_activity_completions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity completions" ON user_activity_completions
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas básicas para generations
CREATE POLICY "Everyone can view generations" ON generations
    FOR SELECT USING (true);

-- ==============================================
-- FUNCIÓN PARA CREAR PERFIL AUTOMÁTICAMENTE
-- ==============================================

-- Función para crear perfil automáticamente al registrarse
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

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================
-- FUNCIONES DE NEGOCIO
-- ==============================================

-- Función para calcular el leaderboard
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

-- Función para obtener la generación activa
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

-- ==============================================
-- DATOS INICIALES
-- ==============================================

-- Insertar generaciones de ejemplo
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

-- Insertar actividades gustosas de ejemplo
INSERT INTO activities (title, description, unlock_date, category, points) VALUES 
('Gratitud Matutina', 'Escribe 3 cosas por las que estás agradecido cada mañana', NOW(), 'Bienestar', 10),
('Caminata Consciente', 'Da un paseo de 20 minutos prestando atención a tu entorno', NOW() + INTERVAL '7 days', 'Salud', 15),
('Conversación Profunda', 'Ten una conversación significativa con alguien importante en tu vida', NOW() + INTERVAL '14 days', 'Relaciones', 20),
('Reflexión Nocturna', 'Reflexiona sobre tu día y anota una lección aprendida', NOW() + INTERVAL '21 days', 'Crecimiento', 12),
('Meditación de 10 minutos', 'Practica meditación durante 10 minutos al día', NOW() + INTERVAL '28 days', 'Bienestar', 8),
('Lectura Inspiracional', 'Lee un capítulo de un libro de desarrollo personal', NOW() + INTERVAL '35 days', 'Crecimiento', 15);

-- ==============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ==============================================

-- Comentarios en las tablas
COMMENT ON TABLE profiles IS 'Perfiles de usuario que extienden auth.users';
COMMENT ON TABLE generations IS 'Generaciones del programa CC Tecate con fechas de registro y entrenamientos';
COMMENT ON TABLE goals IS 'Metas personales de los usuarios - UNA META POR CATEGORÍA';
COMMENT ON TABLE mechanisms IS 'Mecanismos de acción para alcanzar las metas - 4-6 POR META';
COMMENT ON TABLE activities IS 'Actividades gustosas semanales';
COMMENT ON TABLE calls IS 'Llamadas de seguimiento entre líderes y seniors';
COMMENT ON TABLE user_activity_completions IS 'Registro de actividades completadas por usuario';

-- Comentarios en las columnas importantes
COMMENT ON COLUMN profiles.role IS 'Rol del usuario: lider, senior, admin';
COMMENT ON COLUMN profiles.generation IS 'Generación a la que pertenece el usuario';
COMMENT ON COLUMN profiles.energy_drainers IS 'Lista de cosas que quitan energía al usuario';
COMMENT ON COLUMN profiles.energy_givers IS 'Lista de cosas que dan energía al usuario';
COMMENT ON COLUMN goals.completed_by_senior_id IS 'ID del Senior que marcó la meta como completada';
COMMENT ON COLUMN goals.progress_percentage IS 'Porcentaje de avance de la meta (0-100)';
COMMENT ON COLUMN mechanisms.frequency IS 'Frecuencia con la que se realiza el mecanismo: daily, 2x_week, 3x_week, 4x_week, 5x_week, weekly, biweekly, monthly, yearly';
COMMENT ON COLUMN mechanisms.user_id IS 'ID del usuario propietario del mecanismo';
COMMENT ON COLUMN calls.score IS 'Puntuación de la llamada: 0-3 puntos';
COMMENT ON COLUMN activities.unlock_date IS 'Fecha en que se desbloquea la actividad';
COMMENT ON COLUMN activities.completed_by IS 'Array de IDs de usuarios que completaron la actividad';

-- ==============================================
-- MENSAJE DE CONFIRMACIÓN
-- ==============================================
SELECT 'Base de datos CC Tecate creada exitosamente con todas las modificaciones aplicadas!' as status;