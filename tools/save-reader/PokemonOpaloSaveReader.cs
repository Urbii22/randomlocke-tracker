using System.Numerics;

internal static class PokemonOpaloSaveReader
{
    public static SaveSnapshot Read(string copiedSavePath, string? gameDirectory, string gameName = "Pokemon Opalo")
    {
        using var stream = File.OpenRead(copiedSavePath);
        var values = RubyMarshalReader.ReadSequence(stream);
        var trainer = FindObject(values, "PokeBattle_Trainer");
        var storage = FindObject(values, "PokemonStorage");
        var bag = FindObject(values, "PokemonBag");
        var data = PokemonAnilData.Load(gameDirectory);
        var errors = new List<string>();

        if (data.Species.Count == 0)
            errors.Add("No se encontro la carpeta PBS; los nombres, tipos y movimientos pueden estar incompletos.");

        return new SaveSnapshot(
            DateTimeOffset.UtcNow,
            gameName,
            ReadParty(trainer, data),
            ReadBoxes(storage, data),
            ReadBag(bag, data),
            null,
            errors
        );
    }

    private static RubyObject FindObject(IEnumerable<object?> values, string className) =>
        values.OfType<RubyObject>().FirstOrDefault(value => value.ClassName == className)
        ?? throw new InvalidDataException($"Pokemon Opalo save does not contain {className}.");

    private static List<SavePokemon> ReadParty(RubyObject trainer, PokemonAnilData data) =>
        GetList(trainer, "@party")
            .Select((value, slot) => value is RubyObject pokemon && pokemon.ClassName == "PokeBattle_Pokemon"
                ? ReadPokemon(pokemon, "party", slot, null, null, data)
                : null)
            .Where(pokemon => pokemon is not null)
            .Cast<SavePokemon>()
            .ToList();

