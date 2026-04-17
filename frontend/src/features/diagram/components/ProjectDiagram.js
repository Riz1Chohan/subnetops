import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { synthesizeLogicalDesign } from "../../../lib/designSynthesis";
import { parseRequirementsProfile } from "../../../lib/requirementsProfile";
function siteIdsWithBoundaries(synthesized) {
    return new Set(synthesized.securityBoundaries
        .map((boundary) => synthesized.siteHierarchy.find((site) => site.name === boundary.siteName)?.id)
        .filter((siteId) => Boolean(siteId)));
}
function siteIdsWithWanLinks(synthesized) {
    return new Set(synthesized.wanLinks.flatMap((link) => [link.endpointASiteId, link.endpointBSiteId]).filter((siteId) => Boolean(siteId)));
}
function siteIdsWithCloudOrInternetEdges(synthesized) {
    return new Set(synthesized.sitePlacements
        .filter((placement) => placement.deviceType === "cloud-edge" || placement.role.toLowerCase().includes("internet") || placement.role.toLowerCase().includes("wan"))
        .map((placement) => placement.siteId));
}
function flowsForDiagramScope(flows, scope, focusedSiteName) {
    if (scope === "site" && focusedSiteName) {
        return flows.filter((flow) => flow.sourceSite === focusedSiteName || flow.destinationSite === focusedSiteName || flow.path.some((step) => step.includes(focusedSiteName)));
    }
    if (scope === "wan-cloud") {
        return flows.filter((flow) => flow.flowCategory === "site-centralized-service" || flow.flowCategory === "site-cloud-service" || flow.path.length > 2 || flow.path.some((step) => /cloud|internet|vpn|wan/i.test(step)));
    }
    if (scope === "boundaries") {
        return flows.filter((flow) => flow.sourceZone !== flow.destinationZone || flow.controlPoints.length > 0 || /dmz|management|guest/i.test(`${flow.sourceZone} ${flow.destinationZone}`));
    }
    return flows;
}
function sitesForDiagramScope(sites, synthesized, scope, focusedSiteId) {
    if (scope === "site" && focusedSiteId) {
        const focused = sites.find((site) => site.id === focusedSiteId);
        return focused ? [focused] : sites.slice(0, 1);
    }
    if (scope === "wan-cloud") {
        const wanIds = siteIdsWithWanLinks(synthesized);
        const edgeIds = siteIdsWithCloudOrInternetEdges(synthesized);
        const primary = synthesized.siteHierarchy.find((site) => site.name === synthesized.topology.primarySiteName)?.id;
        const relevantIds = new Set([...(primary ? [primary] : []), ...wanIds, ...edgeIds]);
        const scoped = sites.filter((site) => relevantIds.has(site.id));
        return scoped.length > 0 ? scoped : sites;
    }
    if (scope === "boundaries") {
        const boundaryIds = siteIdsWithBoundaries(synthesized);
        const scoped = sites.filter((site) => boundaryIds.has(site.id) || synthesized.servicePlacements.some((placement) => placement.siteId === site.id && placement.placementType === "dmz"));
        return scoped.length > 0 ? scoped : sites;
    }
    return sites;
}
function diagramScopeMeta(scope, synthesized, focusedSite) {
    if (scope === "site") {
        return {
            title: focusedSite ? `Detailed site topology — ${focusedSite.name}` : "Detailed site topology",
            detail: focusedSite
                ? `This scope keeps the diagram on one site so the edge, switching, boundary, and local service relationships can be reviewed without the rest of the multi-site estate competing for space.`
                : "This scope narrows the diagram to one site so local topology review becomes easier.",
        };
    }
    if (scope === "wan-cloud") {
        return {
            title: "WAN / cloud view",
            detail: `This scope keeps the review on inter-site, internet, and cloud-connected paths so the WAN edge, breakout posture, and centralized-service movement stay visible.`
        };
    }
    if (scope === "boundaries") {
        return {
            title: "Security boundary view",
            detail: `This scope emphasizes the sites carrying concrete boundary objects so trust boundaries, control points, DMZ placement, and cross-zone flows are easier to inspect.`
        };
    }
    return {
        title: "Global multi-site topology",
        detail: `This scope keeps the full multi-site design visible so the overall architecture, topology type, site roles, and major placement decisions can be reviewed together.`
    };
}
function getSvgElement(svgId) {
    return document.getElementById(svgId);
}
function exportSvg(svgId, filename) {
    const svg = getSvgElement(svgId);
    if (!svg)
        return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
async function exportPng(svgId, filename) {
    const svg = getSvgElement(svgId);
    if (!svg)
        return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    await new Promise((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not render SVG as image."));
        image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = image.width || 1800;
    canvas.height = image.height || 1200;
    const context = canvas.getContext("2d");
    if (!context) {
        URL.revokeObjectURL(url);
        return;
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
function openTaskCount(comments, targetType, targetId) {
    return comments.filter((comment) => comment.taskStatus !== "DONE" && comment.targetType === targetType && comment.targetId === targetId).length;
}
function roleTone(kind) {
    switch (kind) {
        case "firewall": return { fill: "#ebf3ff", stroke: "#73a1ef", text: "#144aab" };
        case "router": return { fill: "#ffffff", stroke: "#8cb0ef", text: "#183866" };
        case "core-switch":
        case "distribution-switch":
        case "access-switch": return { fill: "#ffffff", stroke: "#8eb7f7", text: "#183866" };
        case "wireless-controller":
        case "access-point": return { fill: "#f3fff8", stroke: "#8fdab3", text: "#1d7f4c" };
        case "server": return { fill: "#f6f0ff", stroke: "#c9abff", text: "#5a34a3" };
        case "cloud-edge":
        case "cloud": return { fill: "#f4efff", stroke: "#c7b0ff", text: "#5a34a3" };
        case "internet": return { fill: "#eef5ff", stroke: "#bad1f5", text: "#234878" };
        default: return { fill: "#ffffff", stroke: "#ccd7eb", text: "#183866" };
    }
}
function deviceLabel(kind) {
    switch (kind) {
        case "firewall": return "Firewall";
        case "router": return "Router";
        case "core-switch": return "Core Switch";
        case "distribution-switch": return "Distribution";
        case "access-switch": return "Access Switch";
        case "wireless-controller": return "WLC";
        case "access-point": return "AP";
        case "server": return "Server";
        case "cloud-edge": return "Cloud Edge";
        case "cloud": return "Cloud";
        case "internet": return "Internet";
        default: return kind;
    }
}
function linkStyle(type) {
    switch (type) {
        case "internet": return { stroke: "#7ca5eb", dash: "8 6", width: 2.5 };
        case "trunk": return { stroke: "#9a7cff", dash: "2 0", width: 3.5 };
        case "vpn": return { stroke: "#1d7f4c", dash: "10 5", width: 3 };
        case "ha": return { stroke: "#ff9b5d", dash: "6 5", width: 2.5 };
        case "flow": return { stroke: "#ff7a59", dash: "0", width: 3.5 };
        default: return { stroke: "#85a7e6", dash: "0", width: 2.6 };
    }
}
function DeviceIcon({ x, y, kind, label, sublabel, showSublabel = true }) {
    const tone = roleTone(kind);
    const bodyX = x;
    const bodyY = y;
    const renderedSublabel = showSublabel ? sublabel : undefined;
    if (kind === "internet" || kind === "cloud" || kind === "cloud-edge") {
        return (_jsxs("g", { children: [_jsx("ellipse", { cx: bodyX + 34, cy: bodyY + 28, rx: 28, ry: 18, fill: tone.fill, stroke: tone.stroke, strokeWidth: "2" }), _jsx("ellipse", { cx: bodyX + 62, cy: bodyY + 18, rx: 30, ry: 20, fill: tone.fill, stroke: tone.stroke, strokeWidth: "2" }), _jsx("ellipse", { cx: bodyX + 88, cy: bodyY + 30, rx: 22, ry: 15, fill: tone.fill, stroke: tone.stroke, strokeWidth: "2" }), _jsx("rect", { x: bodyX + 20, y: bodyY + 24, width: 78, height: 22, rx: 11, fill: tone.fill, stroke: tone.stroke, strokeWidth: "2" }), _jsx("path", { d: `M ${bodyX + 26} ${bodyY + 36} Q ${bodyX + 60} ${bodyY + 4} ${bodyX + 94} ${bodyY + 36}`, fill: "none", stroke: tone.stroke, strokeWidth: "1.4", opacity: "0.45" }), _jsx("text", { x: bodyX + 60, y: bodyY + 74, textAnchor: "middle", fontSize: "12", fontWeight: "700", fill: tone.text, children: label }), renderedSublabel ? _jsx("text", { x: bodyX + 60, y: bodyY + 89, textAnchor: "middle", fontSize: "10.5", fill: "#657892", children: renderedSublabel }) : null] }));
    }
    if (kind === "router") {
        return (_jsxs("g", { children: [_jsx("ellipse", { cx: bodyX + 54, cy: bodyY + 18, rx: 38, ry: 12, fill: tone.fill, stroke: tone.stroke, strokeWidth: "2.4" }), _jsx("path", { d: `M ${bodyX + 16} ${bodyY + 18} L ${bodyX + 16} ${bodyY + 42} Q ${bodyX + 54} ${bodyY + 58} ${bodyX + 92} ${bodyY + 42} L ${bodyX + 92} ${bodyY + 18}`, fill: tone.fill, stroke: tone.stroke, strokeWidth: "2.4" }), _jsx("ellipse", { cx: bodyX + 54, cy: bodyY + 42, rx: 38, ry: 12, fill: "#f9fcff", stroke: tone.stroke, strokeWidth: "2.2" }), _jsx("path", { d: `M ${bodyX + 37} ${bodyY + 29} L ${bodyX + 54} ${bodyY + 19} L ${bodyX + 54} ${bodyY + 25} L ${bodyX + 69} ${bodyY + 16} L ${bodyX + 57} ${bodyY + 30} L ${bodyX + 69} ${bodyY + 42} L ${bodyX + 54} ${bodyY + 35} L ${bodyX + 54} ${bodyY + 41} L ${bodyX + 37} ${bodyY + 29} Z`, fill: tone.stroke, opacity: "0.78" }), _jsx("circle", { cx: bodyX + 26, cy: bodyY + 42, r: 2.1, fill: tone.stroke, opacity: "0.78" }), _jsx("circle", { cx: bodyX + 82, cy: bodyY + 42, r: 2.1, fill: tone.stroke, opacity: "0.78" }), _jsx("line", { x1: bodyX + 24, y1: bodyY + 51, x2: bodyX + 84, y2: bodyY + 51, stroke: tone.stroke, strokeOpacity: "0.28", strokeWidth: "1.5" }), _jsx("text", { x: bodyX + 54, y: bodyY + 72, textAnchor: "middle", fontSize: "12", fontWeight: "700", fill: "#183866", children: label }), renderedSublabel ? _jsx("text", { x: bodyX + 54, y: bodyY + 87, textAnchor: "middle", fontSize: "10.5", fill: "#657892", children: renderedSublabel }) : null] }));
    }
    if (kind === "firewall") {
        return (_jsxs("g", { children: [_jsx("path", { d: `M ${bodyX + 16} ${bodyY + 4} L ${bodyX + 104} ${bodyY + 4} L ${bodyX + 118} ${bodyY + 18} L ${bodyX + 118} ${bodyY + 56} L ${bodyX} ${bodyY + 56} L ${bodyX} ${bodyY + 18} Z`, fill: tone.fill, stroke: tone.stroke, strokeWidth: "2.4" }), _jsx("path", { d: `M ${bodyX + 52} ${bodyY + 18} L ${bodyX + 66} ${bodyY + 18} L ${bodyX + 66} ${bodyY + 31} L ${bodyX + 78} ${bodyY + 31} L ${bodyX + 78} ${bodyY + 43} L ${bodyX + 66} ${bodyY + 43} L ${bodyX + 66} ${bodyY + 56} L ${bodyX + 52} ${bodyY + 56} L ${bodyX + 52} ${bodyY + 43} L ${bodyX + 40} ${bodyY + 43} L ${bodyX + 40} ${bodyY + 31} L ${bodyX + 52} ${bodyY + 31} Z`, fill: tone.stroke, opacity: "0.16" }), Array.from({ length: 6 }).map((_, index) => (_jsx("rect", { x: bodyX + 14 + index * 16, y: bodyY + 14, width: "12", height: "7", rx: "2", fill: tone.stroke, opacity: 0.28 - index * 0.02 }, index))), Array.from({ length: 5 }).map((_, index) => (_jsx("rect", { x: bodyX + 24 + index * 16, y: bodyY + 44, width: "12", height: "7", rx: "2", fill: tone.stroke, opacity: 0.2 - index * 0.02 }, `lower-${index}`))), _jsx("line", { x1: bodyX + 18, y1: bodyY + 28, x2: bodyX + 100, y2: bodyY + 28, stroke: tone.stroke, strokeOpacity: "0.24", strokeWidth: "1.8" }), _jsx("circle", { cx: bodyX + 102, cy: bodyY + 12, r: "3.2", fill: "#ff8b6b", opacity: "0.85" }), _jsx("circle", { cx: bodyX + 92, cy: bodyY + 12, r: "3.2", fill: "#ffd166", opacity: "0.75" }), _jsx("text", { x: bodyX + 59, y: bodyY + 76, textAnchor: "middle", fontSize: "12", fontWeight: "700", fill: "#183866", children: label }), renderedSublabel ? _jsx("text", { x: bodyX + 59, y: bodyY + 91, textAnchor: "middle", fontSize: "10.5", fill: "#657892", children: renderedSublabel }) : null] }));
    }
    if (kind === "access-point" || kind === "wireless-controller") {
        return (_jsxs("g", { children: [_jsx("ellipse", { cx: bodyX + 27, cy: bodyY + 24, rx: "20", ry: "11", fill: tone.fill, stroke: tone.stroke, strokeWidth: "2.2" }), _jsx("rect", { x: bodyX + 13, y: bodyY + 12, width: "28", height: "4", rx: "2", fill: tone.stroke, opacity: "0.18" }), _jsx("circle", { cx: bodyX + 27, cy: bodyY + 24, r: 3.5, fill: tone.text }), _jsx("path", { d: `M ${bodyX + 9} ${bodyY + 16} Q ${bodyX + 27} ${bodyY - 1} ${bodyX + 45} ${bodyY + 16}`, fill: "none", stroke: tone.stroke, strokeWidth: "2" }), _jsx("path", { d: `M ${bodyX + 13} ${bodyY + 21} Q ${bodyX + 27} ${bodyY + 8} ${bodyX + 41} ${bodyY + 21}`, fill: "none", stroke: tone.stroke, strokeWidth: "2", opacity: "0.9" }), _jsx("path", { d: `M ${bodyX + 18} ${bodyY + 27} Q ${bodyX + 27} ${bodyY + 18} ${bodyX + 36} ${bodyY + 27}`, fill: "none", stroke: tone.stroke, strokeWidth: "1.8", opacity: "0.8" }), _jsx("rect", { x: bodyX + 16, y: bodyY + 40, width: "22", height: "4", rx: "2", fill: tone.stroke, opacity: "0.32" }), _jsx("text", { x: bodyX + 27, y: bodyY + 60, textAnchor: "middle", fontSize: "12", fontWeight: "700", fill: "#183866", children: label }), renderedSublabel ? _jsx("text", { x: bodyX + 27, y: bodyY + 75, textAnchor: "middle", fontSize: "10.5", fill: "#657892", children: renderedSublabel }) : null] }));
    }
    if (kind === "server") {
        return (_jsxs("g", { children: [_jsx("rect", { x: bodyX + 4, y: bodyY, width: "70", height: "56", rx: "8", fill: tone.fill, stroke: tone.stroke, strokeWidth: "2.1" }), _jsx("rect", { x: bodyX + 10, y: bodyY + 8, width: "58", height: "10", rx: "4", fill: "#ffffff", stroke: tone.stroke, strokeOpacity: "0.25" }), Array.from({ length: 3 }).map((_, index) => (_jsxs("g", { children: [_jsx("rect", { x: bodyX + 12, y: bodyY + 24 + index * 9, width: "42", height: "5.5", rx: "2.75", fill: tone.stroke, opacity: 0.24 - index * 0.03 }), _jsx("circle", { cx: bodyX + 60, cy: bodyY + 26.5 + index * 9, r: "1.9", fill: tone.stroke, opacity: "0.7" })] }, index))), _jsx("rect", { x: bodyX + 22, y: bodyY + 59, width: "34", height: "4", rx: "2", fill: tone.stroke, opacity: "0.18" }), _jsx("text", { x: bodyX + 39, y: bodyY + 79, textAnchor: "middle", fontSize: "12", fontWeight: "700", fill: "#183866", children: label }), renderedSublabel ? _jsx("text", { x: bodyX + 39, y: bodyY + 94, textAnchor: "middle", fontSize: "10.5", fill: "#657892", children: renderedSublabel }) : null] }));
    }
    if (kind === "core-switch" || kind === "distribution-switch" || kind === "access-switch") {
        const stackCount = kind === "core-switch" ? 2 : 1;
        const baseY = kind === "core-switch" ? bodyY + 8 : bodyY + 14;
        const width = kind === "access-switch" ? 110 : 122;
        return (_jsxs("g", { children: [Array.from({ length: stackCount }).map((_, stackIndex) => (_jsxs("g", { transform: `translate(${stackIndex * 7}, ${stackIndex * -6})`, children: [_jsx("rect", { x: bodyX, y: baseY, width: width, height: "30", rx: "6", fill: tone.fill, stroke: tone.stroke, strokeWidth: "2.1" }), _jsx("rect", { x: bodyX + 8, y: baseY + 6, width: "16", height: "4", rx: "2", fill: tone.stroke, opacity: "0.34" }), _jsx("rect", { x: bodyX + 8, y: baseY + 18, width: "10", height: "4", rx: "2", fill: tone.stroke, opacity: "0.28" }), Array.from({ length: kind === "access-switch" ? 12 : 14 }).map((_, index) => (_jsx("rect", { x: bodyX + 30 + index * 6.1, y: baseY + 7, width: "4.6", height: "4.6", rx: "1.3", fill: tone.stroke, opacity: 0.95 - index * 0.03 }, index))), Array.from({ length: kind === "access-switch" ? 12 : 14 }).map((_, index) => (_jsx("rect", { x: bodyX + 30 + index * 6.1, y: baseY + 16, width: "4.6", height: "4.6", rx: "1.3", fill: tone.stroke, opacity: 0.78 - index * 0.025 }, `lower-${index}`))), _jsx("rect", { x: bodyX + width - 18, y: baseY + 5, width: "9", height: "16", rx: "3", fill: tone.stroke, opacity: "0.16" })] }, stackIndex))), _jsx("text", { x: bodyX + 61, y: bodyY + 62, textAnchor: "middle", fontSize: "12", fontWeight: "700", fill: "#183866", children: label }), renderedSublabel ? _jsx("text", { x: bodyX + 61, y: bodyY + 77, textAnchor: "middle", fontSize: "10.5", fill: "#657892", children: renderedSublabel }) : null] }));
    }
    return (_jsxs("g", { children: [_jsx("rect", { x: bodyX, y: bodyY, width: "112", height: "42", rx: "10", fill: tone.fill, stroke: tone.stroke, strokeWidth: "2" }), _jsx("text", { x: bodyX + 56, y: bodyY + 24, textAnchor: "middle", fontSize: "12", fontWeight: "700", fill: "#183866", children: label }), renderedSublabel ? _jsx("text", { x: bodyX + 56, y: bodyY + 38, textAnchor: "middle", fontSize: "10.5", fill: "#657892", children: renderedSublabel }) : null] }));
}
function taskBadge(x, y, count) {
    if (count <= 0)
        return null;
    return (_jsxs("g", { children: [_jsx("circle", { cx: x, cy: y, r: "12", fill: "#ff7a59" }), _jsx("text", { x: x, y: y + 4, textAnchor: "middle", fontSize: "11", fill: "white", fontWeight: "700", children: count })] }));
}
function chip(x, y, width, text, tone) {
    const palette = tone === "purple"
        ? { fill: "#f7f1ff", stroke: "#c9abff", text: "#5a34a3" }
        : tone === "green"
            ? { fill: "#f2fff8", stroke: "#96dfb7", text: "#1d7f4c" }
            : tone === "orange"
                ? { fill: "#fff7ef", stroke: "#ffc98e", text: "#8f4b00" }
                : { fill: "#eef5ff", stroke: "#b8cff5", text: "#20427f" };
    return (_jsxs("g", { children: [_jsx("rect", { x: x, y: y, width: width, height: "22", rx: "11", fill: palette.fill, stroke: palette.stroke }), _jsx("text", { x: x + 10, y: y + 15, fontSize: "10.5", fill: palette.text, children: text })] }));
}
function pathLine(points, type, label, secondaryLabel, linkAnnotationMode = "full") {
    const style = linkStyle(type);
    const path = points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
    const labelPoint = points[Math.floor(points.length / 2)];
    const visibleLabel = linkAnnotationMode === "full" ? label : (type === "flow" || type === "internet" || type === "vpn" ? label : undefined);
    const visibleSecondaryLabel = linkAnnotationMode === "full" ? secondaryLabel : undefined;
    const labelWidth = Math.max(116, ((visibleLabel?.length ?? 0) * 6.3) + 24);
    const secondaryWidth = Math.max(104, ((visibleSecondaryLabel?.length ?? 0) * 6.1) + 24);
    return (_jsxs("g", { children: [_jsx("path", { d: path, fill: "none", stroke: style.stroke, strokeWidth: style.width, strokeDasharray: style.dash, strokeLinecap: "round", strokeLinejoin: "round" }), visibleLabel && labelPoint ? (_jsxs("g", { children: [_jsx("rect", { x: labelPoint[0] - labelWidth / 2, y: labelPoint[1] - (visibleSecondaryLabel ? 28 : 18), width: labelWidth, height: 18, rx: "9", fill: "#ffffff", stroke: "#dbe6f7" }), _jsx("text", { x: labelPoint[0], y: labelPoint[1] - (visibleSecondaryLabel ? 15 : 5), textAnchor: "middle", fontSize: "10.5", fill: "#526984", children: visibleLabel }), visibleSecondaryLabel ? (_jsxs("g", { children: [_jsx("rect", { x: labelPoint[0] - secondaryWidth / 2, y: labelPoint[1] - 6, width: secondaryWidth, height: 16, rx: "8", fill: "#f8fbff", stroke: "#dbe6f7" }), _jsx("text", { x: labelPoint[0], y: labelPoint[1] + 5, textAnchor: "middle", fontSize: "9.6", fill: "#6a7d97", children: visibleSecondaryLabel })] })) : null] })) : null] }));
}
function primaryDmzService(synthesized, siteName) {
    return synthesized.servicePlacements.find((service) => service.serviceType === "dmz-service" && (!siteName || service.siteName === siteName));
}
function sitePositionMap(sites, synthesized, cardWidth, startX, gap) {
    const positions = {};
    if (sites.length === 1) {
        positions[sites[0].id] = { x: 560, y: 210 };
        return positions;
    }
    if (synthesized.topology.topologyType === "hub-spoke" && synthesized.topology.primarySiteId) {
        const primary = sites.find((site) => site.id === synthesized.topology.primarySiteId) || sites[0];
        const branches = sites.filter((site) => site.id !== primary.id);
        positions[primary.id] = { x: 560, y: 170 };
        const columns = Math.min(3, Math.max(2, branches.length));
        branches.forEach((site, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;
            positions[site.id] = { x: 120 + col * (cardWidth + 90), y: 580 + row * 400 };
        });
        return positions;
    }
    sites.forEach((site, index) => {
        positions[site.id] = { x: startX + index * (cardWidth + gap), y: 178 };
    });
    return positions;
}
function validationSeverityTone(items) {
    if (items.some((item) => item.severity === "ERROR"))
        return { stroke: "#ef4444", fill: "#fff1f2", label: "Blocker" };
    if (items.some((item) => item.severity === "WARNING"))
        return { stroke: "#f59e0b", fill: "#fff7ed", label: "Warning" };
    return { stroke: "#dce7f8", fill: "#ffffff", label: "Clear" };
}
function siteValidationItems(site, validations) {
    return validations.filter((item) => (item.entityType === "SITE" && item.entityId === site.id) || (item.entityType === "VLAN" && (site.vlans ?? []).some((vlan) => vlan.id === item.entityId)));
}
function normalizeDiagramText(value) {
    return value.toLowerCase().replace(/[^a-z0-9./-]+/g, " ");
}
function relevantSiteSubnets(siteId, synthesized) {
    return synthesized.addressingPlan.filter((row) => row.siteId === siteId).map((row) => row.subnetCidr.toLowerCase());
}
function relevantZoneNames(siteName, synthesized) {
    return synthesized.securityBoundaries.filter((boundary) => boundary.siteName === siteName).map((boundary) => boundary.zoneName.toLowerCase());
}
function deterministicValidationAnchor(item, site, synthesized) {
    const text = normalizeDiagramText(`${item.title} ${item.message}`);
    const subnets = relevantSiteSubnets(site.id, synthesized);
    const zones = relevantZoneNames(site.name, synthesized);
    const matchesSubnet = subnets.some((subnet) => text.includes(subnet.split('/')[0]));
    const mentionsDmz = /\bdmz\b|published|public|internet inbound|reverse proxy|web/.test(text);
    const mentionsMgmt = /management|admin|monitor|snmp|ssh|https access|jump/.test(text);
    const mentionsGuest = /guest|ssid|wireless|ap|wifi/.test(text);
    const mentionsPath = /trunk|uplink|wan|transit|route|path|internet|vpn|link|summary|adjacency/.test(text);
    const mentionsAddressing = /subnet|vlan|gateway|address|dhcp|cidr/.test(text);
    const mentionsEdge = /firewall|edge|nat|outside|inside|dmz interface|internet edge/.test(text);
    if (mentionsDmz || zones.some((zone) => zone.includes('dmz')))
        return 'dmz';
    if (mentionsMgmt)
        return 'management';
    if (mentionsGuest)
        return 'wireless';
    if (mentionsPath)
        return 'path';
    if (mentionsEdge)
        return 'edge';
    if (mentionsAddressing || matchesSubnet)
        return 'switch';
    return 'site';
}
function deviceValidationItems(device, site, validations, synthesized) {
    if (!device)
        return [];
    const roleText = `${device.role} ${device.connectedZones.join(" ")} ${device.connectedSubnets.join(" ")} ${device.interfaceLabels.join(" ")}`.toLowerCase();
    return siteValidationItems(site, validations).filter((item) => {
        const anchor = deterministicValidationAnchor(item, site, synthesized);
        if ((device.deviceType === "firewall" || device.deviceType === "router") && (anchor === 'edge' || anchor === 'dmz' || anchor === 'management' || anchor === 'path'))
            return true;
        if ((device.deviceType === "core-switch" || device.deviceType === "access-switch" || device.deviceType === "distribution-switch") && (anchor === 'switch' || anchor === 'management'))
            return true;
        if (device.deviceType === "server" && anchor === 'dmz')
            return true;
        if ((device.deviceType === "access-point" || device.deviceType === "wireless-controller") && anchor === 'wireless')
            return true;
        const text = normalizeDiagramText(`${item.title} ${item.message}`);
        return text.split(/\W+/).some((token) => token.length > 4 && roleText.includes(token));
    }).slice(0, 2);
}
function interfaceValidationItems(device, site, validations, synthesized) {
    if (!device)
        return [];
    const labels = device.interfaceLabels.map((label) => label.toLowerCase());
    return siteValidationItems(site, validations).filter((item) => {
        const text = normalizeDiagramText(`${item.title} ${item.message}`);
        const anchor = deterministicValidationAnchor(item, site, synthesized);
        return labels.some((label) => label.split(/\W+/).filter((token) => token.length > 2).some((token) => text.includes(token)))
            || ((anchor === 'edge' || anchor === 'management' || anchor === 'dmz') && (device.deviceType === 'firewall' || device.deviceType === 'router'));
    }).slice(0, 2);
}
function linkValidationItems(site, validations, synthesized) {
    return siteValidationItems(site, validations).filter((item) => deterministicValidationAnchor(item, site, synthesized) === 'path').slice(0, 2);
}
function zoneBoundaryRectsForSite(siteName, synthesized) {
    return synthesized.securityBoundaries
        .filter((boundary) => boundary.siteName === siteName)
        .slice(0, 3)
        .map((boundary) => ({
        label: boundary.zoneName,
        subnet: boundary.subnetCidrs[0] || 'TBD',
        anchor: boundary.attachedInterface || boundary.attachedDevice,
    }));
}
function compactInterfaceStack(device, limit = 3) {
    if (!device)
        return [];
    return device.interfaceLabels.slice(0, limit).map((label, index) => `${index + 1}. ${label}`);
}
function boundaryLabelsForSite(siteName, synthesized) {
    return zoneBoundaryRectsForSite(siteName, synthesized)
        .map((boundary) => `${boundary.label} • ${boundary.subnet} • ${boundary.anchor}`);
}
function siteRoleSummary(siteName, synthesized) {
    if (siteName === synthesized.topology.primarySiteName)
        return "Primary site • shared services • policy anchor";
    if (synthesized.topology.topologyType === 'collapsed-core')
        return 'Collapsed-core site • local edge and switching';
    if (synthesized.topology.topologyType === 'hub-spoke')
        return 'Branch site • uplinked to primary hub';
    if (synthesized.topology.topologyType === 'hybrid-cloud')
        return 'Attached site • cloud-aware edge';
    return 'Attached site • routed inter-site design';
}
function dmzBoundaryForSite(siteName, synthesized) {
    return synthesized.securityBoundaries.find((boundary) => boundary.siteName === siteName && /dmz/i.test(boundary.zoneName));
}
function managementBoundaryForSite(siteName, synthesized) {
    return synthesized.securityBoundaries.find((boundary) => boundary.siteName === siteName && /management/i.test(boundary.zoneName));
}
function firstInterfaceLabel(device) {
    return device?.interfaceLabels?.[0];
}
function interfaceSummary(device) {
    return device?.interfaceLabels?.slice(0, 3) ?? [];
}
function overlayTone(mode) {
    switch (mode) {
        case "addressing": return "blue";
        case "security": return "purple";
        case "flows": return "orange";
        case "services": return "purple";
        case "redundancy": return "green";
        default: return "green";
    }
}
function overlayItems(site, synthesized, mode) {
    if (mode === "addressing") {
        return synthesized.addressingPlan
            .filter((row) => row.siteId === site.id)
            .slice(0, 5)
            .map((row) => `${row.segmentName} • ${row.subnetCidr}`);
    }
    if (mode === "security") {
        return synthesized.securityBoundaries
            .filter((boundary) => boundary.siteName === site.name)
            .slice(0, 5)
            .map((boundary) => `${boundary.boundaryName} • via ${boundary.attachedDevice}`);
    }
    if (mode === "flows") {
        return synthesized.trafficFlows
            .filter((flow) => flow.sourceSite === site.name || flow.destinationSite === site.name)
            .slice(0, 4)
            .map((flow) => `${flow.flowLabel} • ${flow.sourceZone} → ${flow.destinationZone}`);
    }
    if (mode === "services") {
        return synthesized.servicePlacements
            .filter((placement) => placement.siteId === site.id || placement.siteName === site.name)
            .slice(0, 5)
            .map((placement) => `${placement.serviceName} • ${placement.placementType} • ${placement.zoneName}`);
    }
    if (mode === "redundancy") {
        const placements = synthesized.sitePlacements.filter((placement) => placement.siteId === site.id);
        const routedLinks = synthesized.wanLinks.filter((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id);
        const firewalls = placements.filter((placement) => placement.deviceType === "firewall");
        const routeDomain = synthesized.designTruthModel.routeDomains.find((route) => route.siteId === site.id || route.siteName === site.name);
        const redundancyItems = [
            `Redundancy posture • ${synthesized.topology.redundancyModel}`,
            ...(routedLinks.length > 0
                ? routedLinks.slice(0, 2).map((link) => `${link.linkName} • ${link.transport}`)
                : [synthesized.topology.topologyType === "collapsed-core" ? "Local-only switching posture" : "Single routed anchor not fully explicit"]),
            firewalls.length > 1 ? `Firewall pair • ${firewalls.length} nodes` : placements.some((placement) => placement.deviceType === "firewall" || placement.deviceType === "router") ? "Single edge anchor" : "Edge redundancy not explicit yet",
            routeDomain ? `Route domain • ${routeDomain.summaryAdvertisement || routeDomain.loopbackCidr || routeDomain.notes[0] || routeDomain.siteName}` : "Route domain still thin",
        ];
        return redundancyItems.slice(0, 5);
    }
    return synthesized.sitePlacements
        .filter((placement) => placement.siteId === site.id)
        .slice(0, 4)
        .map((placement) => `${placement.deviceName} • ${placement.role}`);
}
function diagramLegend(mode) {
    const title = mode === "addressing" ? "Addressing overlay"
        : mode === "security" ? "Security overlay"
            : mode === "flows" ? "Traffic-flow overlay"
                : mode === "services" ? "Service-placement overlay"
                    : mode === "redundancy" ? "Redundancy overlay"
                        : "Placement overlay";
    const details = mode === "addressing"
        ? ["Shows site VLAN / subnet labels.", "Use this to confirm where blocks land."]
        : mode === "security"
            ? ["Shows zones and attached enforcement devices.", "Use this to verify DMZ, guest, and management boundaries."]
            : mode === "flows"
                ? ["Highlights critical traffic paths and control points.", "Use this to review north-south and shared-service movement."]
                : mode === "services"
                    ? ["Shows explicit local, centralized, DMZ, and cloud-hosted service anchors.", "Use this to verify which services are local versus remote and which boundary owns them."]
                    : mode === "redundancy"
                        ? ["Shows routed uplinks, edge posture, and route-domain anchors that affect failover meaning.", "Use this to verify whether the topology reads like single-edge, paired-edge, or broader resilient transport."]
                        : ["Shows actual device roles that the engine placed at each site.", "Use this to verify edge, switching, and service placement."];
    return { title, details };
}
function LogicalTopologyDiagram({ project, synthesized, svgId, comments, validations, overlay, scope, focusedSiteId, labelMode, linkAnnotationMode, onSelectTarget, }) {
    const sites = sitesForDiagramScope((project.sites ?? []), synthesized, scope, focusedSiteId);
    const cardWidth = 290;
    const cardHeight = 350;
    const startX = 50;
    const gap = 24;
    const sitePositions = sitePositionMap(sites, synthesized, cardWidth, startX, gap);
    const occupiedXs = Object.values(sitePositions).map((point) => point.x);
    const occupiedYs = Object.values(sitePositions).map((point) => point.y);
    const width = Math.max(1600, (Math.max(...occupiedXs, 0)) + cardWidth + 120);
    const height = Math.max(980, (Math.max(...occupiedYs, 0)) + cardHeight + 120);
    const showDetailedLabels = labelMode === "detailed";
    const renderPath = (points, type, label, secondaryLabel) => pathLine(points, type, label, secondaryLabel, linkAnnotationMode);
    return (_jsx("div", { style: { overflowX: "auto" }, children: _jsxs("svg", { id: svgId, width: width, height: height, viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": "Logical topology diagram with explicit device placement, addressing, and overlay modes", children: [_jsx("rect", { x: 0, y: 0, width: width, height: height, rx: 30, fill: "#fbfdff" }), _jsx("rect", { x: 40, y: 36, width: width - 80, height: 110, rx: 24, fill: "#f6f9ff", stroke: "#d9e6fb" }), _jsx("text", { x: 64, y: 72, fontSize: "20", fontWeight: "700", fill: "#142742", children: diagramScopeMeta(scope, synthesized, sites[0]).title }), _jsx("text", { x: 64, y: 96, fontSize: "12", fill: "#637998", children: diagramScopeMeta(scope, synthesized, sites[0]).detail }), _jsxs("text", { x: 64, y: 118, fontSize: "12", fill: "#637998", children: ["Topology: ", synthesized.topology.topologyLabel, " \u2022 Breakout: ", synthesized.topology.internetBreakout, " \u2022 Redundancy: ", synthesized.topology.redundancyModel] }), _jsx("text", { x: 64, y: 136, fontSize: "11", fill: "#6c819b", children: "Legend intent: firewall / router / switching / wireless / server / cloud edge should read as real network roles, not generic boxes." }), chip(width - 286, 58, 210, diagramLegend(overlay).title, overlayTone(overlay)), chip(width - 286, 86, 210, "Logical posture review", "green"), sites.map((site, index) => {
                    const sitePoint = sitePositions[site.id] || { x: startX + index * (cardWidth + gap), y: 178 };
                    const x = sitePoint.x;
                    const y = sitePoint.y;
                    const siteDevices = synthesized.sitePlacements.filter((placement) => placement.siteId === site.id);
                    const siteOverlays = overlayItems(site, synthesized, overlay);
                    const taskCount = openTaskCount(comments, "SITE", site.id);
                    const siteValidation = siteValidationItems(site, validations);
                    const validationTone = validationSeverityTone(siteValidation);
                    const edgeDevice = siteDevices.find((device) => device.role.toLowerCase().includes("edge") || device.deviceType === "firewall" || device.deviceType === "router") || siteDevices[0];
                    const switchDevice = siteDevices.find((device) => device.deviceType === "core-switch" || device.deviceType === "distribution-switch" || device.deviceType === "access-switch");
                    const serviceDevice = siteDevices.find((device) => device.deviceType === "server");
                    const wirelessDevice = siteDevices.find((device) => device.deviceType === "wireless-controller" || device.deviceType === "access-point");
                    const securitySummary = synthesized.securityBoundaries.filter((boundary) => boundary.siteName === site.name).slice(0, 2);
                    const dmzService = primaryDmzService(synthesized, site.name);
                    return (_jsxs("g", { children: [_jsx("rect", { x: x, y: y, width: cardWidth, height: cardHeight, rx: 24, fill: validationTone.fill, stroke: validationTone.stroke, strokeWidth: "2.3", style: { cursor: onSelectTarget ? "pointer" : "default" }, onClick: () => onSelectTarget?.("SITE", site.id) }), _jsx("text", { x: x + 20, y: y + 30, fontSize: "18", fontWeight: "700", fill: "#142742", children: site.name }), _jsx("text", { x: x + 20, y: y + 50, fontSize: "11", fill: "#697f98", children: site.defaultAddressBlock || "No site summary block assigned" }), _jsx("text", { x: x + 20, y: y + 68, fontSize: "11", fill: "#697f98", children: siteRoleSummary(site.name, synthesized) }), taskBadge(x + cardWidth - 24, y + 24, taskCount), siteValidation.length > 0 ? chip(x + 156, y + 18, 94, `${validationTone.label} ${siteValidation.length}`, siteValidation.some((item) => item.severity === "ERROR") ? "orange" : "purple") : null, site.name === synthesized.topology.primarySiteName ? _jsx("rect", { x: x + 18, y: y + 76, width: cardWidth - 36, height: "14", rx: "7", fill: "#eef4ff", stroke: "#bfd2f3" }) : null, site.name === synthesized.topology.primarySiteName ? _jsx("text", { x: x + cardWidth / 2, y: y + 86, textAnchor: "middle", fontSize: "10.5", fontWeight: "700", fill: "#284b78", children: "PRIMARY / SHARED-SERVICE / POLICY HUB" }) : null, site.name !== synthesized.topology.primarySiteName ? _jsx("rect", { x: x + 18, y: y + 76, width: cardWidth - 36, height: "14", rx: "7", fill: "#f8fbff", stroke: "#d7e5fb" }) : null, site.name !== synthesized.topology.primarySiteName ? _jsx("text", { x: x + cardWidth / 2, y: y + 86, textAnchor: "middle", fontSize: "10.5", fontWeight: "700", fill: "#4f6582", children: "ATTACHED SITE / LOCAL ACCESS / UPLINKED EDGE" }) : null, _jsx("rect", { x: x + 12, y: y + 92, width: "108", height: "116", rx: "18", fill: "#f8fbff", stroke: "#c7d8f7", strokeDasharray: "6 4" }), _jsx("text", { x: x + 22, y: y + 108, fontSize: "10.5", fill: "#526984", children: "Perimeter / edge group" }), _jsx("rect", { x: x + 122, y: y + 92, width: "160", height: "116", rx: "18", fill: "#fbfdff", stroke: "#d9e6fb", strokeDasharray: "6 4" }), _jsx("text", { x: x + 132, y: y + 108, fontSize: "10.5", fill: "#526984", children: "Core / services / access group" }), edgeDevice ? _jsx(DeviceIcon, { x: x + 18, y: y + 112, kind: edgeDevice.deviceType, label: edgeDevice.deviceName, sublabel: `${edgeDevice.role}${edgeDevice.uplinkTarget ? ` • uplink ${edgeDevice.uplinkTarget}` : ""}`, showSublabel: showDetailedLabels }) : null, switchDevice ? _jsx(DeviceIcon, { x: x + 126, y: y + 112, kind: switchDevice.deviceType, label: switchDevice.deviceName, sublabel: `${switchDevice.role}${switchDevice.uplinkTarget ? ` • uplink ${switchDevice.uplinkTarget}` : ""}`, showSublabel: showDetailedLabels }) : null, serviceDevice ? _jsx(DeviceIcon, { x: x + 212, y: y + 112, kind: serviceDevice.deviceType, label: "Services", sublabel: `${serviceDevice.role}${serviceDevice.uplinkTarget ? ` • upstream ${serviceDevice.uplinkTarget}` : ""}`, showSublabel: showDetailedLabels }) : null, wirelessDevice ? _jsx(DeviceIcon, { x: x + 140, y: y + 196, kind: wirelessDevice.deviceType, label: wirelessDevice.deviceName, sublabel: `${wirelessDevice.role}${wirelessDevice.uplinkTarget ? ` • uplink ${wirelessDevice.uplinkTarget}` : ""}`, showSublabel: showDetailedLabels }) : null, edgeDevice ? chip(x + 24, y + 188, 90, `${deviceValidationItems(edgeDevice, site, validations, synthesized).length} edge flags`, deviceValidationItems(edgeDevice, site, validations, synthesized).length ? "orange" : "green") : null, switchDevice ? chip(x + 150, y + 188, 104, `${deviceValidationItems(switchDevice, site, validations, synthesized).length} core/access flags`, deviceValidationItems(switchDevice, site, validations, synthesized).length ? "orange" : "blue") : null, dmzService ? _jsxs("g", { children: [_jsx("rect", { x: x + 194, y: y + 188, width: "88", height: "24", rx: "12", fill: "#eef6ff", stroke: "#9ab9ef" }), _jsx("text", { x: x + 238, y: y + 204, textAnchor: "middle", fontSize: "10.5", fill: "#24446f", children: "DMZ subnet" }), _jsx(DeviceIcon, { x: x + 210, y: y + 218, kind: "server", label: "DMZ Host", sublabel: dmzService.subnetCidr || "Published", showSublabel: showDetailedLabels })] }) : null, edgeDevice && switchDevice ? renderPath([[x + 120, y + 142], [x + 126, y + 142]], "routed", edgeDevice.deviceType === "firewall" ? "inside / transit" : "LAN handoff", edgeDevice.connectedSubnets[0] || undefined) : null, switchDevice && serviceDevice ? renderPath([[x + 238, y + 142], [x + 212, y + 142]], "trunk", "server trunk", serviceDevice.connectedSubnets[0] || undefined) : null, switchDevice && wirelessDevice ? renderPath([[x + 182, y + 175], [x + 166, y + 196]], "trunk", "AP uplink", wirelessDevice.connectedZones[0] || undefined) : null, edgeDevice && dmzService ? _jsxs(_Fragment, { children: [_jsx("g", { children: renderPath([[x + 78, y + 164], [x + 194, y + 200]], "internet", "Published-service path", dmzService.ingressInterface || dmzService.subnetCidr || undefined) }), _jsx("g", { children: renderPath([[x + 238, y + 212], [x + 238, y + 218]], "trunk", "DMZ host access", dmzService.subnetCidr || undefined) }), managementBoundaryForSite(site.name, synthesized) ? _jsx("g", { children: renderPath([[x + 170, y + 155], [x + 214, y + 250]], "ha", "Management-only path", managementBoundaryForSite(site.name, synthesized)?.attachedInterface || managementBoundaryForSite(site.name, synthesized)?.zoneName) }) : null] }) : null, _jsx("text", { x: x + 18, y: y + 286, fontSize: "12", fontWeight: "700", fill: "#324866", children: diagramLegend(overlay).title }), siteOverlays.slice(0, 3).map((item, overlayIndex) => chip(x + 18, y + 298 + overlayIndex * 24, cardWidth - 36, item, overlayTone(overlay))), siteOverlays.length === 0 ? _jsx("text", { x: x + 18, y: y + 316, fontSize: "10.5", fill: "#6a7d97", children: "No overlay items yet for this site." }) : null, interfaceSummary(edgeDevice).slice(0, 2).map((label, interfaceIndex) => chip(x + 18, y + 224 + interfaceIndex * 24, 118, label, "green")), interfaceSummary(switchDevice).slice(0, 2).map((label, interfaceIndex) => chip(x + 146, y + 224 + interfaceIndex * 24, 126, label, "blue")), securitySummary.map((boundary, boundaryIndex) => (_jsxs("text", { x: x + 18, y: y + cardHeight - 30 + boundaryIndex * 14, fontSize: "10.5", fill: "#61758f", children: [boundary.zoneName, ": ", boundary.controlPoint, boundary.attachedInterface ? ` • ${boundary.attachedInterface}` : ""] }, `${site.id}-${boundary.zoneName}-${boundaryIndex}`))), siteValidation.slice(0, 1).map((item, itemIndex) => _jsxs("text", { x: x + 18, y: y + cardHeight - 8, fontSize: "10.5", fill: "#9a3412", children: ["Validation: ", item.title] }, `${site.id}-validation-${itemIndex}`))] }, site.id));
                }), sites.length > 1 ? (synthesized.topology.topologyType === "hub-spoke" && synthesized.topology.primarySiteId
                    ? sites.filter((site) => site.id !== synthesized.topology.primarySiteId).map((site) => {
                        const primaryPoint = sitePositions[synthesized.topology.primarySiteId];
                        const branchPoint = sitePositions[site.id];
                        const wanLink = synthesized.wanLinks.find((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id);
                        return (_jsx("g", { children: renderPath([[primaryPoint.x + cardWidth / 2, primaryPoint.y + cardHeight], [branchPoint.x + cardWidth / 2, branchPoint.y]], "vpn", "WAN / hub-spoke", wanLink?.subnetCidr || "Point-to-point transit") }, `inter-${site.id}`));
                    })
                    : sites.slice(0, -1).map((site, index) => {
                        const currentPoint = sitePositions[site.id];
                        const nextSite = sites[index + 1];
                        const nextPoint = sitePositions[nextSite.id];
                        const label = synthesized.topology.topologyType === "collapsed-core" ? "Campus / local core" : "Inter-site routed path";
                        return (_jsx("g", { children: renderPath([[currentPoint.x + cardWidth, currentPoint.y + 176], [nextPoint.x, nextPoint.y + 176]], synthesized.topology.topologyType === "collapsed-core" ? "trunk" : "routed", label, synthesized.wanLinks[index]?.subnetCidr || undefined) }, `inter-${site.id}`));
                    })) : null] }) }));
}
function PhysicalTopologyDiagram({ project, synthesized, svgId, comments, validations, overlay, scope, focusedSiteId, labelMode, linkAnnotationMode, onSelectTarget, }) {
    const sites = sitesForDiagramScope((project.sites ?? []), synthesized, scope, focusedSiteId);
    const requirements = parseRequirementsProfile(project.requirementsJson);
    const primarySite = sites.find((site) => site.name === synthesized.topology.primarySiteName) || sites[0];
    const branchSites = sites.filter((site) => site.id !== primarySite?.id);
    const cloudNeeded = synthesized.topology.cloudConnected || synthesized.servicePlacements.some((service) => service.placementType === "cloud");
    const width = Math.max(1680, 1280 + branchSites.length * 140 + (cloudNeeded ? 180 : 0));
    const height = 1160;
    const showDetailedLabels = labelMode === "detailed";
    const renderPath = (points, type, label, secondaryLabel) => pathLine(points, type, label, secondaryLabel, linkAnnotationMode);
    const centerX = width / 2;
    const hqTaskCount = primarySite ? openTaskCount(comments, "SITE", primarySite.id) : 0;
    const hqValidation = primarySite ? siteValidationItems(primarySite, validations) : [];
    const hqValidationTone = validationSeverityTone(hqValidation);
    const flowOverlays = overlay === "flows" ? flowsForDiagramScope(synthesized.trafficFlows, scope, sites[0]?.name).slice(0, 4) : [];
    const legend = diagramLegend(overlay);
    return (_jsx("div", { style: { overflowX: "auto" }, children: _jsxs("svg", { id: svgId, width: width, height: height, viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": "Physical style topology diagram with network-style device symbols, overlay modes, and reviewable connection semantics", children: [_jsx("rect", { x: 0, y: 0, width: width, height: height, rx: 30, fill: "#fbfdff" }), _jsx("rect", { x: 48, y: 42, width: width - 96, height: 180, rx: 28, fill: "#f8fbff", stroke: "#dbe6f7", strokeWidth: "2" }), _jsx("text", { x: 72, y: 76, fontSize: "21", fontWeight: "700", fill: "#152742", children: "Physical / topology diagram" }), _jsx("text", { x: 72, y: 101, fontSize: "12", fill: "#607791", children: "v160 keeps the diagram moving toward network-style symbols, clearer path semantics, stronger boundary visibility, and more reviewable topology behavior across primary, branch, and cloud contexts." }), _jsx("text", { x: 72, y: 122, fontSize: "12", fill: "#607791", children: "Connection semantics: routed = blue, trunk = purple, VPN/WAN = green dashed, internet = blue dashed, management/control = slate, flow overlay = orange." }), chip(width - 310, 68, 230, legend.title, overlayTone(overlay)), legend.details.map((detail, index) => _jsxs("text", { x: width - 300, y: 104 + index * 18, fontSize: "11", fill: "#607791", children: ["\u2022 ", detail] }, detail)), _jsx(DeviceIcon, { x: centerX - 65, y: 104, kind: "internet", label: "Internet / WAN", sublabel: synthesized.topology.internetBreakout }), renderPath([[centerX, 170], [centerX, 222]], "internet", synthesized.topology.topologyType === "hub-spoke" ? "Internet + branch WAN" : "North-south edge"), _jsx(DeviceIcon, { x: centerX - 60, y: 226, kind: "firewall", label: "Perimeter Firewall", sublabel: synthesized.topology.redundancyModel }), primaryDmzService(synthesized, primarySite?.name) ? _jsxs("g", { children: [_jsx("rect", { x: centerX + 126, y: 246, width: "120", height: "28", rx: "14", fill: "#eef6ff", stroke: "#9ab9ef" }), _jsx("text", { x: centerX + 186, y: 264, textAnchor: "middle", fontSize: "11", fill: "#24446f", children: "DMZ subnet" }), _jsx(DeviceIcon, { x: centerX + 270, y: 232, kind: "server", label: "DMZ Host", sublabel: primaryDmzService(synthesized, primarySite?.name)?.subnetCidr || "Published service", showSublabel: showDetailedLabels })] }) : null, primaryDmzService(synthesized, primarySite?.name) ? _jsxs(_Fragment, { children: [_jsx("g", { children: renderPath([[centerX + 58, 262], [centerX + 126, 262]], "internet", "dmz", primaryDmzService(synthesized, primarySite?.name)?.ingressInterface || undefined) }), _jsx("g", { children: renderPath([[centerX + 246, 262], [centerX + 270, 262]], "trunk", "dmz host", primaryDmzService(synthesized, primarySite?.name)?.subnetCidr || undefined) })] }) : null, renderPath([[centerX, 278], [centerX, 340]], "routed", "inside / routed core", synthesized.routingPlan.find((item) => item.siteId === primarySite?.id)?.summaryAdvertisement || undefined), _jsx("rect", { x: centerX - 270, y: 344, width: 540, height: 360, rx: 28, fill: hqValidationTone.fill, stroke: hqValidationTone.stroke, strokeWidth: "2.5", style: { cursor: onSelectTarget ? "pointer" : "default" }, onClick: () => primarySite && onSelectTarget?.("SITE", primarySite.id) }), _jsx("text", { x: centerX - 236, y: 380, fontSize: "19", fontWeight: "700", fill: "#16263d", children: primarySite?.name || project.name }), _jsx("text", { x: centerX - 236, y: 400, fontSize: "11", fill: "#6a7d97", children: "Primary site / policy hub" }), _jsx("text", { x: centerX - 236, y: 418, fontSize: "11", fill: "#6a7d97", children: primarySite?.defaultAddressBlock || "No site summary block assigned" }), taskBadge(centerX + 236, 372, hqTaskCount), hqValidation.length > 0 ? chip(centerX + 82, 360, 148, `Validation ${hqValidation.length}`, hqValidation.some((item) => item.severity === "ERROR") ? "orange" : "purple") : null, _jsx(DeviceIcon, { x: centerX - 216, y: 448, kind: "router", label: "Core Routing", sublabel: "Summaries / north-south", showSublabel: showDetailedLabels }), _jsx(DeviceIcon, { x: centerX - 66, y: 452, kind: "core-switch", label: "Core Switch", sublabel: "Inter-VLAN / trunks", showSublabel: showDetailedLabels }), _jsx(DeviceIcon, { x: centerX + 96, y: 448, kind: "server", label: "Shared Services", sublabel: "Server / management", showSublabel: showDetailedLabels }), _jsx(DeviceIcon, { x: centerX - 20, y: 564, kind: "access-switch", label: "Access Layer", sublabel: "Users / closets / PoE", showSublabel: showDetailedLabels }), _jsx(DeviceIcon, { x: centerX + 178, y: 564, kind: "access-point", label: "Wireless", sublabel: "Staff / guest", showSublabel: showDetailedLabels }), renderPath([[centerX - 128, 480], [centerX - 66, 480]], "routed", firstInterfaceLabel(synthesized.sitePlacements.find((item) => item.siteId === primarySite?.id && item.deviceType === "router")) || "svi / routed handoff", synthesized.routingPlan.find((item) => item.siteId === primarySite?.id)?.loopbackCidr || undefined), renderPath([[centerX + 46, 480], [centerX + 96, 480]], "trunk", firstInterfaceLabel(synthesized.sitePlacements.find((item) => item.siteId === primarySite?.id && item.deviceType === "server")) || "server / service trunk", synthesized.servicePlacements.find((item) => item.siteName === primarySite?.name)?.subnetCidr || undefined), renderPath([[centerX - 8, 594], [centerX + 178, 594]], "trunk", firstInterfaceLabel(synthesized.sitePlacements.find((item) => item.siteId === primarySite?.id && item.deviceType === "access-point")) || "edge access / AP uplink", (requirements.wireless || requirements.guestWifi) ? "staff + guest SSIDs" : undefined), overlay === "addressing" ? synthesized.addressingPlan.filter((row) => row.siteId === primarySite?.id).slice(0, 6).map((row, index) => chip(centerX - 238, 630 + index * 28, 476, `${row.segmentName} • VLAN ${row.vlanId ?? "—"} • ${row.subnetCidr}`, "blue")) : null, overlay === "security" ? synthesized.securityBoundaries.filter((boundary) => boundary.siteName === primarySite?.name).slice(0, 5).map((boundary, index) => chip(centerX - 238, 630 + index * 28, 476, `${boundary.zoneName} • ${boundary.attachedDevice} • ${boundary.controlPoint}`, "purple")) : null, overlay === "flows" ? flowOverlays.slice(0, 3).map((flow, index) => chip(centerX - 238, 630 + index * 28, 476, `${flow.flowLabel} • ${flow.sourceZone} → ${flow.destinationZone}`, "orange")) : null, overlay === "none" ? synthesized.sitePlacements.filter((placement) => placement.siteId === primarySite?.id).slice(0, 5).map((placement, index) => chip(centerX - 238, 630 + index * 28, 476, `${deviceLabel(placement.deviceType)} • ${placement.role} • ${placement.connectedZones.join(", ") || "No zone labels yet"}`, "green")) : null, cloudNeeded ? (_jsxs("g", { children: [_jsx(DeviceIcon, { x: width - 250, y: 132, kind: "cloud", label: "Cloud", sublabel: synthesized.topology.cloudConnected ? "Connected" : "Optional", showSublabel: showDetailedLabels }), _jsx(DeviceIcon, { x: width - 256, y: 270, kind: "cloud-edge", label: "Cloud Edge", sublabel: "VNet / VPN / route filters", showSublabel: showDetailedLabels }), renderPath([[centerX + 58, 262], [width - 220, 262]], "vpn", "Hybrid / cloud transport", requirements.cloudConnectivity || undefined)] })) : null, branchSites.map((site, index) => {
                    const left = index % 2 === 0;
                    const row = Math.floor(index / 2);
                    const x = left ? 72 : width - 392;
                    const y = 392 + row * 246;
                    const boxWidth = 320;
                    const anchorX = left ? x + boxWidth : x;
                    const anchorY = y + 92;
                    const siteTaskCount = openTaskCount(comments, "SITE", site.id);
                    const siteValidation = siteValidationItems(site, validations);
                    const siteValidationTone = validationSeverityTone(siteValidation);
                    const edgePlacement = synthesized.sitePlacements.find((placement) => placement.siteId === site.id && (placement.deviceType === "firewall" || placement.deviceType === "router"));
                    const switchPlacement = synthesized.sitePlacements.find((placement) => placement.siteId === site.id && (placement.deviceType === "core-switch" || placement.deviceType === "access-switch" || placement.deviceType === "distribution-switch"));
                    const serverPlacement = synthesized.sitePlacements.find((placement) => placement.siteId === site.id && placement.deviceType === "server");
                    const wirelessPlacement = synthesized.sitePlacements.find((placement) => placement.siteId === site.id && (placement.deviceType === "access-point" || placement.deviceType === "wireless-controller"));
                    const edgeDevice = edgePlacement?.deviceType || "router";
                    const localOverlay = overlayItems(site, synthesized, overlay);
                    const edgeValidation = deviceValidationItems(edgePlacement, site, validations, synthesized);
                    const switchValidation = deviceValidationItems(switchPlacement, site, validations, synthesized);
                    const edgeInterfaceValidation = interfaceValidationItems(edgePlacement, site, validations, synthesized);
                    const switchInterfaceValidation = interfaceValidationItems(switchPlacement, site, validations, synthesized);
                    const pathValidation = linkValidationItems(site, validations, synthesized);
                    const zoneLabels = boundaryLabelsForSite(site.name, synthesized);
                    const zoneRects = zoneBoundaryRectsForSite(site.name, synthesized);
                    const edgeStack = compactInterfaceStack(edgePlacement, 2);
                    const switchStack = compactInterfaceStack(switchPlacement, 2);
                    const dmzBoundary = dmzBoundaryForSite(site.name, synthesized);
                    const managementBoundary = managementBoundaryForSite(site.name, synthesized);
                    const dmzService = primaryDmzService(synthesized, site.name);
                    return (_jsxs("g", { children: [renderPath([[centerX, 490], [anchorX, anchorY]], synthesized.topology.topologyType === "hub-spoke" ? "vpn" : "routed", synthesized.wanLinks.find((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id)?.linkName || (synthesized.topology.topologyType === "hub-spoke" ? "WAN / hub-spoke" : "Inter-site path"), synthesized.wanLinks.find((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id)?.subnetCidr || undefined), _jsx("rect", { x: x, y: y, width: boxWidth, height: 340, rx: 24, fill: siteValidationTone.fill, stroke: siteValidationTone.stroke, strokeWidth: "2.3", style: { cursor: onSelectTarget ? "pointer" : "default" }, onClick: () => onSelectTarget?.("SITE", site.id) }), _jsx("text", { x: x + 20, y: y + 30, fontSize: "17", fontWeight: "700", fill: "#16263d", children: site.name }), _jsx("text", { x: x + 20, y: y + 49, fontSize: "11", fill: "#6a7d97", children: site.defaultAddressBlock || "No site block assigned" }), _jsx("text", { x: x + 20, y: y + 64, fontSize: "10.5", fill: "#526984", children: siteRoleSummary(site.name, synthesized) }), taskBadge(x + boxWidth - 28, y + 24, siteTaskCount), siteValidation.length > 0 ? chip(x + 150, y + 18, 132, `Validation ${siteValidation.length}`, siteValidation.some((item) => item.severity === "ERROR") ? "orange" : "purple") : null, _jsx("rect", { x: x + 8, y: y + 74, width: 112, height: 100, rx: 16, fill: "#f8fbff", stroke: "#c7d8f7", strokeDasharray: "6 4" }), _jsx("text", { x: x + 20, y: y + 88, fontSize: "10.5", fill: "#526984", children: "Perimeter / edge zone group" }), _jsx("rect", { x: x + 118, y: y + 78, width: 122, height: 96, rx: 16, fill: "#f9fcff", stroke: "#d6e4fb", strokeDasharray: "6 4" }), _jsx("text", { x: x + 130, y: y + 92, fontSize: "10.5", fill: "#526984", children: "Core / access zone group" }), site.name === synthesized.topology.primarySiteName ? _jsx("rect", { x: x + 8, y: y + 58, width: boxWidth - 16, height: "12", rx: "6", fill: "#eef4ff", stroke: "#bfd2f3" }) : null, site.name === synthesized.topology.primarySiteName ? _jsx("text", { x: x + boxWidth / 2, y: y + 67, textAnchor: "middle", fontSize: "10", fontWeight: "700", fill: "#284b78", children: "PRIMARY / SHARED-SERVICE / POLICY HUB" }) : null, _jsx(DeviceIcon, { x: x + 16, y: y + 96, kind: edgeDevice, label: edgePlacement?.deviceName || deviceLabel(edgeDevice), sublabel: `${edgePlacement?.role || "Site edge / VPN"}${edgePlacement?.uplinkTarget ? ` • uplink ${edgePlacement.uplinkTarget}` : ""}`, showSublabel: showDetailedLabels }), _jsx(DeviceIcon, { x: x + 132, y: y + 98, kind: switchPlacement?.deviceType || "access-switch", label: switchPlacement?.deviceName || deviceLabel(switchPlacement?.deviceType || "access-switch"), sublabel: `${switchPlacement?.role || "Users / trunks"}${switchPlacement?.uplinkTarget ? ` • uplink ${switchPlacement.uplinkTarget}` : ""}`, showSublabel: showDetailedLabels }), wirelessPlacement ? _jsx(DeviceIcon, { x: x + 254, y: y + 102, kind: wirelessPlacement.deviceType, label: wirelessPlacement.deviceName, sublabel: `${wirelessPlacement.role}${wirelessPlacement.uplinkTarget ? ` • uplink ${wirelessPlacement.uplinkTarget}` : ""}`, showSublabel: showDetailedLabels }) : null, serverPlacement ? _jsx(DeviceIcon, { x: x + 214, y: y + 26, kind: "server", label: serverPlacement.deviceName, sublabel: serverPlacement.connectedSubnets[0] || serverPlacement.role, showSublabel: showDetailedLabels }) : null, renderPath([[x + 118, y + 125], [x + 132, y + 125]], "routed", firstInterfaceLabel(edgePlacement) || "inside", synthesized.addressingPlan.find((row) => row.siteId === site.id)?.gatewayIp || undefined), wirelessPlacement ? renderPath([[x + 244, y + 125], [x + 254, y + 125]], "trunk", firstInterfaceLabel(wirelessPlacement) || "wireless / access", localOverlay[0] || undefined) : null, edgeStack.map((item, itemIndex) => chip(x + 18, y + 178 + itemIndex * 24, boxWidth - 36, item, "green")), switchStack.map((item, itemIndex) => chip(x + 18, y + 226 + itemIndex * 24, boxWidth - 36, item, "blue")), zoneLabels.slice(0, 1).map((item, itemIndex) => chip(x + 18, y + 274 + itemIndex * 24, boxWidth - 36, item, "purple")), localOverlay.slice(0, 1).map((item, itemIndex) => chip(x + 18, y + 298 + itemIndex * 24, boxWidth - 36, item, overlayTone(overlay))), dmzBoundary ? _jsxs("text", { x: x + 18, y: y + 320, fontSize: "10.2", fill: "#5a34a3", children: ["DMZ boundary: ", dmzBoundary.attachedDevice, dmzBoundary.attachedInterface ? ` • ${dmzBoundary.attachedInterface}` : ''] }) : null, managementBoundary ? _jsxs("text", { x: x + 18, y: y + 334, fontSize: "10.2", fill: "#24446f", children: ["Management boundary: ", managementBoundary.controlPoint] }) : null, edgeInterfaceValidation.slice(0, 1).map((item, itemIndex) => _jsxs("text", { x: x + 18, y: y + 352 + itemIndex * 14, fontSize: "10.2", fill: "#9a3412", children: ["Edge interface: ", item.title] }, `${site.id}-edge-if-validation-${itemIndex}`)), switchInterfaceValidation.slice(0, 1).map((item, itemIndex) => _jsxs("text", { x: x + 18, y: y + 366 + itemIndex * 14, fontSize: "10.2", fill: "#9a3412", children: ["Switch interface: ", item.title] }, `${site.id}-switch-if-validation-${itemIndex}`)), pathValidation.slice(0, 1).map((item, itemIndex) => _jsxs("text", { x: x + 18, y: y + 380 + itemIndex * 14, fontSize: "10.2", fill: "#9a3412", children: ["Path/link: ", item.title] }, `${site.id}-path-validation-${itemIndex}`)), edgeValidation.slice(0, 1).map((item, itemIndex) => _jsxs("text", { x: x + 18, y: y + 394 + itemIndex * 14, fontSize: "10.2", fill: "#9a3412", children: ["Edge role: ", item.title] }, `${site.id}-edge-validation-${itemIndex}`)), switchValidation.slice(0, 1).map((item, itemIndex) => _jsxs("text", { x: x + 18, y: y + 408 + itemIndex * 14, fontSize: "10.2", fill: "#9a3412", children: ["Switching role: ", item.title] }, `${site.id}-switch-validation-${itemIndex}`)), zoneRects.slice(0, 2).map((zone, zoneIndex) => _jsxs("text", { x: x + 214, y: y + 186 + zoneIndex * 14, fontSize: "10.2", fill: "#5a34a3", children: [zone.label, ": ", zone.anchor] }, `${site.id}-zone-rect-${zoneIndex}`)), dmzService ? _jsxs("g", { children: [renderPath([[x + 66, y + 118], [x + 252, y + 74]], 'internet', 'Published-service path', dmzService.ingressInterface || dmzService.subnetCidr || undefined), _jsx("rect", { x: x + 234, y: y + 28, width: "68", height: "18", rx: "9", fill: "#eef6ff", stroke: "#9ab9ef" }), _jsx("text", { x: x + 268, y: y + 40, textAnchor: "middle", fontSize: "10", fill: "#24446f", children: "DMZ subnet" }), renderPath([[x + 268, y + 46], [x + 268, y + 62]], 'trunk', 'Published host', dmzService.subnetCidr || undefined), managementBoundary ? renderPath([[x + 184, y + 122], [x + 268, y + 62]], 'ha', 'Management-only path', managementBoundary.attachedInterface || managementBoundary.zoneName) : null] }) : null] }, site.id));
                }), flowOverlays.map((flow, index) => {
                    const baseY = 774 + index * 84;
                    return (_jsxs("g", { children: [renderPath([[86, baseY], [width - 86, baseY]], "flow", `${flow.flowLabel} • ${flow.sourceZone} → ${flow.destinationZone}`), _jsxs("text", { x: 92, y: baseY + 22, fontSize: "11", fill: "#6a7d97", children: ["Path: ", flow.path.join(" → ")] }), _jsxs("text", { x: 92, y: baseY + 40, fontSize: "11", fill: "#6a7d97", children: ["Control points: ", flow.controlPoints.join(", ")] }), _jsxs("text", { x: 92, y: baseY + 58, fontSize: "11", fill: "#6a7d97", children: ["NAT / policy: ", flow.natBehavior, " \u2022 ", flow.enforcementPolicy] })] }, flow.id));
                })] }) }));
}
function ArchitectureSignals({ synthesized }) {
    const signals = [
        `Topology: ${synthesized.topology.topologyLabel}`,
        `Primary site: ${synthesized.topology.primarySiteName || "TBD"}`,
        `Breakout: ${synthesized.topology.internetBreakout}`,
        `Placements: ${synthesized.sitePlacements.length}`,
        `Services: ${synthesized.servicePlacements.length}`,
        `Flows: ${synthesized.trafficFlows.length}`,
    ];
    return (_jsx("div", { className: "diagram-note-grid", children: signals.map((item) => (_jsx("div", { className: "diagram-note-card", children: _jsx("p", { style: { margin: 0 }, children: item }) }, item))) }));
}
function Legend() {
    const items = [
        ["Firewall", "Perimeter, segmentation, DMZ, NAT, VPN"],
        ["Router", "WAN, summaries, inter-site routing"],
        ["Switch", "Core, distribution, access, trunks"],
        ["Server", "Shared services, management, DMZ hosts"],
        ["AP / WLC", "Wireless access and controller layers"],
    ];
    return (_jsx("div", { className: "diagram-note-grid", style: { marginTop: 10 }, children: items.map(([title, detail]) => (_jsxs("div", { className: "diagram-note-card", children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: title }), _jsx("p", { style: { margin: 0 }, children: detail })] }, title))) }));
}
function DeviceSwatch({ kind, title, detail }) {
    return (_jsxs("div", { className: "topology-icon-swatch", children: [_jsx("svg", { viewBox: "0 0 140 88", className: "topology-icon-swatch-svg", "aria-hidden": "true", children: _jsx(DeviceIcon, { x: 18, y: 8, kind: kind, label: title }) }), _jsxs("div", { children: [_jsx("strong", { children: title }), _jsx("p", { children: detail })] })] }));
}
function DeviceSymbolLibraryPanel() {
    return (_jsxs("div", { className: "topology-icon-legend", children: [_jsx("strong", { style: { display: "block" }, children: "Device symbol library" }), _jsx("p", { className: "muted", style: { margin: "2px 0 0 0" }, children: "v113 sets the diagram direction toward network-style device symbols. The goal is firewall, router, stacked-switch, AP, server, cloud, and edge visuals that read like infrastructure objects, not generic circles or plain rectangles." }), _jsxs("div", { className: "topology-icon-legend-grid", children: [_jsx(DeviceSwatch, { kind: "firewall", title: "Firewall", detail: "Perimeter, trust boundary, DMZ, NAT, VPN edge" }), _jsx(DeviceSwatch, { kind: "router", title: "Router", detail: "WAN termination, summaries, branch or hub routing" }), _jsx(DeviceSwatch, { kind: "core-switch", title: "Core Switch", detail: "Core or distribution switching with stacked look" }), _jsx(DeviceSwatch, { kind: "access-switch", title: "Access Switch", detail: "User, printer, AP, and local trunk access" }), _jsx(DeviceSwatch, { kind: "wireless-controller", title: "Wireless", detail: "AP / controller layer for coverage and control" }), _jsx(DeviceSwatch, { kind: "server", title: "Server", detail: "Local, centralized, DMZ, or management services" }), _jsx(DeviceSwatch, { kind: "cloud-edge", title: "Cloud Edge", detail: "On-prem to cloud boundary and hosted service edge" }), _jsx(DeviceSwatch, { kind: "internet", title: "Internet", detail: "Public edge, ISP, published-service path anchor" })] })] }));
}
function OverlayReviewPanel({ overlay }) {
    const items = {
        none: {
            title: "Placement overlay",
            detail: [
                "Use this to confirm where edge, switching, wireless, server, and cloud objects are placed.",
                "Best for role review before checking labels, subnets, or traffic paths.",
            ],
        },
        addressing: {
            title: "Addressing overlay",
            detail: [
                "Use this to verify site blocks, VLAN/subnet labels, gateways, and transit references.",
                "Best for cross-checking the diagram against the addressing hierarchy and report tables.",
            ],
        },
        security: {
            title: "Security overlay",
            detail: [
                "Use this to verify zones, DMZ placement, management-only paths, and enforcement points.",
                "Best for checking whether trust boundaries are explicit and attached to real devices.",
            ],
        },
        flows: {
            title: "Traffic-flow overlay",
            detail: [
                "Use this to verify how user, guest, management, branch, internet, and DMZ traffic are expected to move.",
                "Best for comparing critical paths against routing intent, NAT behavior, and validation warnings.",
            ],
        },
        services: {
            title: "Service-placement overlay",
            detail: [
                "Use this to verify which services are local, centralized, DMZ-based, or cloud-hosted.",
                "Best for checking whether service consumers and controlling boundaries line up with the current topology.",
            ],
        },
        redundancy: {
            title: "Redundancy overlay",
            detail: [
                "Use this to verify routed uplinks, edge posture, and route-domain anchors that change failover meaning.",
                "Best for checking whether the topology visually reads like single-edge, paired-edge, or resilient transport.",
            ],
        },
    };
    const current = items[overlay];
    return (_jsxs("div", { className: "diagram-overlay-guide", children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: current.title }), current.detail.map((line) => (_jsx("p", { children: line }, line)))] }));
}
function ConnectionSemanticsPanel() {
    const links = [
        ["Routed link", "Solid blue path for L3 adjacency, WAN transit, or inter-device routed handoff."],
        ["Trunk / switched", "Thicker purple path for VLAN carriage, local switching, or AP uplinks."],
        ["Internet edge", "Dashed blue path for public or ISP-facing connectivity."],
        ["VPN / secure tunnel", "Dashed green path for encrypted or policy-bound overlay connectivity."],
        ["HA / restricted path", "Orange path for management-only, HA, or special-control movement."],
        ["Traffic flow", "Highlighted red path for review overlays and critical traffic traversal."],
    ];
    return (_jsx("div", { className: "diagram-note-grid", style: { marginTop: 10 }, children: links.map(([title, detail]) => (_jsxs("div", { className: "diagram-note-card", children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: title }), _jsx("p", { style: { margin: 0 }, children: detail })] }, title))) }));
}
function LinkTypeRenderingPanel({ synthesized }) {
    const samples = [
        {
            type: "routed",
            title: "Routed handoff / WAN edge",
            detail: "Use for site-to-site transit, L3 handoff, and point-to-point path review.",
            example: synthesized.wanLinks[0]?.subnetCidr || synthesized.routingPlan[0]?.summaryAdvertisement || "Transit / summary path",
        },
        {
            type: "trunk",
            title: "Trunk / switched carriage",
            detail: "Use for VLAN carriage from edge to switching or switching to access tiers.",
            example: synthesized.addressingPlan[0]?.subnetCidr || "VLAN / access carriage",
        },
        {
            type: "internet",
            title: "Internet / public edge",
            detail: "Use where guest, DMZ, or egress posture crosses the public boundary.",
            example: synthesized.topology.internetBreakout || "Public edge",
        },
        {
            type: "vpn",
            title: "Tunnel / protected transport",
            detail: "Use for VPN, SD-WAN, or secured branch-to-hub movement.",
            example: synthesized.wanLinks[0]?.transport || "Secured transport",
        },
        {
            type: "ha",
            title: "HA / restricted control path",
            detail: "Use for sync, management-only, or constrained-control relationships.",
            example: synthesized.securityBoundaries[0]?.controlPoint || "Restricted-control path",
        },
        {
            type: "flow",
            title: "Traffic-flow highlight",
            detail: "Use when reviewing how a generated flow traverses devices and boundaries.",
            example: synthesized.trafficFlows[0]?.flowLabel || "Critical flow path",
        },
    ];
    return (_jsxs("div", { className: "diagram-linktype-panel", children: [_jsxs("div", { children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: "Link-type rendering direction" }), _jsx("p", { className: "muted", style: { margin: 0 }, children: "The diagram should increasingly read like an engineering drawing: the line itself should tell you whether the relationship is routed, trunked, public-edge, tunneled, HA, or a reviewed traffic path." })] }), _jsx("div", { className: "diagram-linktype-grid", children: samples.map((sample) => {
                    const tone = linkStyle(sample.type);
                    return (_jsxs("div", { className: "diagram-linktype-card", children: [_jsx("div", { className: "diagram-linktype-sample", children: _jsx("svg", { viewBox: "0 0 180 36", width: "100%", height: "36", "aria-hidden": "true", children: _jsx("line", { x1: "12", y1: "18", x2: "168", y2: "18", stroke: tone.stroke, strokeWidth: tone.width, strokeDasharray: tone.dash, strokeLinecap: "round" }) }) }), _jsx("strong", { children: sample.title }), _jsx("p", { children: sample.detail }), _jsx("span", { children: sample.example })] }, sample.type));
                }) })] }));
}
function TopologySpecificRenderingPanel({ synthesized }) {
    const topologyLabel = synthesized.topology.topologyType;
    const hubLabel = synthesized.topology.primarySiteName || synthesized.siteHierarchy[0]?.name || "Primary site";
    const items = topologyLabel === "hub-spoke"
        ? [
            { title: "Hub-and-spoke behavior", detail: `The primary site ${hubLabel} should visually read as the concentration point for shared services, WAN attachment, and most branch-bound traffic review.` },
            { title: "Branch posture", detail: "Branches should read as attached edges, not mini data centers. Their diagrams should prioritize WAN handoff, local access, and dependency on shared or central services unless local breakout is explicit." },
            { title: "Flow expectation", detail: "Inter-site and shared-service flows should usually pull attention back toward the hub unless policy or local internet breakout changes that path." },
        ]
        : topologyLabel === "collapsed-core"
            ? [
                { title: "Campus / collapsed-core behavior", detail: "The site should read as a local hierarchy where switching, firewall edge, and service adjacency dominate review more than WAN routing posture." },
                { title: "Gateway concentration", detail: "Gateway and trust-boundary reading should stay local. Do not let the visual suggest fake branch routing summaries or non-existent WAN edges." },
                { title: "Flow expectation", detail: "Most important reviews should focus on internal segmentation, internet egress, local services, and management reachability." },
            ]
            : [
                { title: "Distributed topology behavior", detail: "Sites should visually show which roles are local, which roles are centralized, and where the controlling edge or shared-service anchor sits." },
                { title: "Service placement", detail: "Cloud, DMZ, and centralized-service anchors should be obvious enough that a reviewer can tell what is local versus remote at a glance." },
                { title: "Flow expectation", detail: "The active overlay should make cross-boundary movement and trust enforcement easy to follow without relying on narrative paragraphs." },
            ];
    return (_jsxs("div", { className: "diagram-topology-specific-panel", children: [_jsxs("div", { children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: "Topology-specific rendering behavior" }), _jsx("p", { className: "muted", style: { margin: 0 }, children: "v116 pushes the diagram stage further toward topology-aware rendering. The same symbol library should not read the same way for hub-and-spoke, campus/collapsed-core, and cloud-connected patterns." })] }), _jsx("div", { className: "diagram-topology-specific-grid", children: items.map((item) => (_jsxs("div", { className: "diagram-topology-specific-card", children: [_jsx("strong", { children: item.title }), _jsx("p", { children: item.detail })] }, item.title))) })] }));
}
function SiteDeviceLinkMatrixPanel({ synthesized, siteIds }) {
    const allowedIds = siteIds && siteIds.length > 0 ? new Set(siteIds) : null;
    const siteRows = synthesized.siteHierarchy.filter((site) => !allowedIds || allowedIds.has(site.id)).map((site) => {
        const placements = synthesized.sitePlacements.filter((placement) => placement.siteId === site.id);
        const edge = placements.find((placement) => placement.deviceType === 'firewall' || placement.deviceType === 'router');
        const switching = placements.find((placement) => placement.deviceType === 'core-switch' || placement.deviceType === 'distribution-switch' || placement.deviceType === 'access-switch');
        const wireless = placements.find((placement) => placement.deviceType === 'wireless-controller' || placement.deviceType === 'access-point');
        const services = synthesized.servicePlacements.filter((service) => service.siteName === site.name).slice(0, 3);
        const transit = synthesized.wanLinks.filter((link) => link.endpointASiteId === site.id || link.endpointBSiteId === site.id);
        const primaryBoundary = synthesized.securityBoundaries.find((boundary) => boundary.siteName === site.name);
        return {
            id: site.id,
            siteName: site.name,
            tier: site.source === "configured" ? "configured" : "proposed",
            edge: edge ? `${edge.deviceName} • ${edge.deviceType}` : 'Not synthesized',
            switching: switching ? `${switching.deviceName} • ${switching.deviceType}` : 'Not synthesized',
            wireless: wireless ? `${wireless.deviceName} • ${wireless.deviceType}` : 'None / not synthesized',
            links: transit.length > 0 ? transit.map((link) => `${link.linkName} • ${link.transport}`).join(', ') : (synthesized.topology.topologyType === 'collapsed-core' ? 'Local switched core' : 'Local edge only'),
            boundary: primaryBoundary ? `${primaryBoundary.zoneName} • ${primaryBoundary.controlPoint}` : 'Boundary not explicit yet',
            services: services.length > 0 ? services.map((service) => service.serviceName).join(', ') : 'No anchored services yet',
        };
    });
    return (_jsxs("div", { className: "diagram-site-matrix-panel", children: [_jsxs("div", { children: [_jsx("strong", { style: { display: 'block', marginBottom: 6 }, children: "Site / device / link matrix" }), _jsx("p", { className: "muted", style: { margin: 0 }, children: "Use this matrix to confirm that every site has the right edge role, switching posture, transport behavior, and service or boundary anchors before trusting the diagram as a design artifact." })] }), _jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { align: "left", children: "Site" }), _jsx("th", { align: "left", children: "Tier" }), _jsx("th", { align: "left", children: "Edge" }), _jsx("th", { align: "left", children: "Switching" }), _jsx("th", { align: "left", children: "Wireless" }), _jsx("th", { align: "left", children: "Transport / link meaning" }), _jsx("th", { align: "left", children: "Primary boundary" }), _jsx("th", { align: "left", children: "Anchored services" })] }) }), _jsx("tbody", { children: siteRows.map((row) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("strong", { children: row.siteName }) }), _jsx("td", { children: row.tier }), _jsx("td", { children: row.edge }), _jsx("td", { children: row.switching }), _jsx("td", { children: row.wireless }), _jsx("td", { children: row.links }), _jsx("td", { children: row.boundary }), _jsx("td", { children: row.services })] }, row.id))) })] }) })] }));
}
function TopologyObjectPanel({ synthesized }) {
    const primarySite = synthesized.topology.primarySiteName || synthesized.siteHierarchy[0]?.name || "Not assigned";
    const serviceAnchors = Array.from(new Set(synthesized.servicePlacements.slice(0, 6).map((item) => `${item.serviceName} • ${item.placementType === "cloud" ? "cloud" : item.siteName || item.zoneName}`)));
    return (_jsxs("div", { className: "diagram-topology-object-panel", children: [_jsxs("div", { className: "diagram-topology-object-card", children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: "Topology object model" }), _jsx("p", { style: { margin: "0 0 10px 0", color: "#61758f" }, children: "v114 makes the diagram stage more explicit about the underlying topology object: what architecture pattern is being drawn, where the primary edge sits, how breakout is expected, and which service anchors should appear in review." }), _jsxs("div", { className: "diagram-topology-object-grid", children: [_jsxs("div", { children: [_jsx("span", { children: "Pattern" }), _jsx("strong", { children: synthesized.topology.topologyLabel })] }), _jsxs("div", { children: [_jsx("span", { children: "Primary site" }), _jsx("strong", { children: primarySite })] }), _jsxs("div", { children: [_jsx("span", { children: "Breakout" }), _jsx("strong", { children: synthesized.topology.internetBreakout })] }), _jsxs("div", { children: [_jsx("span", { children: "Cloud posture" }), _jsx("strong", { children: synthesized.topology.cloudConnected ? "cloud-attached" : "on-prem only" })] }), _jsxs("div", { children: [_jsx("span", { children: "WAN posture" }), _jsx("strong", { children: synthesized.topology.topologyType === "collapsed-core" ? "local only" : synthesized.topology.internetBreakout === "centralized" ? "centralized WAN / breakout" : "distributed WAN / breakout" })] }), _jsxs("div", { children: [_jsx("span", { children: "Redundancy" }), _jsx("strong", { children: synthesized.topology.redundancyModel })] })] })] }), _jsxs("div", { className: "diagram-topology-object-card", children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: "Service and placement anchors" }), _jsx("div", { className: "network-chip-list", children: serviceAnchors.length > 0 ? serviceAnchors.map((item) => _jsx("span", { className: "badge-soft", children: item }, item)) : _jsx("span", { className: "badge-soft", children: "No explicit service anchors yet" }) }), _jsx("p", { style: { margin: "10px 0 0 0", color: "#61758f" }, children: "Use these anchors to decide whether the current diagram should emphasize branch-to-hub movement, cloud edge visibility, DMZ placement, or local breakout at individual sites." })] })] }));
}
function OverlayBehaviorPanel({ overlay }) {
    const overlayChecks = {
        none: [
            "Confirm the primary edge device exists at the right site.",
            "Check that access, distribution, core, wireless, and service roles look plausible.",
            "Use this first before reviewing labels or path behavior.",
        ],
        addressing: [
            "Check site blocks, VLAN/subnet labels, gateways, and transit references.",
            "Make sure DMZ and management subnets are visible when the design expects them.",
            "Use this before trusting report addressing tables or route summaries.",
        ],
        security: [
            "Check trust boundaries, attached enforcement points, and DMZ adjacency.",
            "Verify guest, user, server, management, and edge paths are separated correctly.",
            "Use this before reviewing policy text in the report.",
        ],
        flows: [
            "Check whether branch, guest, internet, cloud, management, and published-service paths look believable.",
            "Verify the traversal path matches the topology type rather than reading like a generic network.",
            "Use this before trusting cutover, routing, or security review narrative.",
        ],
        services: [
            "Check whether services are shown as local, centralized, DMZ-based, or cloud-hosted where the design expects them.",
            "Verify the service anchor sits behind the correct boundary and consumer model.",
            "Use this before trusting service-placement sections in the report.",
        ],
        redundancy: [
            "Check whether the current layout shows one edge, paired edge, or more resilient transport clearly enough.",
            "Verify route-domain anchors and WAN links support the failover story the topology implies.",
            "Use this before trusting HA, resilience, or transport narrative in the report.",
        ],
    };
    return (_jsxs("div", { className: "diagram-overlay-behavior-panel", children: [_jsx("strong", { style: { display: "block", marginBottom: 8 }, children: "Overlay behavior checklist" }), _jsx("div", { className: "diagram-overlay-behavior-grid", children: overlayChecks[overlay].map((item) => (_jsx("div", { className: "diagram-overlay-behavior-card", children: item }, item))) })] }));
}
function TopologyFoundationPanel({ synthesized }) {
    const topServices = synthesized.servicePlacements.slice(0, 4);
    return (_jsxs("div", { className: "diagram-foundation-grid", style: { marginTop: 10 }, children: [_jsxs("div", { className: "diagram-foundation-card", children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: "Topology intent" }), _jsx("p", { style: { margin: "0 0 8px 0" }, children: synthesized.topology.notes?.[0] || synthesized.topology.topologyLabel }), _jsxs("div", { className: "network-chip-list", children: [_jsx("span", { className: "badge-soft", children: synthesized.topology.topologyType }), _jsxs("span", { className: "badge-soft", children: ["WAN ", synthesized.topology.topologyType === "collapsed-core" ? "local only" : synthesized.topology.internetBreakout === "centralized" ? "centralized WAN / breakout" : "distributed WAN / breakout"] }), _jsxs("span", { className: "badge-soft", children: ["Breakout ", synthesized.topology.internetBreakout] }), _jsxs("span", { className: "badge-soft", children: ["Redundancy ", synthesized.topology.redundancyModel] })] })] }), _jsxs("div", { className: "diagram-foundation-card", children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: "Placement and service anchors" }), _jsxs("div", { className: "diagram-mini-list", children: [_jsxs("div", { children: [_jsx("span", { children: "Placements" }), _jsx("strong", { children: synthesized.sitePlacements.length })] }), _jsxs("div", { children: [_jsx("span", { children: "Boundaries" }), _jsx("strong", { children: synthesized.securityBoundaries.length })] }), _jsxs("div", { children: [_jsx("span", { children: "Flows" }), _jsx("strong", { children: synthesized.trafficFlows.length })] }), _jsxs("div", { children: [_jsx("span", { children: "Services" }), _jsx("strong", { children: synthesized.servicePlacements.length })] })] }), _jsxs("p", { style: { margin: "8px 0 0 0", color: "#61758f" }, children: ["Primary service edge: ", topServices[0]?.serviceName || "No explicit service yet"] })] })] }));
}
function FlowSummaryPanel({ flows }) {
    const displayedFlows = flows.slice(0, 5);
    return (_jsx("div", { className: "diagram-note-grid", style: { marginTop: 10 }, children: displayedFlows.map((flow) => (_jsxs("div", { className: "diagram-note-card", children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: flow.flowName }), _jsxs("p", { style: { margin: "0 0 6px 0" }, children: [flow.sourceZone, " \u2192 ", flow.destinationZone] }), _jsx("p", { style: { margin: 0, color: "#61758f" }, children: flow.path.join(" → ") })] }, flow.id))) }));
}
function DeviceRealismDirectionPanel() {
    const items = [
        ["Firewall", "Shielded perimeter or security appliance posture rather than a plain box."],
        ["Router", "Routed edge / transit device with a more recognisable router silhouette."],
        ["Switch stack", "Stacked switching face with port rows so access and core look different."],
        ["Wireless", "AP / controller shapes with RF arcs so wireless roles read immediately."],
        ["Server", "Rack-like server posture instead of a generic rectangle."],
        ["Cloud / internet", "North-south edge icons that read as service or public boundary, not random circles."],
    ];
    return (_jsxs("div", { className: "diagram-realism-panel", children: [_jsxs("div", { children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: "Device realism direction" }), _jsx("p", { className: "muted", style: { margin: 0 }, children: "v117-v120 continues the shift away from generic circles and plain rectangles. The diagram should increasingly use network-style symbols that look like firewalls, routers, switch stacks, wireless devices, servers, cloud edges, and internet boundaries." })] }), _jsx("div", { className: "diagram-realism-grid", children: items.map(([title, detail]) => (_jsxs("div", { className: "diagram-realism-card", children: [_jsx("strong", { children: title }), _jsx("p", { children: detail })] }, title))) })] }));
}
function TopologyBehaviorMatrixPanel({ synthesized }) {
    const primarySite = synthesized.topology.primarySiteName || synthesized.siteHierarchy[0]?.name || "Primary site";
    const rows = synthesized.siteHierarchy.slice(0, 6).map((site) => {
        const boundary = synthesized.securityBoundaries.find((item) => item.siteName === site.name);
        const flow = synthesized.trafficFlows.find((item) => item.path.some((hop) => hop.includes(site.name)));
        const services = synthesized.servicePlacements.filter((item) => item.siteName === site.name).slice(0, 2);
        return {
            site: site.name,
            role: site.name === primarySite ? "Primary / policy concentration" : "Attached / branch posture",
            expectedPath: flow ? flow.path.join(" → ") : (site.name === primarySite ? "Local edge / shared services / internet" : `${site.name} → ${primarySite}`),
            boundary: boundary ? `${boundary.zoneName} via ${boundary.controlPoint}` : "Boundary not yet explicit",
            services: services.length > 0 ? services.map((item) => item.serviceName).join(", ") : "No explicit anchor yet",
        };
    });
    return (_jsxs("div", { className: "diagram-behavior-panel", children: [_jsxs("div", { children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: "Topology-specific path and placement behavior" }), _jsx("p", { className: "muted", style: { margin: 0 }, children: "This matrix helps the diagram read like an architecture pattern instead of a generic map. Site role, expected path, boundary attachment, and anchored services should all change when the topology changes." })] }), _jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { align: "left", children: "Site" }), _jsx("th", { align: "left", children: "Expected role" }), _jsx("th", { align: "left", children: "Expected path emphasis" }), _jsx("th", { align: "left", children: "Boundary anchor" }), _jsx("th", { align: "left", children: "Service anchors" })] }) }), _jsx("tbody", { children: rows.map((row) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("strong", { children: row.site }) }), _jsx("td", { children: row.role }), _jsx("td", { children: row.expectedPath }), _jsx("td", { children: row.boundary }), _jsx("td", { children: row.services })] }, row.site))) })] }) })] }));
}
function OverlayEvidencePanel({ overlay, synthesized }) {
    const evidence = {
        placement: [
            `${synthesized.siteHierarchy.length} site summaries`,
            `${synthesized.sitePlacements.length} site placement entries`,
            `${synthesized.servicePlacements.length} service placement anchors`,
        ],
        addressing: [
            `${synthesized.addressingPlan.length} subnet or VLAN plan rows`,
            `${synthesized.wanLinks.length} WAN/transit links`,
            `${synthesized.routingPlan.length} routing intent rows`,
        ],
        security: [
            `${synthesized.securityBoundaries.length} security boundaries`,
            `${synthesized.servicePlacements.filter((item) => item.zoneName?.toLowerCase().includes("dmz")).length} DMZ-related service anchors`,
            `${synthesized.trafficFlows.filter((item) => /internet|remote|guest/i.test(item.flowLabel)).length} public-edge or remote-relevant flows`,
        ],
        flows: [
            `${synthesized.trafficFlows.length} generated traffic flows`,
            `${synthesized.trafficFlows.filter((item) => item.path.length >= 3).length} multi-hop paths`,
            `${synthesized.trafficFlows.filter((item) => /cloud/i.test(item.flowLabel)).length} cloud-oriented flows`,
        ],
        services: [
            `${synthesized.servicePlacements.length} explicit service placement anchors`,
            `${synthesized.servicePlacements.filter((item) => item.placementType === "local").length} local services`,
            `${synthesized.servicePlacements.filter((item) => item.placementType === "centralized" || item.placementType === "cloud").length} centralized or cloud services`,
        ],
        redundancy: [
            `${synthesized.wanLinks.length} WAN or transit links`,
            `${synthesized.designTruthModel.routeDomains.length} route domains`,
            `${synthesized.sitePlacements.filter((item) => item.deviceType === "firewall" || item.deviceType === "router").length} edge anchors`,
        ],
    };
    const key = overlay === "none" ? "placement" : overlay;
    return (_jsxs("div", { className: "diagram-evidence-panel", children: [_jsx("strong", { style: { display: "block", marginBottom: 8 }, children: "Overlay evidence snapshot" }), _jsx("div", { className: "diagram-evidence-grid", children: evidence[key].map((item) => (_jsx("div", { className: "diagram-evidence-card", children: item }, item))) })] }));
}
function DiagramReviewSequencePanel({ overlay }) {
    const steps = [
        ["Placement", "Confirm the edge, switching tiers, wireless roles, and service anchors look plausible before trusting finer labels."],
        ["Addressing", "Check block hierarchy, VLAN/subnet labels, DMZ or management visibility, and any transit references."],
        ["Services", "Check which services are local, centralized, DMZ-based, or cloud-hosted and whether that matches the intended architecture."],
        ["Security", "Review trust boundaries, enforcement attachment, DMZ adjacency, and guest or management separation."],
        ["Redundancy", "Check routed uplinks, edge posture, and route-domain anchors so the failover story reads honestly from the topology."],
        ["Flows", "Finish by tracing critical traffic and making sure path behavior matches the chosen topology."],
    ];
    return (_jsxs("div", { className: "diagram-review-sequence", children: [_jsx("strong", { style: { display: "block", marginBottom: 8 }, children: "Recommended review sequence" }), _jsx("div", { className: "diagram-review-sequence-grid", children: steps.map(([title, detail]) => (_jsxs("div", { className: `diagram-review-sequence-card${(overlay === "none" && title === "Placement") || overlay.toLowerCase() === title.toLowerCase() ? " active" : ""}`, children: [_jsx("span", { children: title }), _jsx("p", { children: detail })] }, title))) })] }));
}
function buildDiagramReviewPresets(focusedSiteId) {
    return [
        { key: "architecture", label: "Architecture review", detail: "Global placement baseline for edge, switching, and shared anchors.", mode: "logical", scope: "global", overlay: "none", density: "guided", labelMode: "essential", linkAnnotationMode: "minimal" },
        { key: "site-lld", label: "Site LLD", detail: "Per-site review for local topology, labels, and service anchors.", mode: "physical", scope: "site", overlay: "addressing", density: "expanded", labelMode: "detailed", linkAnnotationMode: "full", focusedSiteId },
        { key: "transport", label: "Transport / WAN", detail: "WAN, cloud edge, and redundancy posture review.", mode: "logical", scope: "wan-cloud", overlay: "redundancy", density: "guided", labelMode: "essential", linkAnnotationMode: "full" },
        { key: "boundaries", label: "Trust boundaries", detail: "Boundary and enforcement review across edge, DMZ, guest, and management zones.", mode: "logical", scope: "boundaries", overlay: "security", density: "guided", labelMode: "detailed", linkAnnotationMode: "full" },
        { key: "services", label: "Service placement", detail: "Local, centralized, DMZ, and cloud-hosted service anchoring.", mode: "logical", scope: "global", overlay: "services", density: "guided", labelMode: "essential", linkAnnotationMode: "minimal" },
        { key: "critical-flows", label: "Critical flows", detail: "Trace critical movement and control points through the current design.", mode: "logical", scope: "wan-cloud", overlay: "flows", density: "expanded", labelMode: "essential", linkAnnotationMode: "full" },
    ];
}
function activePresetKeyForState(mode, scope, overlay) {
    if (mode === "logical" && scope === "global" && overlay === "none")
        return "architecture";
    if (mode === "physical" && scope === "site" && overlay === "addressing")
        return "site-lld";
    if (mode === "logical" && scope === "wan-cloud" && overlay === "redundancy")
        return "transport";
    if (mode === "logical" && scope === "boundaries" && overlay === "security")
        return "boundaries";
    if (mode === "logical" && scope === "global" && overlay === "services")
        return "services";
    if (mode === "logical" && scope === "wan-cloud" && overlay === "flows")
        return "critical-flows";
    return undefined;
}
export function ProjectDiagram({ project, comments = [], validations = [], onSelectTarget }) {
    const sites = (project.sites ?? []);
    const svgId = `diagram-${project.id}`;
    const [mode, setMode] = useState("logical");
    const [overlay, setOverlay] = useState("none");
    const [scope, setScope] = useState("global");
    const [workspaceDensity, setWorkspaceDensity] = useState("guided");
    const [labelMode, setLabelMode] = useState("essential");
    const [linkAnnotationMode, setLinkAnnotationMode] = useState("minimal");
    const [focusedSiteId, setFocusedSiteId] = useState(sites[0]?.id ?? "");
    const requirements = parseRequirementsProfile(project.requirementsJson);
    const allVlans = sites.flatMap((site) => site.vlans ?? []);
    const synthesized = useMemo(() => synthesizeLogicalDesign(project, sites, allVlans, requirements), [project, sites, allVlans, requirements]);
    const scopedSites = useMemo(() => sitesForDiagramScope(sites, synthesized, scope, focusedSiteId), [sites, synthesized, scope, focusedSiteId]);
    const focusedSite = useMemo(() => sites.find((site) => site.id === focusedSiteId) || scopedSites[0] || sites[0], [sites, scopedSites, focusedSiteId]);
    const scopeMeta = useMemo(() => diagramScopeMeta(scope, synthesized, focusedSite), [scope, synthesized, focusedSite]);
    const scopedFlows = useMemo(() => flowsForDiagramScope(synthesized.trafficFlows, scope, focusedSite?.name), [synthesized.trafficFlows, scope, focusedSite]);
    const scopedBoundaryIds = useMemo(() => new Set(scopedSites.map((site) => site.name)), [scopedSites]);
    const scopedBoundaryCount = synthesized.securityBoundaries.filter((boundary) => scopedBoundaryIds.has(boundary.siteName)).length;
    const scopedPlacementCount = synthesized.sitePlacements.filter((placement) => scopedSites.some((site) => site.id === placement.siteId)).length;
    const scopedServiceCount = synthesized.servicePlacements.filter((placement) => placement.siteId ? scopedSites.some((site) => site.id === placement.siteId) : placement.siteName ? scopedBoundaryIds.has(placement.siteName) : false).length;
    const scopeFilename = scope === "site" ? `site-${(focusedSite?.name || "focus").replace(/\s+/g, "-").toLowerCase()}` : scope;
    const baseFilename = useMemo(() => `${project.name.replace(/\s+/g, "-").toLowerCase()}-${mode}-${overlay}-${scopeFilename}-diagram`, [mode, overlay, scopeFilename, project.name]);
    const reviewPresets = useMemo(() => buildDiagramReviewPresets(focusedSite?.id || sites[0]?.id), [focusedSite?.id, sites]);
    const activePresetKey = useMemo(() => activePresetKeyForState(mode, scope, overlay), [mode, scope, overlay]);
    const activePreset = reviewPresets.find((preset) => preset.key === activePresetKey) || null;
    const showSupportPanels = workspaceDensity === "expanded";
    const densityLabel = workspaceDensity === "guided" ? "Guided" : "Expanded";
    const applyPreset = (presetKey) => {
        const preset = reviewPresets.find((item) => item.key === presetKey);
        if (!preset)
            return;
        setMode(preset.mode);
        setScope(preset.scope);
        setOverlay(preset.overlay);
        setWorkspaceDensity(preset.density);
        setLabelMode(preset.labelMode);
        setLinkAnnotationMode(preset.linkAnnotationMode);
        if (preset.scope === "site") {
            setFocusedSiteId(preset.focusedSiteId || focusedSite?.id || sites[0]?.id || "");
        }
    };
    if (sites.length === 0) {
        return _jsx("div", { className: "panel", children: _jsx("div", { className: "diagram-toolbar", children: _jsxs("div", { children: [_jsx("h2", { style: { marginBottom: 6 }, children: "Diagram" }), _jsx("p", { className: "muted", style: { margin: 0 }, children: "Add sites and VLANs to generate a topology diagram." })] }) }) });
    }
    return (_jsxs("div", { className: "panel", children: [_jsxs("div", { className: "diagram-toolbar", style: { marginBottom: 12 }, children: [_jsxs("div", { children: [_jsx("h2", { style: { marginBottom: 6 }, children: "Generated Topology Diagram" }), _jsx("p", { className: "muted", style: { margin: 0 }, children: "This recovery pass keeps the diagram work tied to the roadmap: real layout modes, guided-vs-expanded density control, stronger link semantics, and clearer label discipline so the workspace behaves more like a real topology review surface." })] }), _jsxs("div", { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }, children: [_jsxs("div", { className: "diagram-toggle", children: [_jsx("button", { type: "button", className: mode === "logical" ? "active" : "", onClick: () => setMode("logical"), children: "Logical Topology" }), _jsx("button", { type: "button", className: mode === "physical" ? "active" : "", onClick: () => setMode("physical"), children: "Physical / Topology" })] }), _jsxs("div", { className: "diagram-toggle", children: [_jsx("button", { type: "button", className: scope === "global" ? "active" : "", onClick: () => setScope("global"), children: "Global" }), _jsx("button", { type: "button", className: scope === "site" ? "active" : "", onClick: () => setScope("site"), children: "Per-site" }), _jsx("button", { type: "button", className: scope === "wan-cloud" ? "active" : "", onClick: () => setScope("wan-cloud"), children: "WAN / Cloud" }), _jsx("button", { type: "button", className: scope === "boundaries" ? "active" : "", onClick: () => setScope("boundaries"), children: "Boundaries" })] }), _jsxs("div", { className: "diagram-toggle", children: [_jsx("button", { type: "button", className: overlay === "none" ? "active" : "", onClick: () => setOverlay("none"), children: "Placement" }), _jsx("button", { type: "button", className: overlay === "addressing" ? "active" : "", onClick: () => setOverlay("addressing"), children: "Addressing" }), _jsx("button", { type: "button", className: overlay === "services" ? "active" : "", onClick: () => setOverlay("services"), children: "Services" }), _jsx("button", { type: "button", className: overlay === "security" ? "active" : "", onClick: () => setOverlay("security"), children: "Security" }), _jsx("button", { type: "button", className: overlay === "redundancy" ? "active" : "", onClick: () => setOverlay("redundancy"), children: "Redundancy" }), _jsx("button", { type: "button", className: overlay === "flows" ? "active" : "", onClick: () => setOverlay("flows"), children: "Flows" })] }), _jsxs("div", { className: "diagram-toggle", children: [_jsx("button", { type: "button", className: workspaceDensity === "guided" ? "active" : "", onClick: () => setWorkspaceDensity("guided"), children: "Guided" }), _jsx("button", { type: "button", className: workspaceDensity === "expanded" ? "active" : "", onClick: () => setWorkspaceDensity("expanded"), children: "Expanded" })] }), _jsxs("div", { className: "diagram-toggle", children: [_jsx("button", { type: "button", className: labelMode === "essential" ? "active" : "", onClick: () => setLabelMode("essential"), children: "Essential labels" }), _jsx("button", { type: "button", className: labelMode === "detailed" ? "active" : "", onClick: () => setLabelMode("detailed"), children: "Detailed labels" })] }), _jsxs("div", { className: "diagram-toggle", children: [_jsx("button", { type: "button", className: linkAnnotationMode === "minimal" ? "active" : "", onClick: () => setLinkAnnotationMode("minimal"), children: "Minimal link notes" }), _jsx("button", { type: "button", className: linkAnnotationMode === "full" ? "active" : "", onClick: () => setLinkAnnotationMode("full"), children: "Full link notes" })] }), scope === "site" ? (_jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4f6582" }, children: [_jsx("span", { children: "Site focus" }), _jsx("select", { value: focusedSite?.id || "", onChange: (event) => setFocusedSiteId(event.target.value), children: sites.map((site) => (_jsx("option", { value: site.id, children: site.name }, site.id))) })] })) : null, _jsx("button", { type: "button", onClick: () => exportSvg(svgId, `${baseFilename}.svg`), children: "Export SVG" }), _jsx("button", { type: "button", onClick: () => { void exportPng(svgId, `${baseFilename}.png`); }, children: "Export PNG" })] })] }), _jsxs("div", { className: "diagram-note-grid", style: { marginBottom: 12 }, children: [_jsxs("div", { className: "diagram-note-card", children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: "Guided review presets" }), _jsx("p", { style: { margin: "0 0 10px 0", color: "#61758f" }, children: activePreset ? `${activePreset.label} is currently active.` : "Choose a preset to move the workspace into a stronger engineering review posture without manually toggling each control." }), _jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: reviewPresets.map((preset) => (_jsx("button", { type: "button", className: activePresetKey === preset.key ? "active" : "", onClick: () => applyPreset(preset.key), children: preset.label }, preset.key))) }), _jsx("p", { style: { margin: "10px 0 0 0", color: "#61758f" }, children: activePreset?.detail || "Review presets align scope, overlay, and mode around the main engineering checks that still matter most in the recovery roadmap." })] }), _jsxs("div", { className: "diagram-note-card", children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: scopeMeta.title }), _jsx("p", { style: { margin: 0, color: "#61758f" }, children: scopeMeta.detail })] }), _jsxs("div", { className: "diagram-note-card", children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: "Current evidence in scope" }), _jsxs("p", { style: { margin: 0, color: "#61758f" }, children: [scopedSites.length, " site", scopedSites.length === 1 ? "" : "s", ", ", scopedPlacementCount, " placement object", scopedPlacementCount === 1 ? "" : "s", ", ", scopedServiceCount, " service anchor", scopedServiceCount === 1 ? "" : "s", ", ", scopedBoundaryCount, " boundary object", scopedBoundaryCount === 1 ? "" : "s", ", and ", scopedFlows.length, " flow path", scopedFlows.length === 1 ? "" : "s", " are currently active in this view."] })] }), _jsxs("div", { className: "diagram-note-card", children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: "Recovery direction" }), _jsx("p", { style: { margin: 0, color: "#61758f" }, children: "Use global for overall architecture, per-site for local LLD review, WAN / cloud for transport posture, and boundaries for trust enforcement. This keeps the diagram stage closer to the roadmap\u2019s real topology-engine target." })] }), _jsxs("div", { className: "diagram-note-card", children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: "Current workspace discipline" }), _jsxs("p", { style: { margin: 0, color: "#61758f" }, children: [densityLabel, " density \u2022 ", labelMode === "detailed" ? "Detailed device + link labels" : "Essential labels only", " \u2022 ", linkAnnotationMode === "full" ? "Full link annotations" : "Minimal link annotations", ". Guided mode keeps critical review cards first; Expanded mode exposes the deeper support panels."] })] })] }), _jsx(DeviceRealismDirectionPanel, {}), _jsx(ArchitectureSignals, { synthesized: synthesized }), _jsx(TopologyFoundationPanel, { synthesized: synthesized }), showSupportPanels && scope !== "site" ? _jsx(TopologyObjectPanel, { synthesized: synthesized }) : null, showSupportPanels && (scope !== "site" || mode === "physical") ? _jsx(Legend, {}) : null, showSupportPanels && scope === "global" ? _jsx(DeviceSymbolLibraryPanel, {}) : null, _jsx(OverlayReviewPanel, { overlay: overlay }), _jsx(OverlayBehaviorPanel, { overlay: overlay }), (showSupportPanels || overlay === "security" || overlay === "flows") && scope !== "site" && (overlay === "security" || overlay === "flows" || overlay === "redundancy") ? _jsx(ConnectionSemanticsPanel, {}) : null, _jsx(LinkTypeRenderingPanel, { synthesized: synthesized }), _jsx(OverlayEvidencePanel, { overlay: overlay, synthesized: synthesized }), _jsx(TopologySpecificRenderingPanel, { synthesized: synthesized }), showSupportPanels && scope !== "site" && (overlay === "none" || overlay === "redundancy" || overlay === "flows") ? _jsx(TopologyBehaviorMatrixPanel, { synthesized: synthesized }) : null, _jsx(DiagramReviewSequencePanel, { overlay: overlay }), _jsxs("div", { className: "diagram-note-grid", style: { marginTop: 10 }, children: [_jsxs("div", { className: "diagram-note-card", children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: "Report cross-check" }), _jsx("p", { style: { margin: 0, color: "#61758f" }, children: "Use Placement with report section 3, Addressing with section 4, Services with section 5, Security with section 6, Redundancy with section 7, and Flows with section 7 so the device, service, subnet, and boundary names match the written package exactly." })] }), _jsxs("div", { className: "diagram-note-card", children: [_jsx("strong", { style: { display: "block", marginBottom: 6 }, children: "Validation cross-check" }), _jsx("p", { style: { margin: 0, color: "#61758f" }, children: "If labels, paths, interfaces, DMZ chains, or primary-versus-branch behavior look wrong here, review the same mismatch in validation and then correct it in addressing, security, routing, or service-placement workspaces." })] })] }), showSupportPanels ? _jsx(SiteDeviceLinkMatrixPanel, { synthesized: synthesized, siteIds: scopedSites.map((site) => site.id) }) : null, overlay === "flows" ? _jsx(FlowSummaryPanel, { flows: scopedFlows }) : null, mode === "logical"
                ? _jsx(LogicalTopologyDiagram, { project: project, synthesized: synthesized, svgId: svgId, comments: comments, validations: validations, overlay: overlay, scope: scope, focusedSiteId: focusedSite?.id, labelMode: labelMode, linkAnnotationMode: linkAnnotationMode, onSelectTarget: onSelectTarget })
                : _jsx(PhysicalTopologyDiagram, { project: project, synthesized: synthesized, svgId: svgId, comments: comments, validations: validations, overlay: overlay, scope: scope, focusedSiteId: focusedSite?.id, labelMode: labelMode, linkAnnotationMode: linkAnnotationMode, onSelectTarget: onSelectTarget })] }));
}
