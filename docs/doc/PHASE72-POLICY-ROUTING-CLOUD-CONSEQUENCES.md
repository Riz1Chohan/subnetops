# Phase 72 — Requirements Policy, Routing, and Cloud Consequences

## Purpose

Phase 72 is not a UI polish pass. It hardens the requirement consequence path after Phase 70/71 so selected security, cloud, WAN, and operations requirements do not remain report-only text.

The target relationship is:

```text
saved requirementsJson
→ materialized segments
→ backend network object model
→ requirement-driven zones
→ requirement-driven policy rules
→ security-flow evidence
→ routing/cloud/WAN notes and review evidence
```

## What changed

### Requirement-driven zones

The backend network object model now creates or strengthens security zones from selected requirements even when the zone is still only proposed/review-level evidence:

- user population / design objective → internal zone evidence
- guest Wi-Fi / guest policy → guest zone evidence
- management / admin boundary / management IP policy → management zone evidence
- remote access / VPN method → DMZ or remote-access edge evidence
- cloud / hybrid / cloud routing / cloud traffic boundary → transit/cloud-edge evidence
- multi-site / inter-site traffic / dual ISP / resilience → WAN transit evidence
- voice / QoS / phone count → voice zone evidence
- printers / cameras / IoT → shared-device/IoT zone evidence

This does **not** pretend those zones are implemented. They remain `proposed` unless backed by concrete subnets/interfaces.

### Requirement-driven policy rules

The backend policy model now creates explicit neutral policy consequences for major security/cloud selections:

- guest isolation deny rule
- guest internet-only review/allow rule
- admin access to management-plane review rule
- operations-plane to internal review rule
- WAN to remote-access edge review rule
- cloud edge reachability review rule
- voice/QoS reachability review rule
- shared-device/IoT default-deny and scoped access review rules

These are vendor-neutral design consequences, not Cisco/Palo Alto/Fortinet commands.

### Routing/cloud/WAN notes

The route-domain and WAN zone now carry Phase 72 requirement evidence, including internet model, security posture, trust boundary, cloud provider/connectivity, inter-site traffic, and resilience target. This makes routing/cloud consequences visible in design-core and export instead of being buried in requirements text.

## What Phase 72 still does not claim

Phase 72 does not complete validation hardening. It does not claim an empty design is acceptable. Phase 73 still needs to add hard validation failures for missing required outputs.

Phase 72 also does not generate vendor-specific firewall rules, cloud route tables, BGP, SD-WAN configuration, or device CLI.

## Acceptance expectations

For a saved multi-site/cloud/security-heavy requirement set, design-core should now show more than traceability text:

- requirement-driven security zones
- policy rules tied to selected requirements
- security-flow consequences with requirement keys
- WAN/cloud transit evidence
- routing notes reflecting WAN/cloud selections

If Sites/VLANs/address rows are still zero after save, that remains a Phase 70/71 runtime problem and Phase 73 must block the design instead of allowing a fake clean state.
