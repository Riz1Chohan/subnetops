import type { Request, Response } from "express";
import { requireParam } from "../utils/request.js";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
  ShadingType,
  TableLayoutType,
} from "docx";
import { composeProfessionalReport, getCsvRows, getProjectExportData, type ExportSnapshot, type ProfessionalReport, type ReportTable } from "../services/export.service.js";

function readExportSnapshot(req: Request): ExportSnapshot | undefined {
  const body = req.body as { exportSnapshot?: ExportSnapshot } | undefined;
  return body?.exportSnapshot;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "";

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

async function tryEmbedRemoteLogo(pdf: PDFDocument, logoUrl?: string | null) {
  if (!logoUrl) return null;

  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    const bytes = new Uint8Array(await response.arrayBuffer());

    if (contentType.includes("png")) {
      return pdf.embedPng(bytes);
    }

    if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      return pdf.embedJpg(bytes);
    }

    return null;
  } catch {
    return null;
  }
}


function sanitizePdfText(value: string) {
  return value
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/•/g, "-")
    .replace(/→/g, "->")
    .replace(/↔/g, "<->")
    .replace(/ /g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number) {
  const safeText = sanitizePdfText(text);
  const words = safeText.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(next, size);
    if (width <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function ensurePage(state: { pdf: PDFDocument; page: PDFPage; y: number; width: number; height: number }) {
  if (state.y >= 70) return;
  state.page = state.pdf.addPage([612, 792]);
  const size = state.page.getSize();
  state.width = size.width;
  state.height = size.height;
  state.y = state.height - 56;
}

function drawParagraph(
  state: { pdf: PDFDocument; page: PDFPage; y: number; width: number; height: number },
  font: PDFFont,
  text: string,
  options?: { size?: number; boldFont?: PDFFont; bold?: boolean; indent?: number; lineGap?: number; color?: ReturnType<typeof rgb> },
) {
  const size = options?.size ?? 11;
  const indent = options?.indent ?? 0;
  const lineGap = options?.lineGap ?? 4;
  const drawFont = options?.bold && options.boldFont ? options.boldFont : font;
  const safeText = sanitizePdfText(text);
  const lines = wrapText(drawFont, safeText, size, state.width - 108 - indent);

  for (const line of lines) {
    ensurePage(state);
    state.page.drawText(line, {
      x: 54 + indent,
      y: state.y,
      size,
      font: drawFont,
      color: options?.color ?? rgb(0.12, 0.16, 0.24),
    });
    state.y -= size + lineGap;
  }
}

function drawTable(
  state: { pdf: PDFDocument; page: PDFPage; y: number; width: number; height: number },
  font: PDFFont,
  boldFont: PDFFont,
  table: ReportTable,
) {
  drawParagraph(state, font, table.title, { size: 12, bold: true, boldFont });
  const headers = table.headers.map((value) => sanitizePdfText(value)).join(" | ");
  drawParagraph(state, font, headers, { size: 10, bold: true, boldFont, color: rgb(0.12, 0.31, 0.77) });
  drawParagraph(state, font, "-".repeat(Math.min(110, Math.max(20, headers.length))), { size: 9 });
  for (const row of table.rows) {
    drawParagraph(state, font, row.map((value) => sanitizePdfText(value)).join(" | "), { size: 9 });
  }
  state.y -= 10;
}

function drawControlRow(
  state: { pdf: PDFDocument; page: PDFPage; y: number; width: number; height: number },
  font: PDFFont,
  boldFont: PDFFont,
  label: string,
  value: string,
) {
  ensurePage(state);
  const leftMargin = 54;
  const labelWidth = 150;
  const valueWidth = state.width - 108 - labelWidth;
  const rowHeight = 22;
  state.page.drawRectangle({ x: leftMargin, y: state.y - 4, width: labelWidth, height: rowHeight, color: rgb(0.93, 0.95, 0.98) });
  state.page.drawRectangle({ x: leftMargin + labelWidth, y: state.y - 4, width: valueWidth, height: rowHeight, color: rgb(0.985, 0.988, 0.995), borderColor: rgb(0.83, 0.86, 0.91), borderWidth: 0.5 });
  state.page.drawText(sanitizePdfText(label), { x: leftMargin + 8, y: state.y + 3, size: 10, font: boldFont, color: rgb(0.12, 0.16, 0.24) });
  state.page.drawText(sanitizePdfText(value), { x: leftMargin + labelWidth + 8, y: state.y + 3, size: 10, font, color: rgb(0.2, 0.25, 0.32), maxWidth: valueWidth - 16 });
  state.y -= rowHeight + 2;
}

function drawMetricCards(
  state: { pdf: PDFDocument; page: PDFPage; y: number; width: number; height: number },
  font: PDFFont,
  boldFont: PDFFont,
  metrics: Array<[string, string]>,
) {
  const leftMargin = 54;
  const gap = 10;
  const columns = 2;
  const cardWidth = (state.width - 108 - gap) / columns;
  const cardHeight = 54;
  for (let i = 0; i < metrics.length; i += columns) {
    ensurePage(state);
    const row = metrics.slice(i, i + columns);
    row.forEach(([label, value], idx) => {
      const cardX = leftMargin + idx * (cardWidth + gap);
      state.page.drawRectangle({ x: cardX, y: state.y - cardHeight + 6, width: cardWidth, height: cardHeight, color: rgb(0.97, 0.98, 0.995), borderColor: rgb(0.83, 0.86, 0.91), borderWidth: 0.8 });
      state.page.drawText(sanitizePdfText(label), { x: cardX + 10, y: state.y - 10, size: 9.5, font: boldFont, color: rgb(0.12, 0.31, 0.77) });
      state.page.drawText(sanitizePdfText(value), { x: cardX + 10, y: state.y - 30, size: 12, font, color: rgb(0.12, 0.16, 0.24), maxWidth: cardWidth - 20 });
    });
    state.y -= cardHeight + 8;
  }
}

async function buildPdf(projectId: string, snapshot?: ExportSnapshot) {
  const project = await getProjectExportData(projectId);
  const report = composeProfessionalReport(project, snapshot);
  const snapshotProject = (snapshot?.project ?? {}) as Record<string, unknown>;
  if ((!project && !snapshot?.project) || !report) return null;
  const projectName = typeof snapshotProject.name === "string" && snapshotProject.name.trim() ? snapshotProject.name : project?.name ?? "SubnetOps Project";
  const organizationName = typeof snapshotProject.organizationName === "string" && snapshotProject.organizationName.trim() ? snapshotProject.organizationName : project?.organizationName ?? "To be confirmed";
  const environmentType = typeof snapshotProject.environmentType === "string" && snapshotProject.environmentType.trim() ? snapshotProject.environmentType : project?.environmentType ?? "Custom";
  const logoUrl = typeof snapshotProject.logoUrl === "string" && snapshotProject.logoUrl.trim() ? snapshotProject.logoUrl : project?.logoUrl;

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const cover = pdf.addPage([612, 792]);
  const logo = await tryEmbedRemoteLogo(pdf, logoUrl);

  cover.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: rgb(0.985, 0.988, 0.995) });
  cover.drawRectangle({ x: 0, y: 640, width: 612, height: 152, color: rgb(0.12, 0.31, 0.77) });
  cover.drawText(sanitizePdfText(report.title), { x: 54, y: 724, size: 24, font: boldFont, color: rgb(1, 1, 1), maxWidth: 500 });
  cover.drawText(sanitizePdfText(report.subtitle), { x: 54, y: 694, size: 13, font, color: rgb(0.9, 0.94, 1), maxWidth: 500 });

  if (logo) {
    const scaled = logo.scale(0.22);
    cover.drawImage(logo, { x: 54, y: 500, width: scaled.width, height: scaled.height });
  }

  cover.drawText(sanitizePdfText(`Project: ${projectName}`), { x: 54, y: 446, size: 16, font: boldFont, color: rgb(0.12, 0.16, 0.24) });
  const coverState = { pdf, page: cover, y: 416, width: 612, height: 792 };
  const coverRows: Array<[string, string]> = [
    ["Organization", report.metadata?.organizationName || organizationName || "To be confirmed"],
    ["Environment", report.metadata?.environment || environmentType],
    ["Document status", report.metadata?.revisionStatus || "Review draft"],
    ["Approval posture", report.metadata?.approvalStatus || "Ready for technical review"],
    ["Project phase", report.metadata?.projectPhase || "To be confirmed"],
    ["Planning focus", report.metadata?.planningFocus || "To be confirmed"],
    ["Generated", report.generatedAt],
    ["Prepared by", report.metadata?.documentOwner || "SubnetOps Professional Report Composer"],
  ];
  coverRows.forEach(([label, value]) => drawControlRow(coverState, font, boldFont, label, value));
  cover.drawText(sanitizePdfText(`Professional network design and planning package`), { x: 54, y: 162, size: 12, font, color: rgb(0.34, 0.39, 0.47) });

  let state = { pdf, page: pdf.addPage([612, 792]), y: 730, width: 612, height: 792 };
  drawParagraph(state, font, "Executive Summary", { size: 18, bold: true, boldFont });
  for (const paragraph of report.executiveSummary) {
    drawParagraph(state, font, paragraph, { size: 11 });
    state.y -= 6;
  }

  drawParagraph(state, font, "Table of Contents", { size: 18, bold: true, boldFont });
  report.sections.forEach((section) => drawParagraph(state, font, section.title, { size: 11 }));
  if (report.appendices?.length) {
    report.appendices.forEach((section) => drawParagraph(state, font, section.title, { size: 10.5 }));
  }
  if (report.visualSnapshot?.metrics?.length) {
    state.y -= 10;
    drawParagraph(state, font, "Key Design Snapshot", { size: 16, bold: true, boldFont });
    drawMetricCards(state, font, boldFont, report.visualSnapshot.metrics);
  }
  if (report.visualSnapshot?.topologyRows?.length) {
    drawTable(state, font, boldFont, { title: "Topology and Design Snapshot", headers: ["Layer", "Current Design", "Review Note"], rows: report.visualSnapshot.topologyRows });
  }

  const allSections = [...report.sections, ...(report.appendices ?? [])];

  for (const section of allSections) {
    state.page = pdf.addPage([612, 792]);
    state.width = 612;
    state.height = 792;
    state.y = 730;

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

function cellParagraph(text: string, bold = false) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, bold, size: 22 })],
  });
}

