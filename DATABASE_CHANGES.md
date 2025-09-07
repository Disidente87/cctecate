# Cambios Consolidados en la Base de Datos - CC Tecate

## Archivo Consolidado
- **Archivo principal**: `supabase-schema.sql`
- **Propósito**: Resetear completamente la base de datos con todas las modificaciones aplicadas

## Cambios Principales Consolidados

### 1. **Estructura de Tablas Actualizada**

#### **Tabla `goals` (Metas)**
- ❌ **Eliminado**: `frequency` (movido a mechanisms)
- ❌ **Eliminado**: `is_custom` (no necesario)
- ✅ **Agregado**: `completed_by_senior_id` (UUID del Senior que completó la meta)
- ✅ **Agregado**: `progress_percentage` (0-100, con constraint)

#### **Tabla `mechanisms` (Mecanismos)**
- ❌ **Eliminado**: `completed` (no necesario)
- ❌ **Eliminado**: `due_date` (no necesario)
- ✅ **Agregado**: `frequency` (frecuencia individual por mecanismo)
- ✅ **Agregado**: `user_id` (propietario del mecanismo)
- ✅ **Agregado**: Constraint `check_frequency` con opciones:
  - `daily`, `2x_week`, `3x_week`, `4x_week`, `5x_week`
  - `weekly`, `biweekly`, `monthly`, `yearly`

### 2. **Políticas RLS Simplificadas**
- ✅ **Eliminadas**: Políticas complejas que causaban recursión infinita
- ✅ **Implementadas**: Políticas básicas sin dependencias circulares
- ✅ **Enfoque**: Usar `auth.uid()` directamente en lugar de consultar `profiles`

### 3. **Índices Optimizados**
- ✅ **Agregados**: Índices para `mechanisms.user_id`
- ✅ **Agregados**: Índices para `goals.completed_by_senior_id`
- ✅ **Optimizados**: Índices existentes mantenidos

### 4. **Funciones de Negocio Actualizadas**

#### **`get_leaderboard_data()`**
- ✅ **Actualizada**: Para trabajar con nueva estructura
- ✅ **Mejorada**: Cálculo de puntuaciones más preciso

#### **`get_active_generation()`**
- ✅ **Mantenida**: Funcionalidad existente
- ✅ **Mejorada**: Tipo de retorno más específico

### 5. **Restricciones de Negocio Implementadas**

#### **Una Meta por Categoría**
- ✅ **Validación**: En el frontend (TypeScript)
- ✅ **Categorías disponibles**: 8 categorías predefinidas
- ✅ **Máximo**: 8 metas por usuario (una por categoría)

#### **Límite de Mecanismos**
- ✅ **Mínimo**: 4 mecanismos por meta
- ✅ **Máximo**: 6 mecanismos por meta
- ✅ **Validación**: En el frontend y base de datos

### 6. **Datos Iniciales**
- ✅ **Generaciones**: C1, C2, C3 con fechas realistas
- ✅ **Actividades**: 6 actividades de ejemplo
- ✅ **Categorías de metas**: Personal, Finanzas, Salud, Familia, Carrera, Relaciones, Espiritual, Recreación

## Archivos de Migración Consolidados

Los siguientes archivos fueron consolidados en `supabase-schema.sql`:

1. `20241220_update_goals_mechanisms.sql` - Estructura de tablas
2. `20241220_fix_rls_policies.sql` - Políticas RLS
3. `20241220_disable_rls_temporarily.sql` - Deshabilitación temporal
4. `disable-rls-simple.sql` - Script simple de deshabilitación
5. `fix-mechanisms-table.sql` - Corrección de tabla mechanisms
6. `fix-rls-recursion.sql` - Corrección de recursión RLS

## Cómo Usar el Archivo Consolidado

### Para Resetear la Base de Datos:
1. Ir al **SQL Editor** de Supabase Dashboard
2. Copiar y pegar el contenido de `supabase-schema.sql`
3. Ejecutar el script completo
4. La base de datos se reseteará con todas las modificaciones aplicadas

### Características del Script:
- ✅ **Idempotente**: Se puede ejecutar múltiples veces
- ✅ **Completo**: Incluye todas las modificaciones
- ✅ **Limpio**: Elimina tablas existentes antes de recrear
- ✅ **Documentado**: Incluye comentarios explicativos

## Estructura Final de la Base de Datos

```
profiles (usuarios)
├── goals (metas - 1 por categoría)
│   └── mechanisms (4-6 por meta)
├── activities (actividades gustosas)
├── calls (llamadas de seguimiento)
├── user_activity_completions (completadas)
└── generations (generaciones del programa)
```

## Notas Importantes

1. **RLS Deshabilitado**: Para desarrollo, las políticas RLS están simplificadas
2. **Una Meta por Categoría**: Restricción implementada en frontend
3. **4-6 Mecanismos**: Validación en frontend y base de datos
4. **Frecuencias Individuales**: Cada mecanismo tiene su propia frecuencia
5. **Progreso de Metas**: Seguimiento de porcentaje y Senior que completó

## Próximos Pasos

1. Ejecutar `supabase-schema.sql` en Supabase
2. Verificar que la aplicación funcione correctamente
3. Implementar políticas RLS más complejas si es necesario
4. Agregar más datos de prueba según sea necesario
