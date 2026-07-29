using System.Globalization;
using System.Numerics;

internal sealed record AnilSpecies(string Name, string[] Types, string[] Abilities);
internal sealed record AnilMove(string Name, string Type, string Category, int? Power, int? Accuracy);
internal sealed record AnilItem(
    string Name,
    int Pocket,
    bool IsKeyItem,
    string[] Flags,
    string? MoveKey
);
internal sealed record AnilAbility(string Name);

internal sealed class PokemonAnilData
{
    public Dictionary<string, AnilSpecies> Species { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, AnilSpecies> Forms { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, AnilMove> Moves { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, AnilItem> Items { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, AnilAbility> Abilities { get; } = new(StringComparer.OrdinalIgnoreCase);

    public static PokemonAnilData Load(string? gameDirectory)
    {
        var result = new PokemonAnilData();
        if (string.IsNullOrWhiteSpace(gameDirectory))
            return result;

        var pbs = Directory.Exists(Path.Combine(gameDirectory, "PBS"))
            ? Path.Combine(gameDirectory, "PBS")
            : gameDirectory;

        result.LoadSpecies(Path.Combine(pbs, "pokemon.txt"));
        result.LoadForms(Path.Combine(pbs, "pokemon_forms.txt"));
        result.LoadMoves(Path.Combine(pbs, "moves.txt"));
        result.LoadItems(Path.Combine(pbs, "items.txt"));
        result.LoadAbilities(Path.Combine(pbs, "abilities.txt"));
        result.LoadCompiledItems(Path.Combine(gameDirectory, "Data", "items.dat"));
        return result;
    }

    private void LoadCompiledItems(string path)
    {
        if (!File.Exists(path))
            return;

        try
        {
            using var stream = File.OpenRead(path);
            if (RubyMarshalReader.Read(stream) is not RubyHash root)
                return;

            foreach (var entry in root)
            {
                if (entry.Key is not RubySymbol symbol || entry.Value is not RubyObject item)
                    continue;

                var previous = Items.GetValueOrDefault(symbol.Name);
                var name = GetBytes(item, "@real_name") ?? previous?.Name ?? Humanize(symbol.Name);
                var pocket = GetInt(item, "@pocket") ?? previous?.Pocket ?? 0;
                var flags = GetSymbols(item, "@flags");
                if (flags.Length == 0)
                    flags = previous?.Flags ?? [];

                Items[symbol.Name] = new AnilItem(
                    name,
                    pocket,
                    flags.Any(flag => flag.Equals("KeyItem", StringComparison.OrdinalIgnoreCase)),
                    flags,
                    GetSymbol(item, "@move") ?? previous?.MoveKey
                );
            }
        }
        catch
        {
            // PBS data remains a valid fallback when compiled data is unavailable or incompatible.
        }
    }

    private static string? GetBytes(RubyObject value, string key) => value.Fields.GetValueOrDefault(key) switch
    {
        byte[] bytes => RubyMarshalReader.Decode(bytes),
        string text when !string.IsNullOrWhiteSpace(text) => text,
        _ => null,
    };

    private static string[] GetSymbols(RubyObject value, string key) =>
        value.Fields.GetValueOrDefault(key) is List<object?> list
            ? list.OfType<RubySymbol>().Select(symbol => symbol.Name).ToArray()
            : [];

    private static string? GetSymbol(RubyObject value, string key) =>
        value.Fields.GetValueOrDefault(key) is RubySymbol symbol ? symbol.Name : null;

    private static int? GetInt(RubyObject value, string key) => value.Fields.GetValueOrDefault(key) switch
    {
        int number => number,
        long number when number is >= int.MinValue and <= int.MaxValue => (int)number,
        BigInteger number when number >= int.MinValue && number <= int.MaxValue => (int)number,
        _ => null,
    };

    private void LoadSpecies(string path)
    {
        foreach (var section in ReadSections(path))
        {
            var name = section.Values.GetValueOrDefault("Name") ?? Humanize(section.Id);
            var types = section.Values.TryGetValue("Types", out var typesValue)
                ? SplitTypes(typesValue)
                : [
                    .. new[] { section.Values.GetValueOrDefault("Type1"), section.Values.GetValueOrDefault("Type2") }
                        .Where(type => !string.IsNullOrWhiteSpace(type))
                        .Select(type => TranslateType(type!))
                        .Distinct(StringComparer.OrdinalIgnoreCase),
                ];
            var abilities = Split(section.Values.GetValueOrDefault("Abilities"))
                .Concat(Split(section.Values.GetValueOrDefault("HiddenAbility")))
                .Concat(Split(section.Values.GetValueOrDefault("HiddenAbilities")))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();
            var species = new AnilSpecies(name, types, abilities);
            Species[section.Id] = species;
            if (section.Values.TryGetValue("InternalName", out var internalName))
                Species[internalName] = species;
        }
    }

    private void LoadForms(string path)
    {
        foreach (var section in ReadSections(path))
        {
            var parts = section.Id.Split(',', StringSplitOptions.TrimEntries);
            if (parts.Length != 2 || !Species.TryGetValue(parts[0], out var species))
                continue;

            var formName = section.Values.GetValueOrDefault("FormName") ?? $"Forma {parts[1]}";
            var name = formName.Contains(species.Name, StringComparison.OrdinalIgnoreCase)
                ? formName
                : $"{species.Name} ({formName})";
            var types = section.Values.TryGetValue("Types", out var formTypes)
                ? SplitTypes(formTypes)
                : species.Types;
            var abilities = section.Values.TryGetValue("Abilities", out var formAbilities)
                ? Split(formAbilities)
                : species.Abilities;

            if (section.Values.TryGetValue("HiddenAbilities", out var hiddenAbilities))
            {
                abilities = abilities
                    .Concat(Split(hiddenAbilities))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray();
            }

            Forms[section.Id] = new AnilSpecies(name, types, abilities);
        }
    }

    private void LoadMoves(string path)
    {
        var sections = ReadSections(path).ToArray();
        foreach (var section in sections)
        {
            var category = (section.Values.GetValueOrDefault("Category") ?? "unknown").ToLowerInvariant();
            Moves[section.Id] = new AnilMove(
                section.Values.GetValueOrDefault("Name") ?? Humanize(section.Id),
                TranslateType(section.Values.GetValueOrDefault("Type") ?? ""),
                category is "physical" or "special" or "status" ? category : "unknown",
                ParsePositiveInt(section.Values.GetValueOrDefault("Power")),
                ParseAccuracy(section.Values.GetValueOrDefault("Accuracy"))
            );
        }

        if (sections.Length > 0 || !File.Exists(path))
            return;

        foreach (var line in File.ReadLines(path))
        {
            var fields = ParseCsv(line);
            if (fields.Count < 8 || !int.TryParse(fields[0], out _))
                continue;

            var move = new AnilMove(
                fields[2],
                TranslateType(fields[5]),
                ParseCategory(fields[6]),
                ParseNonNegativeInt(fields[4]),
                ParseNonNegativeInt(fields[7])
            );
            Moves[fields[0]] = move;
            Moves[fields[1]] = move;
        }
    }

    private void LoadItems(string path)
    {
        var sections = ReadSections(path).ToArray();
        foreach (var section in sections)
        {
            var flags = SplitRaw(section.Values.GetValueOrDefault("Flags"));
            Items[section.Id] = new AnilItem(
                section.Values.GetValueOrDefault("Name") ?? Humanize(section.Id),
                ParsePositiveInt(section.Values.GetValueOrDefault("Pocket")) ?? 0,
                HasFlag(section.Values.GetValueOrDefault("Flags"), "KeyItem"),
                flags,
                section.Values.GetValueOrDefault("Move")
            );
        }

        if (sections.Length > 0 || !File.Exists(path))
            return;

        foreach (var line in File.ReadLines(path))
        {
            var fields = ParseCsv(line);
            if (fields.Count < 5 || !int.TryParse(fields[0], out _))
                continue;

            var item = new AnilItem(fields[2], ParsePositiveInt(fields[4]) ?? 0, false, [], null);
            Items[fields[0]] = item;
            Items[fields[1]] = item;
        }
    }

    private void LoadAbilities(string path)
    {
        var sections = ReadSections(path).ToArray();
        foreach (var section in sections)
            Abilities[section.Id] = new AnilAbility(section.Values.GetValueOrDefault("Name") ?? Humanize(section.Id));

        if (sections.Length > 0 || !File.Exists(path))
            return;

        foreach (var line in File.ReadLines(path))
        {
            var fields = ParseCsv(line);
            if (fields.Count < 3 || !int.TryParse(fields[0], out _))
                continue;

            var ability = new AnilAbility(fields[2]);
            Abilities[fields[0]] = ability;
            Abilities[fields[1]] = ability;
        }
    }

    private static IEnumerable<Section> ReadSections(string path)
    {
        if (!File.Exists(path))
            yield break;

        string? id = null;
        Dictionary<string, string> values = new(StringComparer.OrdinalIgnoreCase);

        foreach (var rawLine in File.ReadLines(path))
        {
            var line = rawLine.Trim();
            if (line.Length == 0 || line.StartsWith('#'))
                continue;

            if (line.StartsWith('[') && line.EndsWith(']'))
            {
                if (id is not null)
                    yield return new Section(id, values);
                id = line[1..^1];
                values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                continue;
            }

            var separator = line.IndexOf('=');
            if (id is not null && separator > 0)
                values[line[..separator].Trim()] = line[(separator + 1)..].Trim();
        }

        if (id is not null)
            yield return new Section(id, values);
    }

    public static string Humanize(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return "";
        return CultureInfo.GetCultureInfo("es-ES").TextInfo.ToTitleCase(id.Replace('_', ' ').ToLowerInvariant());
    }

    private static string[] Split(string? value) => string.IsNullOrWhiteSpace(value)
        ? []
        : value.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(Humanize)
            .ToArray();

    private static string[] SplitTypes(string? value) => string.IsNullOrWhiteSpace(value)
        ? []
        : value.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(TranslateType)
            .ToArray();

    private static bool HasFlag(string? value, string expected) =>
        !string.IsNullOrWhiteSpace(value) &&
        value.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Any(flag => flag.Equals(expected, StringComparison.OrdinalIgnoreCase));

    private static string[] SplitRaw(string? value) => string.IsNullOrWhiteSpace(value)
        ? []
        : value.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

    private static int? ParsePositiveInt(string? value) =>
        int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) && parsed > 0
            ? parsed
            : null;

    private static int? ParseAccuracy(string? value) => ParsePositiveInt(value);

    private static int? ParseNonNegativeInt(string? value) =>
        int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) && parsed >= 0
            ? parsed
            : null;

    private static string ParseCategory(string value) => value.ToLowerInvariant() switch
    {
        "physical" => "physical",
        "special" => "special",
        "status" => "status",
        _ => "unknown",
    };

    private static string TranslateType(string value) => value.Trim().ToUpperInvariant() switch
    {
        "NORMAL" => "Normal",
        "FIGHTING" => "Lucha",
        "FLYING" => "Volador",
        "POISON" => "Veneno",
        "GROUND" => "Tierra",
        "ROCK" => "Roca",
        "BUG" => "Bicho",
        "GHOST" => "Fantasma",
        "STEEL" => "Acero",
        "FIRE" => "Fuego",
        "WATER" => "Agua",
        "GRASS" => "Planta",
        "ELECTRIC" => "Electrico",
        "PSYCHIC" => "Psiquico",
        "ICE" => "Hielo",
        "DRAGON" => "Dragon",
        "DARK" => "Siniestro",
        "FAIRY" => "Hada",
        _ => Humanize(value),
    };

    private static List<string> ParseCsv(string line)
    {
        var values = new List<string>();
        var current = new System.Text.StringBuilder();
        var quoted = false;

        foreach (var character in line)
        {
            if (character == '"')
            {
                quoted = !quoted;
            }
            else if (character == ',' && !quoted)
            {
                values.Add(current.ToString().Trim());
                current.Clear();
            }
            else
            {
                current.Append(character);
            }
        }

        values.Add(current.ToString().Trim());
        return values;
    }

    private sealed record Section(string Id, Dictionary<string, string> Values);
}
