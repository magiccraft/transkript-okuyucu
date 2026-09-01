using System.Text.Json.Serialization;

namespace TranskriptOkuyucu.Models.Dictionary;

public class DictionaryApiWordResponse
{
    [JsonPropertyName("word")]
    public string? Word { get; set; }

    [JsonPropertyName("phonetic")]
    public string? Phonetic { get; set; }

    [JsonPropertyName("phonetics")]
    public List<DictionaryApiPhonetic>? Phonetics { get; set; }

    [JsonPropertyName("meanings")]
    public List<DictionaryApiMeaning>? Meanings { get; set; }
}

public class DictionaryApiPhonetic
{
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("audio")]
    public string? Audio { get; set; }
}

public class DictionaryApiMeaning
{
    [JsonPropertyName("partOfSpeech")]
    public string? PartOfSpeech { get; set; }

    [JsonPropertyName("definitions")]
    public List<DictionaryApiDefinition>? Definitions { get; set; }

    [JsonPropertyName("synonyms")]
    public List<string>? Synonyms { get; set; }
}

public class DictionaryApiDefinition
{
    [JsonPropertyName("definition")]
    public string? Definition { get; set; }

    [JsonPropertyName("example")]
    public string? Example { get; set; }

    [JsonPropertyName("synonyms")]
    public List<string>? Synonyms { get; set; }
}
