// Script de diagnóstico para master_senior - Ejecutar en la consola del navegador
// Asegúrate de estar en la página del portal

console.log('🔍 Iniciando diagnóstico de master_senior...');

// 1. Verificar si supabase está disponible en el contexto
if (typeof window !== 'undefined' && window.supabase) {
  console.log('✅ Supabase encontrado en window.supabase');
  var supabase = window.supabase;
} else {
  console.log('❌ Supabase no encontrado en window.supabase');
  console.log('🔍 Buscando en otros lugares...');
  
  // Buscar en el contexto de React
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('🔍 React DevTools encontrado, buscando supabase...');
  }
  
  console.log('💡 Intenta ejecutar este script desde la página del portal donde supabase esté disponible');
  console.log('💡 O ejecuta este comando simple: console.log("Usuario actual:", window.location.href);');
}

// 2. Verificar usuario autenticado
supabase.auth.getUser().then(({ data: { user }, error }) => {
  if (error) {
    console.log('❌ Error obteniendo usuario:', error);
    return;
  }
  
  console.log('👤 Usuario autenticado:', user?.id, user?.email);
  
  // 3. Verificar perfil
  supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()
    .then(({ data: profile, error: profileError }) => {
      console.log('📋 Perfil completo:', profile);
      console.log('❌ Error perfil:', profileError);
      
      // 4. Verificar rol específico
      console.log('🎯 Rol del perfil:', profile?.role);
      console.log('🎯 Es master_senior:', profile?.role === 'master_senior');
      
      // 5. Probar consulta de usuarios asignados
      console.log('👥 Probando consulta de usuarios asignados...');
      supabase
        .from('profiles')
        .select('id, name, email, generation, role, supervisor_id')
        .eq('supervisor_id', user?.id)
        .in('role', ['lider', 'senior'])
        .order('role')
        .order('name')
        .then(({ data: assignedUsers, error: usersError }) => {
          console.log('👥 Usuarios asignados encontrados:', assignedUsers);
          console.log('❌ Error usuarios:', usersError);
          
          // 6. Verificar logs del contexto
          console.log('🔍 Revisa la consola para ver si aparecen los logs del SelectedUserProvider:');
          console.log('- [SelectedUserProvider] Debug info:');
          console.log('- [SelectedUserProvider] Loading users for master senior:');
          console.log('- [SelectedUserProvider] Users loaded for master senior:');
        });
    });
});
