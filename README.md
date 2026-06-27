# Randomlocke Tracker

Tracker local para una randomlocke de Pokemon Y. Guarda el estado en `localStorage`, permite mantener equipo, caja, rutas, muertos, objetos y notas manuales, y puede sincronizar equipo/caja desde el archivo de guardado `main` del emulador.

## Guia de instalacion

### Requisitos

- Windows 10/11.
- Node.js 20 o superior.
- npm, incluido con Node.js.
- SDK de .NET compatible con `net10.0`.
- Un save de Citra/Azahar exportado como archivo `main`.

### Instalar desde cero

```powershell
git clone https://github.com/Urbii22/randomlocke-tracker.git
cd randomlocke-tracker
npm install
```

Instala .NET de una de estas dos formas.

Opcion A, SDK global recomendado:

```powershell
winget install Microsoft.DotNet.SDK.10
dotnet --info
```

Opcion B, SDK local dentro del repo:

```powershell
New-Item -ItemType Directory -Force .\.tools | Out-Null
Invoke-WebRequest -UseBasicParsing "https://dot.net/v1/dotnet-install.ps1" -OutFile ".\.tools\dotnet-install.ps1"
& .\.tools\dotnet-install.ps1 -Channel 10.0 -InstallDir .\.dotnet -NoPath
.\.dotnet\dotnet.exe --info
```

Compila el lector de saves:

```powershell
# Si tienes dotnet global
dotnet build .\tools\save-reader\save-reader.csproj -c Release

# Si usaste el SDK local
.\.dotnet\dotnet.exe build .\tools\save-reader\save-reader.csproj -c Release
```

Arranca la app:

```powershell
npm run dev
```

Abre `http://127.0.0.1:3420`.

### Configurar el save

En `Ajustes`, pega la carpeta del save o la ruta exacta al archivo `main`.

Ejemplo de carpeta:

```text
D:\Citra 1920\user\sdmc\Nintendo 3DS\00000000000000000000000000000000\00000000000000000000000000000000\title\00040000\00055e00\data\00000001
```

Ejemplo de archivo:

```text
D:\Citra 1920\user\sdmc\Nintendo 3DS\00000000000000000000000000000000\00000000000000000000000000000000\title\00040000\00055e00\data\00000001\main
```

La app acepta ambas. Si pegas la carpeta, la API usa automaticamente el archivo `main` que hay dentro.

Pulsa `Actualizar desde save`. La app deberia leer el equipo, la caja y recalcular la vista de combate.

### Comprobar que todo funciona

```powershell
npm run test
npm run typecheck
npm run lint
npm run build
```

Prueba manual del lector:

```powershell
.\tools\save-reader\bin\Release\net10.0\save-reader.exe --save "D:\...\data\00000001\main"
```

Debe devolver JSON por `stdout`.

## Ejecutar la app en desarrollo

```powershell
npm install
npm run dev
```

Abre `http://127.0.0.1:3420`.

Comandos utiles:

```powershell
npm run typecheck
npm run test
npm run lint
npm run build
```

## Actualizar desde save

1. Compila el lector si no lo hiciste ya:

```powershell
dotnet restore .\tools\save-reader\save-reader.csproj
dotnet build .\tools\save-reader\save-reader.csproj -c Release
```

3. En la app, entra en `Ajustes`.
4. En `Ruta del archivo main`, pega la carpeta del save o la ruta del archivo. Ejemplo:

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
- busqueda de rival por Pokedex estandar para resaltar counters del equipo contra sus tipos

## Limitaciones conocidas

- `PKHeX.Core` puede cambiar nombres de APIs entre versiones; si falla la compilacion, el ajuste deberia concentrarse en `tools/save-reader/Program.cs`.
- Los tipos de Pokemon salen de la tabla normal de especie, no del randomizer. Esto encaja con la regla actual de la run.
- Los movimientos se leen desde el save y sus datos estandar de Gen 1-6 se completan desde `tools/save-reader/MoveMetadata.cs`. Si una ROM randomiza tipo/potencia/categoria de movimientos, hara falta importar overrides del randomizer o leer la tabla modificada de la ROM.
- La Pokedex de combate usa tipos y stats base estandar Gen 1-6 desde `src/data/pokedex.ts`; no refleja randomizacion de tipos/base stats si alguna run la activa.

## Pendiente para v2

- Anadir fixtures reales de saves anonimizados.
- Importar overrides de randomizer para tipo/potencia/precision/categoria si se juega con movimientos randomizados.
- Mejorar matching de Pokemon duplicados con PID/EC si se decide guardar esos identificadores.
- Crear una pantalla dedicada de historial de sincronizaciones.
