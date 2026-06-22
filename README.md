# Randomlocke Tracker

Tracker local para una randomlocke de Pokemon Y. Guarda el estado en `localStorage`, permite mantener equipo, caja, rutas, muertos, objetos y notas manuales, y puede sincronizar equipo/caja desde el archivo de guardado `main` del emulador.

## Ejecutar la app

```powershell
npm install
npm run dev
```

Abre `http://127.0.0.1:3000`.

Comandos utiles:

```powershell
npm run typecheck
npm run test
npm run lint
npm run build
```

## Actualizar desde save

1. Instala el SDK de .NET compatible con `net10.0`.
2. Compila el lector:

```powershell
dotnet restore .\tools\save-reader\save-reader.csproj
dotnet build .\tools\save-reader\save-reader.csproj -c Release
```

3. En la app, entra en `Ajustes`.
4. En `Ruta del archivo main`, pega la ruta del save del emulador. Ejemplo:

```text
D:\...\title\...\data\00000001\main
```

5. Pulsa `Actualizar desde save`.

La API local valida que el archivo exista, ejecuta `tools/save-reader`, lee el JSON generado y fusiona el resultado con el estado actual de la app.

## Ejecutar el lector manualmente

```powershell
dotnet run --project .\tools\save-reader -- --save "D:\...\title\...\data\00000001\main"
```

El lector escribe el snapshot JSON en `stdout`.

## Seguridad

- El archivo original `main` nunca se abre directamente para parseo.
- El lector copia `main` a `%TEMP%` y solo abre la copia temporal.
- No hay funciones de escritura o guardado del save.
- La API usa `execFile`, no shell.
- Los errores de UI no muestran rutas completas del equipo.

## Merge de datos

La sincronizacion actualiza datos leidos del save:

- equipo y caja
- nivel
- habilidad
- objeto equipado
- stats actuales
- movimientos
- `source`, `partySlot`, `box`, `slot`, `lastSeenInSaveAt`

La sincronizacion preserva datos manuales:

- muerto/vivo si ya estaba muerto
- notas
- rol manual
- ruta capturada
- causa y lugar de muerte
- estado prohibido para legendarios

Si aparece un legendario en el save, se marca como `forbidden`.

## Analisis tras sincronizar

Despues de fusionar, la app recalcula equipo/caja y muestra en Ajustes:

- cuantos Pokemon se han anadido o actualizado
- cuantos se han marcado como prohibidos
- candidatos de caja con mas valor manual que el sexto miembro del equipo
- alertas defensivas por debilidades repetidas
- alertas de debilidad 4x

## Limitaciones conocidas

- Esta maquina no tenia `dotnet` instalado durante la implementacion, asi que el proyecto C# queda preparado pero debe compilarse en una maquina con SDK .NET.
- `PKHeX.Core` puede cambiar nombres de APIs entre versiones; si falla la compilacion, el ajuste deberia concentrarse en `tools/save-reader/Program.cs`.
- Los tipos de Pokemon salen de la tabla normal de especie, no del randomizer. Esto encaja con la regla actual de la run.
- Los movimientos randomizados se leen por nombre. Tipo/potencia/precision quedan preparados en el JSON, pero el lector actual deja esos campos como desconocidos cuando la API estable de datos de movimiento no este disponible.

## Pendiente para v2

- Anadir fixtures reales de saves anonimizados.
- Resolver tipo/potencia/precision de movimientos desde la tabla interna exacta de `PKHeX.Core`.
- Mejorar matching de Pokemon duplicados con PID/EC si se decide guardar esos identificadores.
- Crear una pantalla dedicada de historial de sincronizaciones.
