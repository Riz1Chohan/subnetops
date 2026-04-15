import { requireParam } from "../utils/request.js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle, } from "docx";
import { composeProfessionalReport, getCsvRows, getProjectExportData } from "../services/export.service.js";
function toCsv(rows) {
    if (rows.length === 0)
        return "";
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(",")];
    for (const row of rows) {
        const values = headers.map((header) => {
            const value = String(row[header] ?? "").replaceAll('"', '""');
            return `"${value}"`;
        });
        lines.push(values.join(","));
    }
    return lines.join("\n");
}
async function tryEmbedRemoteLogo(pdf, logoUrl) {
    if (!logoUrl)
        return null;
    try {
        const response = await fetch(logoUrl);
        if (!response.ok)
            return null;
        const contentType = response.headers.get("content-type") || "";
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (contentType.includes("png")) {
            return pdf.embedPng(bytes);
        }
        if (contentType.includes("jpeg") || contentType.includes("jpg")) {
            return pdf.embedJpg(bytes);
        }
        return null;
    }
    catch {
        return null;
    }
}
function wrapText(font, text, size, maxWidth) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";
    for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        const width = font.widthOfTextAtSize(next, size);
        if (width <= maxWidth) {
            current = next;
        }
        else {
            if (current)
                lines.push(current);
            current = word;
        }
    }
    if (current)
        lines.push(current);
    return lines.length > 0 ? lines : [""];
}
function ensurePage(state) {
    if (state.y >= 64)
        return;
    state.page = state.pdf.addPage([792, 612]);
    const size = state.page.getSize();
    state.width = size.width;
    state.height = size.height;
    state.y = state.height - 44;
}
function drawParagraph(state, font, text, options) {
    const size = options?.size ?? 11;
    const indent = options?.indent ?? 0;
    const lineGap = options?.lineGap ?? 4;
    const drawFont = options?.bold && options.boldFont ? options.boldFont : font;
    const lines = wrapText(drawFont, text, size, state.width - 96 - indent);
    for (const line of lines) {
        ensurePage(state);
        state.page.drawText(line, {
            x: 48 + indent,
            y: state.y,
            size,
            font: drawFont,
            color: options?.color ?? rgb(0.12, 0.16, 0.24),
        });
        state.y -= size + lineGap;
    }
}
function drawTable(state, font, boldFont, table) {
    drawParagraph(state, font, table.title, { size: 12, bold: true, boldFont });
    const headers = table.headers.join(" | ");
    drawParagraph(state, font, headers, { size: 10, bold: true, boldFont });
    drawParagraph(state, font, "-".repeat(Math.min(110, Math.max(20, headers.length))), { size: 9 });
    for (const row of table.rows) {
        drawParagraph(state, font, row.join(" | "), { size: 9 });
    }
    state.y -= 10;
}
async function buildPdf(projectId) {
    const project = await getProjectExportData(projectId);
    const report = composeProfessionalReport(project);
    if (!project || !report)
        return null;
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
    const cover = pdf.addPage([792, 612]);
    const logo = await tryEmbedRemoteLogo(pdf, project.logoUrl);
    cover.drawRectangle({ x: 0, y: 0, width: 792, height: 612, color: rgb(0.98, 0.985, 1) });
    cover.drawRectangle({ x: 0, y: 520, width: 792, height: 92, color: rgb(0.12, 0.31, 0.77) });
    cover.drawText(report.title, { x: 48, y: 555, size: 25, font: boldFont, color: rgb(1, 1, 1), maxWidth: 690 });
    cover.drawText(report.subtitle, { x: 48, y: 528, size: 13, font, color: rgb(0.9, 0.94, 1), maxWidth: 690 });
    if (logo) {
        const scaled = logo.scale(0.28);
        cover.drawImage(logo, { x: 48, y: 404, width: scaled.width, height: scaled.height });
    }
    cover.drawText(`Project: ${project.name}`, { x: 48, y: 370, size: 16, font: boldFont, color: rgb(0.12, 0.16, 0.24) });
    cover.drawText(`Organization: ${project.organizationName || "Not set"}`, { x: 48, y: 344, size: 12, font, color: rgb(0.2, 0.25, 0.32) });
    cover.drawText(`Environment: ${project.environmentType || "Custom"}`, { x: 48, y: 324, size: 12, font, color: rgb(0.2, 0.25, 0.32) });
    cover.drawText(`Generated: ${report.generatedAt}`, { x: 48, y: 304, size: 12, font, color: rgb(0.2, 0.25, 0.32) });
    cover.drawText(`Prepared by: SubnetOps Professional Report Composer`, { x: 48, y: 284, size: 12, font, color: rgb(0.2, 0.25, 0.32) });
    let state = { pdf, page: pdf.addPage([792, 612]), y: 560, width: 792, height: 612 };
    drawParagraph(state, font, "Executive Summary", { size: 18, bold: true, boldFont });
    for (const paragraph of report.executiveSummary) {
        drawParagraph(state, font, paragraph, { size: 11 });
        state.y -= 6;
    }
    drawParagraph(state, font, "Table of Contents", { size: 18, bold: true, boldFont });
    report.sections.forEach((section) => drawParagraph(state, font, section.title, { size: 11 }));
    for (const section of report.sections) {
        state.page = pdf.addPage([792, 612]);
        state.width = 792;
        state.height = 612;
        state.y = 560;
        drawParagraph(state, font, section.title, { size: 18, bold: true, boldFont, color: rgb(0.12, 0.31, 0.77) });
        state.y -= 4;
        for (const paragraph of section.paragraphs) {
            drawParagraph(state, font, paragraph, { size: 11, boldFont });
            state.y -= 6;
        }
        if (section.bullets?.length) {
            for (const bullet of section.bullets) {
                drawParagraph(state, font, `• ${bullet}`, { size: 10.5, indent: 10, boldFont });
            }
            state.y -= 6;
        }
        if (section.tables?.length) {
            for (const table of section.tables) {
                drawTable(state, font, boldFont, table);
            }
        }
    }
    return pdf.save();
}
function cellParagraph(text, bold = false) {
    return new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text, bold, size: 22 })],
    });
}
async function buildDocx(projectId) {
    const project = await getProjectExportData(projectId);
    const report = composeProfessionalReport(project);
    if (!project || !report)
        return null;
    const children = [];
    children.push(new Paragraph({ text: report.title, heading: HeadingLevel.TITLE, spacing: { after: 200 } }), new Paragraph({ text: report.subtitle, alignment: AlignmentType.CENTER, spacing: { after: 200 } }), new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [new TextRun({ text: `Generated ${report.generatedAt}`, italics: true, size: 22 })],
    }), new Paragraph({ text: "Executive Summary", heading: HeadingLevel.HEADING_1 }));
    report.executiveSummary.forEach((paragraph) => {
        children.push(new Paragraph({ text: paragraph, spacing: { after: 160 } }));
    });
    children.push(new Paragraph({ text: "Table of Contents", heading: HeadingLevel.HEADING_1 }));
    report.sections.forEach((section) => {
        children.push(new Paragraph({ text: section.title, bullet: { level: 0 }, spacing: { after: 100 } }));
    });
    report.sections.forEach((section) => {
        children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
        section.paragraphs.forEach((paragraph) => {
            children.push(new Paragraph({ text: paragraph, spacing: { after: 160 } }));
        });
        section.bullets?.forEach((bullet) => {
            children.push(new Paragraph({ text: bullet, bullet: { level: 0 }, spacing: { after: 100 } }));
        });
        section.tables?.forEach((table) => {
            children.push(new Paragraph({ text: table.title, heading: HeadingLevel.HEADING_2 }));
            children.push(new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: table.headers.map((header) => new TableCell({
                            children: [cellParagraph(header, true)],
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 1, color: "BFC7D5" },
                                bottom: { style: BorderStyle.SINGLE, size: 1, color: "BFC7D5" },
                                left: { style: BorderStyle.SINGLE, size: 1, color: "BFC7D5" },
                                right: { style: BorderStyle.SINGLE, size: 1, color: "BFC7D5" },
                            },
                        })),
                    }),
                    ...table.rows.map((row) => new TableRow({
                        children: row.map((value) => new TableCell({
                            children: [cellParagraph(value)],
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                                bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                                left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                                right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                            },
                        })),
                    })),
                ],
            }));
        });
    });
    const doc = new Document({
        sections: [
            {
                properties: {},
                children,
            },
        ],
    });
    return Packer.toBuffer(doc);
}
export async function exportCsv(req, res) {
    const rows = await getCsvRows(requireParam(req, "projectId"));
    const csv = toCsv(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="subnetops-export.csv"');
    res.send(csv);
}
export async function exportPdf(req, res) {
    const pdfBytes = await buildPdf(requireParam(req, "projectId"));
    if (!pdfBytes) {
        return res.status(404).json({ message: "Project not found" });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="subnetops-professional-report.pdf"');
    return res.send(Buffer.from(pdfBytes));
}
export async function exportDocx(req, res) {
    const docxBytes = await buildDocx(requireParam(req, "projectId"));
    if (!docxBytes) {
        return res.status(404).json({ message: "Project not found" });
    }
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", 'attachment; filename="subnetops-professional-report.docx"');
    return res.send(Buffer.from(docxBytes));
}
