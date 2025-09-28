-- =====================================================
-- POLÍTICAS RLS PARA GESTIÓN DE GENERACIONES
-- =====================================================

-- 1. Política para que todos los usuarios autenticados puedan ver las generaciones
CREATE POLICY "Authenticated users can view generations" ON generations
  FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Política para que solo los admins puedan crear generaciones
CREATE POLICY "Admins can create generations" ON generations
  FOR INSERT WITH CHECK (is_user_admin());

-- 3. Política para que solo los admins puedan actualizar generaciones
CREATE POLICY "Admins can update generations" ON generations
  FOR UPDATE USING (is_user_admin());

-- 4. Política para que solo los admins puedan eliminar generaciones
CREATE POLICY "Admins can delete generations" ON generations
  FOR DELETE USING (is_user_admin());

-- 5. Verificar que las políticas se crearon correctamente
SELECT 
  'VERIFICACIÓN DE POLÍTICAS RLS' as tipo,
  'Políticas para generaciones creadas exitosamente' as estado,
  'Solo admins pueden gestionar generaciones' as detalles;
