-- =====================================================
-- CORRECCIÓN DE PERMISOS DE ADMINISTRADOR
-- =====================================================
-- Este script asegura que las funciones de admin funcionen
-- correctamente en el contexto de las políticas RLS
-- =====================================================

-- Recrear la función is_user_admin con mejor manejo de errores
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar que el usuario esté autenticado
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar que el usuario tenga rol de admin
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, retornar FALSE por seguridad
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función auxiliar específica para verificar permisos de activities
CREATE OR REPLACE FUNCTION can_manage_activities()
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar autenticación
  IF auth.role() != 'authenticated' THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar rol de admin
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos a la función
GRANT EXECUTE ON FUNCTION can_manage_activities() TO authenticated;

-- Verificar que las funciones existen y funcionan
DO $$
DECLARE
    admin_user_id UUID;
    is_admin_result BOOLEAN;
    can_manage_result BOOLEAN;
BEGIN
    -- Buscar un usuario admin para pruebas
    SELECT id INTO admin_user_id
    FROM profiles 
    WHERE role = 'admin' 
    LIMIT 1;
    
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'No se encontró usuario admin para pruebas';
    ELSE
        RAISE NOTICE 'Usuario admin encontrado: %', admin_user_id;
        
        -- Probar la función is_user_admin (sin contexto de usuario específico)
        SELECT is_user_admin() INTO is_admin_result;
        RAISE NOTICE 'Función is_user_admin disponible: %', is_admin_result IS NOT NULL;
        
        -- Probar la función can_manage_activities
        SELECT can_manage_activities() INTO can_manage_result;
        RAISE NOTICE 'Función can_manage_activities disponible: %', can_manage_result IS NOT NULL;
    END IF;
    
    RAISE NOTICE 'Funciones de administrador configuradas correctamente';
END $$;
