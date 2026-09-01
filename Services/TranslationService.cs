using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using TranskriptOkuyucu.Common;

namespace TranskriptOkuyucu.Services;

public partial class TranslationService : ITranslationService
{
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;
    private readonly KeyedLock _keyedLock;

    public TranslationService(HttpClient httpClient, IMemoryCache cache, KeyedLock keyedLock)
    {
        _httpClient = httpClient;
        _cache = cache;
        _keyedLock = keyedLock;
    }

    public async Task<string?> TranslateTextAsync(string text, string targetLanguage = "tr", CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;

        var targetLang = string.IsNullOrWhiteSpace(targetLanguage) ? "tr" : targetLanguage.Trim().ToLowerInvariant();
        var cacheKey = $"trans_{targetLang}_{text.Trim().ToLowerInvariant()}";

        if (_cache.TryGetValue(cacheKey, out string? cached) && !string.IsNullOrEmpty(cached))
        {
            return cached;
        }

        using (await _keyedLock.LockAsync(cacheKey, cancellationToken))
        {
            if (_cache.TryGetValue(cacheKey, out cached) && !string.IsNullOrEmpty(cached))
            {
                return cached;
            }

            var translated = await GetFastTranslationAsync(text, targetLang, cancellationToken);
            if (!string.IsNullOrWhiteSpace(translated))
            {
                _cache.Set(cacheKey, translated, new MemoryCacheEntryOptions
                {
                    Size = 1,
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(2)
                });
                return translated;
            }
        }

        return text;
    }

    public async Task<string?> GetFastTranslationAsync(string text, string targetLanguage = "tr", CancellationToken cancellationToken = default)
    {
        var cleanText = text.Trim();
        if (string.IsNullOrEmpty(cleanText)) return null;
        var targetLang = string.IsNullOrWhiteSpace(targetLanguage) ? "tr" : targetLanguage.Trim().ToLowerInvariant();

        var translated = await TryChromeDictApiAsync(cleanText, targetLang, cancellationToken);
        if (translated != null) return translated;

        translated = await TryMobileWebScrapeAsync(cleanText, targetLang, cancellationToken);
        if (translated != null) return translated;

        translated = await TryGtxApiAsync(cleanText, targetLang, cancellationToken);
        if (translated != null) return translated;

        translated = await TryMyMemoryApiAsync(cleanText, targetLang, cancellationToken);
        if (translated != null) return translated;

        return null;
    }

    private async Task<string?> TryChromeDictApiAsync(string cleanText, string targetLang, CancellationToken cancellationToken)
    {
        try
        {
            var url = $"https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl={targetLang}&q={Uri.EscapeDataString(cleanText)}";
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromMilliseconds(1800));

            var resp = await _httpClient.SendAsync(req, cts.Token);
            if (resp.IsSuccessStatusCode)
            {
                var json = await resp.Content.ReadAsStringAsync(cts.Token);
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (root.ValueKind == JsonValueKind.Array && root.GetArrayLength() > 0)
                {
                    var first = root[0];
                    if (first.ValueKind == JsonValueKind.String)
                    {
                        return first.GetString()?.Trim();
                    }
                    else if (first.ValueKind == JsonValueKind.Array && first.GetArrayLength() > 0)
                    {
                        var seg = first[0];
                        if (seg.ValueKind == JsonValueKind.String)
                        {
                            return seg.GetString()?.Trim();
                        }
                    }
                }
                else if (root.ValueKind == JsonValueKind.String)
                {
                    return root.GetString()?.Trim();
                }
            }
        }
        catch { }
        return null;
    }

    private async Task<string?> TryMobileWebScrapeAsync(string cleanText, string targetLang, CancellationToken cancellationToken)
    {
        try
        {
            var url = $"https://translate.google.com/m?sl=auto&tl={targetLang}&q={Uri.EscapeDataString(cleanText)}";
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromMilliseconds(2000));

            var resp = await _httpClient.SendAsync(req, cts.Token);
            if (resp.IsSuccessStatusCode)
            {
                var html = await resp.Content.ReadAsStringAsync(cts.Token);
                var match = ResultContainerRegex().Match(html);
                if (match.Success)
                {
                    var extracted = System.Net.WebUtility.HtmlDecode(match.Groups[1].Value).Trim();
                    if (!string.IsNullOrWhiteSpace(extracted))
                    {
                        return extracted;
                    }
                }
            }
        }
        catch { }
        return null;
    }

    private async Task<string?> TryGtxApiAsync(string cleanText, string targetLang, CancellationToken cancellationToken)
    {
        try
        {
            var gUrl = $"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={targetLang}&dt=t&q={Uri.EscapeDataString(cleanText)}";
            using var gReq = new HttpRequestMessage(HttpMethod.Get, gUrl);
            gReq.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromMilliseconds(1800));

            var gResp = await _httpClient.SendAsync(gReq, cts.Token);
            if (gResp.IsSuccessStatusCode)
            {
                var gJson = await gResp.Content.ReadAsStringAsync(cts.Token);
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
        catch { }
        return null;
    }

    private async Task<string?> TryMyMemoryApiAsync(string cleanText, string targetLang, CancellationToken cancellationToken)
    {
        try
        {
            var encodedText = Uri.EscapeDataString(cleanText);
            var mUrl = $"https://api.mymemory.translated.net/get?q={encodedText}&langpair=autodetect|{targetLang}";
            using var mReq = new HttpRequestMessage(HttpMethod.Get, mUrl);
            mReq.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromMilliseconds(2000));

            var mResp = await _httpClient.SendAsync(mReq, cts.Token);
            if (mResp.IsSuccessStatusCode)
            {
                var mJson = await mResp.Content.ReadAsStringAsync(cts.Token);
                using var mDoc = JsonDocument.Parse(mJson);
                if (mDoc.RootElement.TryGetProperty("responseData", out var responseData) &&
                    responseData.TryGetProperty("translatedText", out var translatedTextElement))
                {
                    var textRes = translatedTextElement.GetString();
                    if (!string.IsNullOrWhiteSpace(textRes) && !textRes.Equals(cleanText, StringComparison.OrdinalIgnoreCase))
                    {
                        return textRes.Trim();
                    }
                }
            }
        }
        catch { }
        return null;
    }

    [GeneratedRegex(@"<div[^>]*class=""result-container""[^>]*>(.*?)</div>", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex ResultContainerRegex();
}
