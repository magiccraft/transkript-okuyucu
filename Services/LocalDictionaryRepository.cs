using System.Collections.Concurrent;
using System.Text.Json;
using TranskriptOkuyucu.Models.Dictionary;

namespace TranskriptOkuyucu.Services;

public class LocalDictionaryRepository : ILocalDictionaryRepository
{
    private readonly ConcurrentDictionary<string, DictionaryLookupResponse> _dictionary = new(StringComparer.OrdinalIgnoreCase);
    private readonly Lazy<Task> _initializationLazy;

    public LocalDictionaryRepository()
    {
        _initializationLazy = new Lazy<Task>(LoadDictionaryAsync);
        // Start loading asynchronously in background on startup
        _ = _initializationLazy.Value;
    }

    private async Task LoadDictionaryAsync()
    {
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
                await using var stream = File.OpenRead(dictPath);
                var dict = await JsonSerializer.DeserializeAsync<Dictionary<string, DictionaryLookupResponse>>(stream, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (dict != null)
                {
                    foreach (var kvp in dict)
                    {
                        _dictionary[kvp.Key] = kvp.Value;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[LocalDictionaryRepository] Warning: Could not load local dictionary: {ex.Message}");
        }
    }

    public bool TryGetEntry(string word, out DictionaryLookupResponse? response)
    {
        if (!_initializationLazy.IsValueCreated)
        {
            _initializationLazy.Value.GetAwaiter().GetResult();
        }
        else if (!_initializationLazy.Value.IsCompleted)
        {
            _initializationLazy.Value.GetAwaiter().GetResult();
        }

        return _dictionary.TryGetValue(word, out response);
    }
}
