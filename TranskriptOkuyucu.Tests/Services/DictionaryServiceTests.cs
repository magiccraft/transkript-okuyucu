using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using TranskriptOkuyucu.Models.Dictionary;
using TranskriptOkuyucu.Services;
using Xunit;

namespace TranskriptOkuyucu.Tests.Services;

public class DictionaryServiceTests
{
    private readonly Mock<IDictionaryApiClient> _mockApiClient;
    private readonly Mock<ILocalDictionaryRepository> _mockLocalRepo;
    private readonly Mock<ITranslationService> _mockTranslationService;
    private readonly Mock<IEnglishLemmatizer> _mockLemmatizer;
    private readonly Mock<ILogger<DictionaryService>> _mockLogger;
    private readonly Mock<IMemoryCache> _mockCache;
    private readonly DictionaryService _service;

    public DictionaryServiceTests()
    {
        _mockApiClient = new Mock<IDictionaryApiClient>();
        _mockLocalRepo = new Mock<ILocalDictionaryRepository>();
        _mockTranslationService = new Mock<ITranslationService>();
        _mockLemmatizer = new Mock<IEnglishLemmatizer>();
        _mockLogger = new Mock<ILogger<DictionaryService>>();
        _mockCache = new Mock<IMemoryCache>();

        _service = new DictionaryService(
            _mockCache.Object,
            _mockLocalRepo.Object,
            _mockApiClient.Object,
            _mockLemmatizer.Object,
            _mockTranslationService.Object,
            _mockLogger.Object
        );
    }

    [Fact]
    public async Task LookupWordAsync_ShouldThrowException_WhenWordIsEmpty()
    {
        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => _service.LookupWordAsync(""));
    }
}
