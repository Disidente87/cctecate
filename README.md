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
- Gestión de metas personales con mecanismos de acción
- Calendario de actividades drag & drop
- Actividades gustosas semanales
- Programación de llamadas con Senior
- Visualización del leaderboard de su generación

**Senior:**
- Seguimiento de líderes de su generación
- Marcado de actividades completadas
- Gestión de llamadas con puntuación
- Acceso a estadísticas de progreso

**Admin:**
- Acceso total al sistema
- Gestión de generaciones y usuarios
- Configuración de actividades gustosas
- Cambio de credenciales de usuario
- Consulta de información de todas las generaciones

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
-- Tabla de usuarios (extiende auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('lider', 'senior', 'admin')) NOT NULL,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de metas
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de llamadas
CREATE TABLE calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  senior_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'rescheduled', 'missed')) DEFAULT 'scheduled',
  score DECIMAL(2,1) DEFAULT 0,
  notes TEXT,
  rescheduled_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Políticas de Seguridad (RLS)

```sql
-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanisms ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Políticas para goals
CREATE POLICY "Users can view own goals" ON goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals" ON goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON goals
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para activities (visibles para todos los usuarios autenticados)
CREATE POLICY "Authenticated users can view activities" ON activities
  FOR SELECT USING (auth.role() = 'authenticated');

-- Políticas para calls (seniors y admins pueden gestionar)
CREATE POLICY "Users can view calls they are involved in" ON calls
  FOR SELECT USING (auth.uid() = leader_id OR auth.uid() = senior_id);
```

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