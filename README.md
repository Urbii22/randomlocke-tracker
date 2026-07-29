# Randomlocke Tracker

Tracker local para randomlockes de Pokemon Y, Anil, Opalo, Z y Prolocke. Guarda el estado en `localStorage`, permite mantener equipo, caja, rutas, muertos, objetos y notas manuales, y puede sincronizar equipo/caja desde el guardado del juego.

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

La app acepta ambas. Si pegas una carpeta, la API busca automáticamente `main`, `SaveData.bin` o la `Partida N.rxdata` más reciente.

Para Pokemon Anil, configura:

```text
Save: C:\Users\Diego\AppData\Roaming\Pokemon Anil\Partida 1.rxdata
Juego: D:\POKEMON_ANIL\Pokemon Anil
```

La app incluye pestañas independientes para Anil (A), Opalo (B), Z (C) y Prolocke (D). Prolocke está preparado para Luminescent Platinum (mod basado en Pokemon Diamante Brillante) y usa por defecto la carpeta de guardado de Ryujinx:

```text
Prolocke - Save: C:\Users\Diego\AppData\Roaming\Ryujinx\bis\user\save\0000000000000001\0
```

Si configuras una carpeta de Ryujinx, la app resuelve automáticamente el archivo `SaveData.bin` que contiene.

Prolocke usa el parser de PKLumiHEx 0.4.3.1 incluido en `tools/save-reader/vendor/PKHeX.Core.dll`. Detecta los guardados de Luminescent Platinum, lee el equipo, las cajas, la bolsa y el progreso, y trabaja sobre una copia temporal para no modificar `SaveData.bin`. El ensamblado procede del proyecto [PKLumiHEx](https://github.com/TalonSabre/PKLumiHex/releases/tag/0.4.3) y conserva su licencia GPL-3.0-or-later.

Para Prolocke no hace falta rellenar la carpeta del juego: las tablas necesarias las aporta el parser.

Las rutas predeterminadas de las otras partidas son:

```text
Opalo - Save: C:\Users\Diego\Saved Games\Pokemon Opalo\Game.rxdata
Opalo - Juego: D:\OPALO V2.11\Pokemon Opalo V2.11
Z - Save: C:\Users\Diego\Saved Games\Pokemon Z\Game.rxdata
Z - Juego: D:\Pokemon Z V2.18
```

Tambien puedes indicar la carpeta de saves; se seleccionara la `Partida N.rxdata` modificada mas recientemente. La carpeta del juego permite resolver los nombres, tipos, habilidades, movimientos y objetos desde `PBS`.

La Pokedex de busqueda y combate usa los datos de Anil en las partidas A/B/C y los datos propios de Luminescent Platinum en Prolocke. En Prolocke se aplican los tipos, stats base y habilidades de `LumiMons.json` de Team Luminescent, incluida la Pokédex personalizada del mod. Fuente: [luminescent.team/pokedex](https://luminescent.team/pokedex).

Para regenerar los datos de Anil despues de actualizar el juego:

```powershell
npm run generate:anil-pokedex -- "D:\POKEMON_ANIL\Pokemon Anil"
```

Para regenerar la tabla de Luminescent desde una copia local de `LumiMons.json`:

```powershell
npm run generate:luminescent-pokedex -- "C:\ruta\a\LumiMons.json"
```

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

# Prolocke / Luminescent Platinum
.\tools\save-reader\bin\Release\net10.0\save-reader.exe --save "C:\Users\Diego\AppData\Roaming\Ryujinx\bis\user\save\0000000000000001\0\SaveData.bin"

# Pokemon Anil
.\tools\save-reader\bin\Release\net10.0\save-reader.exe --save "C:\Users\Diego\AppData\Roaming\Pokemon Anil\Partida 1.rxdata" --game-dir "D:\POKEMON_ANIL\Pokemon Anil"
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
- naturaleza, EVs, IVs, experiencia, amistad, PS actuales, estado y genero
- movimientos
- `rawFields` con todos los campos disponibles del objeto `Pokemon` de Pokemon Anil (con sus nombres Ruby originales)
- MTs con su número y el movimiento que enseñan (`moveKey`/`moveName`), usando el PBS del juego
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
- En Pokemon Y, los tipos salen de la tabla normal de especie y los movimientos se completan con los datos estandar de Gen 1-6.
- En Pokemon Anil, especies, formas, tipos, stats base y movimientos salen de los archivos `PBS` instalados. Hay que regenerar la Pokedex si una actualizacion del juego cambia esos archivos.
- La Pokedex generada no refleja cambios temporales hechos solo en memoria durante una partida.

## Pendiente para v2

- Anadir fixtures reales de saves anonimizados.
- Importar overrides de randomizer para tipo/potencia/precision/categoria si se juega con movimientos randomizados.
- Mejorar matching de Pokemon duplicados con PID/EC si se decide guardar esos identificadores.
- Crear una pantalla dedicada de historial de sincronizaciones.
