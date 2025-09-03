# Configuración de Tiempo Real para Check-in App

## Resumen
Esta aplicación ahora soporta sincronización en tiempo real entre múltiples dispositivos usando Supabase Realtime. Todos los cambios en los datos se reflejan automáticamente en todas las computadoras conectadas.

## Características Implementadas

### ✅ Sincronización en Tiempo Real
- **Registro de participantes**: Se sincroniza automáticamente entre todos los dispositivos
- **Check-ins**: Cuando alguien se registra, aparece inmediatamente en todas las pantallas
- **Importación de Excel/CSV**: Los nuevos participantes se muestran en tiempo real
- **Edición de datos**: Los cambios se reflejan instantáneamente

### ✅ Identificación de Estaciones
- Selector mejorado con opciones predefinidas:
  - N1 - Entrada Principal
  - N2 - Entrada Lateral  
  - N3 - Entrada VIP
  - N4 - Registro Tardío
  - ADMIN - Administración

### ✅ Indicador de Conexión
- **Verde con pulso**: Tiempo real activo
- **Amarillo**: Conectando o reconectando
- Botón de reconexión manual disponible

## Configuración Requerida

### 1. Base de Datos Supabase
Ejecuta el siguiente SQL en tu Supabase SQL Editor:

```sql
-- Enable realtime for the attendees table
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendees;

-- Enable row level security if not already enabled
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations
CREATE POLICY "Allow all operations on attendees" ON public.attendees
FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendees_checked_in_at ON public.attendees(checked_in_at);
CREATE INDEX IF NOT EXISTS idx_attendees_station ON public.attendees(station);
CREATE INDEX IF NOT EXISTS idx_attendees_full_name ON public.attendees(full_name);
```

### 2. Variables de Entorno
Asegúrate de tener configuradas:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
```

## Uso en Múltiples Dispositivos

### Configuración por Estación
1. **Abre la aplicación** en cada computadora/tablet
2. **Selecciona la estación** correspondiente (N1, N2, N3, etc.)
3. **Configura la impresora** local para cada dispositivo
4. **Verifica** que el indicador muestre "Tiempo Real Activo" (verde)

### Flujo de Trabajo
1. **Importar participantes**: Hazlo desde cualquier estación (preferiblemente ADMIN)
2. **Registro simultáneo**: Cada estación puede registrar participantes independientemente
3. **Visualización en tiempo real**: Todos los cambios aparecen automáticamente en todas las pantallas
4. **Impresión local**: Cada estación imprime con su impresora configurada

## Solución de Problemas

### Conexión de Tiempo Real
- **Indicador amarillo**: Verifica tu conexión a internet
- **Sin sincronización**: Usa el botón "🔄 Reconectar"
- **Datos desactualizados**: El botón de refrescar fuerza una actualización manual

### Rendimiento
- La aplicación está optimizada para manejar miles de participantes
- Las actualizaciones se procesan eficientemente sin recargar la página
- Los filtros de búsqueda funcionan en tiempo real

### Impresión
- Cada estación mantiene su configuración de impresora independientemente
- Las etiquetas se imprimen localmente en cada dispositivo
- El sistema funciona con cualquier impresora compatible con QZ Tray

## Archivos Modificados

### Nuevos Archivos
- `src/app/lib/useRealtime.ts` - Hook para manejo de tiempo real
- `supabase-realtime-setup.sql` - Configuración de base de datos
- `REALTIME_SETUP.md` - Esta documentación

### Archivos Modificados
- `src/app/lib/supabase.ts` - Configuración de cliente con realtime
- `src/app/page.tsx` - Componente principal con sincronización
- `src/app/globals.css` - Animaciones para indicadores

## Beneficios

### Para el Evento
- **Eficiencia**: Múltiples puntos de registro simultáneos
- **Consistencia**: Todos ven la misma información actualizada
- **Flexibilidad**: Agregar/quitar estaciones dinámicamente
- **Confiabilidad**: Respaldo automático en la nube

### Para los Operadores
- **Visibilidad**: Estado en tiempo real de todos los registros
- **Colaboración**: Trabajo coordinado entre estaciones
- **Simplicidad**: No requiere configuración compleja
- **Autonomía**: Cada estación opera independientemente

## Próximos Pasos

1. **Prueba** la aplicación en múltiples navegadores/dispositivos
2. **Configura** las estaciones según tu evento
3. **Importa** la lista de participantes
4. **Inicia** el registro coordinado

¡El sistema está listo para eventos con múltiples puntos de registro simultáneos!
