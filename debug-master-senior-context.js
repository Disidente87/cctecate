// Script de diagnóstico específico para el contexto de master_senior
// Ejecutar en la consola del navegador

console.log('🔍 Diagnóstico completo de master_senior...');

// 1. Verificar usuario autenticado
const { data: { user } } = await supabase.auth.getUser();
console.log('👤 Usuario autenticado:', user?.id, user?.email);

// 2. Verificar perfil completo
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user?.id)
  .single();
console.log('📋 Perfil completo:', profile);
console.log('❌ Error perfil:', profileError);

// 3. Verificar rol específico
console.log('🎯 Rol del perfil:', profile?.role);
console.log('🎯 Es master_senior:', profile?.role === 'master_senior');

// 4. Probar consulta de usuarios asignados
console.log('👥 Probando consulta de usuarios asignados...');
const { data: assignedUsers, error: usersError } = await supabase
  .from('profiles')
  .select('id, name, email, generation, role, supervisor_id')
  .eq('supervisor_id', user?.id)
  .in('role', ['lider', 'senior'])
  .order('role')
  .order('name');

console.log('👥 Usuarios asignados encontrados:', assignedUsers);
console.log('❌ Error usuarios:', usersError);

// 5. Verificar si hay logs en la consola
console.log('🔍 Buscando logs del SelectedUserProvider...');
console.log('Revisa la consola para ver si aparecen los logs:');
console.log('- [SelectedUserProvider] Loading users for master senior:');
console.log('- [SelectedUserProvider] Users loaded for master senior:');
