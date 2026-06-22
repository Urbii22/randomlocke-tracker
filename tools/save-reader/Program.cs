using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;

var options = SaveReaderOptions.Parse(args);

if (options is null)
{
    Console.Error.WriteLine("Usage: save-reader --save \"path\\to\\main\"");
    Environment.Exit(2);
    return;
}

if (!File.Exists(options.SavePath))
{
    Console.Error.WriteLine("Save file was not found.");
    Environment.Exit(3);
    return;
}

var tempPath = Path.Combine(Path.GetTempPath(), $"randomlocke-save-{Guid.NewGuid():N}.main");

try
{
    File.Copy(options.SavePath, tempPath, overwrite: false);
    var snapshot = SaveSnapshotReader.Read(tempPath);
    Console.WriteLine(JsonSerializer.Serialize(snapshot, JsonOptions.Value));
}
catch (Exception ex)
{
    var errorSnapshot = new SaveSnapshot(
        DateTimeOffset.UtcNow,
        "Pokemon Y",
        [],
        [],
        [],
        null,
        [$"No se pudo leer el save: {ex.GetType().Name}"]
    );
    Console.WriteLine(JsonSerializer.Serialize(errorSnapshot, JsonOptions.Value));
    Environment.ExitCode = 1;
}
finally
{
    try
    {
        if (File.Exists(tempPath))
            File.Delete(tempPath);
    }
    catch
    {
        // Best effort cleanup only; never touch the original save.
    }
}

internal sealed record SaveReaderOptions(string SavePath)
{
    public static SaveReaderOptions? Parse(string[] args)
    {
        for (var i = 0; i < args.Length - 1; i++)
        {
            if (args[i] is "--save" or "-s")
                return new SaveReaderOptions(args[i + 1]);
        }

        return null;
    }
}

internal static class SaveSnapshotReader
{
    public static SaveSnapshot Read(string copiedSavePath)
    {
        var save = SaveUtil.GetSaveFile(copiedSavePath);
        if (save is null)
            throw new InvalidOperationException("PKHeX.Core did not recognize the save file.");

        var party = new List<SavePokemon>();
        var boxes = new List<SavePokemon>();

        for (var slot = 0; slot < save.PartyCount; slot++)
        {
            var pokemon = save.GetPartySlotAtIndex(slot);
            if (IsEmpty(pokemon))
                continue;

            party.Add(ToSavePokemon(pokemon, "party", partySlot: slot, box: null, slot: null));
        }

        for (var box = 0; box < save.BoxCount; box++)
        {
            for (var slot = 0; slot < save.BoxSlotCount; slot++)
            {
                var pokemon = save.GetBoxSlotAtIndex(box, slot);
                if (IsEmpty(pokemon))
                    continue;

                boxes.Add(ToSavePokemon(pokemon, "box", partySlot: null, box: box + 1, slot: slot + 1));
            }
        }

        return new SaveSnapshot(DateTimeOffset.UtcNow, "Pokemon Y", party, boxes, GetBag(save), GetProgress(save), []);
    }

    private static bool IsEmpty(PKM pokemon) => pokemon.Species == 0;

    private static SavePokemon ToSavePokemon(
        PKM pokemon,
        string source,
        int? partySlot,
        int? box,
        int? slot
    )
    {
        var speciesName = GetSpeciesName(pokemon);
        var nickname = string.IsNullOrWhiteSpace(pokemon.Nickname) ? speciesName : pokemon.Nickname;
        var stats = pokemon.GetStats(pokemon.PersonalInfo);

        return new SavePokemon(
            source,
            partySlot,
            box,
            slot,
            speciesName,
            nickname,
            pokemon.CurrentLevel,
            GetTypes(pokemon),
            GetAbilityName(pokemon),
            GetItemName(pokemon),
            new SaveStats(
                stats[0],
                stats[1],
                stats[2],
                stats[4],
                stats[5],
                stats[3]
            ),
            GetMoves(pokemon, pokemon.Context)
        );
    }

    private static string GetSpeciesName(PKM pokemon)
    {
        var species = pokemon.Species;
        var names = GameInfo.Strings.Species;
        return species < names.Count ? names[species] : $"Species {species}";
    }

    private static string GetAbilityName(PKM pokemon)
    {
        var ability = pokemon.Ability;
        var names = GameInfo.Strings.Ability;
        return ability < names.Count ? names[ability] : $"Ability {ability}";
    }

    private static string? GetItemName(PKM pokemon)
    {
        if (pokemon.HeldItem == 0)
            return null;

        var names = GameInfo.Strings.Item;
        return pokemon.HeldItem < names.Count ? names[pokemon.HeldItem] : $"Item {pokemon.HeldItem}";
    }

    private static string[] GetTypes(PKM pokemon)
    {
        var types = GameInfo.Strings.Types;
        var type1 = (int)pokemon.PersonalInfo.Type1;
        var type2 = (int)pokemon.PersonalInfo.Type2;

        if (type1 == type2)
            return [TranslateType(type1, types)];

        return [TranslateType(type1, types), TranslateType(type2, types)];
    }

    private static SaveMove[] GetMoves(PKM pokemon, EntityContext context)
    {
        return pokemon.Moves
            .Where(move => move != 0)
            .Select(move => ToSaveMove(move, context))
            .ToArray();
    }

