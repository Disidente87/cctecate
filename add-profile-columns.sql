-- =====================================================
-- AGREGAR COLUMNAS FALTANTES A LA TABLA PROFILES
-- Para la sección de perfil del usuario
-- =====================================================

-- Agregar columnas para información personal completa
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS personal_contract TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Agregar comentarios a las nuevas columnas
COMMENT ON COLUMN profiles.phone IS 'Número de teléfono del usuario';
COMMENT ON COLUMN profiles.birth_date IS 'Fecha de nacimiento del usuario';
COMMENT ON COLUMN profiles.personal_contract IS 'Contrato personal del usuario (máximo 20 palabras)';
COMMENT ON COLUMN profiles.bio IS 'Biografía o descripción personal del usuario';
COMMENT ON COLUMN profiles.location IS 'Ubicación o ciudad del usuario';
COMMENT ON COLUMN profiles.linkedin_url IS 'URL del perfil de LinkedIn';
COMMENT ON COLUMN profiles.website_url IS 'URL del sitio web personal';

-- Agregar restricciones de validación
ALTER TABLE profiles 
ADD CONSTRAINT check_personal_contract_length 
CHECK (personal_contract IS NULL OR array_length(string_to_array(personal_contract, ' '), 1) <= 20);

-- Crear índices para las nuevas columnas (opcional, para búsquedas)
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_birth_date ON profiles(birth_date);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(location);

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

-- Agregar restricciones de validación para los arrays de energía
ALTER TABLE profiles 
ADD CONSTRAINT check_energy_givers_length 
CHECK (validate_energy_arrays(energy_givers));

ALTER TABLE profiles 
ADD CONSTRAINT check_energy_drainers_length 
CHECK (validate_energy_arrays(energy_drainers));

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

-- Otorgar permisos para las nuevas funciones
GRANT EXECUTE ON FUNCTION update_user_profile(UUID, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_personal_contract(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_energy_arrays(TEXT[]) TO authenticated;

-- Comentarios en las funciones
COMMENT ON FUNCTION update_user_profile IS 'Actualiza el perfil completo del usuario con validaciones';
COMMENT ON FUNCTION get_user_profile IS 'Obtiene el perfil completo del usuario';
COMMENT ON FUNCTION validate_personal_contract IS 'Valida que el contrato personal no exceda 20 palabras';
COMMENT ON FUNCTION validate_energy_arrays IS 'Valida que los arrays de energía no excedan 10 elementos';

-- Mensaje de confirmación
SELECT 'Columnas de perfil agregadas exitosamente a la tabla profiles' as status;
