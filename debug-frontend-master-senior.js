// Script de diagnóstico para master_senior en el frontend
// Ejecutar en la consola del navegador

console.log('🔍 Iniciando diagnóstico de master_senior...');

// 1. Verificar usuario autenticado
const { data: { user } } = await supabase.auth.getUser();
console.log('👤 Usuario autenticado:', user?.id, user?.email);

// 2. Verificar perfil
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user?.id)
  .single();
console.log('📋 Perfil:', profile);
console.log('❌ Error perfil:', profileError);

// 3. Verificar si es master_senior
const isMasterSenior = profile?.role === 'master_senior';
console.log('🎯 Es master_senior:', isMasterSenior);

// 4. Probar consulta directa
const { data: assignedUsers, error: usersError } = await supabase
  .from('profiles')
  .select('id, name, email, generation, role')
  .eq('supervisor_id', user?.id)
  .in('role', ['lider', 'senior'])
  .order('role')
  .order('name');

console.log('👥 Usuarios asignados:', assignedUsers);
console.log('❌ Error usuarios:', usersError);

// 5. Verificar contexto de selected-user
console.log('🔧 Verificando contexto...');
