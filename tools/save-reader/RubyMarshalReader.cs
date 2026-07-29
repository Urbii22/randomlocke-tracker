using System.Collections;
using System.Text;

internal sealed record RubySymbol(string Name);

internal sealed class RubyObject(string className)
{
    public string ClassName { get; } = className;
    public Dictionary<string, object?> Fields { get; } = [];
}

internal sealed class RubyHash : IEnumerable<KeyValuePair<object?, object?>>
{
    public List<KeyValuePair<object?, object?>> Entries { get; } = [];

    public IEnumerator<KeyValuePair<object?, object?>> GetEnumerator() => Entries.GetEnumerator();
    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}

internal sealed record RubyUserData(string ClassName, byte[] Data);

internal sealed class RubyMarshalReader
{
    private readonly BinaryReader reader;
    private readonly List<string> symbols = [];
    private readonly List<object> objects = [];

    private RubyMarshalReader(Stream stream)
    {
        reader = new BinaryReader(stream, Encoding.UTF8, leaveOpen: true);
    }

    public static object? Read(Stream stream)
    {
        var value = ReadFirst(stream);
        if (stream.Position != stream.Length)
            throw new InvalidDataException("The Ruby Marshal stream contains trailing data.");
        return value;
    }

    public static object? ReadFirst(Stream stream)
    {
        var parser = new RubyMarshalReader(stream);
        var major = parser.reader.ReadByte();
        var minor = parser.reader.ReadByte();

        if (major != 4 || minor != 8)
            throw new InvalidDataException("The file is not a Ruby Marshal 4.8 stream.");

        return parser.ReadValue();
    }

    public static IReadOnlyList<object?> ReadSequence(Stream stream)
    {
        var values = new List<object?>();

        while (stream.Position < stream.Length)
        {
            var parser = new RubyMarshalReader(stream);
            var major = parser.reader.ReadByte();
            var minor = parser.reader.ReadByte();

            if (major != 4 || minor != 8)
                throw new InvalidDataException("The file is not a sequence of Ruby Marshal 4.8 streams.");

            values.Add(parser.ReadValue());
        }

        return values;
    }

    private object? ReadValue()
    {
        var marker = (char)reader.ReadByte();
        return marker switch
        {
            '0' => null,
            'T' => true,
            'F' => false,
            'i' => ReadFixnum(),
            ':' => new RubySymbol(ReadNewSymbol()),
            ';' => new RubySymbol(ReadSymbolLink()),
            '@' => ReadObjectLink(),
            '"' => Register(ReadBytes()),
            '[' => ReadArray(),
            '{' => ReadHash(hasDefault: false),
            '}' => ReadHash(hasDefault: true),
            'o' => ReadObject(),
            'S' => ReadStruct(),
            'I' => ReadInstanceVariables(),
            'f' => ReadFloat(),
            'l' => ReadBignum(),
            'u' => ReadUserDefined(),
            'U' => ReadUserMarshal(),
            'C' => ReadUserClass(),
            'e' => ReadExtendedObject(),
            'c' or 'm' or 'M' => Register(new RubyObject("Meta") { Fields = { ["name"] = Decode(ReadBytes()) } }),
            '/' => ReadRegularExpression(),
            _ => throw new InvalidDataException($"Unsupported Ruby Marshal marker '{marker}'."),
        };
    }

    private List<object?> ReadArray()
    {
        var result = Register(new List<object?>());
        var count = ReadLength();
        for (var index = 0; index < count; index++)
            result.Add(ReadValue());
        return result;
    }

    private RubyHash ReadHash(bool hasDefault)
    {
        var result = Register(new RubyHash());
        var count = ReadLength();
        for (var index = 0; index < count; index++)
            result.Entries.Add(new KeyValuePair<object?, object?>(ReadValue(), ReadValue()));
        if (hasDefault)
            _ = ReadValue();
        return result;
    }

    private RubyObject ReadObject()
    {
        var result = Register(new RubyObject(ReadSymbol()));
        ReadFields(result);
        return result;
    }

    private RubyObject ReadStruct()
    {
        var result = Register(new RubyObject($"Struct:{ReadSymbol()}"));
        ReadFields(result);
        return result;
    }

    private void ReadFields(RubyObject target)
    {
        var count = ReadLength();
        for (var index = 0; index < count; index++)
            target.Fields[ReadSymbol()] = ReadValue();
    }

