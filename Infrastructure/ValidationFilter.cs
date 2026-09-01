using FluentValidation;

namespace TranskriptOkuyucu.Infrastructure;

public class ValidationFilter<T> : IEndpointFilter where T : class
{
    private readonly IValidator<T> _validator;

    public ValidationFilter(IValidator<T> validator)
    {
        _validator = validator;
    }

    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var argument = context.Arguments.FirstOrDefault(a => a is T) as T;

        if (argument == null)
        {
            return Results.BadRequest(Models.Common.ApiResponse<string>.Fail("Geçersiz istek formatı."));
        }

        var validationResult = await _validator.ValidateAsync(argument);

        if (!validationResult.IsValid)
        {
            var firstError = validationResult.Errors.FirstOrDefault()?.ErrorMessage ?? "Geçersiz istek.";
            return Results.BadRequest(Models.Common.ApiResponse<string>.Fail(firstError));
        }

        return await next(context);
    }
}