async function buildDocx(projectId: string, snapshot?: ExportSnapshot) {
  const project = await getProjectExportData(projectId);
  const report = composeProfessionalReport(project, snapshot);
  const snapshotProject = (snapshot?.project ?? {}) as Record<string, unknown>;
  if ((!project && !snapshot?.project) || !report) return null;
  const projectName = typeof snapshotProject.name === "string" && snapshotProject.name.trim() ? snapshotProject.name : project?.name ?? "SubnetOps Project";
  const organizationName = typeof snapshotProject.organizationName === "string" && snapshotProject.organizationName.trim() ? snapshotProject.organizationName : project?.organizationName ?? "To be confirmed";
  const environmentType = typeof snapshotProject.environmentType === "string" && snapshotProject.environmentType.trim() ? snapshotProject.environmentType : project?.environmentType ?? "Custom";
  const logoUrl = typeof snapshotProject.logoUrl === "string" && snapshotProject.logoUrl.trim() ? snapshotProject.logoUrl : project?.logoUrl;

  const children: Array<Paragraph | Table> = [];

  const controlRows = [
    ["Organization", report.metadata?.organizationName || organizationName || "To be confirmed"],
    ["Environment", report.metadata?.environment || environmentType],
    ["Document status", report.metadata?.revisionStatus || "Review draft"],
    ["Approval posture", report.metadata?.approvalStatus || "Ready for technical review"],
    ["Project phase", report.metadata?.projectPhase || "To be confirmed"],
    ["Planning focus", report.metadata?.planningFocus || "To be confirmed"],
    ["Generated", report.generatedAt],
    ["Prepared by", report.metadata?.documentOwner || "SubnetOps Professional Report Composer"],
  ];

  children.push(
    new Paragraph({ text: report.title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 140 } }),
    new Paragraph({ text: report.subtitle, alignment: AlignmentType.CENTER, spacing: { after: 220 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: controlRows.map(([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.CLEAR, color: "auto", fill: "E8EEF9" },
              children: [cellParagraph(label, true)],
            }),
            new TableCell({
              children: [cellParagraph(value)],
            }),
          ],
        }),
      ),
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 180, after: 300 },
      children: [new TextRun({ text: `Generated from ${report.metadata?.generatedFrom || "SubnetOps planning data"}`, italics: true, size: 22 })],
    }),
    new Paragraph({ text: "Executive Summary", heading: HeadingLevel.HEADING_1 }),
  );

  report.executiveSummary.forEach((paragraph) => {
    children.push(new Paragraph({ text: paragraph, spacing: { after: 160 } }));
  });

  children.push(new Paragraph({ text: "Table of Contents", heading: HeadingLevel.HEADING_1 }));
  const allSectionsDocx = [...report.sections, ...(report.appendices ?? [])];
  allSectionsDocx.forEach((section) => {
    children.push(new Paragraph({ text: section.title, spacing: { after: 100 } }));
  });

  if (report.visualSnapshot?.metrics?.length) {
    children.push(new Paragraph({ text: "Key Design Snapshot", heading: HeadingLevel.HEADING_1 }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: report.visualSnapshot.metrics.map(([label, value]) => new TableRow({ children: [new TableCell({ shading: { type: ShadingType.CLEAR, color: "auto", fill: "EEF3FB" }, children: [cellParagraph(label, true)] }), new TableCell({ children: [cellParagraph(value)] })] })),
    }));
    if (report.visualSnapshot.topologyRows?.length) {
      children.push(new Paragraph({ text: "Topology and Design Snapshot", heading: HeadingLevel.HEADING_2 }));
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        rows: [
          new TableRow({ children: ["Layer", "Current Design", "Review Note"].map((header) => new TableCell({ shading: { type: ShadingType.CLEAR, color: "auto", fill: "DCE7F8" }, children: [cellParagraph(header, true)] })) }),
          ...report.visualSnapshot.topologyRows.map((row) => new TableRow({ children: row.map((value) => new TableCell({ children: [cellParagraph(value)] })) })),
        ],
      }));
    }
  }

  allSectionsDocx.forEach((section) => {
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
    section.paragraphs.forEach((paragraph) => {
      children.push(new Paragraph({ text: paragraph, spacing: { after: 160 } }));
    });
    section.bullets?.forEach((bullet) => {
      children.push(new Paragraph({ text: bullet, bullet: { level: 0 }, spacing: { after: 100 } }));
    });
    section.tables?.forEach((table) => {
      children.push(new Paragraph({ text: table.title, heading: HeadingLevel.HEADING_2 }));
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: table.headers.map((header) =>
                new TableCell({
                  children: [cellParagraph(header, true)],
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "BFC7D5" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "BFC7D5" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "BFC7D5" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "BFC7D5" },
                  },
                }),
              ),
            }),
            ...table.rows.map(
              (row) =>
                new TableRow({
                  children: row.map((value) =>
                    new TableCell({
                      children: [cellParagraph(value)],
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                      },
                    }),
                  ),
                }),
            ),
          ],
        }),
      );
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

export async function exportCsv(req: Request, res: Response) {
  const rows = await getCsvRows(requireParam(req, "projectId"), readExportSnapshot(req));
  const csv = toCsv(rows);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="subnetops-export.csv"');
  res.send(csv);
}

export async function exportPdf(req: Request, res: Response) {
  const pdfBytes = await buildPdf(requireParam(req, "projectId"), readExportSnapshot(req));
  if (!pdfBytes) {
    return res.status(404).json({ message: "Project not found" });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="subnetops-professional-report.pdf"');
  return res.send(Buffer.from(pdfBytes));
}

export async function exportDocx(req: Request, res: Response) {
  const docxBytes = await buildDocx(requireParam(req, "projectId"), readExportSnapshot(req));
  if (!docxBytes) {
    return res.status(404).json({ message: "Project not found" });
  }

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  res.setHeader("Content-Disposition", 'attachment; filename="subnetops-professional-report.docx"');
  return res.send(Buffer.from(docxBytes));
}
