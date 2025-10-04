# Configuración de la Sección de Perfil

## Descripción
Se ha agregado una nueva sección de "Perfil" al portal de CC Tecate que permite a los usuarios gestionar su información personal completa.

## Características Implementadas

### 1. Información Personal
- **Nombre completo** (requerido)
- **Teléfono** (opcional)
- **Fecha de nacimiento** (opcional)
- **Ubicación** (opcional)
- **Biografía** (opcional)
- **LinkedIn** (opcional, con validación de URL)
- **Sitio web personal** (opcional, con validación de URL)

### 2. Contrato Personal
- Campo de texto para una frase inspiracional
- **Validación**: Máximo 20 palabras
- Contador de palabras en tiempo real

### 3. Gestión de Energía
- **Cosas que me dan energía**: Lista de hasta 10 elementos
- **Cosas que me quitan energía**: Lista de hasta 10 elementos
- Interfaz intuitiva para agregar/remover elementos
- Validación de duplicados

### 4. Información del Sistema
- Rol del usuario
- Generación
- Fecha de registro

## Instalación

### 1. Ejecutar Script SQL
Antes de usar la nueva funcionalidad, es necesario ejecutar el script SQL para agregar las nuevas columnas a la base de datos:

```bash
# Conectar a tu base de datos Supabase y ejecutar:
psql -h your-host -U your-user -d your-database -f add-profile-columns.sql
```

O ejecutar el contenido del archivo `add-profile-columns.sql` directamente en el editor SQL de Supabase.

### 2. Nuevas Columnas Agregadas
El script agrega las siguientes columnas a la tabla `profiles`:

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS personal_contract TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT;
```

### 3. Funciones de Base de Datos
El script también crea funciones útiles:

- `update_user_profile()`: Actualiza el perfil completo con validaciones
- `get_user_profile()`: Obtiene el perfil completo del usuario
- `validate_personal_contract()`: Valida el contrato personal (máximo 20 palabras)
- `validate_energy_arrays()`: Valida los arrays de energía (máximo 10 elementos)

## Uso

### 1. Navegación
- La sección "Mi Perfil" aparece como primera opción en las "Acciones Rápidas" del dashboard
- Ruta: `/portal/perfil`

### 2. Edición
- Hacer clic en "Editar Perfil" para activar el modo de edición
- Todos los campos se vuelven editables
- Validaciones en tiempo real
- Botón "Guardar Cambios" para confirmar

### 3. Gestión de Energía
- Agregar elementos escribiendo en el campo de texto y presionando Enter o el botón "+"
- Remover elementos haciendo clic en la "X" de cada badge
- Máximo 10 elementos por lista
- No se permiten duplicados

## Validaciones

### Contrato Personal
- Máximo 20 palabras
- Contador visual en tiempo real
- Validación tanto en frontend como backend

### URLs
- Validación de formato URL para LinkedIn y sitio web
- Campos opcionales

### Arrays de Energía
- Máximo 10 elementos por lista
- No se permiten elementos vacíos
- No se permiten duplicados

## Archivos Creados/Modificados

### Nuevos Archivos
- `src/app/portal/perfil/page.tsx` - Página principal del perfil
- `src/lib/actions/profile-actions.ts` - Server actions para el perfil
- `src/types/actions.ts` - Tipos para las acciones
- `add-profile-columns.sql` - Script SQL para la base de datos

### Archivos Modificados
- `src/app/portal/page.tsx` - Agregada navegación a "Mi Perfil"

## Tecnologías Utilizadas
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Supabase, PostgreSQL
- **Validación**: Zod
- **Estado**: React hooks
- **Notificaciones**: Sonner (toast)

## Consideraciones de Seguridad
- Todas las operaciones requieren autenticación
- Validación tanto en frontend como backend
- Row Level Security (RLS) de Supabase aplicado
- Sanitización de datos de entrada

## Próximos Pasos
1. Ejecutar el script SQL en la base de datos
2. Probar la funcionalidad en el entorno de desarrollo
3. Considerar agregar más campos según necesidades del negocio
4. Implementar funcionalidad de subida de foto de perfil (opcional)
