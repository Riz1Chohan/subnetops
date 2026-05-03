import { prisma } from "../db/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { ensureCanViewProject } from "./access.service.js";

export const REQUIREMENTS_RUNTIME_RELEASE = {
  phase: "PHASE_84_DESIGN_TRUST_SNAPSHOT_POLICY_RECONCILIATION",
  version: "0.107.0",
  compileFix: "PHASE_85_RENDER_COMPILE_FIXES_FOR_PHASE_84",
  renderBuildCleanup: "PHASE_86_RENDER_BUILD_CLEANUP",
  truthStabilization: "PHASE_87_READINESS_POLICY_WARNING_REPORT_DIAGRAM_STABILIZATION",
  professionalReportHardening: "PHASE_88_PROFESSIONAL_REPORT_RELEASE_DISCIPLINE",
  professionalAudienceCleanup: "PHASE_89_PROFESSIONAL_REPORT_AUDIENCE_CLEANUP",
  diagramProfessionalLayout: "PHASE_90_DIAGRAM_PROFESSIONAL_TOPOLOGY_LAYOUT",
  diagramVisualRegressionPatch: "PHASE_91_DIAGRAM_VISUAL_REGRESSION_PATCH",
  diagramViewSeparationLayout: "PHASE_92_DIAGRAM_VIEW_SEPARATION_LAYOUT_INTELLIGENCE",
  diagramScopeModeLayout: "PHASE_93_DIAGRAM_SCOPE_MODE_LAYOUT_STATUS",
  diagramUsabilityStaleLayoutCleanup: "PHASE_94_DIAGRAM_USABILITY_STALE_LAYOUT_CLEANUP",
  renderFrontendCompileFix: "PHASE_95_RENDER_FRONTEND_COMPILE_FIX",
  diagramReadabilityPolish: "PHASE_96_DIAGRAM_READABILITY_DEFAULTS_AND_SECURITY_MATRIX",
  diagramQaSecurityMatrixReleaseIntegrity: "PHASE_97_DIAGRAM_QA_SECURITY_MATRIX_RELEASE_INTEGRITY",
  diagramSemanticsProfessionalRendering: "PHASE_98_DIAGRAM_SEMANTICS_PROFESSIONAL_RENDERING",
  topologySemanticsRealNetworkLayout: "PHASE_99_TOPOLOGY_SEMANTICS_REAL_NETWORK_LAYOUT",
  diagramTrustEdgePolicyCleanup: "PHASE_100_DIAGRAM_TRUST_EDGE_POLICY_CLEANUP",
  diagramViewDisciplineEdgeTruth: "PHASE_101_DIAGRAM_VIEW_DISCIPLINE_EDGE_TRUTH",
  edgePathTruthFirewallVpnTermination: "PHASE_102_EDGE_PATH_TRUTH_FIREWALL_VPN_TERMINATION",
  enterpriseScaleCanvasLayout: "PHASE_103_ENTERPRISE_SCALE_CANVAS_AND_LAYOUT",
  enterpriseWanFabricPolish: "PHASE_104_ENTERPRISE_WAN_FABRIC_POLISH",
  engineerGradeWanTopology: "PHASE_105_ENGINEER_GRADE_WAN_TOPOLOGY",
  engineerGradeDiagramFinalPass: "PHASE_106_ENGINEER_GRADE_DIAGRAM_FINAL_PASS",
  diagramLayoutContractRewrite: "PHASE_107_DIAGRAM_LAYOUT_CONTRACT_REWRITE",
  phase3RequirementsClosureControl: "PHASE3_REQUIREMENTS_IMPACT_CLOSURE_SCENARIO_PROOF",
  saveRoute: "PATCH /api/projects/:projectId/requirements",
  proofRoute: "GET /api/projects/:projectId/requirements-runtime-proof",
} as const;

type RequirementMap = Record<string, unknown>;
type RuntimeProofStatus = "pass" | "blocker";
type RuntimeProofTx = { project: { findUnique: (args: unknown) => Promise<any> } };

function parseRequirementsJson(requirementsJson?: string | null): RequirementMap {
  if (!requirementsJson) return {};
  try {
    const parsed = JSON.parse(requirementsJson);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as RequirementMap : {};
  } catch {
    return {};
  }
}

function numberRequirement(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanRequirement(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return value === true || normalized === "true" || normalized === "yes" || normalized === "required" || normalized === "enabled";
}

function hasRequirementText(value: unknown) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return Boolean(normalized) && !normalized.includes("not applicable") && normalized !== "none" && normalized !== "n/a";
}

