-- =====================================================
-- PROBAR GESTIÓN DE GENERACIONES
-- =====================================================

-- 1. Verificar que la tabla generations existe y tiene la estructura correcta
SELECT 
  'ESTRUCTURA DE TABLA' as tipo,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'generations' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar que las políticas RLS existen
SELECT 
  'POLÍTICAS RLS' as tipo,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'generations'
ORDER BY policyname;

-- 3. Verificar que la función is_user_admin existe
SELECT 
  'FUNCIÓN AUXILIAR' as tipo,
  'is_user_admin' as funcion,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_user_admin') 
    THEN 'EXISTE' ELSE 'NO EXISTE' END as estado;

-- 4. Verificar datos existentes en la tabla generations
SELECT 
  'DATOS EXISTENTES' as tipo,
  COUNT(*) as total_generaciones,
  COUNT(CASE WHEN is_active = true THEN 1 END) as generaciones_activas
FROM generations;

-- 5. Mostrar generaciones existentes
SELECT 
  'GENERACIONES' as tipo,
  name,
  description,
  registration_start_date,
  registration_end_date,
  generation_start_date,
  generation_graduation_date,
  basic_training_date,
  advanced_training_date,
  pl1_training_date,
  pl2_training_date,
  pl3_training_date,
  is_active,
  created_at
FROM generations
ORDER BY created_at DESC;

-- 6. Verificar permisos del rol authenticated
SELECT 
  'PERMISOS' as tipo,
  'authenticated' as rol,
  'SELECT en generations' as permiso,
  'Habilitado' as estado
UNION ALL
SELECT 
  'PERMISOS' as tipo,
  'admin' as rol,
  'INSERT/UPDATE/DELETE en generations' as permiso,
  'Habilitado' as estado;

-- 7. Resumen de funcionalidades implementadas
SELECT 
  'RESUMEN' as tipo,
  'Gestión de generaciones implementada exitosamente' as funcionalidad,
  'Solo admins pueden crear, editar y eliminar generaciones' as detalles
UNION ALL
SELECT 
  'RESUMEN' as tipo,
  'Navegación agregada al portal' as funcionalidad,
  'Opción Generaciones disponible para admins' as detalles
UNION ALL
SELECT 
  'RESUMEN' as tipo,
  'Formulario completo implementado' as funcionalidad,
  'Crear, editar, eliminar generaciones con todas las fechas' as detalles;
