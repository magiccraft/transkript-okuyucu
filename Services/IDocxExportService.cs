using TranskriptOkuyucu.Models;

namespace TranskriptOkuyucu.Services;

public interface IDocxExportService
{
    byte[] GenerateDocx(ExportDocxRequest request);
}
