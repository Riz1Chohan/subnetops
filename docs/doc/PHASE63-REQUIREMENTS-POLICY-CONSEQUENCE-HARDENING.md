# Phase 63 — Requirements Policy Consequence Hardening

## Purpose

Phase 62 made every requirements field visible and traceable. That was necessary, but it was still not enough. A field being inventoried does not prove that the network plan changes.

Phase 63 turns high-impact requirements into explicit security-flow and policy consequences in the backend design-core model.

## What changed

- `buildSecurityPolicyFlowModel` now accepts `requirementsJson`.
- Captured requirements are parsed inside the security-flow engine.
- Requirement-driven flows are generated for guest access, management access, remote access, cloud/hybrid connectivity, voice/QoS, printers, IoT, cameras, monitoring, logging, backup, operations, and compliance posture.
- `SecurityFlowRequirement` now exposes `requirementKeys` so UI/report/export layers can show exactly which requirement fields created a policy consequence.
- Guest access now creates a concrete guest-to-internal default-deny flow, not just a guest VLAN label.
- Management access now creates an admin-to-management-plane review flow instead of silently assuming normal user networks may manage infrastructure.
- Remote access now creates WAN-to-remote-edge and remote-edge-to-internal review flows.
- Cloud/hybrid posture now creates a cloud-edge reachability review flow.
- Voice/QoS posture now creates a scoped call-control/QoS review flow.
- Printers, cameras, and IoT now create shared-device deny/review flows.
- Printer segments are no longer treated as ordinary internal trust by the object model; they are grouped with restricted shared-device/IoT-style trust handling until a dedicated shared-device zone exists.

## Important limitation

This is still vendor-neutral design intent. The engine is not pretending to generate final Palo Alto, Fortinet, Cisco ACL, or cloud firewall syntax. It now proves that selected requirements drive security consequences that can be validated, reported, and reviewed before implementation.

## Verification

Run:

```bash
npm run check:phase63-requirements-policy-consequences
```
