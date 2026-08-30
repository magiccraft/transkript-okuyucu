using TranskriptOkuyucu.Models;

namespace TranskriptOkuyucu.Services;

public interface IDictionaryService
{
    Task<DictionaryLookupResponse> LookupWordAsync(string word, string? apiKey, string targetLanguage = "tr", CancellationToken cancellationToken = default);
}
