namespace TranskriptOkuyucu.Services;

public interface IEnglishLemmatizer
{
    IEnumerable<string> GenerateStemmedVariants(string word);
}
