import type { Request, Response } from "express";
import { requireParam } from "../utils/request.js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { buildExportContext, getCsvRows, getProjectExportData } from "../services/export.service.js";

function isEnabled(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
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

async function buildPdf(projectId: string) {
  const project = await getProjectExportData(projectId);
  const ctx = buildExportContext(project);
  if (!ctx) return null;

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const cover = pdf.addPage([792, 612]);
  const logo = await tryEmbedRemoteLogo(pdf, ctx.project.logoUrl);

  cover.drawRectangle({ x: 0, y: 0, width: 792, height: 612, color: rgb(0.97, 0.98, 1) });
  cover.drawRectangle({ x: 0, y: 540, width: 792, height: 72, color: rgb(0.14, 0.34, 0.84) });
  cover.drawText(ctx.project.reportHeader || `${ctx.project.name} Technical Design Package`, {
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

  const executiveSummary = `${ctx.project.name} is a ${String(ctx.project.environmentType || "custom").toLowerCase()} network design package covering ${ctx.siteCount} site${ctx.siteCount === 1 ? "" : "s"} and ${ctx.vlanCount} VLAN / subnet row${ctx.vlanCount === 1 ? "" : "s"}. ${ctx.errors.length > 0 ? `${ctx.errors.length} validation blocker${ctx.errors.length === 1 ? " remains" : "s remain"} open.` : ctx.warnings.length > 0 ? `${ctx.warnings.length} warning${ctx.warnings.length === 1 ? " should" : "s should"} be reviewed before sign-off.` : "No active validation blockers are recorded right now."}`;

  cover.drawText(`Project: ${ctx.project.name}`, { x: 48, y: 380, size: 18, font: boldFont, color: rgb(0.12, 0.16, 0.24) });
  cover.drawText(`Organization: ${ctx.project.organizationName || "Not set"}`, { x: 48, y: 350, size: 12, font, color: rgb(0.2, 0.25, 0.32) });
  cover.drawText(`Environment: ${ctx.project.environmentType || "Custom"}`, { x: 48, y: 330, size: 12, font, color: rgb(0.2, 0.25, 0.32) });
  cover.drawText(`Generated: ${new Date().toLocaleString()}`, { x: 48, y: 310, size: 12, font, color: rgb(0.2, 0.25, 0.32) });
  cover.drawText(`Sites: ${ctx.siteCount}   VLANs: ${ctx.vlanCount}`, { x: 48, y: 290, size: 12, font, color: rgb(0.2, 0.25, 0.32) });
  cover.drawText(`Validation — Errors: ${ctx.errors.length}, Warnings: ${ctx.warnings.length}`, { x: 48, y: 270, size: 12, font, color: rgb(0.2, 0.25, 0.32) });
  cover.drawText(executiveSummary, { x: 48, y: 220, size: 11, font, color: rgb(0.2, 0.25, 0.32), maxWidth: 696, lineHeight: 14 });

  if (ctx.project.reportFooter) {
    cover.drawText(ctx.project.reportFooter, { x: 48, y: 56, size: 11, font, color: rgb(0.35, 0.42, 0.54), maxWidth: 696 });
  }

  let page = pdf.addPage([792, 612]);
  let { width, height } = page.getSize();
  let y = height - 40;

  const addLine = (text: string, size = 10, bold = false) => {
    if (y < 48) {
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
      lineHeight: size + 2,
    });
    y -= size + 6;
  };

  const addSection = (title: string, lines: string[]) => {
    addLine(title, 14, true);
    if (lines.length === 0) {
      addLine("No data available.");
    } else {
      for (const line of lines) addLine(`• ${line}`);
    }
    y -= 6;
  };

  addSection("Project Summary", [
    `Project: ${ctx.project.name}`,
    `Organization: ${ctx.project.organizationName || "Not set"}`,
    `Environment: ${ctx.project.environmentType || "Custom"}`,
    `Base private range: ${ctx.project.basePrivateRange || "Not set"}`,
    ctx.project.description ? `Summary: ${ctx.project.description}` : "",
  ].filter(Boolean));

  addSection("Requirements Snapshot", [
    `Planning for: ${ctx.requirements.planningFor || "Not captured"}`,
    `Project phase: ${ctx.requirements.projectPhase || "Not captured"}`,
    `Primary goal: ${ctx.requirements.primaryGoal || "Not captured"}`,
    `Compliance profile: ${ctx.requirements.complianceProfile || "Not captured"}`,
    `Sites: ${ctx.requirements.siteCount || ctx.siteCount || "Not captured"}`,
    `Users per site: ${ctx.requirements.usersPerSite || "Not captured"}`,
    `Internet model: ${ctx.requirements.internetModel || "Not captured"}`,
    `Server placement: ${ctx.requirements.serverPlacement || "Not captured"}`,
    ctx.requirements.customRequirementsNotes ? `Custom notes: ${ctx.requirements.customRequirementsNotes}` : "",
  ].filter(Boolean));

  addSection("Discovery and Current State", ctx.discoveryHighlights.length > 0 ? ctx.discoveryHighlights : ["No discovery baseline has been entered yet."]);

  addSection("High-Level Design Intent", [
    ctx.siteCount > 1 ? "Multi-site logical design with per-site addressing blocks" : "Single-site logical design",
    ctx.requirements.environmentType && String(ctx.requirements.environmentType) !== "On-prem" ? `Cloud / hybrid posture: ${ctx.requirements.environmentType}` : "On-prem-first posture",
    ctx.securityZones.length > 0 ? `Security zones in scope: ${ctx.securityZones.join(", ")}` : "Security zoning has not been modeled yet",
    isEnabled(ctx.requirements.dualIsp) ? `Resilience target: ${String(ctx.requirements.resilienceTarget || "dual uplink / failover")}` : "Single-edge uplink posture unless changed later",
    `Validation status: ${ctx.errors.length} errors, ${ctx.warnings.length} warnings`,
  ]);

  const siteLines: string[] = [];
  for (const site of ctx.project.sites as any[]) {
    siteLines.push(`${site.name} | ${site.location || "—"} | block ${site.defaultAddressBlock || "—"}`);
    for (const vlan of site.vlans as any[]) {
      siteLines.push(`   VLAN ${vlan.vlanId} ${vlan.vlanName} | ${vlan.subnetCidr} | GW ${vlan.gatewayIp} | DHCP ${vlan.dhcpEnabled ? "Yes" : "No"} | Hosts ${vlan.estimatedHosts ?? ""}`);
    }
  }
  addSection("Detailed Site and Addressing Plan", siteLines);

  addSection("Security and Segmentation", [
    ...ctx.securityZones.map((zone) => `Zone: ${zone}`),
    isEnabled(ctx.requirements.guestWifi) ? `Guest policy: ${String(ctx.requirements.guestPolicy || "guest isolated from corporate access")}` : "",
    isEnabled(ctx.requirements.management) ? `Management policy: ${String(ctx.requirements.managementAccess || "management restricted to trusted admin paths")}` : "",
    isEnabled(ctx.requirements.remoteAccess) ? `Remote access: ${String(ctx.requirements.remoteAccessMethod || "remote access gateway")}` : "",
    isEnabled(ctx.requirements.cloudConnected) || String(ctx.requirements.environmentType || "") !== "On-prem" ? `Cloud boundary: ${String(ctx.requirements.cloudTrafficBoundary || ctx.requirements.cloudIdentityBoundary || "review required")}` : "",
  ].filter(Boolean));

  addSection("Platform Profile and BOM Foundation", ctx.bomLines.length > 0 ? ctx.bomLines : ["No platform profile or BOM foundation has been entered yet."]);

  addSection("Validation Review", (ctx.project.validations as any[]).length > 0 ? (ctx.project.validations as any[]).slice(0, 40).map((item) => `${item.severity}: ${item.title} — ${item.message}`) : ["No validation results available."]);

  addSection("Recent Project Activity", (ctx.project.changeLogs as any[]).length > 0 ? (ctx.project.changeLogs as any[]).map((item) => `${new Date(item.createdAt).toLocaleString()} — ${item.message}`) : ["No recent activity logged."]);

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
