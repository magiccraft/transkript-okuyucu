namespace TranskriptOkuyucu.Models.Dictionary;

public record DictionaryLookupRequest(
    string Word,
    string? TargetLanguage = "tr"
);

public record DictionaryDefinitionDto(
    string Definition,
    string? Example
);

public record DictionaryEntryDto(
    string PartOfSpeech,
    string PartOfSpeechTr,
    List<string> Meanings,
    List<DictionaryDefinitionDto> Definitions,
    List<string> Synonyms
);

public record DictionaryLookupResponse(
    string Word,
    string PrimaryTranslation,
    string SourceLanguage,
    string TargetLanguage,
    List<DictionaryEntryDto> Entries,
    List<string> Examples,
    bool Success = true,
    string? Message = null,
    string? Phonetic = null,
    string? AudioUrl = null
);
