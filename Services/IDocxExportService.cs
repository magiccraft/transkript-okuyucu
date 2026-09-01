using TranskriptOkuyucu.Models.Transcript;

namespace TranskriptOkuyucu.Services;

public interface IDocxExportService
{
    byte[] GenerateDocx(ExportDocxRequest request);
}
