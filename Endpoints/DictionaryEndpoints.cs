using Microsoft.AspNetCore.Mvc;
using TranskriptOkuyucu.Models.Dictionary;
using TranskriptOkuyucu.Services;

using TranskriptOkuyucu.Infrastructure;
using TranskriptOkuyucu.Validations;

namespace TranskriptOkuyucu.Endpoints;

public static class DictionaryEndpoints
{
    public static IEndpointRouteBuilder MapDictionaryEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/dictionary/lookup", LookupWordHandler)
           .AddEndpointFilter<ValidationFilter<DictionaryLookupRequest>>();
        return app;
    }

    private static async Task<IResult> LookupWordHandler([FromBody] DictionaryLookupRequest request, [FromServices] IDictionaryService dictionaryService, CancellationToken ct)
    {

        var result = await dictionaryService.LookupWordAsync(request.Word, request.TargetLanguage ?? "tr", ct);
        
        if (!result.Success)
        {
            return Results.BadRequest(result);
        }

        return Results.Ok(result);
    }
}