    private object? ReadInstanceVariables()
    {
        var value = ReadValue();
        var count = ReadLength();
        for (var index = 0; index < count; index++)
        {
            _ = ReadSymbol();
            _ = ReadValue();
        }
        return value;
    }

    private object ReadFloat()
    {
        var raw = Decode(ReadBytes()).Split('\0', 2)[0];
        if (raw.Equals("nan", StringComparison.OrdinalIgnoreCase))
            return Register(double.NaN);
        if (raw.Equals("inf", StringComparison.OrdinalIgnoreCase))
            return Register(double.PositiveInfinity);
        if (raw.Equals("-inf", StringComparison.OrdinalIgnoreCase))
            return Register(double.NegativeInfinity);
        return Register(double.TryParse(raw, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var value)
            ? value
            : double.NaN);
    }

    private object ReadBignum()
    {
        var sign = (char)reader.ReadByte();
        var words = ReadLength();
        var bytes = reader.ReadBytes(checked(words * 2));
        if (bytes.Length != words * 2)
            throw new EndOfStreamException();

        var magnitude = new System.Numerics.BigInteger(bytes, isUnsigned: true, isBigEndian: false);
        return Register(sign == '-' ? -magnitude : magnitude);
    }

    private RubyUserData ReadUserDefined()
    {
        var result = Register(new RubyUserData(ReadSymbol(), []));
        var data = ReadBytes();
        result = result with { Data = data };
        objects[^1] = result;
        return result;
    }

    private RubyObject ReadUserMarshal()
    {
        var result = Register(new RubyObject($"UserMarshal:{ReadSymbol()}"));
        result.Fields["value"] = ReadValue();
        return result;
    }

    private object? ReadUserClass()
    {
        _ = ReadSymbol();
        return ReadValue();
    }

    private object? ReadExtendedObject()
    {
        _ = ReadSymbol();
        return ReadValue();
    }

    private RubyObject ReadRegularExpression()
    {
        var result = Register(new RubyObject("Regexp"));
        result.Fields["pattern"] = Decode(ReadBytes());
        result.Fields["options"] = reader.ReadByte();
        return result;
    }

    private object ReadObjectLink()
    {
        var index = ReadFixnum();
        if (index < 0 || index >= objects.Count)
            throw new InvalidDataException("Invalid Ruby object link.");
        return objects[index];
    }

    private string ReadSymbol()
    {
        var marker = (char)reader.ReadByte();
        return marker switch
        {
            ':' => ReadNewSymbol(),
            ';' => ReadSymbolLink(),
            _ => throw new InvalidDataException($"Expected a Ruby symbol, found '{marker}'."),
        };
    }

    private string ReadNewSymbol()
    {
        var symbol = Decode(ReadBytes());
        symbols.Add(symbol);
        return symbol;
    }

    private string ReadSymbolLink()
    {
        var index = ReadFixnum();
        if (index < 0 || index >= symbols.Count)
            throw new InvalidDataException("Invalid Ruby symbol link.");
        return symbols[index];
    }

    private int ReadLength()
    {
        var value = ReadFixnum();
        if (value < 0)
            throw new InvalidDataException("Negative Ruby collection length.");
        return value;
    }

    private int ReadFixnum()
    {
        var first = reader.ReadSByte();
        if (first == 0)
            return 0;
        if (first is >= 5 and <= 127)
            return first - 5;
        if (first is >= -128 and <= -5)
            return first + 5;

        var byteCount = Math.Abs(first);
        if (byteCount > 4)
            throw new InvalidDataException("Ruby fixnum exceeds 32 bits.");

        uint value = 0;
        for (var index = 0; index < byteCount; index++)
            value |= (uint)reader.ReadByte() << (8 * index);

        if (first < 0)
            value |= uint.MaxValue << (8 * byteCount);
        return unchecked((int)value);
    }

    private byte[] ReadBytes()
    {
        var length = ReadLength();
        var value = reader.ReadBytes(length);
        if (value.Length != length)
            throw new EndOfStreamException();
        return value;
    }

    private T Register<T>(T value) where T : notnull
    {
        objects.Add(value);
        return value;
    }

    internal static string Decode(byte[] value)
    {
        try
        {
            return new UTF8Encoding(false, true).GetString(value);
        }
        catch (DecoderFallbackException)
        {
            return Encoding.Latin1.GetString(value);
        }
    }
}
