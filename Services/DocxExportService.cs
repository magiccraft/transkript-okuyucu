using TranskriptOkuyucu.Models;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

namespace TranskriptOkuyucu.Services;

public class DocxExportService : IDocxExportService
{
    public byte[] GenerateDocx(ExportDocxRequest request)
    {
        using var memoryStream = new MemoryStream();

        using (var wordDoc = WordprocessingDocument.Create(memoryStream, WordprocessingDocumentType.Document, true))
        {
            var mainPart = wordDoc.AddMainDocumentPart();
            mainPart.Document = new Document();
            var body = new Body();

            // Set normal page margins
            var sectionProps = new SectionProperties(
                new PageMargin() { Top = 1134, Right = 1134, Bottom = 1134, Left = 1134 }
            );

            body.Append(CreateSimpleParagraph(new string('=', 56)));
            body.Append(CreateSimpleParagraph("YouTube Video Transkripti"));
            body.Append(CreateSimpleParagraph($"Başlık: {request.Title}"));
            body.Append(CreateSimpleParagraph($"Kanal: {request.Author}"));
            if (!string.IsNullOrWhiteSpace(request.LanguageName))
            {
                body.Append(CreateSimpleParagraph($"Dil: {request.LanguageName}"));
            }
            if (!string.IsNullOrWhiteSpace(request.VideoUrl))
            {
                body.Append(CreateSimpleParagraph($"Link: {request.VideoUrl}"));
            }
            body.Append(CreateSimpleParagraph($"Tarih: {DateTime.Now:dd.MM.yyyy HH:mm}"));
            body.Append(CreateSimpleParagraph(new string('=', 56)));
            
            body.Append(CreateSpacer(200));

            foreach (var item in request.Items)
            {
                body.Append(CreateSimpleParagraph($"[{item.TimestampFormatted}] {item.Text}"));
                body.Append(CreateSpacer(100)); // empty line
            }

            body.Append(sectionProps);
            mainPart.Document.Append(body);
            mainPart.Document.Save();
        }

        return memoryStream.ToArray();
    }

    private static Paragraph CreateSimpleParagraph(string text)
    {
        var p = new Paragraph();
        var r = new Run(
            new RunProperties(
                new RunFonts() { Ascii = "Segoe UI", HighAnsi = "Segoe UI" },
                new FontSize() { Val = "22" }, // 11pt
                new Color() { Val = "000000" }
            ),
            new Text(text)
        );
        p.Append(r);
        return p;
    }

    private static Paragraph CreateSpacer(int heightDxa)
    {
        return new Paragraph(
            new ParagraphProperties(
                new SpacingBetweenLines() { Before = heightDxa.ToString(), After = "0" }
            )
        );
    }
}
