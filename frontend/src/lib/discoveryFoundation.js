const storageKey = (projectId) => `subnetops.discovery.${projectId}`;
export const emptyDiscoveryWorkspaceState = () => ({
    topologyText: "",
    inventoryText: "",
    addressingText: "",
    routingText: "",
    securityText: "",
    wirelessText: "",
    gapText: "",
    constraintsText: "",
    notesText: "",
});
export function parseDiscoveryWorkspaceState(raw) {
    if (!raw)
        return emptyDiscoveryWorkspaceState();
    try {
        const parsed = JSON.parse(raw);
        return {
            ...emptyDiscoveryWorkspaceState(),
            ...parsed,
        };
    }
    catch {
        return emptyDiscoveryWorkspaceState();
    }
}
export function resolveDiscoveryWorkspaceState(projectId, project) {
    const fromProject = parseDiscoveryWorkspaceState(project?.discoveryJson);
    if (project?.discoveryJson)
        return fromProject;
    return loadDiscoveryWorkspaceState(projectId);
}
export function loadDiscoveryWorkspaceState(projectId) {
    if (typeof window === "undefined")
        return emptyDiscoveryWorkspaceState();
    try {
        const raw = window.localStorage.getItem(storageKey(projectId));
        return parseDiscoveryWorkspaceState(raw);
    }
    catch {
        return emptyDiscoveryWorkspaceState();
    }
}
export function saveDiscoveryWorkspaceState(projectId, value) {
    if (typeof window === "undefined")
        return;
    const payload = {
        ...value,
        lastSavedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(payload));
}
export function clearDiscoveryWorkspaceState(projectId) {
    if (typeof window === "undefined")
        return;
    window.localStorage.removeItem(storageKey(projectId));
}
function lineItems(text) {
    return text
        .split(/\r?\n/)
        .map((item) => item.replace(/^[-*•\s]+/, "").trim())
        .filter(Boolean);
}
function keywordMatches(text, pattern) {
    const found = new Set();
    for (const match of text.matchAll(pattern)) {
        const value = match[0]?.trim();
        if (value)
            found.add(value.toUpperCase());
    }
    return Array.from(found.values());
}
function estimateDeviceMentions(text) {
    if (!text.trim())
        return 0;
    const lines = lineItems(text);
    const counted = lines.filter((line) => /(switch|router|firewall|ap|access point|controller|server|wan edge|sd-wan|stack|pair|cluster|gateway)/i.test(line));
    return counted.length || lines.length;
}
function detectLifecycleFlags(text) {
    const lines = lineItems(text);
    return lines.filter((line) => /(eol|eos|end of life|end of support|unsupported|legacy|obsolete|aging|outdated)/i.test(line)).slice(0, 8);
}
function deriveCurrentStateHighlights(input) {
    const { project, sites, vlans, state, routingProtocols, securityControls, wirelessSignals, lifecycleFlags } = input;
    const highlights = [];
    const topologyLines = lineItems(state.topologyText);
    const inventoryLines = lineItems(state.inventoryText);
    const addressingLines = lineItems(state.addressingText);
    const gapLines = lineItems(state.gapText);
    if (sites.length > 0) {
        highlights.push(`The working project already defines ${sites.length} site${sites.length === 1 ? "" : "s"}, which can be used as the target-state site set even before deeper discovery is completed.`);
    }
    if (topologyLines.length > 0) {
        highlights.push(`Topology discovery has ${topologyLines.length} captured note${topologyLines.length === 1 ? "" : "s"} describing the current environment, edge, or site relationships.`);
    }
    if (inventoryLines.length > 0) {
        highlights.push(`The current-state inventory includes ${estimateDeviceMentions(state.inventoryText)} device or platform reference${estimateDeviceMentions(state.inventoryText) === 1 ? "" : "s"} that can drive migration planning and refresh scoping.`);
    }
    if (addressingLines.length > 0 || vlans.length > 0) {
        highlights.push(`Addressing discovery is populated, so the design can compare the intended hierarchy against the current VLAN, subnet, and gateway picture instead of starting from a blank slate.`);
    }
    if (routingProtocols.length > 0) {
        highlights.push(`Current routing posture appears to include ${routingProtocols.join(", ")}, which means migration and redistribution planning should account for existing control-plane behavior.`);
    }
    if (securityControls.length > 0) {
        highlights.push(`Existing security controls referenced so far include ${securityControls.join(", ")}, which helps the future-state design avoid ignoring real boundary and enforcement dependencies.`);
    }
    if (wirelessSignals.length > 0) {
        highlights.push(`Wireless discovery is already present, so corporate, guest, and capacity assumptions can be tied to an actual current-state SSID or controller story.`);
    }
    if (lifecycleFlags.length > 0) {
        highlights.push(`Lifecycle risk is already visible in discovery, so the design can separate reuse assumptions from refresh-required components early.`);
    }
    if (gapLines.length > 0) {
        highlights.push(`Gap discovery has ${gapLines.length} explicit pain point${gapLines.length === 1 ? "" : "s"}, giving the design engine concrete problems to solve rather than only generic best practices.`);
    }
    if (project?.description && highlights.length === 0) {
        highlights.push("The project brief exists, but the current-state baseline is still thin. Add discovery inputs before treating the design as migration-ready.");
    }
    return highlights;
}
export function analyzeDiscoveryWorkspaceState(input) {
    const { project, sites, vlans, state } = input;
    const joined = [
        state.topologyText,
        state.inventoryText,
        state.addressingText,
        state.routingText,
        state.securityText,
        state.wirelessText,
        state.gapText,
        state.constraintsText,
        state.notesText,
    ].join("\n");
    const routingProtocols = keywordMatches(joined, /\b(OSPF|BGP|EIGRP|IS-IS|ISIS|STATIC|RIP|MPLS|SD-WAN|VPN)\b/gi)
        .map((value) => value === "ISIS" ? "IS-IS" : value);
    const securityControls = keywordMatches(joined, /\b(FIREWALL|VPN|IDS|IPS|SIEM|SYSLOG|NAC|802\.1X|MAB|MFA|EDR|XDR|ZTNA|WPA3|ACL|MICROSEGMENTATION)\b/gi);
    const wirelessSignals = keywordMatches(joined, /\b(WIFI|WIRELESS|SSID|WPA2|WPA3|802\.1X|CONTROLLER|AP|ACCESS POINT|RF)\b/gi);
    const lifecycleFlags = detectLifecycleFlags(joined);
    const gaps = lineItems(state.gapText).slice(0, 12);
    const constraints = lineItems(state.constraintsText).slice(0, 12);
    const sectionValues = [
        state.topologyText,
        state.inventoryText,
        state.addressingText,
        state.routingText,
        state.securityText,
        state.wirelessText,
        state.gapText,
        state.constraintsText,
        state.notesText,
    ];
    const filledSections = sectionValues.filter((value) => value.trim().length > 0).length;
    const siteMentions = new Set([
        ...sites.map((site) => site.name.toLowerCase()),
        ...sites.map((site) => (site.siteCode || "").toLowerCase()).filter(Boolean),
    ]).size;
    const deviceMentions = estimateDeviceMentions(state.inventoryText);
    const ingestionCoverage = [
        { label: "Topology baseline", complete: state.topologyText.trim().length > 0, note: "Sites, uplinks, WAN edges, and existing topology relationships." },
        { label: "Inventory and lifecycle", complete: state.inventoryText.trim().length > 0, note: "Devices, OS versions, platform classes, EoL/EoS, and refresh notes." },
        { label: "Addressing and VLAN baseline", complete: state.addressingText.trim().length > 0 || vlans.length > 0, note: "Current subnets, gateways, DHCP, and VLANs that the migration must respect." },
        { label: "Routing and transport baseline", complete: state.routingText.trim().length > 0, note: "Current protocols, edge circuits, redistribution, VPN, SD-WAN, or provider design." },
        { label: "Security baseline", complete: state.securityText.trim().length > 0, note: "Current firewalling, identity controls, logging, remote access, and trust boundaries." },
        { label: "Gaps and pain points", complete: state.gapText.trim().length > 0, note: "What is broken, risky, undersized, or operationally painful today." },
        { label: "Constraints and dependencies", complete: state.constraintsText.trim().length > 0, note: "Maintenance windows, contracts, provider dependencies, compliance, and delivery limits." },
    ];
    const currentStateHighlights = deriveCurrentStateHighlights({
        project,
        sites,
        vlans,
        state,
        routingProtocols,
        securityControls,
        wirelessSignals,
        lifecycleFlags,
    });
    const inferredRisks = [];
    if (filledSections < 3)
        inferredRisks.push("Discovery coverage is still shallow, so future design outputs may reflect assumptions more than observed current-state facts.");
    if (state.addressingText.trim().length === 0 && vlans.length === 0)
        inferredRisks.push("No clear current-state addressing baseline exists yet, which makes overlap analysis and migration planning less reliable.");
    if (routingProtocols.length === 0 && state.routingText.trim().length > 0)
        inferredRisks.push("Routing notes are present but protocol intent is still unclear, which can hide redistribution or summarization risk.");
    if (securityControls.length === 0 && state.securityText.trim().length > 0)
        inferredRisks.push("Security notes exist but named controls are still vague, so trust-boundary and policy assumptions may be under-modeled.");
    if (lifecycleFlags.length > 0)
        inferredRisks.push("Legacy or end-of-support signals are present in the current-state inventory, so implementation planning should separate refresh from migration work.");
    if (gaps.length === 0)
        inferredRisks.push("No explicit pain points were captured, which makes it harder to prove that the new design solves the right problems.");
    const suggestedNextInputs = [];
    if (state.topologyText.trim().length === 0)
        suggestedNextInputs.push("Paste the current topology story: sites, WAN type, internet edge, cloud edge, and any critical inter-site paths.");
    if (state.inventoryText.trim().length === 0)
        suggestedNextInputs.push("Paste a simple current inventory list with device role, platform, software version, and any EoL/EoS notes.");
    if (state.addressingText.trim().length === 0 && vlans.length === 0)
        suggestedNextInputs.push("Paste the current subnet/VLAN/gateway baseline so SubnetOps can compare existing addressing to the target design.");
    if (state.routingText.trim().length === 0)
        suggestedNextInputs.push("Capture the current routing and transport posture: OSPF/BGP/static, MPLS/SD-WAN/VPN, default-route behavior, and edge dependencies.");
    if (state.securityText.trim().length === 0)
        suggestedNextInputs.push("Capture the current security posture: firewalling, NAC/802.1X, VPN, IDS/IPS, logging, and remote-access controls.");
    if (state.gapText.trim().length === 0)
        suggestedNextInputs.push("List the current pain points: overlap, outages, flat VLANs, weak guest isolation, aging gear, or cloud reachability issues.");
    let migrationComplexity = "Low";
    const complexityScore = [routingProtocols.length >= 2, securityControls.length >= 3, sites.length > 1, lifecycleFlags.length > 0, gaps.length >= 4, constraints.length >= 3].filter(Boolean).length;
    if (complexityScore >= 4)
        migrationComplexity = "High";
    else if (complexityScore >= 2)
        migrationComplexity = "Moderate";
    return {
        hasData: filledSections > 0,
        filledSections,
        siteMentions,
        deviceMentions,
        routingProtocols,
        securityControls,
        wirelessSignals,
        lifecycleFlags,
        currentStateHighlights,
        gaps,
        constraints,
        ingestionCoverage,
        inferredRisks,
        suggestedNextInputs,
        migrationComplexity,
    };
}
