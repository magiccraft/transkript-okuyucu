using FluentValidation;
using TranskriptOkuyucu.Models.Dictionary;

namespace TranskriptOkuyucu.Validations;

public class DictionaryLookupRequestValidator : AbstractValidator<DictionaryLookupRequest>
{
    public DictionaryLookupRequestValidator()
    {
        RuleFor(x => x.Word)
            .NotEmpty().WithMessage("Aranacak kelime boş olamaz.");
    }
}
