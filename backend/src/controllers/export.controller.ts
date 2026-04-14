import type { Request, Response } from "express";
import { requireParam } from "../utils/request.js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getCsvRows, getProjectExportData } from "../services/export.service.js";

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

async function buildPdf(projectId: string) {
  const project = await getProjectExportData(projectId);
  if (!project) return null;

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const errorCount = project.validations.filter((item: any) => item.severity === "ERROR").length;
  const warningCount = project.validations.filter((item: any) => item.severity === "WARNING").length;
  const infoCount = project.validations.filter((item: any) => item.severity === "INFO").length;

  const cover = pdf.addPage([792, 612]);
  const logo = await tryEmbedRemoteLogo(pdf, project.logoUrl);

  cover.drawRectangle({ x: 0, y: 0, width: 792, height: 612, color: rgb(0.97, 0.98, 1) });
  cover.drawRectangle({ x: 0, y: 540, width: 792, height: 72, color: rgb(0.14, 0.34, 0.84) });
  cover.drawText(project.reportHeader || `${project.name} Report`, {
    x: 48,
    y: 555,
    size: 24,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  if (logo) {
    const scaled = logo.scale(0.3);
    cover.drawImage(logo, { x: 48, y: 420, width: scaled.width, height: scaled.height });
  }

  cover.drawText(`Project: ${project.name}`, { x: 48, y: 380, size: 18, font: boldFont, color: rgb(0.12, 0.16, 0.24) });
  cover.drawText(`Organization: ${project.organizationName || "Not set"}`, { x: 48, y: 350, size: 12, font, color: rgb(0.2, 0.25, 0.32) });
  cover.drawText(`Environment: ${project.environmentType || "Custom"}`, { x: 48, y: 330, size: 12, font, color: rgb(0.2, 0.25, 0.32) });
  cover.drawText(`Generated: ${new Date().toLocaleString()}`, { x: 48, y: 310, size: 12, font, color: rgb(0.2, 0.25, 0.32) });
  cover.drawText(`Sites: ${project.sites.length}   VLANs: ${project.sites.reduce((sum: number, site: any) => sum + site.vlans.length, 0)}`, { x: 48, y: 280, size: 12, font, color: rgb(0.2, 0.25, 0.32) });
  cover.drawText(`Validation — Errors: ${errorCount}, Warnings: ${warningCount}, Info: ${infoCount}`, { x: 48, y: 260, size: 12, font, color: rgb(0.2, 0.25, 0.32) });

  if (project.reportFooter) {
    cover.drawText(project.reportFooter, { x: 48, y: 56, size: 11, font, color: rgb(0.35, 0.42, 0.54), maxWidth: 696 });
  }

  let page = pdf.addPage([792, 612]);
  let { width, height } = page.getSize();
  let y = height - 40;

  const addLine = (text: string, size = 10, bold = false) => {
    if (y < 40) {
      page = pdf.addPage([792, 612]);
      ({ width, height } = page.getSize());
      y = height - 40;
    }

    page.drawText(text, {
      x: 40,
      y,
      size,
      font: bold ? boldFont : font,
      color: rgb(0.12, 0.16, 0.24),
      maxWidth: width - 80,
    });
    y -= size + 6;
  };

  addLine(`SubnetOps Export`, 18, true);
  addLine(`Project: ${project.name}`, 14, true);
  addLine(`Organization: ${project.organizationName || "Not set"}`);
  addLine(`Environment: ${project.environmentType || "Custom"}`);
  addLine(`Base Range: ${project.basePrivateRange || "Not set"}`);
  y -= 8;

  addLine("Sites", 13, true);
  if (project.sites.length === 0) addLine("No sites added.");
  for (const site of project.sites) {
    addLine(`• ${site.name} | ${site.location || "—"} | ${site.defaultAddressBlock || "—"}`);
  }

  y -= 8;
  addLine("VLANs", 13, true);
  const allVlans = project.sites.flatMap((site: any) => site.vlans.map((vlan: any) => ({ siteName: site.name, vlan })));
  if (allVlans.length === 0) addLine("No VLANs added.");
  for (const { siteName, vlan } of allVlans) {
    addLine(`• ${siteName} | VLAN ${vlan.vlanId} ${vlan.vlanName} | ${vlan.subnetCidr} | GW ${vlan.gatewayIp} | DHCP ${vlan.dhcpEnabled ? "Yes" : "No"}`);
  }

  y -= 8;
  addLine("Validation Summary", 13, true);
  if (project.validations.length === 0) addLine("No validation results available.");
  for (const item of project.validations.slice(0, 25)) {
    addLine(`• ${item.severity}: ${item.title} — ${item.message}`);
  }

  return pdf.save();
}

export async function exportCsv(req: Request, res: Response) {
  const rows = await getCsvRows(requireParam(req, "projectId"));
  const csv = toCsv(rows);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="subnetops-export.csv"');
  res.send(csv);
}

export async function exportPdf(req: Request, res: Response) {
  const pdfBytes = await buildPdf(requireParam(req, "projectId"));
  if (!pdfBytes) {
    return res.status(404).json({ message: "Project not found" });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="subnetops-export.pdf"');
  return res.send(Buffer.from(pdfBytes));
}