    private static SaveMove ToSaveMove(ushort moveId, EntityContext context)
    {
        var moveName = moveId < GameInfo.Strings.Move.Count
            ? GameInfo.Strings.Move[moveId]
            : $"Move {moveId}";
        var typeId = MoveInfo.GetType(moveId, context);

        return new SaveMove(moveName, TranslateType(typeId, GameInfo.Strings.Types), "unknown", null, null);
    }

    private static SaveBagItem[] GetBag(SaveFile save)
    {
        var itemNames = GameInfo.Strings.Item;
        var items = new List<SaveBagItem>();

        foreach (var pouch in save.Inventory.Pouches)
        {
            foreach (var item in pouch.Items)
            {
                if (item.Index <= 0 || item.Count <= 0)
                    continue;

                var name = item.Index < itemNames.Count ? itemNames[item.Index] : $"Item {item.Index}";
                if (string.IsNullOrWhiteSpace(name))
                    name = $"Item {item.Index}";

                items.Add(new SaveBagItem(
                    item.Index,
                    name,
                    item.Count,
                    MapInventoryCategory(pouch.Type),
                    MapPocketName(pouch.Type)
                ));
            }
        }

        return [.. items];
    }

    private static SaveProgress? GetProgress(SaveFile save)
    {
        if (save is not SAV6XY xy)
            return null;

        return new SaveProgress(
            CountSetBits(xy.Badges),
            new SaveLocation(
                xy.Situation.M,
                xy.Situation.R,
                xy.Situation.X,
                xy.Situation.Y,
                xy.Situation.Z,
                GetLocationName(xy.Situation.M)
            )
        );
    }

    private static int CountSetBits(int value)
    {
        var count = 0;
        var remaining = value;

        while (remaining > 0)
        {
            count += remaining & 1;
            remaining >>= 1;
        }

        return count;
    }

    private static string GetLocationName(int mapId)
    {
        return mapId switch
        {
            2 => "Pueblo Boceto",
            4 => "Ciudad Novarte",
            6 => "Ciudad Luminalia",
            7 => "Ciudad Relieve",
            8 => "Ciudad Yantra",
            9 => "Ciudad Témpera",
            10 => "Ciudad Romantis",
            11 => "Ciudad Fluxus",
            12 => "Ciudad Fractal",
            _ => $"Mapa {mapId}",
        };
    }

    private static string MapInventoryCategory(InventoryType type)
    {
        return type switch
        {
            InventoryType.TMHMs => "tm",
            InventoryType.Medicine => "medicine",
            InventoryType.Balls => "pokeball",
            InventoryType.Berries => "berry",
            InventoryType.BattleItems => "battle_item",
            InventoryType.KeyItems => "key_item",
            _ => "other",
        };
    }

    private static string MapPocketName(InventoryType type)
    {
        return type switch
        {
            InventoryType.Items => "Objetos",
            InventoryType.KeyItems => "Objetos clave",
            InventoryType.TMHMs => "MT/MO",
            InventoryType.Medicine => "Medicina",
            InventoryType.Berries => "Bayas",
            InventoryType.Balls => "Pokeballs",
            InventoryType.BattleItems => "Combate",
            _ => type.ToString(),
        };
    }

    private static string TranslateType(int typeId, IReadOnlyList<string> fallback)
    {
        return typeId switch
        {
            0 => "Normal",
            1 => "Lucha",
            2 => "Volador",
            3 => "Veneno",
            4 => "Tierra",
            5 => "Roca",
            6 => "Bicho",
            7 => "Fantasma",
            8 => "Acero",
            9 => "Fuego",
            10 => "Agua",
            11 => "Planta",
            12 => "Electrico",
            13 => "Psiquico",
            14 => "Hielo",
            15 => "Dragon",
            16 => "Siniestro",
            17 => "Hada",
            _ => typeId < fallback.Count ? fallback[typeId] : $"Type {typeId}",
        };
    }
}

internal sealed record SaveSnapshot(
    DateTimeOffset ReadAt,
    string Game,
    IReadOnlyList<SavePokemon> Party,
    IReadOnlyList<SavePokemon> Boxes,
    IReadOnlyList<SaveBagItem> Bag,
    SaveProgress? Progress,
    IReadOnlyList<string> Errors
);

internal sealed record SaveProgress(
    int Badges,
    SaveLocation Location
);

internal sealed record SaveLocation(
    int MapId,
    int Zone,
    float X,
    float Y,
    float Z,
    string Name
);

internal sealed record SavePokemon(
    string Source,
    int? PartySlot,
    int? Box,
    int? Slot,
    string Species,
    string Nickname,
    int Level,
    IReadOnlyList<string> Types,
    string Ability,
    string? Item,
    SaveStats Stats,
    IReadOnlyList<SaveMove> Moves
);

internal sealed record SaveStats(
    int Hp,
    int Attack,
    int Defense,
    int SpecialAttack,
    int SpecialDefense,
    int Speed
);

internal sealed record SaveMove(
    string Name,
    string Type,
    string Category,
    int? Power,
    int? Accuracy
);

internal sealed record SaveBagItem(
    int ItemId,
    string Name,
    int Quantity,
    string Category,
    string Pocket
);

internal static class JsonOptions
{
    public static readonly JsonSerializerOptions Value = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false,
    };
}
