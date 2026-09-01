using Microsoft.Extensions.Caching.Memory;
using Moq;
using TranskriptOkuyucu.Common;
using TranskriptOkuyucu.Services;
using Xunit;

namespace TranskriptOkuyucu.Tests.Services;

public class YouTubeTranscriptServiceTests
{
    private readonly Mock<IMemoryCache> _mockCache;
    private readonly KeyedLock _keyedLock;

    public YouTubeTranscriptServiceTests()
    {
        _mockCache = new Mock<IMemoryCache>();
        _keyedLock = new KeyedLock();
    }

    [Fact]
    public async Task GetVideoMetadataAsync_ShouldThrowException_WhenUrlIsInvalid()
    {
        // Arrange
        var mockHttpClient = new Mock<HttpMessageHandler>();
        var httpClient = new HttpClient(mockHttpClient.Object);
        var service = new YouTubeTranscriptService(httpClient, _mockCache.Object, _keyedLock);

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => service.GetVideoMetadataAsync("", CancellationToken.None));
    }
}
