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
                new PageMargin()
                {
                    Top = 1134, // ~2 cm
                    Right = 1134,
                    Bottom = 1134,
                    Left = 1134
                }
            );

            // Document Title
            body.Append(CreateHeading("YouTube Video Transkripti", 36, "1E293B", true));

            // Metadata card / block
            body.Append(CreateMetadataBox(request));

            body.Append(CreateSpacer(200));

            // Table of Transcripts
            var table = new Table();

            // Table properties
            var tblProp = new TableProperties(
                new TableWidth() { Type = TableWidthUnitValues.Pct, Width = "5000" }, // 100% width
                new TableBorders(
                    new TopBorder() { Val = BorderValues.Single, Size = 4, Color = "CBD5E1" },
                    new BottomBorder() { Val = BorderValues.Single, Size = 4, Color = "CBD5E1" },
                    new LeftBorder() { Val = BorderValues.None },
                    new RightBorder() { Val = BorderValues.None },
                    new InsideHorizontalBorder() { Val = BorderValues.Single, Size = 4, Color = "F1F5F9" },
                    new InsideVerticalBorder() { Val = BorderValues.None }
                ),
                new TableCellMarginDefault(
                    new TopMargin() { Width = "120" },
                    new BottomMargin() { Width = "120" },
                    new TableCellLeftMargin() { Width = 140 },
                    new TableCellRightMargin() { Width = 140 }
                )
            );
            table.Append(tblProp);

            // Table Header Row
            var headerRow = new TableRow(
                new TableRowProperties(new TableHeader())
            );

            var thTime = CreateCell("Zaman", isHeader: true, widthPct: 15, "0F172A", "F8FAFC");
            var thText = CreateCell("Transkript / Konuşma", isHeader: true, widthPct: 85, "0F172A", "F8FAFC");
            headerRow.Append(thTime, thText);
            table.Append(headerRow);

            // Data Rows
            bool alt = false;
            foreach (var item in request.Items)
            {
                var rowBg = alt ? "F8FAFC" : "FFFFFF";
                var row = new TableRow();

                var timeCell = CreateCell(item.TimestampFormatted, isHeader: false, widthPct: 15, "4338CA", rowBg, isBold: true);
                var textCell = CreateCell(item.Text, isHeader: false, widthPct: 85, "334155", rowBg);

                row.Append(timeCell, textCell);
                table.Append(row);

                alt = !alt;
            }

            body.Append(table);

            // Append section properties at the end
            body.Append(sectionProps);

            mainPart.Document.Append(body);
            mainPart.Document.Save();
        }

        return memoryStream.ToArray();
    }

    private static Paragraph CreateHeading(string text, int fontSizeHalfPt, string hexColor, bool isBold)
    {
        var p = new Paragraph(
            new ParagraphProperties(
                new SpacingBetweenLines() { Before = "120", After = "120" }
            )
        );

        var r = new Run(
            new RunProperties(
                new RunFonts() { Ascii = "Segoe UI", HighAnsi = "Segoe UI" },
                new FontSize() { Val = fontSizeHalfPt.ToString() },
                new Color() { Val = hexColor },
                isBold ? new Bold() : new Bold() { Val = false }
            ),
            new Text(text)
        );

        p.Append(r);
        return p;
    }

    private static Paragraph CreateMetadataBox(ExportDocxRequest request)
    {
        var p = new Paragraph(
            new ParagraphProperties(
                new ParagraphBorders(
                    new LeftBorder() { Val = BorderValues.Single, Size = 16, Color = "4F46E5", Space = 8 }
                ),
                new SpacingBetweenLines() { Before = "100", After = "200", Line = "280", LineRule = LineSpacingRuleValues.Auto }
            )
        );

        AddMetaLine(p, "Video Başlığı: ", request.Title, true);
        AddMetaLine(p, "Kanal / Yayınlayan: ", request.Author, false);
        if (!string.IsNullOrWhiteSpace(request.LanguageName))
        {
            AddMetaLine(p, "Dil: ", request.LanguageName, false);
        }
        if (!string.IsNullOrWhiteSpace(request.VideoUrl))
        {
            AddMetaLine(p, "Video Linki: ", request.VideoUrl, false);
        }
        AddMetaLine(p, "Tarih: ", DateTime.Now.ToString("dd.MM.yyyy HH:mm"), false);
        AddMetaLine(p, "Toplam Segment: ", $"{request.Items.Count} satır", false);

        return p;
    }

    private static void AddMetaLine(Paragraph p, string label, string value, bool isMain)
    {
        var runLabel = new Run(
            new RunProperties(
                new RunFonts() { Ascii = "Segoe UI", HighAnsi = "Segoe UI" },
                new FontSize() { Val = isMain ? "22" : "19" },
                new Bold(),
                new Color() { Val = "475569" }
            ),
            new Text(label)
        );

        var runValue = new Run(
            new RunProperties(
                new RunFonts() { Ascii = "Segoe UI", HighAnsi = "Segoe UI" },
                new FontSize() { Val = isMain ? "22" : "19" },
                isMain ? new Bold() : new Bold() { Val = false },
                new Color() { Val = isMain ? "0F172A" : "334155" }
            ),
            new Text(value),
            new Break()
        );

        p.Append(runLabel);
        p.Append(runValue);
    }

    private static TableCell CreateCell(string text, bool isHeader, int widthPct, string textColor, string bgColor, bool isBold = false)
    {
        var cell = new TableCell();

        var cellProps = new TableCellProperties(
            new TableCellWidth() { Type = TableWidthUnitValues.Pct, Width = (widthPct * 50).ToString() },
            new Shading() { Val = ShadingPatternValues.Clear, Color = "auto", Fill = bgColor }
        );
        cell.Append(cellProps);

        var p = new Paragraph(
            new ParagraphProperties(
                new SpacingBetweenLines() { Before = "80", After = "80" }
            )
        );

        var r = new Run(
            new RunProperties(
                new RunFonts() { Ascii = "Segoe UI", HighAnsi = "Segoe UI" },
                new FontSize() { Val = isHeader ? "20" : "19" },
                (isHeader || isBold) ? new Bold() : new Bold() { Val = false },
                new Color() { Val = textColor }
            ),
            new Text(text)
        );

        p.Append(r);
        cell.Append(p);

        return cell;
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
