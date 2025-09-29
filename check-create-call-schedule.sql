-- Verificar la función create_call_schedule existente
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'create_call_schedule';
