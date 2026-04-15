import { prisma } from "../db/prisma.js";
function parseJson(value) {
    if (!value)
        return null;
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
}
function truthy(value) {
    return value === true || value === "true" || value === 1 || value === "1";
}
function isEnabled(value) {
    return truthy(value);
}
function asString(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
export async function getProjectExportData(projectId) {
    return prisma.project.findUnique({
        where: { id: projectId },
        include: {
            sites: {
                include: {
                    vlans: {
                        orderBy: { vlanId: "asc" },
                    },
                },
                orderBy: { name: "asc" },
            },
            validations: {
                orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
            },
            changeLogs: {
                orderBy: { createdAt: "desc" },
                take: 15,
            },
        },
    });
}
export function buildExportContext(project) {
    if (!project)
        return null;
    const requirements = parseJson(project.requirementsJson) || {};
    const discovery = parseJson(project.discoveryJson) || {};
    const platform = parseJson(project.platformProfileJson) || {};
    const siteCount = project.sites.length;
    const vlanCount = project.sites.reduce((sum, site) => sum + site.vlans.length, 0);
    const errors = project.validations.filter((item) => item.severity === "ERROR");
    const warnings = project.validations.filter((item) => item.severity === "WARNING");
    const securityZones = [
        truthy(requirements.guestWifi) ? "Guest" : null,
        truthy(requirements.management) ? "Management" : null,
        truthy(requirements.voice) ? "Voice" : null,
        truthy(requirements.iot) || truthy(requirements.cameras) ? "IoT / Specialty" : null,
        truthy(requirements.remoteAccess) ? "Remote Access" : null,
        "Users",
        "Services",
    ].filter(Boolean);
    const discoveryHighlights = [
        typeof discovery.topologyBaseline === "string" && discovery.topologyBaseline.trim() ? `Topology baseline: ${discovery.topologyBaseline.trim()}` : null,
        typeof discovery.inventoryNotes === "string" && discovery.inventoryNotes.trim() ? `Inventory/lifecycle: ${discovery.inventoryNotes.trim()}` : null,
        typeof discovery.routingTransportBaseline === "string" && discovery.routingTransportBaseline.trim() ? `Routing/transport baseline: ${discovery.routingTransportBaseline.trim()}` : null,
        typeof discovery.securityPosture === "string" && discovery.securityPosture.trim() ? `Security baseline: ${discovery.securityPosture.trim()}` : null,
        typeof discovery.gapsPainPoints === "string" && discovery.gapsPainPoints.trim() ? `Gaps/pain points: ${discovery.gapsPainPoints.trim()}` : null,
        typeof discovery.constraintsDependencies === "string" && discovery.constraintsDependencies.trim() ? `Constraints/dependencies: ${discovery.constraintsDependencies.trim()}` : null,
    ].filter(Boolean);
    const bomLines = [
        siteCount > 0 ? `${siteCount} site location${siteCount === 1 ? "" : "s"}` : null,
        vlanCount > 0 ? `${vlanCount} VLAN / subnet design row${vlanCount === 1 ? "" : "s"}` : null,
        typeof platform.vendorStrategy === "string" && platform.vendorStrategy.trim() ? `Vendor strategy: ${platform.vendorStrategy.trim()}` : null,
        typeof platform.platformMode === "string" && platform.platformMode.trim() ? `Platform mode: ${platform.platformMode.trim()}` : null,
        typeof platform.wanPosture === "string" && platform.wanPosture.trim() ? `WAN posture: ${platform.wanPosture.trim()}` : null,
        typeof platform.wirelessPosture === "string" && platform.wirelessPosture.trim() ? `Wireless posture: ${platform.wirelessPosture.trim()}` : null,
        typeof platform.procurementLifecyclePosture === "string" && platform.procurementLifecyclePosture.trim() ? `Lifecycle posture: ${platform.procurementLifecyclePosture.trim()}` : null,
    ].filter(Boolean);
    return {
        project,
        requirements,
        discovery,
        platform,
        siteCount,
        vlanCount,
        errors,
        warnings,
        securityZones,
        discoveryHighlights,
        bomLines,
    };
}
export function composeProfessionalReport(project) {
    const ctx = buildExportContext(project);
    if (!ctx)
        return null;
    const generatedAt = new Date().toLocaleString();
    const projectType = asString(ctx.project.environmentType, "custom").toLowerCase();
    const architecturePattern = ctx.siteCount > 1
        ? "a multi-site logical design with site-level summary blocks, structured segmentation, and a shared delivery package"
        : "a compact single-site logical design with segmented trust boundaries and a supportable routed edge";
    const executiveSummary = [
        `${ctx.project.name} is a ${projectType} network planning package for ${ctx.siteCount || 0} site${ctx.siteCount === 1 ? "" : "s"}. The design package currently includes ${ctx.vlanCount || 0} VLAN and subnet rows, structured logical segmentation, routing and switching intent, implementation guidance, and a role-based platform foundation.`,
        ctx.errors.length > 0
            ? `The current design still has ${ctx.errors.length} blocking validation issue${ctx.errors.length === 1 ? "" : "s"} that should be resolved before implementation approval.`
            : ctx.warnings.length > 0
                ? `The current design has ${ctx.warnings.length} warning${ctx.warnings.length === 1 ? "" : "s"} that should be reviewed during technical sign-off, but there are no active error-level blockers recorded right now.`
                : "The current design is in a clean validation state with no active error-level or warning-level blockers recorded in the latest review cycle.",
        `The present architecture direction is ${architecturePattern}. This report turns the saved requirements, current-state notes, synthesized topology, and design controls into a review-ready technical handoff package rather than a raw app screen dump.`,
    ];
    const discoverySection = {
        title: "1. Discovery and Requirements Baseline",
        paragraphs: [
            `${ctx.project.name} was planned as a ${projectType} network project. The current saved scope identifies ${asString(ctx.requirements.primaryGoal, "no primary goal captured yet")} as the main design driver, with ${asString(ctx.requirements.projectPhase, "an unspecified project phase")} as the present planning stage.`,
            ctx.discoveryHighlights.length > 0
                ? "The project already contains current-state discovery notes that help ground the proposed design in known topology, routing, security, and operational conditions. These notes should continue to be expanded before the package is treated as migration-ready."
                : "The project currently has only a thin discovery baseline. The design package can still be used as a target-state planning document, but discovery should be strengthened before implementation, migration, or procurement decisions are finalized.",
        ],
        bullets: [
            `Planning for: ${asString(ctx.requirements.planningFor, "Not captured")}`,
            `Project phase: ${asString(ctx.requirements.projectPhase, "Not captured")}`,
            `Primary goal: ${asString(ctx.requirements.primaryGoal, "Not captured")}`,
            `Compliance profile: ${asString(ctx.requirements.complianceProfile, "Not captured")}`,
            `Users per site: ${String(ctx.requirements.usersPerSite ?? "Not captured")}`,
            ...ctx.discoveryHighlights,
        ],
    };
    const hldSection = {
        title: "2. High-Level Design",
        paragraphs: [
            `The proposed architecture follows ${architecturePattern}. This keeps the design understandable during early planning while still preserving clear boundaries for segmentation, growth, and later implementation detail.`,
            `The high-level design assumes ${ctx.siteCount > 1 ? "per-site summary blocks and a shared organizational addressing hierarchy" : "one primary site with a local routed edge, compact switching posture, and a small centralized service boundary"}. The objective is to make the design reviewable before detailed configuration work begins.`,
        ],
        bullets: [
            `Environment posture: ${asString(ctx.project.environmentType, "Not set")}`,
            `Base private range: ${asString(ctx.project.basePrivateRange, "Not set")}`,
            `Site count: ${String(ctx.siteCount)}`,
            `Security zones in scope: ${ctx.securityZones.join(", ") || "Not modeled yet"}`,
            isEnabled(ctx.requirements.cloudConnected) || asString(ctx.project.environmentType) !== "On-prem"
                ? `Cloud / hybrid posture: ${asString(ctx.requirements.environmentType, asString(ctx.project.environmentType, "Hybrid / cloud-connected"))}`
                : "Cloud / hybrid posture: On-prem-first design",
            isEnabled(ctx.requirements.dualIsp)
                ? `Resilience target: ${asString(ctx.requirements.resilienceTarget, "Dual path or failover-aware design")}`
                : "Resilience target: Simpler primary-path posture unless later revised",
        ],
    };
    const siteSummaryRows = ctx.project.sites.map((site) => [
        site.name,
        asString(site.location, "—"),
        asString(site.defaultAddressBlock, "—"),
        String(site.vlans.length),
    ]);
    const addressingRows = ctx.project.sites.flatMap((site) => site.vlans.map((vlan) => [
        site.name,
        String(vlan.vlanId),
        vlan.vlanName,
        vlan.subnetCidr,
        vlan.gatewayIp,
        vlan.dhcpEnabled ? "Yes" : "No",
    ]));
    const lldSection = {
        title: "3. Logical Design and Addressing Plan",
        paragraphs: [
            `The low-level design package currently includes ${ctx.vlanCount} VLAN and subnet row${ctx.vlanCount === 1 ? "" : "s"}. Each row represents a reviewable segment boundary with a subnet, gateway, DHCP posture, and role within the target logical design.`,
            `This structure is intended to prevent overlap, unclear gateway ownership, and uncontrolled growth before any device configurations are applied. The site hierarchy and VLAN table therefore remain central implementation artifacts rather than supporting notes.`,
        ],
        tables: [
            {
                title: "Site Summary",
                headers: ["Site", "Location", "Address Block", "VLAN Rows"],
                rows: siteSummaryRows.length > 0 ? siteSummaryRows : [["No sites added", "—", "—", "0"]],
            },
            {
                title: "Addressing Plan",
                headers: ["Site", "VLAN", "Segment", "Subnet", "Gateway", "DHCP"],
                rows: addressingRows.length > 0 ? addressingRows : [["No segments added", "—", "—", "—", "—", "—"]],
            },
        ],
    };
    const securitySection = {
        title: "4. Security Architecture",
        paragraphs: [
            `Security in the current package is treated as a design layer that should shape segmentation, routing boundaries, and implementation review. The current zone model is intended to keep users, shared services, management access, guest access, and transport/control traffic visibly separated before policy is implemented on real devices.`,
            `This report should be read as a policy-intent and structural security design rather than a final firewall rulebase. The outputs identify what zones exist, what separation principles are expected, and which access paths should remain tightly reviewed during implementation.`,
        ],
        bullets: [
            ...ctx.securityZones.map((zone) => `Security zone in scope: ${zone}`),
            isEnabled(ctx.requirements.guestWifi)
                ? `Guest boundary: ${asString(ctx.requirements.guestPolicy, "Guest access should remain isolated and internet-only unless explicitly reviewed.")}`
                : "Guest boundary: Guest scope not enabled in current requirements.",
            isEnabled(ctx.requirements.management)
                ? `Management boundary: ${asString(ctx.requirements.managementAccess, "Management access should stay on dedicated trusted administrative paths.")}`
                : "Management boundary: Dedicated management requirement not enabled.",
            isEnabled(ctx.requirements.remoteAccess)
                ? `Remote access posture: ${asString(ctx.requirements.remoteAccessMethod, "Remote access requires a controlled edge and reviewed identity path.")}`
                : "Remote access posture: Not enabled in saved scope.",
        ],
    };
    const routingSection = {
        title: "5. Routing, Switching, and Transport Intent",
        paragraphs: [
            `The routing and switching layer is currently positioned as a supportable first-pass design. The package emphasizes stable gateway placement, deliberate segment boundaries, and a clean path to more advanced routing only when scale, resilience, or multi-site growth truly requires it.`,
            `The transport design should be interpreted together with the addressing and security sections. Route summarization, default-route handling, loopback identity, and switching fault boundaries should reinforce the logical site hierarchy rather than undermine it.`,
        ],
        bullets: [
            `Internet model: ${asString(ctx.requirements.internetModel, "Not captured")}`,
            `Server placement: ${asString(ctx.requirements.serverPlacement, "Not captured")}`,
            `WAN posture: ${asString(ctx.platform.wanPosture, "Not captured")}`,
            `Routing posture: ${ctx.siteCount > 1 ? "Summarized multi-site routing recommended" : "Simple routed edge with clear gateway ownership"}`,
            isEnabled(ctx.requirements.voice)
                ? "QoS consideration: Voice scope is enabled and should be reflected in traffic treatment."
                : "QoS consideration: No specific voice scope is enabled in the saved requirements.",
        ],
    };
    const implementationSection = {
        title: "6. Implementation and Validation Strategy",
        paragraphs: [
            `Implementation should follow a phased method so that addressing, gateway behavior, service reachability, security boundaries, and rollback conditions can be reviewed in a controlled sequence. This package is intended to reduce change-window risk by making the design explicit before production configuration begins.`,
            `Validation results should remain tied to the design package. The logical plan should not be considered ready for implementation approval until the remaining blockers and unresolved assumptions are reviewed or explicitly accepted.`,
        ],
        bullets: [
            `Validation blockers: ${String(ctx.errors.length)}`,
            `Validation warnings: ${String(ctx.warnings.length)}`,
            ctx.errors.length > 0
                ? "Implementation note: resolve blocking validation items before cutover approval."
                : "Implementation note: no active error-level blockers are recorded right now.",
            `Latest validation posture: ${ctx.project.validations.length > 0 ? `${ctx.project.validations.length} total finding${ctx.project.validations.length === 1 ? "" : "s"}` : "No validation results recorded"}`,
        ],
        tables: [
            {
                title: "Validation Summary",
                headers: ["Severity", "Title", "Message"],
                rows: ctx.project.validations.length > 0
                    ? ctx.project.validations.slice(0, 12).map((item) => [item.severity, item.title, item.message])
                    : [["INFO", "No validation results available", "Run validation again after design changes if needed."]],
            },
        ],
    };
    const platformRows = ctx.bomLines.map((line) => [line, "Review and confirm during vendor / procurement alignment"]);
    const platformSection = {
        title: "7. Platform Profile and Bill of Materials Foundation",
        paragraphs: [
            `The current platform profile and BOM output should be treated as a role-based foundation rather than a final quote or SKU-accurate procurement package. Its purpose is to capture deployment posture, platform assumptions, and major infrastructure categories early so the design package can move toward engineering review.`,
            `Final platform selection, model choice, licensing detail, optics, and procurement-specific decisions still require engineering and commercial review. This section is meant to improve planning realism, not replace procurement sign-off.`,
        ],
        tables: [
            {
                title: "Platform and BOM Foundation",
                headers: ["Foundation Item", "Review Note"],
                rows: platformRows.length > 0 ? platformRows : [["No BOM foundation captured", "Open the Platform & BOM workspace and save a profile before export."]],
            },
        ],
    };
    const conclusionSection = {
        title: "8. Conclusion and Handoff Notes",
        paragraphs: [
            `${ctx.project.name} now has a structured design package covering requirements, current-state notes, high-level architecture, logical addressing, security intent, routing posture, implementation sequencing, and platform assumptions. This is the point at which the project can move into deeper review, refinement, or implementation preparation rather than remaining only as raw planner input.`,
            ctx.errors.length > 0
                ? `Before this package is treated as implementation-ready, the remaining ${ctx.errors.length} blocker${ctx.errors.length === 1 ? "" : "s"} should be resolved and the validation cycle rerun so the final export reflects a cleaner approval state.`
                : "The package currently reads as review-ready. Continue refining discovery detail, platform specificity, and implementation evidence so the handoff becomes stronger over time.",
        ],
    };
    return {
        title: ctx.project.reportHeader || `${ctx.project.name} Technical Design Report`,
        subtitle: `${ctx.project.name} — Professional network planning package`,
        generatedAt,
        executiveSummary,
        sections: [discoverySection, hldSection, lldSection, securitySection, routingSection, implementationSection, platformSection, conclusionSection],
    };
}
export async function getCsvRows(projectId) {
    const project = await getProjectExportData(projectId);
    const ctx = buildExportContext(project);
    if (!ctx)
        return [];
    const rows = [];
    rows.push({ Section: "Project", Scope: "Project", Name: ctx.project.name, Key: "Organization", Value: ctx.project.organizationName ?? "", Notes: "" }, { Section: "Project", Scope: "Project", Name: ctx.project.name, Key: "Environment", Value: ctx.project.environmentType ?? "", Notes: "" }, { Section: "Project", Scope: "Project", Name: ctx.project.name, Key: "Base Private Range", Value: ctx.project.basePrivateRange ?? "", Notes: "" }, { Section: "Requirements", Scope: "Project", Name: ctx.project.name, Key: "Planning For", Value: ctx.requirements.planningFor ?? "", Notes: "" }, { Section: "Requirements", Scope: "Project", Name: ctx.project.name, Key: "Project Phase", Value: ctx.requirements.projectPhase ?? "", Notes: "" }, { Section: "Requirements", Scope: "Project", Name: ctx.project.name, Key: "Primary Goal", Value: ctx.requirements.primaryGoal ?? "", Notes: "" }, { Section: "Requirements", Scope: "Project", Name: ctx.project.name, Key: "Compliance Profile", Value: ctx.requirements.complianceProfile ?? "", Notes: "" });
    for (const site of ctx.project.sites) {
        rows.push({ Section: "Sites", Scope: "Site", Name: site.name, Key: "Address Block", Value: site.defaultAddressBlock ?? "", Notes: site.location ?? "" });
        for (const vlan of site.vlans) {
            rows.push({
                Section: "Addressing",
                Scope: site.name,
                Name: `VLAN ${vlan.vlanId} ${vlan.vlanName}`,
                Key: "Subnet",
                Value: vlan.subnetCidr,
                Notes: `Gateway ${vlan.gatewayIp} | DHCP ${vlan.dhcpEnabled ? "Yes" : "No"} | Hosts ${vlan.estimatedHosts ?? ""}`,
            });
        }
    }
    for (const zone of ctx.securityZones) {
        rows.push({ Section: "Security", Scope: "Project", Name: zone, Key: "Zone", Value: zone, Notes: "Generated from current requirements scope" });
    }
    for (const item of ctx.project.validations) {
        rows.push({ Section: "Validation", Scope: item.entityType, Name: item.title, Key: item.severity, Value: item.message, Notes: item.ruleCode });
    }
    for (const item of ctx.bomLines) {
        rows.push({ Section: "Platform/BOM", Scope: "Project", Name: ctx.project.name, Key: "Foundation", Value: item, Notes: "Review before procurement" });
    }
    for (const item of ctx.discoveryHighlights) {
        rows.push({ Section: "Discovery", Scope: "Project", Name: ctx.project.name, Key: "Highlight", Value: item, Notes: "Current-state input" });
    }
    return rows;
}
