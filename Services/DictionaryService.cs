using Microsoft.Extensions.Caching.Memory;
using TranskriptOkuyucu.Models.Dictionary;

namespace TranskriptOkuyucu.Services;

public class DictionaryService : IDictionaryService
{
    private readonly IMemoryCache _cache;
    private readonly ILocalDictionaryRepository _localDictRepo;
    private readonly IDictionaryApiClient _dictApiClient;
    private readonly IEnglishLemmatizer _lemmatizer;
    private readonly ITranslationService _translationService;
    private readonly ILogger<DictionaryService> _logger;

    public DictionaryService(
        IMemoryCache cache,
        ILocalDictionaryRepository localDictRepo,
        IDictionaryApiClient dictApiClient,
        IEnglishLemmatizer lemmatizer,
        ITranslationService translationService,
        ILogger<DictionaryService> logger)
    {
        _cache = cache;
        _localDictRepo = localDictRepo;
        _dictApiClient = dictApiClient;
        _lemmatizer = lemmatizer;
        _translationService = translationService;
        _logger = logger;
    }

    public async Task<DictionaryLookupResponse> LookupWordAsync(string rawWord, string targetLanguage = "tr", CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rawWord))
        {
            throw new ArgumentException("Sorgulanacak kelime boş olamaz.", nameof(rawWord));
        }

        var cleanWord = CleanWord(rawWord);
        if (string.IsNullOrWhiteSpace(cleanWord))
        {
            cleanWord = rawWord.Trim();
        }

        var isSingleWord = !cleanWord.Any(char.IsWhiteSpace) && cleanWord.Length <= 45;
        var targetLang = string.IsNullOrWhiteSpace(targetLanguage) ? "tr" : targetLanguage.Trim().ToLowerInvariant();
        var cacheKey = $"dict_{targetLang}_{cleanWord.ToLowerInvariant()}";

        if (_cache.TryGetValue(cacheKey, out DictionaryLookupResponse? cachedResult) && cachedResult != null)
        {
            return cachedResult;
        }

        if (TryGetRichLocalEntry(cleanWord, out var localRichEntry))
        {
            return localRichEntry;
        }

        var stemmedCandidates = isSingleWord ? _lemmatizer.GenerateStemmedVariants(cleanWord).ToList() : new List<string>();

        try
        {
            return await FetchAndEnrichDictionaryDataAsync(cleanWord, isSingleWord, targetLang, stemmedCandidates, cacheKey, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Sözlük araması sırasında hata oluştu. Kelime: {Word}", cleanWord);
            return CreateErrorResponse(cleanWord, targetLang, ex.Message);
        }
    }

    private bool TryGetRichLocalEntry(string cleanWord, [System.Diagnostics.CodeAnalysis.NotNullWhen(true)] out DictionaryLookupResponse? entry)
    {
        if (_localDictRepo.TryGetEntry(cleanWord, out var localMatch) && localMatch != null)
        {
            bool isRich = (localMatch.Entries?.Any(e => e.Definitions?.Count > 0) == true) || !string.IsNullOrWhiteSpace(localMatch.Phonetic);
            if (isRich)
            {
                entry = localMatch with { Word = cleanWord };
                return true;
            }
        }
        entry = null;
        return false;
    }

    private async Task<DictionaryLookupResponse> FetchAndEnrichDictionaryDataAsync(
        string cleanWord, bool isSingleWord, string targetLang, 
        List<string> stemmedCandidates, string cacheKey, CancellationToken cancellationToken)
    {
        string? localTranslation = GetLocalTranslation(cleanWord, isSingleWord, stemmedCandidates);

        var (primaryTranslation, rootHint) = await GetTranslationAsync(cleanWord, isSingleWord, targetLang, localTranslation, stemmedCandidates, cancellationToken);
        var dictData = await GetOnlineDictionaryDataAsync(cleanWord, isSingleWord, stemmedCandidates, cancellationToken);

        bool success = true;
        string? message = rootHint;

        if (string.IsNullOrWhiteSpace(primaryTranslation) || primaryTranslation.Equals(cleanWord, StringComparison.OrdinalIgnoreCase))
        {
            if (dictData == null)
            {
                success = false;
                message = isSingleWord ? "Kelime sözlükte bulunamadı." : "Çeviri bulunamadı.";
            }
            else
            {
                primaryTranslation = cleanWord;
            }
        }

        var entries = dictData?.Entries ?? new List<DictionaryEntryDto>();
        if (entries.Count == 0 && !string.IsNullOrWhiteSpace(primaryTranslation))
        {
            entries.Add(CreateFallbackEntry(primaryTranslation, isSingleWord));
        }

        var result = new DictionaryLookupResponse(
            cleanWord,
            primaryTranslation,
            "en",
            targetLang,
            entries,
            dictData?.Examples ?? new List<string>(),
            success,
            message,
            dictData?.Phonetic,
            dictData?.AudioUrl
        );

        if (result.Success && !string.IsNullOrWhiteSpace(result.PrimaryTranslation))
        {
            _cache.Set(cacheKey, result, new MemoryCacheEntryOptions { Size = 1, AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(4) });
        }

        return result;
    }

    private string? GetLocalTranslation(string cleanWord, bool isSingleWord, List<string> stemmedCandidates)
    {
        if (_localDictRepo.TryGetEntry(cleanWord, out var localMatch) && localMatch != null && !string.IsNullOrWhiteSpace(localMatch.PrimaryTranslation))
        {
            return localMatch.PrimaryTranslation;
        }

        if (isSingleWord)
        {
            foreach (var stem in stemmedCandidates)
            {
                if (_localDictRepo.TryGetEntry(stem, out var stemMatch) && stemMatch != null && !string.IsNullOrWhiteSpace(stemMatch.PrimaryTranslation))
                {
                    return stemMatch.PrimaryTranslation;
                }
            }
        }

        return null;
    }

    private async Task<(string PrimaryTranslation, string? RootHint)> GetTranslationAsync(
        string cleanWord, bool isSingleWord, string targetLang, string? localTranslation, 
        List<string> stemmedCandidates, CancellationToken cancellationToken)
    {
        string primaryTranslation = localTranslation ?? "";
        string? rootHint = null;

        if (string.IsNullOrWhiteSpace(primaryTranslation))
        {
            primaryTranslation = await _translationService.GetFastTranslationAsync(cleanWord, targetLang, cancellationToken) ?? "";
        }

        if ((string.IsNullOrWhiteSpace(primaryTranslation) || primaryTranslation.Equals(cleanWord, StringComparison.OrdinalIgnoreCase)) && isSingleWord)
        {
            foreach (var stem in stemmedCandidates)
            {
                if (!stem.Equals(cleanWord, StringComparison.OrdinalIgnoreCase))
                {
                    var stemTr = await _translationService.GetFastTranslationAsync(stem, targetLang, cancellationToken);
                    if (!string.IsNullOrWhiteSpace(stemTr) && !stemTr.Equals(stem, StringComparison.OrdinalIgnoreCase))
                    {
                        primaryTranslation = stemTr;
                        rootHint = $"Kök kelime: {stem}";
                        break;
                    }
                }
            }
        }

        return (primaryTranslation, rootHint);
    }

    private async Task<ParsedOnlineDictData?> GetOnlineDictionaryDataAsync(
        string cleanWord, bool isSingleWord, List<string> stemmedCandidates, CancellationToken cancellationToken)
    {
        if (!isSingleWord) return null;

        try
        {
            using var dictCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            dictCts.CancelAfter(TimeSpan.FromMilliseconds(1200));
            var dictData = await _dictApiClient.GetOnlineDictionaryDataAsync(cleanWord.ToLowerInvariant(), dictCts.Token);
            
            if (dictData != null && dictData.Entries.Count > 0)
                return dictData;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Online dictionary fetch failed for '{Word}'", cleanWord);
        }

        foreach (var stem in stemmedCandidates)
        {
            if (!stem.Equals(cleanWord, StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    using var stemCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                    stemCts.CancelAfter(TimeSpan.FromMilliseconds(700));
                    var stemDictData = await _dictApiClient.GetOnlineDictionaryDataAsync(stem.ToLowerInvariant(), stemCts.Token);
                    if (stemDictData != null && stemDictData.Entries.Count > 0)
                    {
                        return stemDictData;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Online dictionary fetch failed for stem '{Stem}'", stem);
                }
            }
        }

        return null;
    }

    private DictionaryEntryDto CreateFallbackEntry(string primaryTranslation, bool isSingleWord)
    {
        return new DictionaryEntryDto(
            isSingleWord ? "word" : "phrase",
            isSingleWord ? "Kelime" : "İfade / Cümle",
            new List<string> { primaryTranslation },
            new List<DictionaryDefinitionDto>(),
            new List<string>()
        );
    }

    private DictionaryLookupResponse CreateErrorResponse(string cleanWord, string targetLang, string errorMessage)
    {
        return new DictionaryLookupResponse(
            cleanWord, "", "en", targetLang, new List<DictionaryEntryDto>(),
            new List<string>(), false, "Sözlük sorgusu sırasında bir hata oluştu: " + errorMessage
        );
    }

    private static string CleanWord(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        var span = input.AsSpan().Trim();

        int start = 0;
        while (start < span.Length && !char.IsLetterOrDigit(span[start]))
        {
            start++;
        }

        int end = span.Length - 1;
        while (end >= start && !char.IsLetterOrDigit(span[end]))
        {
            end--;
        }

        if (start > end) return string.Empty;
        return span.Slice(start, end - start + 1).ToString();
    }
}