    private static List<SavePokemon> ReadBoxes(RubyObject storage, PokemonAnilData data)
    {
        var result = new List<SavePokemon>();
        var boxes = GetList(storage, "@boxes");

        for (var boxIndex = 0; boxIndex < boxes.Count; boxIndex++)
        {
            if (boxes[boxIndex] is not RubyObject box)
                continue;

            var slots = GetList(box, "@pokemon");
            for (var slotIndex = 0; slotIndex < slots.Count; slotIndex++)
            {
                if (slots[slotIndex] is RubyObject pokemon && pokemon.ClassName == "PokeBattle_Pokemon")
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
        var speciesId = GetIdentifier(pokemon, "@species") ?? "UNKNOWN";
        var species = data.Species.GetValueOrDefault(speciesId);
        var nickname = GetString(pokemon, "@name");
        var abilityId = GetNonZeroIdentifier(pokemon, "@ability") ?? "";
        var itemId = GetNonZeroIdentifier(pokemon, "@item");
        var moves = GetList(pokemon, "@moves")
            .Select(move => move is RubyObject moveObject ? ReadMove(moveObject, data) : null)
            .Where(move => move is not null)
            .Cast<SaveMove>()
            .Take(4)
            .ToArray();

        var resolvedSpecies = species?.Name ?? PokemonAnilData.Humanize(speciesId);
        return new SavePokemon(
            source,
            partySlot,
            box,
            slot,
            resolvedSpecies,
            string.IsNullOrWhiteSpace(nickname) ? resolvedSpecies : nickname,
            GetInt(pokemon, "@level") ?? 1,
            species?.Types ?? [],
            data.Abilities.GetValueOrDefault(abilityId)?.Name
                ?? species?.Abilities.FirstOrDefault()
                ?? PokemonAnilData.Humanize(abilityId),
            itemId is null ? null : data.Items.GetValueOrDefault(itemId)?.Name ?? PokemonAnilData.Humanize(itemId),
            new SaveStats(
                GetInt(pokemon, "@totalhp") ?? GetInt(pokemon, "@hp") ?? 0,
                GetInt(pokemon, "@attack") ?? 0,
                GetInt(pokemon, "@defense") ?? 0,
                GetInt(pokemon, "@spatk") ?? 0,
                GetInt(pokemon, "@spdef") ?? 0,
                GetInt(pokemon, "@speed") ?? 0
            ),
            moves,
            speciesId,
            GetBool(pokemon, "@shiny") ?? false,
            GetLabel(pokemon, "@nature"),
            null,
            null,
            GetInt(pokemon, "@exp"),
            GetInt(pokemon, "@happiness"),
            GetInt(pokemon, "@hp"),
            GetStatusCondition(pokemon),
            GetGender(pokemon)
        );
    }

    private static SaveMove? ReadMove(RubyObject move, PokemonAnilData data)
    {
        var id = GetNonZeroIdentifier(move, "@id");
        if (string.IsNullOrWhiteSpace(id))
            return null;

        return data.Moves.TryGetValue(id, out var metadata)
            ? new SaveMove(metadata.Name, metadata.Type, metadata.Category, metadata.Power, metadata.Accuracy)
            : new SaveMove(PokemonAnilData.Humanize(id), "", "unknown", null, null);
    }

    private static SaveBagItem[] ReadBag(RubyObject bag, PokemonAnilData data)
    {
        var items = new List<SaveBagItem>();
        var pockets = GetList(bag, "@pockets");

        for (var pocketIndex = 0; pocketIndex < pockets.Count; pocketIndex++)
        {
            if (pockets[pocketIndex] is not List<object?> pocket)
                continue;

            foreach (var entry in pocket.OfType<List<object?>>())
            {
                if (entry.Count < 2 || ToInt(entry[0]) is not int itemNumber || ToInt(entry[1]) is not int quantity || quantity <= 0)
                    continue;

                var itemId = itemNumber.ToString(System.Globalization.CultureInfo.InvariantCulture);
                var item = data.Items.GetValueOrDefault(itemId);
                var pocketNumber = item?.Pocket ?? pocketIndex;
                items.Add(new SaveBagItem(
                    itemNumber,
                    item?.Name ?? $"Objeto {itemNumber}",
                    quantity,
                    MapItemCategory(pocketNumber),
                    MapPocket(pocketNumber),
                    itemId,
                    pocketNumber
                ));
            }
        }

        return [.. items];
    }

    private static List<object?> GetList(RubyObject value, string key) =>
        value.Fields.GetValueOrDefault(key) as List<object?> ?? [];

    private static string? GetIdentifier(RubyObject value, string key) => value.Fields.GetValueOrDefault(key) switch
    {
        RubySymbol symbol => symbol.Name,
        int number => number.ToString(System.Globalization.CultureInfo.InvariantCulture),
        long number => number.ToString(System.Globalization.CultureInfo.InvariantCulture),
        BigInteger number => number.ToString(System.Globalization.CultureInfo.InvariantCulture),
        byte[] bytes => RubyMarshalReader.Decode(bytes),
        string text => text,
        _ => null,
    };

    private static string? GetNonZeroIdentifier(RubyObject value, string key) => GetIdentifier(value, key) switch
    {
        null or "0" => null,
        var identifier => identifier,
    };

    private static string? GetString(RubyObject value, string key) => value.Fields.GetValueOrDefault(key) switch
    {
        byte[] bytes => RubyMarshalReader.Decode(bytes),
        string text => text,
        _ => null,
    };

    private static string? GetLabel(RubyObject value, string key) => GetIdentifier(value, key) is { } id
        ? PokemonAnilData.Humanize(id)
        : null;

    private static string? GetGender(RubyObject value) => ToInt(value.Fields.GetValueOrDefault("@gender")) switch
    {
        0 => "Macho",
        1 => "Hembra",
        2 => "Sin genero",
        _ => null,
    };

    private static string? GetStatusCondition(RubyObject value) => ToInt(value.Fields.GetValueOrDefault("@status")) switch
    {
        null or 0 => null,
        1 => "Dormido",
        2 => "Envenenado",
        3 => "Quemado",
        4 => "Paralizado",
        5 => "Congelado",
        6 => "Toxico",
        var status => $"Estado {status}",
    };

    private static int? GetInt(RubyObject value, string key) => ToInt(value.Fields.GetValueOrDefault(key));

    private static int? ToInt(object? value) => value switch
    {
        int number => number,
        long number when number is >= int.MinValue and <= int.MaxValue => (int)number,
        BigInteger number when number >= int.MinValue && number <= int.MaxValue => (int)number,
        _ => null,
    };

    private static bool? GetBool(RubyObject value, string key) => value.Fields.GetValueOrDefault(key) as bool?;

    private static string MapItemCategory(int pocket) => pocket switch
    {
        2 => "medicine",
        3 => "pokeball",
        4 => "tm",
        5 => "berry",
        6 => "held_item",
        7 => "battle_item",
        8 => "key_item",
        _ => "other",
    };

    private static string MapPocket(int pocket) => pocket switch
    {
        1 => "Objetos",
        2 => "Medicina",
        3 => "Pokeballs",
        4 => "MT/MO",
        5 => "Bayas",
        6 => "Objetos equipables",
        7 => "Combate",
        8 => "Objetos clave",
        _ => "Otros",
    };
}
