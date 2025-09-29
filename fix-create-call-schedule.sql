-- Actualizar la función create_call_schedule para usar supervisor_id
CREATE OR REPLACE FUNCTION create_call_schedule(
  p_leader_id UUID,
  p_supervisor_id UUID,
  p_monday_time TIME,
  p_wednesday_time TIME,
  p_friday_time TIME
)
RETURNS UUID AS $$
DECLARE
  v_schedule_id UUID;
  v_leader_generation TEXT;
  v_pl1_date TIMESTAMP WITH TIME ZONE;
  v_pl3_date TIMESTAMP WITH TIME ZONE;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Obtener la generación del líder
  SELECT generation INTO v_leader_generation
  FROM profiles 
  WHERE id = p_leader_id;
  
  IF v_leader_generation IS NULL THEN
    RAISE EXCEPTION 'Líder no encontrado o sin generación asignada';
  END IF;
  
  -- Obtener fechas PL1 y PL3 de la generación
  SELECT pl1_training_date, pl3_training_date 
  INTO v_pl1_date, v_pl3_date
  FROM generations 
  WHERE name = v_leader_generation;
  
  IF v_pl1_date IS NULL OR v_pl3_date IS NULL THEN
    RAISE EXCEPTION 'Fechas PL1 o PL3 no definidas para la generación %', v_leader_generation;
  END IF;
  
  -- Calcular fechas de inicio y fin
  v_start_date := (v_pl1_date + INTERVAL '2 days')::DATE;
  v_end_date := (v_pl3_date - INTERVAL '5 days')::DATE;
  
  -- Crear la programación
  INSERT INTO call_schedules (
    leader_id, 
    supervisor_id, 
    monday_time, 
    wednesday_time, 
    friday_time, 
    start_date, 
    end_date
  ) VALUES (
    p_leader_id, 
    p_supervisor_id, 
    p_monday_time,
    p_wednesday_time,
    p_friday_time,
    v_start_date, 
    v_end_date
  ) RETURNING id INTO v_schedule_id;
  
  -- Generar todas las llamadas automáticamente
  PERFORM generate_calls_from_schedule(v_schedule_id);
  
  RETURN v_schedule_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar que la función se creó correctamente
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'create_call_schedule';
