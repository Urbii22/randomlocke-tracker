using System.Numerics;

internal static class PokemonAnilSaveReader
{
    public static bool LooksLikeSave(string path)
    {
        using var stream = File.OpenRead(path);
        return stream.Length >= 2 && stream.ReadByte() == 4 && stream.ReadByte() == 8;
    }

    public static SaveSnapshot Read(string copiedSavePath, string? gameDirectory)
    {
        using var stream = File.OpenRead(copiedSavePath);
        if (RubyMarshalReader.Read(stream) is not RubyHash root)
            throw new InvalidDataException("Pokemon Anil save root is not a hash.");

        var data = PokemonAnilData.Load(gameDirectory);
        var player = GetRootObject(root, "player");
        var storage = GetRootObject(root, "storage_system");
        var party = ReadParty(player, data);
        var boxes = ReadBoxes(storage, data);
        var bag = ReadBag(GetRootObject(root, "bag"), data);
        var progress = ReadProgress(player);

        var errors = new List<string>();
        if (data.Species.Count == 0)
            errors.Add("No se encontro la carpeta PBS; tipos, habilidades y nombres pueden estar incompletos.");

        return new SaveSnapshot(DateTimeOffset.UtcNow, "Pokemon Anil", party, boxes, bag, progress, errors);
    }

    private static List<SavePokemon> ReadParty(RubyObject player, PokemonAnilData data)
    {
        var result = new List<SavePokemon>();
        var party = GetList(player, "@party");
        for (var slot = 0; slot < party.Count; slot++)
        {
            if (party[slot] is RubyObject pokemon && pokemon.ClassName == "Pokemon")
                result.Add(ReadPokemon(pokemon, "party", slot, null, null, data));
        }
        return result;
    }

    private static List<SavePokemon> ReadBoxes(RubyObject storage, PokemonAnilData data)
    {
        var result = new List<SavePokemon>();
        var boxes = GetList(storage, "@boxes");
        for (var boxIndex = 0; boxIndex < boxes.Count; boxIndex++)
        {
            if (boxes[boxIndex] is not RubyObject box)
                continue;

            var pokemonSlots = GetList(box, "@pokemon");
            for (var slotIndex = 0; slotIndex < pokemonSlots.Count; slotIndex++)
            {
                if (pokemonSlots[slotIndex] is RubyObject pokemon && pokemon.ClassName == "Pokemon")
                    result.Add(ReadPokemon(pokemon, "box", null, boxIndex + 1, slotIndex + 1, data));
            }
        }
        return result;
    }

    private static SavePokemon ReadPokemon(
        RubyObject pokemon,
        string source,
        int? partySlot,
        int? box,
        int? slot,
        PokemonAnilData data
    )
    {
        var speciesId = GetSymbol(pokemon, "@species") ?? "UNKNOWN";
        var form = GetInt(pokemon, "@form") ?? 0;
        var species = form > 0
            ? data.Forms.GetValueOrDefault($"{speciesId},{form}") ?? data.Species.GetValueOrDefault(speciesId)
            : data.Species.GetValueOrDefault(speciesId);
        var nickname = GetString(pokemon, "@name");
        var abilityIndex = GetInt(pokemon, "@ability_index") ?? 0;
        var abilityId = GetSymbol(pokemon, "@ability")
            ?? species?.Abilities.ElementAtOrDefault(abilityIndex)
            ?? species?.Abilities.FirstOrDefault()
            ?? "";
        var ability = data.Abilities.GetValueOrDefault(abilityId)?.Name ?? PokemonAnilData.Humanize(abilityId);
        var itemId = GetSymbol(pokemon, "@item");
        var item = itemId is null
            ? null
            : data.Items.GetValueOrDefault(itemId)?.Name ?? PokemonAnilData.Humanize(itemId);

        var moves = GetList(pokemon, "@moves")
            .OfType<RubyObject>()
            .Select(move => ReadMove(move, data))
            .Where(move => move is not null)
            .Cast<SaveMove>()
            .Take(4)
            .ToArray();

        var evs = ReadStatValues(pokemon, "@ev");
        var ivs = ReadStatValues(pokemon, "@iv");

        return new SavePokemon(
            source,
            partySlot,
            box,
            slot,
            species?.Name ?? PokemonAnilData.Humanize(speciesId),
            string.IsNullOrWhiteSpace(nickname) ? species?.Name ?? PokemonAnilData.Humanize(speciesId) : nickname,
            GetInt(pokemon, "@level") ?? 1,
            species?.Types ?? [],
            ability,
            item,
            new SaveStats(
                GetInt(pokemon, "@totalhp") ?? GetInt(pokemon, "@hp") ?? 0,
                GetInt(pokemon, "@attack") ?? 0,
                GetInt(pokemon, "@defense") ?? 0,
                GetInt(pokemon, "@spatk") ?? 0,
                GetInt(pokemon, "@spdef") ?? 0,
                GetInt(pokemon, "@speed") ?? 0
            ),
            moves,
            form > 0 ? $"{speciesId}_{form}" : speciesId,
            GetBool(pokemon, "@shiny") ?? false,
            GetLabel(pokemon, "@nature"),
            evs,
            ivs,
            GetInt(pokemon, "@exp"),
            GetInt(pokemon, "@happiness"),
            GetInt(pokemon, "@hp"),
            GetStatusCondition(pokemon),
            GetGender(pokemon),
            ToRawFields(pokemon)
        );
    }

