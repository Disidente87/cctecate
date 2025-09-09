# Creando Consciencia Tecate (CC) - Portal Web

Una aplicación web completa para el programa de desarrollo personal y liderazgo "Creando Consciencia Tecate", construida con Next.js 15, TypeScript, TailwindCSS y Supabase.

## 🚀 Características

### Landing Page
- **Hero Section** con mensaje motivacional y diseño atractivo
- **Sobre el Programa** con timeline del proceso de transformación
- **Beneficios** destacando inteligencia emocional, metas personales, finanzas y comunidad
- **Testimonios** de participantes reales
- **Diseño responsive** mobile-first

### Portal de Usuarios
- **Sistema de autenticación** con Supabase (usuario/contraseña)
- **Roles de usuario**: Líder, Senior, Admin
- **Dashboard personalizado** según el rol del usuario

#### Funcionalidades por Rol:

**Líder:**
- Gestión de metas personales con mecanismos de acción (4-6 por meta)
- Calendario de actividades drag & drop personalizable
- Actividades gustosas semanales con sistema de desbloqueo
- Programación de llamadas con Senior
- Visualización del leaderboard de su generación
- Seguimiento de progreso con porcentajes
- Actividades del calendario programables por fecha

**Senior:**
- Seguimiento de líderes de su generación
- Marcado de actividades completadas por líderes
- Gestión de llamadas con puntuación (0-3 puntos)
- Acceso a estadísticas de progreso detalladas
- Validación de metas completadas
- Sistema de puntuación avanzado

**Admin:**
- Acceso total al sistema
- Gestión de generaciones con fechas de registro y entrenamientos
- Configuración de actividades gustosas
- Cambio de credenciales de usuario
- Consulta de información de todas las generaciones
- Gestión de fechas de entrenamientos (básico, avanzado, PL1, PL2, PL3)
- Configuración de generaciones activas

## 🛠️ Tecnologías

- **Frontend**: Next.js 15, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **UI Components**: Radix UI, Lucide React
- **Formularios**: React Hook Form, Zod
- **Drag & Drop**: @dnd-kit
- **Fechas**: date-fns
- **Estilos**: TailwindCSS con colores corporativos

## 📦 Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd cctecate
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env.local
```

Editar `.env.local` con tus credenciales de Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

4. **Configurar Supabase**
   - Crear un proyecto en [Supabase](https://supabase.com)
   - Ejecutar el script SQL para crear las tablas (ver sección de Base de Datos)
   - Configurar las políticas de seguridad (RLS)

5. **Ejecutar en desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🗄️ Base de Datos

### Esquema de Tablas

```sql
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

-- Tabla para almacenar actividades del calendario del usuario
CREATE TABLE user_calendar_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  mechanism_id UUID REFERENCES mechanisms(id) ON DELETE CASCADE NOT NULL,
  scheduled_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, goal_id, mechanism_id, scheduled_date)
);
```

### Políticas de Seguridad (RLS)

```sql
-- Habilitar Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanisms ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_calendar_activities ENABLE ROW LEVEL SECURITY;

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

-- Políticas básicas para user_calendar_activities
CREATE POLICY "Users can view own calendar activities" ON user_calendar_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own calendar activities" ON user_calendar_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar activities" ON user_calendar_activities
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar activities" ON user_calendar_activities
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas básicas para generations
CREATE POLICY "Everyone can view generations" ON generations
    FOR SELECT USING (true);
```

### Funciones de Base de Datos

```sql
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
```

### Características de la Base de Datos

- **Triggers automáticos**: Creación de perfiles al registrarse
- **Índices optimizados**: Para mejorar el rendimiento de consultas
- **Funciones de negocio**: Leaderboard y gestión de generaciones
- **Validaciones**: Constraints para asegurar integridad de datos
- **Sistema de puntuación**: Cálculo automático basado en actividades completadas
- **Calendario personalizado**: Actividades programadas por usuario
- **Seguimiento de progreso**: Porcentajes de avance en metas

## 🎨 Diseño

### Colores Corporativos
- **Azul Principal**: #0ea5e9 (primary-500)
- **Verde Principal**: #22c55e (secondary-500)
- **Amarillo Acento**: #eab308 (accent-500)

### Tipografías
- **Títulos**: Poppins (display)
- **Cuerpo**: Inter (sans)

### Principios de Diseño
- **Mobile-first**: Diseño responsive que prioriza dispositivos móviles
- **Minimalista**: Interfaz limpia y moderna
- **Accesible**: Cumple con estándares de accesibilidad web
- **Consistente**: Sistema de diseño unificado

## 🚀 Despliegue

### Vercel (Recomendado)
1. Conectar el repositorio con Vercel
2. Configurar las variables de entorno
3. Desplegar automáticamente

### Otras plataformas
- **Netlify**: Compatible con Next.js
- **Railway**: Para aplicaciones full-stack
- **DigitalOcean**: Para mayor control

## 📱 Funcionalidades Móviles

- **Navegación táctil** optimizada
- **Gestos de arrastrar y soltar** en calendario
- **Formularios adaptativos** con validación
- **Notificaciones push** (futuro)
- **Modo offline** (futuro)

## 🔧 Desarrollo

### Estructura del Proyecto
```
src/
├── app/                    # App Router de Next.js
│   ├── auth/              # Páginas de autenticación
│   ├── portal/            # Portal de usuarios
│   └── globals.css        # Estilos globales
├── components/            # Componentes reutilizables
│   ├── ui/               # Componentes base (Radix UI)
│   └── portal/           # Componentes específicos del portal
├── lib/                  # Utilidades y configuración
│   ├── supabase.ts       # Cliente Supabase
│   └── utils.ts          # Funciones auxiliares
└── types/                # Definiciones de TypeScript
```

### Scripts Disponibles
```bash
npm run dev          # Desarrollo
npm run build        # Construcción
npm run start        # Producción
npm run lint         # Linting
npm run type-check   # Verificación de tipos
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas sobre el proyecto:
- Email: soporte@cctecate.com
- Documentación: [docs.cctecate.com](https://docs.cctecate.com)

---

**Creando Consciencia Tecate** - Transformando vidas a través del liderazgo consciente y el crecimiento personal.