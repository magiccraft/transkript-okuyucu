using TranskriptOkuyucu.Models.Dictionary;

namespace TranskriptOkuyucu.Services;

public interface ILocalDictionaryRepository
{
    bool TryGetEntry(string word, out DictionaryLookupResponse? response);
}
