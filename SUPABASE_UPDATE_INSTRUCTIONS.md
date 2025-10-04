# Instrucciones para Actualizar Supabase y Corregir Errores de Cookies

## Problema Identificado
Los errores en el terminal indican que el proyecto está usando `@supabase/auth-helpers-nextjs` que es deprecated y no es compatible con Next.js 15. Los errores específicos son:

```
Error: Route "/portal/leaderboard" used `cookies().get('sb-nzbqgwjhrhjaakckyxmn-auth-token')`. `cookies()` should be awaited before using its value.
```

## Solución Implementada

### 1. Código Actualizado
- ✅ **`src/lib/actions/leaderboard-actions.ts`**: Actualizado para usar `createClient` de `@/lib/supabase-server`
- ✅ **`src/lib/actions/profile-actions.ts`**: Actualizado para usar `createClient` de `@/lib/supabase-server`
- ✅ **`src/lib/supabase-server.ts`**: Ya está configurado correctamente para Next.js 15

### 2. Dependencias que Necesitan Actualización

#### Comandos a Ejecutar:
```bash
# Desinstalar dependencias deprecated
npm uninstall @supabase/auth-helpers-nextjs @supabase/auth-helpers-react

# Actualizar dependencias de Supabase
npm install @supabase/ssr@latest @supabase/supabase-js@latest
```

#### Dependencias a Remover del package.json:
- `@supabase/auth-helpers-nextjs`: "^0.10.0"
- `@supabase/auth-helpers-react`: "^0.5.0"

#### Dependencias a Mantener:
- `@supabase/ssr`: "^0.7.0" (actualizar a latest)
- `@supabase/supabase-js`: "^2.57.2" (actualizar a latest)
- `@supabase/auth-ui-react`: "^0.4.7" (mantener)
- `@supabase/auth-ui-shared`: "^0.1.8" (mantener)

### 3. Cambios Realizados en el Código

#### Antes (Deprecated):
```typescript
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const supabase = createServerActionClient({ cookies })
```

#### Después (Next.js 15 Compatible):
```typescript
import { createClient } from '@/lib/supabase-server'

const supabase = await createClient()
```

### 4. Archivos Modificados
- `src/lib/actions/leaderboard-actions.ts`
- `src/lib/actions/profile-actions.ts`

### 5. Próximos Pasos
1. Ejecutar los comandos de actualización de dependencias
2. Reiniciar el servidor de desarrollo
3. Verificar que los errores de cookies desaparezcan
4. Probar la funcionalidad de configuración de pesos del leaderboard

## Resultado Esperado
- ✅ Eliminación de errores de cookies en el terminal
- ✅ Funcionalidad completa de configuración de pesos
- ✅ Compatibilidad completa con Next.js 15
- ✅ Mejor rendimiento y estabilidad