    private static SaveMove? ReadMove(RubyObject move, PokemonAnilData data)
    {
        var id = GetSymbol(move, "@id");
        if (string.IsNullOrWhiteSpace(id))
            return null;

        if (data.Moves.TryGetValue(id, out var metadata))
            return new SaveMove(metadata.Name, metadata.Type, metadata.Category, metadata.Power, metadata.Accuracy);
        return new SaveMove(PokemonAnilData.Humanize(id), "", "unknown", null, null);
    }

    private static SaveBagItem[] ReadBag(RubyObject bag, PokemonAnilData data)
    {
        var result = new List<SaveBagItem>();
        var pockets = GetList(bag, "@pockets");

        for (var pocketIndex = 0; pocketIndex < pockets.Count; pocketIndex++)
        {
            if (pockets[pocketIndex] is not List<object?> pocket)
                continue;

            foreach (var entry in pocket.OfType<List<object?>>())
            {
                if (entry.Count < 2 || entry[0] is not RubySymbol itemSymbol || ToInt(entry[1]) is not int quantity || quantity <= 0)
                    continue;

                var itemId = itemSymbol.Name;
                var item = data.Items.GetValueOrDefault(itemId);
                var pocketNumber = item?.Pocket ?? pocketIndex;
                var isKeyItem = item?.IsKeyItem ?? pocketNumber == 8;
                var itemName = item?.Name ?? PokemonAnilData.Humanize(itemId);
                var moveKey = item?.MoveKey;
                var moveName = moveKey is not null && data.Moves.TryGetValue(moveKey, out var move)
                    ? move.Name
                    : null;
                var displayName = moveName is null ? itemName : $"{itemName} ({moveName})";
                result.Add(new SaveBagItem(
                    StableNumericId(itemId),
                    displayName,
                    quantity,
                    MapItemCategory(itemId, pocketNumber, isKeyItem),
                    MapPocket(pocketNumber, isKeyItem),
                    itemId,
                    pocketNumber,
                    item?.Flags,
                    itemName,
                    moveKey,
                    moveName
                ));
            }
        }

        return [.. result];
    }

    private static SaveProgress ReadProgress(RubyObject player)
    {
        var badges = GetList(player, "@badges").Count(value => value is true);
        return new SaveProgress(badges, null);
    }

    private static RubyObject GetRootObject(RubyHash root, string key) =>
        root.FirstOrDefault(pair => pair.Key is RubySymbol symbol && symbol.Name == key).Value as RubyObject
        ?? throw new InvalidDataException($"Pokemon Anil save does not contain {key}.");

    private static List<object?> GetList(RubyObject value, string key) =>
        value.Fields.GetValueOrDefault(key) as List<object?> ?? [];

    private static string? GetSymbol(RubyObject value, string key) =>
        value.Fields.GetValueOrDefault(key) is RubySymbol symbol ? symbol.Name : null;

    private static string? GetString(RubyObject value, string key) => value.Fields.GetValueOrDefault(key) switch
    {
        byte[] bytes => RubyMarshalReader.Decode(bytes),
        string text => text,
        _ => null,
    };

    private static string? GetLabel(RubyObject value, string key) => value.Fields.GetValueOrDefault(key) switch
    {
        RubySymbol symbol => PokemonAnilData.Humanize(symbol.Name),
        byte[] bytes => RubyMarshalReader.Decode(bytes),
        string text when !string.IsNullOrWhiteSpace(text) => text,
        _ => null,
    };

    private static string? GetGender(RubyObject value)
    {
        var raw = value.Fields.GetValueOrDefault("@gender");
        if (raw is RubySymbol symbol)
            return PokemonAnilData.Humanize(symbol.Name);
        if (raw is string text && !string.IsNullOrWhiteSpace(text))
            return text;

        return ToInt(raw) switch
        {
            0 => "Macho",
            1 => "Hembra",
            2 => "Sin genero",
            _ => null,
        };
    }

