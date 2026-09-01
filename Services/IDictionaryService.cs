using TranskriptOkuyucu.Models.Dictionary;

namespace TranskriptOkuyucu.Services;

public interface IDictionaryService
{
    Task<DictionaryLookupResponse> LookupWordAsync(string rawWord, string targetLanguage = "tr", CancellationToken cancellationToken = default);
}
