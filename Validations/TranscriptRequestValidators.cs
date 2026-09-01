using FluentValidation;
using TranskriptOkuyucu.Models.Transcript;

namespace TranskriptOkuyucu.Validations;

public class VideoInfoRequestValidator : AbstractValidator<VideoInfoRequest>
{
    public VideoInfoRequestValidator()
    {
        RuleFor(x => x.Url)
            .NotEmpty().WithMessage("Lütfen bir YouTube video linki girin.");
    }
}

public class TranscriptFetchRequestValidator : AbstractValidator<TranscriptFetchRequest>
{
    public TranscriptFetchRequestValidator()
    {
        RuleFor(x => x.Url)
            .NotEmpty().WithMessage("Lütfen bir YouTube video linki girin.");
    }
}

public class TranslateRequestValidator : AbstractValidator<TranslateRequest>
{
    public TranslateRequestValidator()
    {
        RuleFor(x => x.TextToTranslate)
            .NotEmpty().WithMessage("Çevrilecek metin bulunamadı.");
    }
}

public class ExportDocxRequestValidator : AbstractValidator<ExportDocxRequest>
{
    public ExportDocxRequestValidator()
    {
        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("Dışa aktarılacak transkript verisi bulunamadı.");
    }
}
