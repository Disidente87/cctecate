// Script simple de diagnóstico - Ejecutar en la consola del navegador

console.log('🔍 Diagnóstico simple de master_senior...');

// 1. Verificar la página actual
console.log('📍 Página actual:', window.location.href);

// 2. Verificar si estamos en el portal
if (window.location.href.includes('/portal')) {
  console.log('✅ Estamos en el portal');
} else {
  console.log('❌ No estamos en el portal');
}

// 3. Verificar si hay logs del contexto
console.log('🔍 Busca en la consola estos logs:');
console.log('- 🔍 [PortalLayout] Debug info:');
console.log('- 🔍 [SelectedUserProvider] Debug info:');
console.log('- 🎯 [SelectedUserProvider] MASTER SENIOR DETECTED');
console.log('- [SelectedUserProvider] Loading users for master senior:');

// 4. Verificar si hay elementos del DOM relacionados
const leaderSwitcher = document.querySelector('[data-testid="leader-switcher"]');
console.log('🔍 LeaderSwitcher encontrado:', leaderSwitcher !== null);

const assignedUsers = document.querySelectorAll('[data-testid="assigned-user"]');
console.log('👥 Usuarios asignados en el DOM:', assignedUsers.length);

// 5. Verificar si hay errores en la consola
console.log('🔍 Revisa si hay errores en la consola (líneas rojas)');
