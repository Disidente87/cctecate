-- Migración para cambiar unlock_date de TIMESTAMP a DATE
-- Ejecutar en el SQL Editor de Supabase

-- Paso 1: Crear una columna temporal para almacenar solo la fecha
ALTER TABLE activities 
ADD COLUMN unlock_date_temp DATE;

-- Paso 2: Migrar los datos existentes, extrayendo solo la fecha
UPDATE activities 
SET unlock_date_temp = unlock_date::DATE;

-- Paso 3: Eliminar la columna original
ALTER TABLE activities 
DROP COLUMN unlock_date;

-- Paso 4: Renombrar la columna temporal
ALTER TABLE activities 
RENAME COLUMN unlock_date_temp TO unlock_date;

-- Paso 5: Hacer la columna NOT NULL si es necesario
ALTER TABLE activities 
ALTER COLUMN unlock_date SET NOT NULL;

-- Verificar que la migración fue exitosa
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'activities' 
AND column_name = 'unlock_date';

-- Mostrar algunos registros para verificar
SELECT id, title, unlock_date 
FROM activities 
LIMIT 5;