    private static string? GetStatusCondition(RubyObject value)
    {
        var raw = value.Fields.GetValueOrDefault("@status");
        if (raw is RubySymbol or string or byte[])
            return GetLabel(value, "@status");

        return ToInt(raw) switch
        {
            null or 0 => null,
            1 => "Dormido",
            2 => "Envenenado",
            3 => "Quemado",
            4 => "Paralizado",
            5 => "Congelado",
            6 => "Toxico",
            _ => $"Estado {ToInt(raw)}",
        };
    }

    private static SaveStats? ReadStatValues(RubyObject value, string key)
    {
        if (value.Fields.GetValueOrDefault(key) is not List<object?> values || values.Count < 6)
            return null;

        var numbers = values.Take(6).Select(ToInt).ToArray();
        return numbers.All(number => number is not null)
            ? new SaveStats(
                numbers[0]!.Value,
                numbers[1]!.Value,
                numbers[2]!.Value,
                numbers[3]!.Value,
                numbers[4]!.Value,
                numbers[5]!.Value
            )
            : null;
    }

    private static IReadOnlyDictionary<string, object?> ToRawFields(RubyObject pokemon)
    {
        var fields = new Dictionary<string, object?>(StringComparer.Ordinal);
        foreach (var (key, value) in pokemon.Fields)
            fields[key] = ToJsonValue(value);

        fields["_class"] = pokemon.ClassName;
        return fields;
    }

    private static object? ToJsonValue(object? value) => value switch
    {
        null => null,
        RubySymbol symbol => symbol.Name,
        byte[] bytes => RubyMarshalReader.Decode(bytes),
        BigInteger number when number >= long.MinValue && number <= long.MaxValue => (long)number,
        BigInteger number => number.ToString(System.Globalization.CultureInfo.InvariantCulture),
        List<object?> list => list.Select(ToJsonValue).ToArray(),
        RubyHash hash => hash.ToDictionary(
            entry => ToJsonKey(entry.Key),
            entry => ToJsonValue(entry.Value),
            StringComparer.Ordinal
        ),
        RubyObject nested => new Dictionary<string, object?>
        {
            ["_class"] = nested.ClassName,
            ["fields"] = ToRawFields(nested),
        },
        RubyUserData userData => new Dictionary<string, object?>
        {
            ["_class"] = userData.ClassName,
            ["dataBase64"] = Convert.ToBase64String(userData.Data),
        },
        _ => value,
    };

    private static string ToJsonKey(object? key) => key switch
    {
        RubySymbol symbol => symbol.Name,
        byte[] bytes => RubyMarshalReader.Decode(bytes),
        null => "null",
        _ => Convert.ToString(key, System.Globalization.CultureInfo.InvariantCulture) ?? "",
    };

    private static int? GetInt(RubyObject value, string key) => value.Fields.GetValueOrDefault(key) switch
    {
        int number => number,
        long number when number is >= int.MinValue and <= int.MaxValue => (int)number,
        BigInteger number when number >= int.MinValue && number <= int.MaxValue => (int)number,
        _ => null,
    };

    private static int? ToInt(object? value) => value switch
    {
        int number => number,
        long number when number is >= int.MinValue and <= int.MaxValue => (int)number,
        BigInteger number when number >= int.MinValue && number <= int.MaxValue => (int)number,
        _ => null,
    };

    private static bool? GetBool(RubyObject value, string key) => value.Fields.GetValueOrDefault(key) switch
    {
        bool boolean => boolean,
        _ => null,
    };

    private static int StableNumericId(string value)
    {
        unchecked
        {
            var hash = 17;
            foreach (var character in value)
                hash = hash * 31 + character;
            return Math.Abs(hash == int.MinValue ? int.MaxValue : hash);
        }
    }

    private static string MapItemCategory(string id, int pocket, bool isKeyItem)
    {
        if (id.EndsWith("BALL", StringComparison.OrdinalIgnoreCase))
            return "pokeball";
        if (isKeyItem || pocket == 8)
            return "key_item";
        return pocket switch
        {
            2 => "medicine",
            3 => "pokeball",
            4 => "tm",
            5 => "berry",
            6 => "held_item",
            7 => "battle_item",
            _ => "other",
        };
    }

    private static string MapPocket(int pocket, bool isKeyItem) =>
        isKeyItem || pocket == 8 ? "Objetos clave" : pocket switch
    {
        1 => "Objetos",
        2 => "Medicina",
        3 => "Pokeballs",
        4 => "MT/MO",
        5 => "Bayas",
        6 => "Objetos equipables",
        7 => "Combate",
        _ => "Otros",
    };
}
