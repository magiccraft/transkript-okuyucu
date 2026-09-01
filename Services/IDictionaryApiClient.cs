using TranskriptOkuyucu.Models.Dictionary;

namespace TranskriptOkuyucu.Services;

public record ParsedOnlineDictData(
    string? Phonetic,
    string? AudioUrl,
    List<DictionaryEntryDto> Entries,
    List<string> Examples
);

public interface IDictionaryApiClient
{
    Task<ParsedOnlineDictData?> GetOnlineDictionaryDataAsync(string word, CancellationToken cancellationToken = default);
}
