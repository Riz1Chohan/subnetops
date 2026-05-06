import assert from "node:assert/strict";
import { buildV1PlatformBomFoundationControl, V1_PLATFORM_BOM_FOUNDATION_CONTRACT } from "../services/designCore/designCore.platformBomFoundationControl.js";
const networkObjectModel: any = { summary: { deviceCount: 3, interfaceCount: 6 }, devices: [{ id: "device-core" }, { id: "device-fw" }], interfaces: [{ id: "if-users" }, { id: "if-guest" }], routeDomains: [{ id: "rd-default" }], securityZones: [{ id: "zone-guest" }], dhcpPools: [{ id: "dhcp-guest" }] };
const result = buildV1PlatformBomFoundationControl({ project: { environmentType: "Healthcare clinic", requirementsJson: JSON.stringify({ siteCount: 3, usersPerSite: 80, guestWifi: true, wireless: true, voice: true, printers: true, cameras: true, iot: true, dualIsp: true, remoteAccess: true, cloudHybrid: true, securityPosture: "segmented healthcare edge", growthMarginPercent: 25, printerCount: 6, phoneCount: 30, apCount: 5, cameraCount: 8, iotDeviceCount: 12 }), platformProfileJson: JSON.stringify({ wanStack: "dual-ISP internet edge with VPN overlays", supportModel: "vendor support plus internal operational ownership", procurementModel: "role-based BOM with final engineering review", lifecyclePolicy: "standard refresh and supportability review" }), sites: [{ id: "site-hq", name: "HQ" }, { id: "site-1", name: "Branch 1" }, { id: "site-2", name: "Branch 2" }] }, networkObjectModel, V1DiagramTruth: { overallReadiness: "REVIEW_REQUIRED" } as any });
assert.equal(result.contract, V1_PLATFORM_BOM_FOUNDATION_CONTRACT);
assert.equal(result.role, "BACKEND_CONTROLLED_ADVISORY_BOM_NO_FAKE_SKUS");
assert.equal(result.procurementAuthority, "ADVISORY_ONLY_NOT_FINAL_SKU");
assert.equal(result.sourceOfTruthLevel, "backend-computed-advisory-estimate");
<<<<<<< HEAD
assert.equal(result.platformProfileState, "SAVED_REVIEW_REQUIRED");
assert(result.procurementReadinessReason.includes("procurement remains review-required"));
=======
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
assert.equal(result.siteCount, 3);
assert(result.rowCount >= 8);
assert(result.rows.some((row) => row.category === "Switching" && row.sourceRequirementIds.includes("requirements:usersPerSite")));
assert(result.rows.some((row) => row.category === "Power/PoE" && row.calculationBasis.includes("phones")));
assert(result.rows.some((row) => row.category === "Security Edge" && row.manualReviewNote.includes("throughput")));
assert(result.rows.some((row) => row.confidence === "placeholder" && row.readinessImpact === "REVIEW_REQUIRED"));
assert(result.requirementDrivers.some((driver) => driver.requirementId === "requirements:dualIsp" && driver.affectedRows.length > 0));
assert(result.proofBoundary.some((line) => line.includes("No vendor model, SKU, price")));
assert(result.findings.some((finding) => finding.code === "V1_ADVISORY_BOM_NOT_VENDOR_CATALOG"));
<<<<<<< HEAD
const unsavedResult = buildV1PlatformBomFoundationControl({ project: { requirementsJson: JSON.stringify({ siteCount: 1, usersPerSite: 20 }), platformProfileJson: null, sites: [{ id: "site-1", name: "Site 1" }] }, networkObjectModel, V1DiagramTruth: { overallReadiness: "REVIEW_REQUIRED" } as any });
assert.equal(unsavedResult.platformProfileState, "ROLE_BASED_ASSUMPTIONS");
assert(unsavedResult.procurementReadinessReason.includes("no saved platform profile exists"));
=======
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
console.log("[V1] Platform/BOM foundation selftest passed");
