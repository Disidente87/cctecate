-- =====================================================
-- CORRECCIÓN DE POLÍTICAS RLS PARA TABLA ACTIVITIES
-- =====================================================
-- Este script corrige las políticas RLS para que los admins
-- puedan insertar, actualizar y eliminar actividades
-- =====================================================

-- Eliminar políticas existentes para activities
DROP POLICY IF EXISTS "Admins can view all activities" ON activities;
DROP POLICY IF EXISTS "Admins can insert activities" ON activities;
DROP POLICY IF EXISTS "Admins can update activities" ON activities;
DROP POLICY IF EXISTS "Admins can delete activities" ON activities;

-- Recrear políticas con verificación directa del rol
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

-- Verificar que las políticas se aplicaron correctamente
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'activities' 
    AND policyname LIKE '%Admins%';
    
    IF policy_count < 4 THEN
        RAISE EXCEPTION 'Error: No se pudieron crear todas las políticas para activities';
    END IF;
    
    RAISE NOTICE 'Políticas RLS para activities corregidas exitosamente';
    RAISE NOTICE 'Total de políticas de admin creadas: %', policy_count;
END $$;

-- Mostrar las políticas actuales
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'activities'
ORDER BY policyname;
