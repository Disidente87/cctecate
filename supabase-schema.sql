-- Creando Consciencia Tecate - Esquema de Base de Datos
-- Ejecutar este script en el SQL Editor de Supabase

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de metas
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  mechanisms TEXT[] DEFAULT '{}',
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')) NOT NULL,
  is_custom BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de mecanismos/actividades
CREATE TABLE mechanisms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Índices para mejorar el rendimiento
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_generation ON profiles(generation);
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_category ON goals(category);
CREATE INDEX idx_mechanisms_goal_id ON mechanisms(goal_id);
CREATE INDEX idx_mechanisms_due_date ON mechanisms(due_date);
CREATE INDEX idx_activities_unlock_date ON activities(unlock_date);
CREATE INDEX idx_activities_category ON activities(category);
CREATE INDEX idx_calls_leader_id ON calls(leader_id);
CREATE INDEX idx_calls_senior_id ON calls(senior_id);
CREATE INDEX idx_calls_scheduled_date ON calls(scheduled_date);
CREATE INDEX idx_calls_status ON calls(status);

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

-- Habilitar Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanisms ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_completions ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Seniors can view leaders in their generation" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p1
            WHERE p1.id = auth.uid() 
            AND p1.role = 'senior' 
            AND p1.generation = profiles.generation
        )
    );

-- Políticas para generations
CREATE POLICY "Everyone can view generations" ON generations
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage generations" ON generations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para goals
CREATE POLICY "Users can view own goals" ON goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals" ON goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON goals
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Seniors can view goals of leaders in their generation" ON goals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p1, profiles p2
            WHERE p1.id = auth.uid() 
            AND p1.role = 'senior' 
            AND p2.id = goals.user_id
            AND p1.generation = p2.generation
        )
    );

-- Políticas para mechanisms
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

CREATE POLICY "Seniors can update mechanisms for leaders in their generation" ON mechanisms
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM goals g, profiles p1, profiles p2
            WHERE g.id = mechanisms.goal_id
            AND p1.id = auth.uid() 
            AND p1.role = 'senior' 
            AND p2.id = g.user_id
            AND p1.generation = p2.generation
        )
    );

-- Políticas para activities
CREATE POLICY "Authenticated users can view active activities" ON activities
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Admins can manage activities" ON activities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para calls
CREATE POLICY "Users can view calls they are involved in" ON calls
    FOR SELECT USING (auth.uid() = leader_id OR auth.uid() = senior_id);

CREATE POLICY "Seniors can create calls for leaders in their generation" ON calls
    FOR INSERT WITH CHECK (
        auth.uid() = senior_id AND
        EXISTS (
            SELECT 1 FROM profiles p1, profiles p2
            WHERE p1.id = auth.uid() 
            AND p1.role = 'senior' 
            AND p2.id = calls.leader_id
            AND p1.generation = p2.generation
        )
    );

CREATE POLICY "Seniors can update calls they are involved in" ON calls
    FOR UPDATE USING (auth.uid() = senior_id);

CREATE POLICY "Admins can manage all calls" ON calls
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para user_activity_completions
CREATE POLICY "Users can view own activity completions" ON user_activity_completions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activity completions" ON user_activity_completions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity completions" ON user_activity_completions
    FOR DELETE USING (auth.uid() = user_id);

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

-- Insertar datos iniciales
INSERT INTO generations (name, description) VALUES 
('C1', 'Primera generación de líderes'),
('C2', 'Segunda generación de líderes'),
('C3', 'Tercera generación de líderes'),
('C4', 'Cuarta generación de líderes'),
('C5', 'Quinta generación de líderes');

