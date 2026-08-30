using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using TranskriptOkuyucu.Models;

namespace TranskriptOkuyucu.Services;

public class DictionaryService : IDictionaryService
{
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;
    private static readonly ConcurrentDictionary<string, DictionaryLookupResponse> _embeddedDictionary = new(StringComparer.OrdinalIgnoreCase);
    private static bool _isDictionaryLoaded = false;
    private static readonly object _loadLock = new();

    public DictionaryService(HttpClient httpClient, IMemoryCache cache)
    {
        _httpClient = httpClient;
        _cache = cache;
        EnsureDictionaryLoaded();
    }

    private void EnsureDictionaryLoaded()
    {
        if (_isDictionaryLoaded) return;

        lock (_loadLock)
        {
            if (_isDictionaryLoaded) return;

            try
            {
                var baseDir = AppContext.BaseDirectory;
                var candidates = new[]
                {
                    Path.Combine(baseDir, "Data", "dictionary_en_tr.json"),
                    Path.Combine(Directory.GetCurrentDirectory(), "Data", "dictionary_en_tr.json"),
                    Path.Combine(baseDir, "..", "..", "..", "Data", "dictionary_en_tr.json")
                };

                string? dictPath = candidates.FirstOrDefault(File.Exists);

                if (dictPath != null)
                {
                    var json = File.ReadAllText(dictPath);
                    var dict = JsonSerializer.Deserialize<Dictionary<string, DictionaryLookupResponse>>(json, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    if (dict != null)
                    {
                        foreach (var kvp in dict)
                        {
                            _embeddedDictionary[kvp.Key] = kvp.Value;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DictionaryService] Warning: Could not load local dictionary: {ex.Message}");
            }
            finally
            {
                _isDictionaryLoaded = true;
            }
        }
    }

    public async Task<DictionaryLookupResponse> LookupWordAsync(string rawWord, string? apiKey, string targetLanguage = "tr", CancellationToken cancellationToken = default)
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

        var targetLang = string.IsNullOrWhiteSpace(targetLanguage) ? "tr" : targetLanguage.Trim().ToLowerInvariant();
        var cacheKey = $"dict_{targetLang}_{cleanWord.ToLowerInvariant()}";

        // 1. Check RAM Cache
        if (_cache.TryGetValue(cacheKey, out DictionaryLookupResponse? cachedResult) && cachedResult != null)
        {
            return cachedResult;
        }

        // 2. Check Embedded Local Dictionary (O(1) in-memory lookup)
        if (_embeddedDictionary.TryGetValue(cleanWord, out var localMatch) && localMatch != null)
        {
            var matchWithCleanWord = localMatch with { Word = cleanWord };
            _cache.Set(cacheKey, matchWithCleanWord, TimeSpan.FromHours(24));
            return matchWithCleanWord;
        }

        // 3. Try Stemming / Lemmatization on Embedded Dictionary
        var stemmedCandidates = GenerateStemmedVariants(cleanWord);
        foreach (var stem in stemmedCandidates)
        {
            if (_embeddedDictionary.TryGetValue(stem, out var stemMatch) && stemMatch != null)
            {
                var adaptedResult = stemMatch with
                {
                    Word = cleanWord,
                    Message = stem.Equals(cleanWord, StringComparison.OrdinalIgnoreCase) ? null : $"Kök kelime: {stem}"
                };
                _cache.Set(cacheKey, adaptedResult, TimeSpan.FromHours(24));
                return adaptedResult;
            }
        }

        // 4. Fallback: Free API + Free Translation Engine (Async)
        try
        {
            var translationTask = GetFastTranslationAsync(cleanWord, targetLang, cancellationToken);
            var dictionaryTask = GetOnlineDictionaryDataAsync(cleanWord, cancellationToken);

            await Task.WhenAll(translationTask, dictionaryTask);

            var primaryTranslation = await translationTask ?? "";
            var dictData = await dictionaryTask;

            bool success = true;
            string? message = null;

            if (dictData == null && (string.IsNullOrWhiteSpace(primaryTranslation) || primaryTranslation.Equals(cleanWord, StringComparison.OrdinalIgnoreCase)))
            {
                success = false;
                message = "Kelime sözlükte bulunamadı.";
            }

            var entries = dictData?.Entries ?? new List<DictionaryEntryDto>();
            var examples = dictData?.Examples ?? new List<string>();
            var phonetic = dictData?.Phonetic;
            var audioUrl = dictData?.AudioUrl;

            // If no part of speech entries were returned but translation exists, create a default entry
            if (entries.Count == 0 && !string.IsNullOrWhiteSpace(primaryTranslation))
            {
                entries.Add(new DictionaryEntryDto(
                    "word",
                    "Kelime",
                    new List<string> { primaryTranslation },
                    new List<DictionaryDefinitionDto>(),
                    new List<string>()
                ));
            }

            var result = new DictionaryLookupResponse(
                cleanWord,
                primaryTranslation,
                "en",
                targetLang,
                entries,
                examples,
                success,
                message,
                phonetic,
                audioUrl
            );

            if (result.Success)
            {
                _cache.Set(cacheKey, result, TimeSpan.FromHours(24));
                _embeddedDictionary[cleanWord] = result; // Save to runtime local map for subsequent fast access
            }

            return result;
        }
        catch (Exception ex)
        {
            return new DictionaryLookupResponse(
                cleanWord,
                "",
                "en",
                targetLang,
                new List<DictionaryEntryDto>(),
                new List<string>(),
                false,
                "Sözlük sorgusu sırasında bir hata oluştu: " + ex.Message
            );
        }
    }

    private IEnumerable<string> GenerateStemmedVariants(string word)
    {
        var lower = word.ToLowerInvariant();
        var variants = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // -ing
        if (lower.EndsWith("ing") && lower.Length > 4)
        {
            var baseStem = lower[..^3];
            variants.Add(baseStem);
            variants.Add(baseStem + "e"); // e.g. making -> make
            if (baseStem.Length > 2 && baseStem[^1] == baseStem[^2]) // e.g. running -> run
            {
                variants.Add(baseStem[..^1]);
            }
        }

        // -ed
        if (lower.EndsWith("ed") && lower.Length > 3)
        {
            var baseStem = lower[..^2];
            variants.Add(baseStem);
            variants.Add(lower[..^1]); // e.g. created -> create
            if (baseStem.Length > 2 && baseStem[^1] == baseStem[^2]) // e.g. stopped -> stop
            {
                variants.Add(baseStem[..^1]);
            }
        }

        // -ies -> -y
        if (lower.EndsWith("ies") && lower.Length > 4)
        {
            variants.Add(lower[..^3] + "y"); // e.g. studies -> study
        }

        // -es
        if (lower.EndsWith("es") && lower.Length > 3)
        {
            variants.Add(lower[..^2]); // e.g. watches -> watch
            variants.Add(lower[..^1]);
        }

        // -s
        if (lower.EndsWith("s") && lower.Length > 2 && !lower.EndsWith("ss"))
        {
            variants.Add(lower[..^1]); // e.g. words -> word
        }

        // -ly
        if (lower.EndsWith("ly") && lower.Length > 3)
        {
            variants.Add(lower[..^2]); // e.g. clearly -> clear
            if (lower.EndsWith("ily") && lower.Length > 4)
            {
                variants.Add(lower[..^3] + "y"); // e.g. happily -> happy
            }
        }

        // -er / -est
        if (lower.EndsWith("er") && lower.Length > 3)
        {
            variants.Add(lower[..^2]);
            variants.Add(lower[..^1]);
        }
        if (lower.EndsWith("est") && lower.Length > 4)
        {
            variants.Add(lower[..^3]);
            variants.Add(lower[..^2]);
        }

        return variants;
    }

    private async Task<string?> GetFastTranslationAsync(string word, string targetLang, CancellationToken cancellationToken)
    {
        try
        {
            // 1. Google Translate GTX Free Endpoint (Ultra fast & accurate)
            var gUrl = $"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={targetLang}&dt=t&q={Uri.EscapeDataString(word)}";
            using var gReq = new HttpRequestMessage(HttpMethod.Get, gUrl);
            gReq.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
            
            var gResp = await _httpClient.SendAsync(gReq, cancellationToken);
            if (gResp.IsSuccessStatusCode)
            {
                var gJson = await gResp.Content.ReadAsStringAsync(cancellationToken);
                using var doc = JsonDocument.Parse(gJson);
                if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
                {
                    var firstArr = doc.RootElement[0];
                    if (firstArr.ValueKind == JsonValueKind.Array && firstArr.GetArrayLength() > 0)
                    {
                        var segment = firstArr[0];
                        if (segment.ValueKind == JsonValueKind.Array && segment.GetArrayLength() > 0)
                        {
                            var trText = segment[0].GetString();
                            if (!string.IsNullOrWhiteSpace(trText))
                            {
                                return trText.Trim();
                            }
                        }
                    }
                }
            }
        }
        catch
        {
            // Fallback to MyMemory
        }

        try
        {
            // 2. MyMemory Backup
            var encodedText = Uri.EscapeDataString(word);
            var mUrl = $"https://api.mymemory.translated.net/get?q={encodedText}&langpair=en|{targetLang}";
            using var mReq = new HttpRequestMessage(HttpMethod.Get, mUrl);
            mReq.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
            
            var mResp = await _httpClient.SendAsync(mReq, cancellationToken);
            if (mResp.IsSuccessStatusCode)
            {
                var mJson = await mResp.Content.ReadAsStringAsync(cancellationToken);
                using var mDoc = JsonDocument.Parse(mJson);
                if (mDoc.RootElement.TryGetProperty("responseData", out var responseData) &&
                    responseData.TryGetProperty("translatedText", out var translatedTextElement))
                {
                    var text = translatedTextElement.GetString();
                    if (!string.IsNullOrWhiteSpace(text) && !text.Equals(word, StringComparison.OrdinalIgnoreCase))
                    {
                        return text.Trim();
                    }
                }
            }
        }
        catch
        {
            // Ignore translation errors
        }

        return null;
    }

    private class ParsedOnlineDictData
    {
        public string? Phonetic { get; set; }
        public string? AudioUrl { get; set; }
        public List<DictionaryEntryDto> Entries { get; set; } = new();
        public List<string> Examples { get; set; } = new();
    }

    private async Task<ParsedOnlineDictData?> GetOnlineDictionaryDataAsync(string word, CancellationToken cancellationToken)
    {
        try
        {
            var url = $"https://api.dictionaryapi.dev/api/v2/entries/en/{Uri.EscapeDataString(word)}";
            var response = await _httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Array || doc.RootElement.GetArrayLength() == 0)
                return null;

            var firstEntry = doc.RootElement[0];
            var result = new ParsedOnlineDictData();

            // Extract Phonetic text
            if (firstEntry.TryGetProperty("phonetic", out var phoElement) && !string.IsNullOrWhiteSpace(phoElement.GetString()))
            {
                result.Phonetic = phoElement.GetString();
            }

            // Extract Phonetics array for audio & text
            if (firstEntry.TryGetProperty("phonetics", out var phoneticsElement) && phoneticsElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var pho in phoneticsElement.EnumerateArray())
                {
                    if (string.IsNullOrWhiteSpace(result.Phonetic) && pho.TryGetProperty("text", out var tElem))
                    {
                        result.Phonetic = tElem.GetString();
                    }
                    if (string.IsNullOrWhiteSpace(result.AudioUrl) && pho.TryGetProperty("audio", out var aElem))
                    {
                        var audio = aElem.GetString();
                        if (!string.IsNullOrWhiteSpace(audio))
                        {
                            result.AudioUrl = audio;
                        }
                    }
                }
            }

            // Extract Meanings
            if (firstEntry.TryGetProperty("meanings", out var meaningsElement) && meaningsElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var meaning in meaningsElement.EnumerateArray())
                {
                    string partOfSpeech = meaning.TryGetProperty("partOfSpeech", out var posElement) ? (posElement.GetString() ?? "") : "";
                    string partOfSpeechTr = TranslatePartOfSpeech(partOfSpeech);

                    var synonyms = new List<string>();
                    if (meaning.TryGetProperty("synonyms", out var synsElement) && synsElement.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var syn in synsElement.EnumerateArray())
                        {
                            var s = syn.GetString();
                            if (!string.IsNullOrEmpty(s)) synonyms.Add(s);
                        }
                    }

                    var definitions = new List<DictionaryDefinitionDto>();
                    if (meaning.TryGetProperty("definitions", out var defsElement) && defsElement.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var def in defsElement.EnumerateArray())
                        {
                            string defText = def.TryGetProperty("definition", out var dElement) ? (dElement.GetString() ?? "") : "";
                            string? exText = def.TryGetProperty("example", out var exElement) ? exElement.GetString() : null;

                            if (!string.IsNullOrEmpty(exText))
                                result.Examples.Add(exText);

                            definitions.Add(new DictionaryDefinitionDto(defText, exText));
                        }
                    }

                    result.Entries.Add(new DictionaryEntryDto(
                        partOfSpeech,
                        partOfSpeechTr,
                        new List<string>(),
                        definitions,
                        synonyms
                    ));
                }
            }

            return result;
        }
        catch
        {
            return null;
        }
    }

    private string TranslatePartOfSpeech(string? pos)
    {
        if (string.IsNullOrWhiteSpace(pos)) return "Kelime";
        return pos.ToLowerInvariant() switch
        {
            "noun" => "İsim",
            "verb" => "Fiil",
            "adjective" => "Sıfat",
            "adverb" => "Zarf",
            "pronoun" => "Zamir",
            "preposition" => "Edat",
            "conjunction" => "Bağlaç",
            "interjection" => "Ünlem",
            "determiner" => "Belirteç",
            _ => pos
        };
    }

    private static string CleanWord(string input)
    {
        var trimmed = input.Trim();
        trimmed = Regex.Replace(trimmed, @"^[^\w\d\p{L}]+", "");
        trimmed = Regex.Replace(trimmed, @"[^\w\d\p{L}]+$", "");
        return trimmed;
    }
}
