import { env } from "../config/env.js";
function inferEnvironment(prompt) {
    const text = prompt.toLowerCase();
    if (text.includes("clinic") || text.includes("medical") || text.includes("health"))
        return "clinic";
    if (text.includes("school") || text.includes("lab") || text.includes("campus"))
        return "school";
    if (text.includes("retail") || text.includes("store"))
        return "retail";
    if (text.includes("office") || text.includes("hq") || text.includes("branch"))
        return "office";
    return "custom";
}
function titleCase(value) {
    return value
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
function inferredProjectName(prompt, environmentType) {
    const quoted = prompt.match(/"([^"]+)"/);
    if (quoted?.[1])
        return quoted[1];
    const firstWords = titleCase(prompt.replace(/[^a-z0-9\s]/gi, " ").trim().split(/\s+/).slice(0, 4).join(" "));
    if (firstWords.length >= 6)
        return `${firstWords} Network Plan`;
    return `${titleCase(environmentType)} Network Plan`;
}
function extractCount(prompt, pattern, fallback) {
    const match = prompt.match(pattern);
    if (!match)
        return fallback;
    const value = Number(match[1]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}
function nextSiteOctet(index) {
    return 10 + index * 10;
}
function recommendedPrefix(hosts) {
    const safeHosts = Math.max(2, hosts + Math.max(5, Math.ceil(hosts * 0.2)));
    for (let prefix = 30; prefix >= 16; prefix -= 1) {
        const usable = Math.pow(2, 32 - prefix) - 2;
        if (usable >= safeHosts)
            return prefix;
    }
    return 24;
}
function defaultCategoryHosts(category, siteKind) {
    const table = {
        admin: { hq: 60, branch: 20 },
        guest: { hq: 75, branch: 30 },
        voice: { hq: 40, branch: 15 },
        servers: { hq: 20, branch: 8 },
        management: { hq: 10, branch: 6 },
        clinical: { hq: 80, branch: 30 },
        printers: { hq: 15, branch: 6 },
    };
    const entry = table[category] ?? { hq: 24, branch: 12 };
    return siteKind === "hq" ? entry.hq : entry.branch;
}
function subnetFor(siteOctet, vlanId, hosts) {
    const prefix = recommendedPrefix(hosts);
    return {
        subnetCidr: `10.${siteOctet}.${vlanId}.0/${prefix}`,
        gatewayIp: `10.${siteOctet}.${vlanId}.1`,
        prefix,
    };
}
function categoriesFromPrompt(prompt, environmentType) {
    const text = prompt.toLowerCase();
    const categories = ["admin"];
    if (text.includes("guest"))
        categories.push("guest");
    if (text.includes("voice") || text.includes("phone"))
        categories.push("voice");
    if (text.includes("server"))
        categories.push("servers");
    if (text.includes("management") || text.includes("mgmt"))
        categories.push("management");
    if (text.includes("printer"))
        categories.push("printers");
    if (environmentType === "clinic" || text.includes("clinical") || text.includes("medical"))
        categories.push("clinical");
    return Array.from(new Set(categories));
}
function siteNamesFromPrompt(prompt) {
    const text = prompt.toLowerCase();
    const sites = [];
    if (text.includes("hq") || text.includes("headquarters") || text.includes("head office")) {
        sites.push({ name: "HQ", kind: "hq" });
    }
    const branchCount = extractCount(prompt, /(\d+)\s+branches?/i, 0);
    const clinicCount = extractCount(prompt, /(\d+)\s+clinics?/i, 0);
    if (sites.length === 0) {
        sites.push({ name: "Main Site", kind: "hq" });
    }
    if (branchCount > 0) {
        for (let index = 1; index <= branchCount; index += 1) {
            sites.push({ name: `Branch ${index}`, kind: "branch" });
        }
    }
    else if (clinicCount > 1) {
        for (let index = 1; index <= clinicCount; index += 1) {
            sites.push({ name: `Clinic ${index}`, kind: index === 1 ? "hq" : "branch" });
        }
    }
    else if (text.includes("branch") && branchCount === 0) {
        sites.push({ name: "Branch 1", kind: "branch" });
    }
    return sites;
}
function localPlanDraft(prompt) {
    const environmentType = inferEnvironment(prompt);
    const siteDefs = siteNamesFromPrompt(prompt);
    const categories = categoriesFromPrompt(prompt, environmentType);
    const sites = siteDefs.map((site, index) => {
        const siteOctet = nextSiteOctet(index);
        return {
            name: site.name,
            siteCode: site.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6),
            location: site.kind === "hq" ? "Primary location" : "Branch location",
            defaultAddressBlock: `10.${siteOctet}.0.0/16`,
            notes: site.kind === "hq" ? "Primary site generated from prompt" : "Remote site generated from prompt",
        };
    });
    const categoryMap = [
        { key: "admin", vlanId: 10, name: "ADMIN", purpose: "Administrative workstations", department: "Administration" },
        { key: "clinical", vlanId: 20, name: "CLINICAL", purpose: "Clinical or business-critical user devices", department: "Operations" },
        { key: "guest", vlanId: 30, name: "GUEST", purpose: "Guest wireless and internet-only access" },
        { key: "voice", vlanId: 40, name: "VOICE", purpose: "Voice endpoints and IP phones" },
        { key: "servers", vlanId: 50, name: "SERVERS", purpose: "Servers and shared application services" },
        { key: "printers", vlanId: 70, name: "PRINTERS", purpose: "Network printers and print devices" },
        { key: "management", vlanId: 90, name: "MANAGEMENT", purpose: "Management interfaces and admin-only access" },
    ];
    const vlans = [];
    sites.forEach((site, siteIndex) => {
        const siteKind = siteIndex === 0 ? "hq" : "branch";
        const siteOctet = nextSiteOctet(siteIndex);
        categoryMap
            .filter((entry) => categories.includes(entry.key))
            .forEach((entry) => {
            const hosts = defaultCategoryHosts(entry.key, siteKind);
            const subnet = subnetFor(siteOctet, entry.vlanId, hosts);
            vlans.push({
                siteName: site.name,
                vlanId: entry.vlanId,
                vlanName: entry.name,
                purpose: entry.purpose,
                subnetCidr: subnet.subnetCidr,
                gatewayIp: subnet.gatewayIp,
                dhcpEnabled: entry.key !== "servers" && entry.key !== "management",
                estimatedHosts: hosts,
                department: entry.department,
                notes: `Generated from prompt for ${site.name}`,
            });
        });
    });
    const basePrivateRange = sites[0]?.defaultAddressBlock ?? "10.10.0.0/16";
    const rationale = [
        `Detected an ${environmentType} environment from the prompt and generated a project draft around that operating model.`,
        `Created ${sites.length} site${sites.length === 1 ? "" : "s"} and separated core traffic types into dedicated VLANs for easier segmentation.`,
        `Subnet sizes were chosen with reserve headroom so the first draft is safer than sizing each VLAN to the bare minimum.`,
    ];
    const hqCount = siteDefs.filter((site) => site.kind === "hq").length;
    const branchCount = siteDefs.filter((site) => site.kind === "branch").length;
    const assumptions = [
        `Assumed ${hqCount} HQ site${hqCount === 1 ? "" : "s"} and ${branchCount} branch site${branchCount === 1 ? "" : "s"} unless the prompt suggested otherwise.`,
        `Assumed guest, user, and infrastructure traffic should be separated where that fit the prompt.`,
        `Assumed the first draft should favor safer subnet headroom over exact minimum host sizing.`,
    ];
    const reviewChecklist = [
        "Confirm that each site name and address block matches your intended real-world locations.",
        "Verify that the suggested VLANs match your policy for guest, voice, server, management, and user traffic.",
        "Review the proposed gateways and subnet sizes before saving or exporting the project.",
    ];
    return {
        project: {
            name: inferredProjectName(prompt, environmentType),
            description: `AI-generated first draft based on: ${prompt}`,
            environmentType,
            basePrivateRange,
            organizationName: environmentType === "custom" ? undefined : titleCase(environmentType),
        },
        sites,
        vlans,
        rationale,
        assumptions,
        reviewChecklist,
        provider: "local",
    };
}
async function tryOpenAIPlanDraft(prompt) {
    if (env.aiProvider !== "openai" || !env.openAiApiKey)
        return null;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.openAiApiKey}`,
        },
        body: JSON.stringify({
            model: env.openAiModel,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: "You are a network planning assistant. Return strict JSON with keys project, sites, vlans, rationale, assumptions, reviewChecklist. Project includes name, description, organizationName, environmentType, basePrivateRange. Sites is an array of objects with name, location, siteCode, defaultAddressBlock, notes. Vlans is an array of objects with siteName, vlanId, vlanName, purpose, subnetCidr, gatewayIp, dhcpEnabled, estimatedHosts, department, notes. Rationale is an array of short strings. Assumptions is an array of short strings about what the draft assumed. ReviewChecklist is an array of short strings telling the user what to verify before saving.",
                },
                { role: "user", content: prompt },
            ],
        }),
    });
    if (!response.ok)
        return null;
    const payload = (await response.json());
    const content = payload.choices?.[0]?.message?.content;
    if (!content)
        return null;
    try {
        const parsed = JSON.parse(content);
        return {
            project: parsed.project || localPlanDraft(prompt).project,
            sites: parsed.sites || [],
            vlans: parsed.vlans || [],
            rationale: parsed.rationale || ["AI generated a first draft based on the provided prompt."],
            assumptions: parsed.assumptions || ["Review the generated draft carefully before saving."],
            reviewChecklist: parsed.reviewChecklist || ["Confirm the project details, sites, VLANs, and gateways before applying the draft."],
            provider: "openai",
        };
    }
    catch {
        return null;
    }
}
export async function generatePlanDraft(prompt) {
    const openAiDraft = await tryOpenAIPlanDraft(prompt);
    if (openAiDraft)
        return openAiDraft;
    return localPlanDraft(prompt);
}
function localValidationExplanation(input) {
    const lower = `${input.title} ${input.message}`.toLowerCase();
    let explanation = "This finding means the current network plan contains something that should be reviewed before implementation.";
    let whyItMatters = "Unchecked planning issues can turn into routing, DHCP, security, or documentation problems later.";
    let suggestedFixes = ["Review the affected object and confirm the intent.", "Adjust the design before exporting or implementing it."];
    if (lower.includes("overlap")) {
        explanation = "Two subnets are covering some of the same address space, so the plan is ambiguous about where traffic should belong.";
        whyItMatters = "Overlapping subnets cause routing confusion, broken DHCP expectations, and hard-to-troubleshoot connectivity issues.";
        suggestedFixes = ["Move one VLAN to a different subnet range.", "Check the site address block so each VLAN gets a unique subnet.", "Run validation again after updating the subnet plan."];
    }
    else if (lower.includes("gateway") && lower.includes("not inside")) {
        explanation = "The configured gateway address is outside the VLAN subnet, so devices on that VLAN would not have a valid local default gateway.";
        whyItMatters = "Hosts expect the gateway to live inside their local subnet. If it does not, traffic will fail even if the rest of the design looks correct.";
        suggestedFixes = ["Choose a gateway IP that belongs to the subnet.", "Use a standard gateway choice such as .1 or .254 if that fits your convention."];
    }
    else if (lower.includes("network address") || lower.includes("broadcast")) {
        explanation = "The current gateway is using a reserved address instead of a usable host address.";
        whyItMatters = "Network and broadcast addresses are not assignable to normal interfaces, so the gateway choice is invalid.";
        suggestedFixes = ["Pick the first or last usable host address in the subnet.", "Re-run validation after changing the gateway."];
    }
    else if (lower.includes("host") && (lower.includes("too large") || lower.includes("capacity") || lower.includes("small"))) {
        explanation = "The host estimate is larger than what the current subnet can safely support with reasonable headroom.";
        whyItMatters = "Undersized subnets create future exhaustion, forced renumbering, and unnecessary redesign work.";
        suggestedFixes = ["Increase the subnet size.", "Split devices into separate VLANs if they should not all live together.", "Keep extra headroom for growth, not just today’s count."];
    }
    else if (lower.includes("oversized") || lower.includes("right-size")) {
        explanation = "The current subnet is larger than the estimated need, so the plan may be wasting address space.";
        whyItMatters = "Over-allocation makes future address planning less efficient and can hide the true shape of the design.";
        suggestedFixes = ["Consider shrinking the prefix if growth does not justify the current size.", "Reserve the larger block only if you have a documented expansion plan."];
    }
    return {
        explanation,
        whyItMatters,
        suggestedFixes,
        provider: "local",
    };
}
async function tryOpenAIValidationExplanation(input) {
    if (env.aiProvider !== "openai" || !env.openAiApiKey)
        return null;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.openAiApiKey}`,
        },
        body: JSON.stringify({
            model: env.openAiModel,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: "You explain network validation findings. Return strict JSON with keys explanation, whyItMatters, suggestedFixes. suggestedFixes must be an array of short strings.",
                },
                { role: "user", content: JSON.stringify(input) },
            ],
        }),
    });
    if (!response.ok)
        return null;
    const payload = (await response.json());
    const content = payload.choices?.[0]?.message?.content;
    if (!content)
        return null;
    try {
        const parsed = JSON.parse(content);
        return { ...parsed, provider: "openai" };
    }
    catch {
        return null;
    }
}
export async function explainValidationFinding(input) {
    const openAiExplanation = await tryOpenAIValidationExplanation(input);
    if (openAiExplanation)
        return openAiExplanation;
    return localValidationExplanation(input);
}
