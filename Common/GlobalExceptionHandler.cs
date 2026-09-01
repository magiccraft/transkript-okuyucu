using Microsoft.AspNetCore.Diagnostics;
using TranskriptOkuyucu.Models.Common;

namespace TranskriptOkuyucu.Common;

public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        _logger.LogError(exception, "Beklenmeyen bir hata oluştu: {Message}", exception.Message);

        var response = ApiResponse<string>.Fail(exception.Message);
        
        if (exception is ArgumentException || exception is InvalidOperationException)
        {
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
        }
        else
        {
            httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
            response = ApiResponse<string>.Fail("Sistemde beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
        }

        await httpContext.Response.WriteAsJsonAsync(response, cancellationToken);

        return true;
    }
}