-- Insertar actividades gustosas de ejemplo
INSERT INTO activities (title, description, unlock_date, category, points) VALUES 
('Gratitud Matutina', 'Escribe 3 cosas por las que estás agradecido cada mañana', NOW(), 'Bienestar', 10),
('Caminata Consciente', 'Da un paseo de 20 minutos prestando atención a tu entorno', NOW() + INTERVAL '7 days', 'Salud', 15),
('Conversación Profunda', 'Ten una conversación significativa con alguien importante en tu vida', NOW() + INTERVAL '14 days', 'Relaciones', 20),
('Reflexión Nocturna', 'Reflexiona sobre tu día y anota una lección aprendida', NOW() + INTERVAL '21 days', 'Crecimiento', 12),
('Meditación de 10 minutos', 'Practica meditación durante 10 minutos al día', NOW() + INTERVAL '28 days', 'Bienestar', 8),
('Lectura Inspiracional', 'Lee un capítulo de un libro de desarrollo personal', NOW() + INTERVAL '35 days', 'Crecimiento', 15);

-- Función para calcular el leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(generation_filter TEXT DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  generation TEXT,
  goals_completion_percentage NUMERIC,
  activities_completion_percentage NUMERIC,
  calls_score NUMERIC,
  total_score NUMERIC,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      p.id as user_id,
      p.name,
      p.generation,
      COALESCE(
        (SELECT AVG(CASE WHEN g.completed THEN 100.0 ELSE 0.0 END) 
         FROM goals g WHERE g.user_id = p.id), 0
      ) as goals_completion_percentage,
      COALESCE(
        (SELECT AVG(CASE WHEN uac.user_id IS NOT NULL THEN 100.0 ELSE 0.0 END)
         FROM activities a
         LEFT JOIN user_activity_completions uac ON a.id = uac.activity_id AND uac.user_id = p.id
         WHERE a.is_active = true AND a.unlock_date <= NOW()), 0
      ) as activities_completion_percentage,
      COALESCE(
        (SELECT AVG(c.score) 
         FROM calls c WHERE c.leader_id = p.id AND c.status = 'completed'), 0
      ) as calls_score
    FROM profiles p
    WHERE (generation_filter IS NULL OR p.generation = generation_filter)
  ),
  ranked_stats AS (
    SELECT 
      *,
      (goals_completion_percentage * 0.4 + activities_completion_percentage * 0.4 + calls_score * 20) as total_score,
      ROW_NUMBER() OVER (ORDER BY (goals_completion_percentage * 0.4 + activities_completion_percentage * 0.4 + calls_score * 20) DESC) as rank
    FROM user_stats
  )
  SELECT 
    rs.user_id,
    rs.name,
    rs.generation,
    rs.goals_completion_percentage,
    rs.activities_completion_percentage,
    rs.calls_score,
    rs.total_score,
    rs.rank
  FROM ranked_stats rs
  ORDER BY rs.total_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios en las tablas
COMMENT ON TABLE profiles IS 'Perfiles de usuario que extienden auth.users';
COMMENT ON TABLE generations IS 'Generaciones del programa CC Tecate';
COMMENT ON TABLE goals IS 'Metas personales de los usuarios';
COMMENT ON TABLE mechanisms IS 'Mecanismos de acción para alcanzar las metas';
COMMENT ON TABLE activities IS 'Actividades gustosas semanales';
COMMENT ON TABLE calls IS 'Llamadas de seguimiento entre líderes y seniors';
COMMENT ON TABLE user_activity_completions IS 'Registro de actividades completadas por usuario';

-- Comentarios en las columnas importantes
COMMENT ON COLUMN profiles.role IS 'Rol del usuario: lider, senior, admin';
COMMENT ON COLUMN profiles.generation IS 'Generación a la que pertenece el usuario';
COMMENT ON COLUMN profiles.energy_drainers IS 'Lista de cosas que quitan energía al usuario';
COMMENT ON COLUMN profiles.energy_givers IS 'Lista de cosas que dan energía al usuario';
COMMENT ON COLUMN goals.frequency IS 'Frecuencia de la meta: daily, weekly, monthly, yearly';
COMMENT ON COLUMN calls.score IS 'Puntuación de la llamada: 0-3 puntos';
COMMENT ON COLUMN activities.unlock_date IS 'Fecha en que se desbloquea la actividad';
COMMENT ON COLUMN activities.completed_by IS 'Array de IDs de usuarios que completaron la actividad';
