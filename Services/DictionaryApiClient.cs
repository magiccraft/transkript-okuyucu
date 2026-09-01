using System.Net.Http.Json;
using TranskriptOkuyucu.Models.Dictionary;

namespace TranskriptOkuyucu.Services;

public class DictionaryApiClient : IDictionaryApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<DictionaryApiClient> _logger;

    public DictionaryApiClient(HttpClient httpClient, ILogger<DictionaryApiClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<ParsedOnlineDictData?> GetOnlineDictionaryDataAsync(string word, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(word) || word.Any(char.IsWhiteSpace) || word.Length > 45)
        {
            return null;
        }

        try
        {
            var wordPath = Uri.EscapeDataString(word.ToLowerInvariant());
            var responses = await _httpClient.GetFromJsonAsync<List<DictionaryApiWordResponse>>(wordPath, cancellationToken);
            
            if (responses == null || responses.Count == 0) return null;

            string? phonetic = null;
            string? audioUrl = null;
            var entriesByPos = new Dictionary<string, (string posTr, List<DictionaryDefinitionDto> defs, HashSet<string> syns)>(StringComparer.OrdinalIgnoreCase);
            var examples = new List<string>();

            foreach (var element in responses)
            {
                if (string.IsNullOrWhiteSpace(phonetic) && !string.IsNullOrWhiteSpace(element.Phonetic))
                {
                    phonetic = element.Phonetic;
                }

                if (element.Phonetics != null)
                {
                    foreach (var pho in element.Phonetics)
                    {
                        if (string.IsNullOrWhiteSpace(phonetic) && !string.IsNullOrWhiteSpace(pho.Text)) phonetic = pho.Text;
                        if (string.IsNullOrWhiteSpace(audioUrl) && !string.IsNullOrWhiteSpace(pho.Audio)) audioUrl = pho.Audio;
                    }
                }

                if (element.Meanings != null)
                {
                    foreach (var meaning in element.Meanings)
                    {
                        string partOfSpeech = string.IsNullOrWhiteSpace(meaning.PartOfSpeech) ? "word" : meaning.PartOfSpeech;
                        string partOfSpeechTr = TranslatePartOfSpeech(partOfSpeech);

                        if (!entriesByPos.TryGetValue(partOfSpeech, out var posGroup))
                        {
                            posGroup = (partOfSpeechTr, new List<DictionaryDefinitionDto>(), new HashSet<string>(StringComparer.OrdinalIgnoreCase));
                            entriesByPos[partOfSpeech] = posGroup;
                        }

                        if (meaning.Synonyms != null)
                        {
                            foreach (var syn in meaning.Synonyms)
                            {
                                if (!string.IsNullOrWhiteSpace(syn)) posGroup.syns.Add(syn);
                            }
                        }

                        if (meaning.Definitions != null)
                        {
                            foreach (var def in meaning.Definitions)
                            {
                                string defText = def.Definition ?? "";
                                string? exText = def.Example;

                                if (!string.IsNullOrWhiteSpace(exText) && !examples.Contains(exText))
                                    examples.Add(exText);

                                if (!string.IsNullOrWhiteSpace(defText))
                                {
                                    posGroup.defs.Add(new DictionaryDefinitionDto(defText, exText));
                                }

                                if (def.Synonyms != null)
                                {
                                    foreach (var syn in def.Synonyms)
                                    {
                                        if (!string.IsNullOrWhiteSpace(syn)) posGroup.syns.Add(syn);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            var entries = entriesByPos.Select(kvp => new DictionaryEntryDto(
                kvp.Key,
                kvp.Value.posTr,
                new List<string>(),
                kvp.Value.defs,
                kvp.Value.syns.ToList()
            )).ToList();

            return entries.Count > 0 ? new ParsedOnlineDictData(phonetic, audioUrl, entries, examples) : null;
        }
        catch (HttpRequestException ex)
        {
            // API may return 404 for word not found, which throws HttpRequestException with EnsureSuccessStatusCode true internally by GetFromJsonAsync.
            // Log it as trace/debug because it's an expected flow when a word isn't in the dictionary.
            _logger.LogDebug(ex, "Word '{Word}' not found in dictionary API or request failed.", word);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error fetching dictionary data for '{Word}'", word);
            return null;
        }
    }

    private static string TranslatePartOfSpeech(string? pos)
    {
        if (string.IsNullOrWhiteSpace(pos)) return "Kelime";
        return pos.Trim().ToLowerInvariant() switch
        {
            "noun" => "İsim",
            "verb" => "Fiil",
            "transitive verb" => "Geçişli Fiil",
            "intransitive verb" => "Geçişsiz Fiil",
            "adjective" => "Sıfat",
            "adverb" => "Zarf",
            "pronoun" => "Zamir",
            "preposition" => "Edat",
            "conjunction" => "Bağlaç",
            "interjection" => "Ünlem",
            "determiner" => "Belirteç",
            "article" => "Tanımlık",
            "numeral" => "Sayı",
            "particle" => "Edat / Parçacık",
            "phrase" => "İfade / Deyim",
            "idiom" => "Deyim",
            _ => char.ToUpperInvariant(pos[0]) + pos[1..]
        };
    }
}
