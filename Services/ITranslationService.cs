namespace TranskriptOkuyucu.Services;

public interface ITranslationService
{
    Task<string?> TranslateTextAsync(string text, string targetLanguage = "tr", CancellationToken cancellationToken = default);
    Task<string?> GetFastTranslationAsync(string text, string targetLanguage = "tr", CancellationToken cancellationToken = default);
}