export function expectedRequirementSegmentFamilies(requirements: RequirementMap) {
  const expected = new Set<string>();
  expected.add("USERS");
  if (numberRequirement(requirements.serverCount) > 0 || hasRequirementText(requirements.serverPlacement) || hasRequirementText(requirements.criticalServicesModel)) expected.add("SERVICES");
  if (booleanRequirement(requirements.guestWifi)) expected.add("GUEST");
  if (booleanRequirement(requirements.wireless) || numberRequirement(requirements.apCount) > 0) expected.add("STAFF-WIFI");
  if (booleanRequirement(requirements.voice) || numberRequirement(requirements.phoneCount) > 0) expected.add("VOICE");
  if (booleanRequirement(requirements.printers) || numberRequirement(requirements.printerCount) > 0) expected.add("PRINTERS");
  if (booleanRequirement(requirements.iot) || numberRequirement(requirements.iotDeviceCount) > 0) expected.add("IOT");
  if (booleanRequirement(requirements.cameras) || numberRequirement(requirements.cameraCount) > 0) expected.add("CAMERAS");
  if (booleanRequirement(requirements.management) || hasRequirementText(requirements.managementIpPolicy) || hasRequirementText(requirements.managementAccess)) expected.add("MANAGEMENT");
  if (booleanRequirement(requirements.remoteAccess)) expected.add("REMOTE-ACCESS");

  const environmentType = String(requirements.environmentType ?? "").toLowerCase();
  if (booleanRequirement(requirements.cloudConnected) || environmentType.includes("cloud") || environmentType.includes("hybrid")) expected.add("CLOUD-EDGE");

  const selectedSites = Math.max(1, numberRequirement(requirements.siteCount, 1));
  const internetModel = String(requirements.internetModel ?? "internet at each site").toLowerCase();
  if (selectedSites > 1 || !internetModel.includes("each site") || booleanRequirement(requirements.dualIsp)) expected.add("WAN-TRANSIT");
  if (hasRequirementText(requirements.monitoringModel) || hasRequirementText(requirements.loggingModel) || hasRequirementText(requirements.backupPolicy)) expected.add("OPERATIONS");
  return [...expected].sort();
}

export async function buildRequirementsRuntimeProof(
  tx: RuntimeProofTx,
  projectId: string,
  requirementsJsonOverride?: string | null,
  proofStage = "runtime-proof",
) {
  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      requirementsJson: true,
      environmentType: true,
      sites: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          siteCode: true,
          defaultAddressBlock: true,
          vlans: {
            orderBy: { vlanId: "asc" },
            select: {
              id: true,
              vlanId: true,
              vlanName: true,
              segmentRole: true,
              subnetCidr: true,
              gatewayIp: true,
              dhcpEnabled: true,
              estimatedHosts: true,
            },
          },
        },
      },
    },
  });

  if (!project) throw new ApiError(404, "Project not found");

  const requirementsJson = typeof requirementsJsonOverride === "string" ? requirementsJsonOverride : project.requirementsJson;
  const requirements = parseRequirementsJson(requirementsJson);
  const savedRequirementKeys = Object.keys(requirements).sort();
  const selectedSiteCount = Math.max(1, numberRequirement(requirements.siteCount, 1));
  const requiredSegmentFamilies = expectedRequirementSegmentFamilies(requirements);
  const siteCount = project.sites.length;
  const vlanCount = project.sites.reduce((sum: number, site: any) => sum + site.vlans.length, 0);
  const addressingRows = project.sites.reduce((sum: number, site: any) => sum + site.vlans.filter((vlan: any) => Boolean(vlan.subnetCidr && vlan.gatewayIp)).length, 0);
  const expectedMinimumVlans = selectedSiteCount * requiredSegmentFamilies.length;
  const failureReasons: string[] = [];

  if (!requirementsJson || savedRequirementKeys.length === 0) failureReasons.push("No parseable requirementsJson exists for this project save path.");
  if (siteCount < selectedSiteCount) failureReasons.push(`Selected ${selectedSiteCount} site(s), but only ${siteCount} durable Site row(s) exist.`);
  if (requiredSegmentFamilies.length > 0 && vlanCount < expectedMinimumVlans) failureReasons.push(`Expected at least ${expectedMinimumVlans} VLAN/segment row(s) from ${requiredSegmentFamilies.length} required segment family/families across ${selectedSiteCount} site(s), but only ${vlanCount} exist.`);
  if (vlanCount > 0 && addressingRows === 0) failureReasons.push("VLAN rows exist, but none have both subnetCidr and gatewayIp populated.");

  const status: RuntimeProofStatus = failureReasons.length > 0 ? "blocker" : "pass";

  return {
    release: REQUIREMENTS_RUNTIME_RELEASE,
    proofStage,
    generatedAt: new Date().toISOString(),
    status,
    materializerExpected: true,
    materializerContract: "Save Requirements must persist durable Site and VLAN rows in the same Prisma database that design-core/report/export reads.",
    requirementsPresent: savedRequirementKeys.length > 0,
    savedRequirementKeys,
    selectedSiteCount,
    requiredSegmentFamilies,
    expectedMinimumVlans,
    counts: { sites: siteCount, vlans: vlanCount, addressingRows },
    samples: {
      sites: project.sites.slice(0, 5).map((site: any) => ({ id: site.id, name: site.name, siteCode: site.siteCode, defaultAddressBlock: site.defaultAddressBlock, vlanCount: site.vlans.length })),
      vlans: project.sites.flatMap((site: any) => site.vlans.map((vlan: any) => ({ siteName: site.name, siteCode: site.siteCode, vlanId: vlan.vlanId, vlanName: vlan.vlanName, segmentRole: vlan.segmentRole, subnetCidr: vlan.subnetCidr, gatewayIp: vlan.gatewayIp, dhcpEnabled: vlan.dhcpEnabled, estimatedHosts: vlan.estimatedHosts }))).slice(0, 12),
    },
    failureReasons,
  };
}

export function assertRequirementsRuntimeProofPass(proof: Awaited<ReturnType<typeof buildRequirementsRuntimeProof>>) {
  if (proof.status === "pass") return;
  throw new ApiError(500, `Requirements runtime proof failed after save: ${proof.failureReasons.join(" ")}`);
}

export async function getRequirementsRuntimeProof(projectId: string, userId: string) {
  await ensureCanViewProject(userId, projectId);
  return buildRequirementsRuntimeProof(prisma as any, projectId, null, "direct-runtime-proof-route");
}
